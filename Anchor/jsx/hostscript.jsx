// アンカー - hostscript.jsx

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * 選択クリップのエフェクト情報を返す。
 * debug フィールドに全コンポーネント名とプロパティ名を含む（診断用）。
 */
function AS_getClipInfo() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ success: false, error: 'アクティブなシーケンスがありません' });
        }

        var clip = _firstSelected(seq);
        if (!clip) {
            return JSON.stringify({ success: false, error: 'クリップを選択してください' });
        }

        var mediaPath = '';
        var sw = 0, sh = 0;

        if (clip.projectItem) {
            try { mediaPath = clip.projectItem.getMediaPath() || ''; } catch (e) {}
            var sz = _sourceSize(clip.projectItem);
            sw = sz[0]; sh = sz[1];
        }
        if (!sw || !sh) {
            sw = seq.frameSizeHorizontal || 1920;
            sh = seq.frameSizeVertical   || 1080;
        }

        var ext = mediaPath.toLowerCase().replace(/.*\./, '');
        var supportsAlpha = /^(png|tif|tiff|psd|exr|psb)$/.test(ext);

        var crop = _detectCrop(clip);
        var maskResult = _detectMask(clip, sw, sh);

        // ── 診断: マスクが見つからない場合のために不透明度コンポーネントの詳細を収集 ──
        var maskDebug = '';
        if (!maskResult) {
            try {
                for (var ci = 0; ci < clip.components.numItems; ci++) {
                    var dbComp = clip.components[ci];
                    var cdn2 = dbComp.displayName || '';
                    if (cdn2 !== '不透明度' && cdn2 !== 'Opacity') { continue; }

                    var n = dbComp.properties.numItems;
                    maskDebug = cdn2 + ' n=' + n + ':';
                    // numItems + 3 まで試してマスクが隠れていないか確認
                    for (var pi = 0; pi < n + 3; pi++) {
                        try {
                            var xp = dbComp.properties[pi];
                            if (xp === undefined || xp === null) { maskDebug += '[' + pi + ']=null '; break; }
                            var xpdn = '';
                            try { xpdn = xp.displayName || '(empty)'; } catch (e2) { xpdn = 'ERR'; }
                            var xSub = 0;
                            try { xSub = xp.numProperties || 0; } catch (e2) {}
                            maskDebug += '[' + pi + ']=' + xpdn + '(sub' + xSub + ') ';
                        } catch (de) { maskDebug += '[' + pi + ']=THROW '; break; }
                    }
                    break;
                }
            } catch (de) {}
        }

        // Detect Transform effects (エフェクトで追加したトランスフォーム)
        var transforms = [];
        for (var tci = 0; tci < clip.components.numItems; tci++) {
            var tcomp = clip.components[tci];
            var tcdn  = tcomp.displayName || '';
            if (/^(Transform|トランスフォーム)$/.test(tcdn)) {
                transforms.push({ index: tci, displayName: tcdn });
            }
        }

        return JSON.stringify({
            success:       true,
            name:          clip.name || '',
            mediaPath:     mediaPath,
            supportsAlpha: supportsAlpha,
            sourceWidth:   sw,
            sourceHeight:  sh,
            crop:          crop,
            mask:          maskResult,
            maskDebug:     maskDebug,
            transforms:    transforms
        });

    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
}

/**
 * 選択クリップのメディアパスを返す（アルファ解析用）。
 */
function AS_getAlphaSourcePath() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ success: false, error: 'アクティブなシーケンスがありません' });
        }

        for (var i = 0; i < seq.videoTracks.numTracks; i++) {
            var track = seq.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                if (!clip.isSelected() || !clip.projectItem) { continue; }

                var path = '';
                try { path = clip.projectItem.getMediaPath() || ''; } catch (e) {}
                if (!path) { continue; }

                var ext = path.toLowerCase().replace(/.*\./, '');
                if (/^(png|tif|tiff|psd|exr|psb)$/.test(ext)) {
                    return JSON.stringify({ success: true, path: path });
                }
            }
        }

        return JSON.stringify({
            success: false,
            error: 'このクリップはアルファ非対応です (PNG/TIF/PSD/EXR のみ)'
        });

    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
}

