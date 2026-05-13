// アンカー - main.js

(function () {
    'use strict';

    var cs = new CSInterface();

    // ── State ─────────────────────────────────────────────────────────────────
    var state = {
        jsxReady:        false,
        clipLoaded:      false,
        clipInfo:        null,
        alphaBounds:     null,
        alphaAnalyzed:   false,
        maskBounds:      null,
        maskAnalyzed:    false,
        transforms:      [],      // [{index, displayName}]
        transformChecked: {}      // {componentIndex: bool}
    };

    // ── DOM ───────────────────────────────────────────────────────────────────
    var $hold             = document.getElementById('chk-hold');
    var $chkCrop          = document.getElementById('chk-crop');
    var $chkAlpha         = document.getElementById('chk-alpha');
    var $chkMask          = document.getElementById('chk-mask');
    var $refresh          = document.getElementById('btn-refresh');
    var $statusDot        = document.getElementById('status-dot');
    var $statusText       = document.getElementById('status-text');
    var $rowCrop          = document.getElementById('row-crop');
    var $rowAlpha         = document.getElementById('row-alpha');
    var $rowMask          = document.getElementById('row-mask');
    var $valCrop          = document.getElementById('val-crop');
    var $valAlpha         = document.getElementById('val-alpha');
    var $valMask          = document.getElementById('val-mask');
    var $canvas           = document.getElementById('alpha-canvas');
    var $img              = document.getElementById('alpha-img');
    var $transformSection = document.getElementById('transform-section');
    var $transformRows    = document.getElementById('transform-rows');

    // ── Status helpers ────────────────────────────────────────────────────────
    function setStatus(type, msg) {
        $statusDot.className    = 'status-dot ' + type;
        $statusText.textContent = msg;
    }

    function flash(btn) {
        btn.classList.add('flashing');
        setTimeout(function () { btn.classList.remove('flashing'); }, 280);
    }

    function setRow(rowEl, valEl, detected, valText, chkEl, enableChk) {
        rowEl.classList.toggle('detected', !!detected);
        valEl.textContent = valText || '—';
        if (chkEl) {
            chkEl.disabled = !enableChk;
            if (!enableChk) chkEl.checked = false;
        }
    }

    // ── Transform rows ────────────────────────────────────────────────────────
    function buildTransformRows(transforms) {
        $transformRows.innerHTML = '';
        state.transforms         = transforms || [];
        state.transformChecked   = {};

        if (!transforms || transforms.length === 0) {
            $transformSection.style.display = 'none';
            return;
        }

        $transformSection.style.display = 'block';

        transforms.forEach(function (t, i) {
            state.transformChecked[t.index] = false;

            var row = document.createElement('div');
            row.className = 'detect-row detected';

            var icon = document.createElement('span');
            icon.className   = 'detect-icon';
            icon.textContent = '⊞';

            var chkLabel = document.createElement('label');
            chkLabel.className = 'detect-chk-label';
            chkLabel.title     = 'このトランスフォームにアンカースナップを適用';

            var chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.id   = 'chk-tfx-' + t.index;
            (function (idx) {
                chk.addEventListener('change', function () {
                    state.transformChecked[idx] = this.checked;
                });
            }(t.index));

            var chkSm = document.createElement('span');
            chkSm.className = 'chk-sm';

            chkLabel.appendChild(chk);
            chkLabel.appendChild(chkSm);

            var lbl = document.createElement('span');
            lbl.className   = 'detect-label';
            lbl.textContent = 'T' + (i + 1);

            var val = document.createElement('span');
            val.className   = 'detect-val';
            val.textContent = t.displayName;

            row.appendChild(icon);
            row.appendChild(chkLabel);
            row.appendChild(lbl);
            row.appendChild(val);
            $transformRows.appendChild(row);
        });
    }

    function clearRows() {
        setRow($rowCrop,  $valCrop,  false, '—', $chkCrop,  false);
        setRow($rowAlpha, $valAlpha, false, '—', $chkAlpha, false);
        setRow($rowMask,  $valMask,  false, '—', $chkMask,  false);
        buildTransformRows([]);
        state.clipLoaded    = false;
        state.clipInfo      = null;
        state.alphaBounds   = null;
        state.alphaAnalyzed = false;
        state.maskBounds    = null;
        state.maskAnalyzed  = false;
        if ($maskManual) { $maskManual.style.display = 'none'; }
    }

    // ── JSX helpers ───────────────────────────────────────────────────────────
    function loadJSX(cb) {
        var extPath = cs.getSystemPath(SystemPath.EXTENSION);
        extPath = extPath.replace(/\\/g, '/');
        var jsxPath = extPath + '/jsx/hostscript.jsx';
        jsxPath = jsxPath.replace(/'/g, "\\'");
        cs.evalScript('$.evalFile("' + jsxPath + '")', function (res) {
            cb(res !== 'EvalScript error.');
        });
    }

    function callJSX(script, cb) {
        cs.evalScript(script, function (raw) {
            if (!raw || raw === 'EvalScript error.') {
                cb(null, 'EvalScript error');
                return;
            }
            try {
                cb(JSON.parse(raw), null);
            } catch (e) {
                cb(null, 'JSON parse error: ' + raw);
            }
        });
    }

    // ── Clip info ─────────────────────────────────────────────────────────────
    function loadClipInfo() {
        if (!state.jsxReady) return;
        setStatus('working', '読み込み中...');
        clearRows();

        callJSX('AS_getClipInfo()', function (res, err) {
            if (err || !res || !res.success) {
                setStatus('ready', res ? res.error : (err || 'エラー'));
                return;
            }

            state.clipLoaded = true;
            state.clipInfo   = res;

            // Crop
            if (res.crop) {
                var c = res.crop;
                var cropLabel = 'L' + Math.round(c.leftPct)  +
                                ' R' + Math.round(c.rightPct) +
                                ' T' + Math.round(c.topPct)   +
                                ' B' + Math.round(c.bottomPct);
                setRow($rowCrop, $valCrop, true, cropLabel, $chkCrop, true);
                $chkCrop.checked = true;
            }

            // Alpha
            if (res.supportsAlpha && res.mediaPath) {
                var fname = res.mediaPath.replace(/\\/g, '/').split('/').pop();
                setRow($rowAlpha, $valAlpha, true, fname, $chkAlpha, true);
            }

            // Mask
            setRow($rowMask, $valMask, false, '手動', $chkMask, true);

            // Transform effects
            buildTransformRows(res.transforms || []);

            setStatus('ok', res.name || 'クリップ読み込み完了');
        });
    }

    // ── Alpha analysis ────────────────────────────────────────────────────────
    function analyzeAlpha(cb) {
        callJSX('AS_getAlphaSourcePath()', function (res, err) {
            if (err || !res || !res.success) {
                cb(false, res ? res.error : err);
                return;
            }
            loadImageForAlpha(res.path, cb);
        });
    }

    function loadImageForAlpha(filePath, cb) {
        var url;
        if (typeof cep_node !== 'undefined') {
            try {
                var fs  = cep_node.require('fs');
                var buf = fs.readFileSync(filePath);
                url = URL.createObjectURL(new Blob([buf]));
            } catch (e) { /* fall through */ }
        }
        if (!url) {
            url = 'file:///' + filePath.replace(/\\/g, '/').replace(/ /g, '%20');
        }

        $img.onload = function () {
            var b = computeAlphaBounds($img);
            if (url.substr(0, 4) === 'blob') { URL.revokeObjectURL(url); }
            if (!b) {
                cb(false, 'アルファ領域が検出できませんでした', null);
                return;
            }
            cb(true, null, b);
        };

        $img.onerror = function () {
            if (url.substr(0, 4) === 'blob') { URL.revokeObjectURL(url); }
            cb(false, '画像読み込み失敗', null);
        };

        $img.src = url;
    }

    function computeAlphaBounds(img) {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (!w || !h) return null;

        $canvas.width  = w;
        $canvas.height = h;
        var ctx = $canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);

        var pixels    = ctx.getImageData(0, 0, w, h).data;
        var threshold = 10;
        var minX = w, minY = h, maxX = -1, maxY = -1;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                if (pixels[(y * w + x) * 4 + 3] > threshold) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < 0) return null;
        return { left: minX / w, top: minY / h, right: (maxX + 1) / w, bottom: (maxY + 1) / h };
    }

    // ── Alpha checkbox ────────────────────────────────────────────────────────
    $chkAlpha.addEventListener('change', function () {
        if (!$chkAlpha.checked) {
            state.alphaBounds   = null;
            state.alphaAnalyzed = false;
            if (state.clipInfo && state.clipInfo.mediaPath) {
                $valAlpha.textContent = state.clipInfo.mediaPath.replace(/\\/g, '/').split('/').pop();
            }
            return;
        }

        if (state.alphaAnalyzed && state.alphaBounds) return;

        setStatus('alpha', 'アルファ解析中...');
        analyzeAlpha(function (ok, errMsg, bounds) {
            if (!ok) {
                setStatus('error', errMsg || 'Alpha解析失敗');
                $chkAlpha.checked = false;
                return;
            }
            state.alphaBounds   = bounds;
            state.alphaAnalyzed = true;
            var b = bounds;
            $valAlpha.textContent =
                'L:' + Math.round(b.left * 100) + '% ' +
                'T:' + Math.round(b.top  * 100) + '%';
            setStatus('ok', 'Alpha解析完了');
        });
    });

    // ── Mask manual mode ─────────────────────────────────────────────────────
    var $maskManual = document.getElementById('mask-manual');
    var $mL = document.getElementById('mask-l');
    var $mR = document.getElementById('mask-r');
    var $mT = document.getElementById('mask-t');
    var $mB = document.getElementById('mask-b');
    var $mApply = document.getElementById('mask-apply');

    function enterMaskManualMode() {
        $maskManual.style.display = 'block';
        setStatus('ready', 'マスク範囲を手動で入力してください (0〜100%)');
    }

    function exitMaskManualMode() {
        $maskManual.style.display = 'none';
    }

    if ($mApply) {
        $mApply.addEventListener('click', function () {
            var L = parseFloat($mL.value) / 100 || 0;
            var R = 1 - (parseFloat($mR.value) / 100 || 0);
            var T = parseFloat($mT.value) / 100 || 0;
            var B = 1 - (parseFloat($mB.value) / 100 || 0);

            if (L >= R || T >= B) {
                setStatus('error', '範囲が無効です (L<R、T<B になるよう入力)');
                return;
            }

            state.maskBounds   = { left: L, top: T, right: R, bottom: B };
            state.maskAnalyzed = true;
            exitMaskManualMode();

            var b = state.maskBounds;
            setRow($rowMask, $valMask, true,
                'L:' + Math.round(b.left * 100) + '% ' +
                'T:' + Math.round(b.top  * 100) + '%',
                null, true);
            setStatus('ok', 'マスク範囲を設定しました');
        });
    }

    // ── Mask analysis ────────────────────────────────────────────────────────
    function seqToSourceBounds(sb, p) {
        var kx = p.seqW / (p.sw * p.scale / 100);
        var ky = p.seqH / (p.sh * p.scale / 100);
        return {
            left:   p.ax + (sb.left   - p.px) * kx,
            top:    p.ay + (sb.top    - p.py) * ky,
            right:  p.ax + (sb.right  - p.px) * kx,
            bottom: p.ay + (sb.bottom - p.py) * ky
        };
    }

    $chkMask.addEventListener('change', function () {
        if (!$chkMask.checked) {
            state.maskBounds   = null;
            state.maskAnalyzed = false;
            $rowMask.classList.remove('detected');
            $valMask.textContent = '手動';
            exitMaskManualMode();
            return;
        }

        if (state.maskAnalyzed && state.maskBounds) { return; }

        setStatus('working', 'マスク解析中...');
        callJSX('AS_exportMaskFrame()', function (res, err) {
            if (err || !res || !res.success) {
                if (res && res.manualMode) {
                    enterMaskManualMode();
                } else {
                    setStatus('error', (res && res.error) ? res.error : (err || 'フレームエクスポート失敗'));
                    $chkMask.checked = false;
                }
                return;
            }

            loadImageForAlpha(res.path, function (ok, errMsg, seqBounds) {
                if (!ok) {
                    enterMaskManualMode();
                    return;
                }

                var p = res.clipProps;
                var srcBounds = seqToSourceBounds(seqBounds, p);

                state.maskBounds   = srcBounds;
                state.maskAnalyzed = true;

                var b = srcBounds;
                setRow($rowMask, $valMask, true,
                    'L:' + Math.round(b.left * 100) + '% ' +
                    'T:' + Math.round(b.top  * 100) + '%',
                    null, true);
                setStatus('ok', 'マスク解析完了');
            });
        });
    });

    // ── Snap ─────────────────────────────────────────────────────────────────
    var POS_MAP = {
        7: [0.0, 0.0], 8: [0.5, 0.0], 9: [1.0, 0.0],
        4: [0.0, 0.5], 5: [0.5, 0.5], 6: [1.0, 0.5],
        1: [0.0, 1.0], 2: [0.5, 1.0], 3: [1.0, 1.0]
    };

    function doSnap(posNum) {
        if (!state.jsxReady) {
            setStatus('error', 'スクリプト未ロード – Premiereを再起動してください');
            return;
        }

        var mult  = POS_MAP[posNum];
        var xMult = mult[0];
        var yMult = mult[1];

        var holdPos  = $hold.checked ? 'true' : 'false';
        var useCrop  = (!$chkCrop.disabled && $chkCrop.checked) ? 'true' : 'false';
        var useAlpha = !$chkAlpha.disabled && $chkAlpha.checked && state.alphaAnalyzed;
        var useMask  = !$chkMask.disabled  && $chkMask.checked  && state.maskAnalyzed;

        var alphaBoundsJson = (useAlpha && state.alphaBounds)
            ? JSON.stringify(state.alphaBounds) : 'null';

        var maskBoundsJson = (useMask && state.maskBounds)
            ? JSON.stringify(state.maskBounds) : 'null';

        // 選択された Transform エフェクトのインデックス一覧
        var selectedTfx = [];
        state.transforms.forEach(function (t) {
            if (state.transformChecked[t.index]) { selectedTfx.push(t.index); }
        });
        var transformIndicesJson = JSON.stringify(selectedTfx);

        var script = 'AS_anchorSnap(' +
            JSON.stringify(String(xMult))       + ',' +
            JSON.stringify(String(yMult))       + ',' +
            JSON.stringify(holdPos)             + ',' +
            JSON.stringify(alphaBoundsJson)     + ',' +
            JSON.stringify(useCrop)             + ',' +
            JSON.stringify(maskBoundsJson)      + ',' +
            JSON.stringify(transformIndicesJson) + ')';

        setStatus('working', 'スナップ中...');
        callJSX(script, function (res, err) {
            if (err || !res) {
                setStatus('error', err || 'スクリプトエラー');
                return;
            }
            if (!res.success) {
                setStatus('error', res.error || 'エラー');
                return;
            }
            var msg = res.count + '件 完了';
            if (res.fallback) msg += '  ※サイズ推定';
            if (res.keyFrameWarning) msg += '  ⚠ 位置キーフレームは手動確認を';
            setStatus(res.keyFrameWarning ? 'ready' : 'ok', msg);
        });
    }

    // ── Events ────────────────────────────────────────────────────────────────
    document.querySelectorAll('.snap-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            flash(btn);
            doSnap(parseInt(btn.dataset.pos, 10));
        });
    });

    $refresh.addEventListener('click', function () {
        clearRows();
        loadClipInfo();
    });

    // ── Startup ───────────────────────────────────────────────────────────────
    setStatus('working', 'スクリプト読み込み中...');
    loadJSX(function (ok) {
        if (!ok) {
            setStatus('error', 'スクリプト読み込み失敗 – Premiereを再起動してください');
            return;
        }
        state.jsxReady = true;
        loadClipInfo();
    });

}());