/**
 * 選択クリップのシーケンスフレームを一時 PNG へエクスポートする（マスク解析用）。
 * 他のビデオトラックを一時的に無効化して合成をなくしたうえでエクスポートする。
 * 戻り値: { success, path, clipProps: { ax,ay,px,py,scale,sw,sh,seqW,seqH } }
 */
function AS_exportMaskFrame() {
    var seq = app.project.activeSequence;
    if (!seq) { return JSON.stringify({ success: false, error: 'シーケンスなし' }); }

    var clip = _firstSelected(seq);
    if (!clip) { return JSON.stringify({ success: false, error: 'クリップを選択してください' }); }

    var seqW = seq.frameSizeHorizontal || 1920;
    var seqH = seq.frameSizeVertical   || 1080;

    var sw = 0, sh = 0, ax = 0.5, ay = 0.5, px = 0.5, py = 0.5, scale = 100;
    if (clip.projectItem) {
        var sz = _sourceSize(clip.projectItem);
        sw = sz[0]; sh = sz[1];
    }
    if (!sw || !sh) { sw = seqW; sh = seqH; }
    if (sw > 16384 || sh > 16384) { sw = seqW; sh = seqH; }

    // Read Motion properties (position, scale, anchor)
    for (var ci = 0; ci < clip.components.numItems; ci++) {
        var comp = clip.components[ci];
        var cdn  = comp.displayName || '';
        if (cdn !== 'Motion' && cdn !== 'モーション') { continue; }
        for (var pi = 0; pi < comp.properties.numItems; pi++) {
            var prop = comp.properties[pi];
            var dn   = prop.displayName || '';
            try {
                if (dn === 'Position' || dn === '位置') {
                    var pv = prop.getValue();
                    if (pv && pv.length >= 2) { px = pv[0]; py = pv[1]; }
                } else if (dn === 'Scale' || dn === 'スケール') {
                    var sv = prop.getValue();
                    scale = (sv !== null && typeof sv === 'object') ? sv[0] : (sv || 100);
                } else if (dn === 'Anchor Point' || dn === 'アンカーポイント') {
                    var av = prop.getValue();
                    if (av && av.length >= 2) { ax = av[0]; ay = av[1]; }
                }
            } catch (e) {}
        }
        break;
    }

    // Find which track the selected clip is on
    var clipTrackIdx = -1;
    var ti;
    for (ti = 0; ti < seq.videoTracks.numTracks; ti++) {
        var tr = seq.videoTracks[ti];
        for (var tci = 0; tci < tr.clips.numItems; tci++) {
            if (tr.clips[tci].isSelected()) { clipTrackIdx = ti; break; }
        }
        if (clipTrackIdx >= 0) { break; }
    }

    // Save track enabled states and disable all except clip's track
    var trackStates = [];
    for (ti = 0; ti < seq.videoTracks.numTracks; ti++) {
        var t = seq.videoTracks[ti];
        var wasEnabled = true;
        try {
            if (typeof t.isEnabled === 'function') { wasEnabled = t.isEnabled(); }
            else { wasEnabled = (t.enabled !== false); }
        } catch (e) {}
        trackStates.push(wasEnabled);
        if (ti !== clipTrackIdx) {
            try {
                if (typeof t.setEnabled === 'function') { t.setEnabled(false); }
                else { t.enabled = false; }
            } catch (e) {}
        }
    }

    // Export current frame to temp PNG
    // exportFramePNG returns undefined on success (not a boolean), so only check file existence
    var tempFile = new File(Folder.temp.absoluteURI + '/anchor_mask_frame.png');
    var tempPath = tempFile.fsName;

    // Remove stale file first so we can reliably detect creation
    if (tempFile.exists) { try { tempFile.remove(); } catch (e) {} }

    // ① 標準 API
    try { seq.exportFramePNG(tempPath, seq.getPlayerPosition()); } catch(e) {}
    if (!(new File(tempPath).exists)) {
        try { seq.exportFramePNG(tempPath); } catch(e) {}
    }

    // ② QE API（ネイティブメソッドは typeof では検出できないため直接呼ぶ）
    if (!(new File(tempPath).exists)) {
        try { app.enableQE(); } catch(e) {}
        try { qe.project.getActiveSequence().exportStill(tempPath); } catch(e) {}
    }
    if (!(new File(tempPath).exists)) {
        try { qe.project.getActiveSequence().exportCurrentFrame(tempPath); } catch(e) {}
    }
    if (!(new File(tempPath).exists)) {
        try { qe.project.getActiveSequence().exportFramePNG(tempPath); } catch(e) {}
    }

    // Restore all track enabled states (always, even on failure)
    for (ti = 0; ti < seq.videoTracks.numTracks; ti++) {
        try {
            var t2 = seq.videoTracks[ti];
            if (typeof t2.setEnabled === 'function') { t2.setEnabled(trackStates[ti]); }
            else { t2.enabled = trackStates[ti]; }
        } catch (e) {}
    }

    var outFile = new File(tempPath);
    if (!outFile.exists) {
        // フレームエクスポート不可 → 手動入力モードを返す
        return JSON.stringify({ success: false, manualMode: true,
            error: 'フレームエクスポートAPIが利用できません' });
    }

    // 位置はピクセル単位 → seqToSourceBounds 用に正規化[0,1]へ変換
    return JSON.stringify({
        success:   true,
        path:      tempPath,
        clipProps: { ax: ax, ay: ay, px: px / seqW, py: py / seqH, scale: scale, sw: sw, sh: sh, seqW: seqW, seqH: seqH }
    });
}

/**
 * 選択クリップ全てのアンカーポイントを指定位置へ移動する。
 */
function AS_anchorSnap(xMult, yMult, holdPos, alphaBoundsJson, useCrop, maskBoundsJson, transformIndicesJson) {
    try {
        var x      = parseFloat(xMult);
        var y      = parseFloat(yMult);
        var hold   = (holdPos === 'true');
        var doCrop = (useCrop === 'true');

        var alphaBounds = null;
        if (alphaBoundsJson && alphaBoundsJson !== 'null') {
            try { alphaBounds = JSON.parse(alphaBoundsJson); } catch (e) {}
        }

        var maskBounds = null;
        if (maskBoundsJson && maskBoundsJson !== 'null') {
            try { maskBounds = JSON.parse(maskBoundsJson); } catch (e) {}
        }

        var transformIndices = [];
        if (transformIndicesJson && transformIndicesJson !== 'null' && transformIndicesJson !== '[]') {
            try { transformIndices = JSON.parse(transformIndicesJson); } catch (e) {}
        }

        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ success: false, error: 'アクティブなシーケンスがありません' });
        }

        var seqW = seq.frameSizeHorizontal || 1920;
        var seqH = seq.frameSizeVertical   || 1080;

        var count           = 0;
        var fallback        = false;
        var keyFrameWarning = false;

        for (var i = 0; i < seq.videoTracks.numTracks; i++) {
            var track = seq.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                if (!clip.isSelected()) { continue; }

                var sw = 0, sh = 0;
                if (clip.projectItem) {
                    var sz = _sourceSize(clip.projectItem);
                    sw = sz[0]; sh = sz[1];
                }
                if (!sw || !sh) { sw = seqW; sh = seqH; fallback = true; }
                if (sw > 16384 || sh > 16384) { sw = seqW; sh = seqH; fallback = true; }

                var bounds = { left: 0, top: 0, right: 1, bottom: 1 };
                if (alphaBounds) { bounds = _intersect(bounds, alphaBounds); }
                if (doCrop) {
                    var cropResult = _detectCrop(clip);
                    if (cropResult) {
                        var cL = cropResult.leftPct   / 100;
                        var cT = cropResult.topPct    / 100;
                        var cR = 1 - cropResult.rightPct  / 100;
                        var cB = 1 - cropResult.bottomPct / 100;
                        bounds = _intersect(bounds, { left: cL, top: cT, right: cR, bottom: cB });
                    }
                }
                if (maskBounds) { bounds = _intersect(bounds, maskBounds); }

                var newAX = bounds.left + x * (bounds.right  - bounds.left);
                var newAY = bounds.top  + y * (bounds.bottom - bounds.top);

                // ── Motion (ベクトルモーション) ─────────────────────────
                for (var c = 0; c < clip.components.numItems; c++) {
                    var comp = clip.components[c];
                    var cdn  = comp.displayName || '';
                    if (cdn !== 'Motion' && cdn !== 'モーション') { continue; }
                    var r = _snapComponent(comp, newAX, newAY, sw, sh, seqW, seqH, hold);
                    if (r.snapped) { count++; }
                    if (r.keyFrameWarning) { keyFrameWarning = true; }
                }

                // ── 選択された Transform エフェクト ──────────────────────
                for (var ti = 0; ti < transformIndices.length; ti++) {
                    var idx = transformIndices[ti];
                    if (idx < 0 || idx >= clip.components.numItems) { continue; }
                    var r2 = _snapComponent(clip.components[idx], newAX, newAY, sw, sh, seqW, seqH, hold);
                    if (r2.snapped) { count++; }
                    if (r2.keyFrameWarning) { keyFrameWarning = true; }
                }
            }
        }

        if (count === 0) {
            return JSON.stringify({
                success: false,
                error: 'クリップが選択されていないか、Motionエフェクトが見つかりません'
            });
        }

        return JSON.stringify({ success: true, count: count, fallback: fallback, keyFrameWarning: keyFrameWarning });

    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Motion または Transform コンポーネントのアンカーポイントをスナップする共通処理。
 * anchor/pos は正規化[0,1]。参照スクリプト準拠の位置補正式を使用。
 */
function _snapComponent(comp, newAX, newAY, sw, sh, seqW, seqH, hold) {
    var result = { snapped: false, keyFrameWarning: false };

    var posProp = null, scaleProp = null, anchorProp = null;
    for (var p = 0; p < comp.properties.numItems; p++) {
        var prop = comp.properties[p];
        var dn   = prop.displayName || '';
        if      (/^(Position|位置)$/.test(dn))                           { posProp    = prop; }
        else if (/^(Anchor Point|アンカーポイント)$/.test(dn))            { anchorProp = prop; }
        else if (/^(Scale|スケール)$/.test(dn) && !scaleProp)             { scaleProp  = prop; }
    }

    if (!anchorProp) { return result; }

    var curAnchor = anchorProp.getValue();
    anchorProp.setValue([newAX, newAY], 1);
    result.snapped = true;

    if (hold && posProp && scaleProp) {
        var keys = null;
        try { keys = posProp.getKeys(); } catch(e) {}

        if (keys && keys.length > 0) {
            result.keyFrameWarning = true;
        } else {
            var curScale = scaleProp.getValue();
            var curPos   = posProp.getValue();
            // ① アンカーデルタ(正規化) × ソース寸法 × スケール → ソースピクセル変位
            // ② ÷ シーケンス寸法 → 位置の正規化デルタ（参照スクリプト準拠）
            var pixelMoveX = (newAX - curAnchor[0]) * sw * (curScale / 100);
            var pixelMoveY = (newAY - curAnchor[1]) * sh * (curScale / 100);
            posProp.setValue([
                curPos[0] + pixelMoveX / seqW,
                curPos[1] + pixelMoveY / seqH
            ], 1);
        }
    }

    return result;
}

function _firstSelected(seq) {
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
        var track = seq.videoTracks[i];
        for (var j = 0; j < track.clips.numItems; j++) {
            if (track.clips[j].isSelected()) { return track.clips[j]; }
        }
    }
    return null;
}

function _sourceSize(projectItem) {
    var w = 0, h = 0;
    try {
        var pMeta = projectItem.getProjectMetadata() || '';
        var xMeta = projectItem.getXMPMetadata()     || '';

        var r1 = />(?:<!\[CDATA\[)?\s*(\d{3,4})\s*[xX]\s*(\d{3,4})\s*(?:\([^)]+\))?\s*(?:\]\]>)?</i;
        var m1 = pMeta.match(r1);
        if (m1) { w = parseInt(m1[1], 10); h = parseInt(m1[2], 10); }

        if (!w || !h) {
            var r2 = /(?:>|\[CDATA\[|\s)(\d{3,4})\s*[xX]\s*(\d{3,4})(?:<|\]\]>|\s|\()/i;
            var m2 = pMeta.match(r2);
            if (m2) { w = parseInt(m2[1], 10); h = parseInt(m2[2], 10); }
        }

        if (!w || !h) {
            var wm = xMeta.match(/<tiff:ImageWidth>(\d+)/i)      ||
                     xMeta.match(/<exif:PixelXDimension>(\d+)/i) ||
                     xMeta.match(/<stDim:w>(\d+)/i)               ||
                     xMeta.match(/stDim:w="(\d+)"/i);
            var hm = xMeta.match(/<tiff:ImageLength>(\d+)/i)     ||
                     xMeta.match(/<exif:PixelYDimension>(\d+)/i) ||
                     xMeta.match(/<stDim:h>(\d+)/i)               ||
                     xMeta.match(/stDim:h="(\d+)"/i);
            if (wm && hm) { w = parseInt(wm[1], 10); h = parseInt(hm[1], 10); }
        }
    } catch (e) {}
    return [w, h];
}

/**
 * クロップ検出: 以下の全ケースに対応
 *   1. 別コンポーネントの Crop エフェクト（Crop / クロップ / 切り抜き 等）
 *   2. Motion コンポーネントの組み込みクロップ（切り抜き (左端) 等）
 *   3. 4つの L/R/T/B スカラプロパティを持つ任意のコンポーネント
 */
function _detectCrop(clip) {
    var cropResult = null;

    try {
        for (var c = 0; c < clip.components.numItems; c++) {
            var comp = clip.components[c];
            var cdn  = comp.displayName || '';

            var L = NaN, R = NaN, T = NaN, B = NaN;
            var hitCount = 0;

            for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                var pdn  = prop.displayName || '';
                var v;

                try {
                    var raw = prop.getValue();
                    // getValue() は配列を返すこともあるのでスカラのみ
                    if (raw !== null && typeof raw !== 'object') {
                        v = parseFloat(raw);
                    }
                } catch (e) { continue; }

                if (typeof v !== 'number' || isNaN(v)) { continue; }

                // --- 左/Left 系 ---
                if (/^[Ll]eft$|^左$|^左端$/.test(pdn) ||
                    (/切り抜き|[Cc]rop/i.test(pdn) && /左|[Ll]eft/i.test(pdn))) {
                    L = v; hitCount++;
                }
                // --- 右/Right 系 ---
                else if (/^[Rr]ight$|^右$|^右端$/.test(pdn) ||
                         (/切り抜き|[Cc]rop/i.test(pdn) && /右|[Rr]ight/i.test(pdn))) {
                    R = v; hitCount++;
                }
                // --- 上/Top 系 ---
                else if (/^[Tt]op$|^上$|^上端$/.test(pdn) ||
                         (/切り抜き|[Cc]rop/i.test(pdn) && /上|[Tt]op/i.test(pdn))) {
                    T = v; hitCount++;
                }
                // --- 下/Bottom 系 ---
                else if (/^[Bb]ottom$|^下$|^下端$/.test(pdn) ||
                         (/切り抜き|[Cc]rop/i.test(pdn) && /下|[Bb]ottom/i.test(pdn))) {
                    B = v; hitCount++;
                }
            }

            // 4方向すべて揃っていてかつ非ゼロ値があるコンポーネントをCropとみなす
            // （Motionのクロップは切り抜き系プロパティ名なのでhitCount>=4になる）
            // 別コンポーネントのCropはコンポーネント名でも判別
            var isCropFxName = /[Cc]rop|クロップ|切り抜き/.test(cdn);
            var hasNonZero   = (L > 0 || R > 0 || T > 0 || B > 0);

            if (hitCount >= 2 && hasNonZero) {
                // 0-1 range (例: 0.36) → 0-100 に正規化
                var maxV = Math.max(
                    isNaN(L) ? 0 : L,
                    isNaN(R) ? 0 : R,
                    isNaN(T) ? 0 : T,
                    isNaN(B) ? 0 : B
                );
                var scale = (maxV > 0 && maxV <= 1) ? 100 : 1;

                var candidate = {
                    leftPct:   isNaN(L) ? 0 : L * scale,
                    rightPct:  isNaN(R) ? 0 : R * scale,
                    topPct:    isNaN(T) ? 0 : T * scale,
                    bottomPct: isNaN(B) ? 0 : B * scale
                };

                // 専用のCropコンポーネントを優先。Motionの組み込みクロップはfallback
                if (isCropFxName || cdn === 'Motion' || cdn === 'モーション') {
                    if (!cropResult || isCropFxName) {
                        cropResult = candidate;
                    }
                }
            }
        }
    } catch (e) {}

    return cropResult;
}

/**
 * マスク検出: 以下の順で試みる
 *   A. comp.properties[0..numItems-1] でマスク名/Pathサブプロパティを探す
 *   B. numItems の外側(+5)まで試みる（APIがマスクを別枠で持つ可能性）
 *   C. for...in で comp.properties の全キーを列挙する
 *   D. comp 自体に numMasks / getMask 等があれば使う
 */
function _detectMask(clip, sw, sh) {
    try {
        for (var c = 0; c < clip.components.numItems; c++) {
            var comp = clip.components[c];
            var numProps = 0;
            try { numProps = comp.properties.numItems; } catch (e) {}

            // ─ A: 通常ループ ───────────────────────────────────────
            for (var p = 0; p < numProps; p++) {
                var r = _testPropForMask(comp.properties[p], sw, sh);
                if (r) { return r; }
            }

            // ─ B: numItems 外を最大5個試す ─────────────────────────
            for (var extra = 0; extra < 5; extra++) {
                try {
                    var xp = comp.properties[numProps + extra];
                    if (!xp) { break; }
                    var r2 = _testPropForMask(xp, sw, sh);
                    if (r2) { return r2; }
                } catch (e2) { break; }
            }

            // ─ C: for...in で全キー列挙（数値キーのみ対象）──────────
            try {
                for (var key in comp.properties) {
                    var ki = parseInt(key, 10);
                    if (isNaN(ki) || ki < numProps) { continue; } // A/B で未カバーのものだけ
                    try {
                        var kp = comp.properties[ki];
                        var r3 = _testPropForMask(kp, sw, sh);
                        if (r3) { return r3; }
                    } catch (e3) {}
                }
            } catch (e3) {}

            // ─ D: comp.numMasks / comp.getMask API ─────────────────
            try {
                var nm = 0;
                if (typeof comp.numMasks === 'number') {
                    nm = comp.numMasks;
                } else if (typeof comp.getMaskCount === 'function') {
                    nm = comp.getMaskCount();
                }
                if (nm > 0) {
                    return { type: 'マスク (method-D)', bounds: null };
                }
            } catch (e4) {}
        }
    } catch (e) {}
    return null;
}

function _testPropForMask(prop, sw, sh) {
    if (!prop) { return null; }
    var pdn = '';
    try { pdn = prop.displayName || ''; } catch (e) {}

    var isMaskByName = /[Mm]ask|マスク|楕円形|長方形|フリーフォーム/.test(pdn);

    var numSub = 0;
    try { numSub = prop.numProperties || 0; } catch (e) {}

    // パスサブプロパティを持つ複合プロパティもマスクとみなす
    var hasPath = false;
    if (numSub > 0) {
        try {
            for (var sp = 0; sp < numSub; sp++) {
                var sub = prop.getPropertyByIndex(sp);
                if (/[Pp]ath|パス/.test(sub.displayName || '')) {
                    hasPath = true;
                    break;
                }
            }
        } catch (e2) {}
    }

    if (!isMaskByName && !hasPath) { return null; }

    var bounds = _maskBounds(prop, sw, sh, numSub);
    return { type: pdn || 'マスク', bounds: bounds };
}

function _maskBounds(maskProp, sw, sh, numSub) {
    try {
        if (!numSub) { return null; }

        for (var sp = 0; sp < numSub; sp++) {
            var subProp = maskProp.getPropertyByIndex(sp);
            if (!/[Pp]ath|パス/.test(subProp.displayName || '')) { continue; }

            var pts = null;
            try { pts = subProp.getValue(); } catch (e) { continue; }
            if (!pts || !pts.length) { continue; }

            var minX = Infinity, maxX = -Infinity;
            var minY = Infinity, maxY = -Infinity;

            for (var v = 0; v < pts.length; v++) {
                var pt = pts[v];
                if (!pt || pt.length < 2) { continue; }
                if (pt[0] < minX) { minX = pt[0]; }
                if (pt[0] > maxX) { maxX = pt[0]; }
                if (pt[1] < minY) { minY = pt[1]; }
                if (pt[1] > maxY) { maxY = pt[1]; }
            }

            if (minX === Infinity) { return null; }

            // マスク座標はソース中心原点 (px) → [0,1] 正規化
            return {
                left:   (minX + sw / 2) / sw,
                top:    (minY + sh / 2) / sh,
                right:  (maxX + sw / 2) / sw,
                bottom: (maxY + sh / 2) / sh
            };
        }
    } catch (e) {}
    return null;
}

function _intersect(a, b) {
    return {
        left:   Math.max(a.left,   b.left),
        top:    Math.max(a.top,    b.top),
        right:  Math.min(a.right,  b.right),
        bottom: Math.min(a.bottom, b.bottom)
    };
}

'Anchor_JSX_OK';
