// ==========================================
// 選択範囲セレクター v2 – host.jsx
// ==========================================

function framesToSec(seq, frames) {
    var frameDuration = 1 / 30;
    try {
        var s = seq.getSettings();
        if (s && s.videoFrameRate && s.videoFrameRate.seconds > 0) {
            frameDuration = s.videoFrameRate.seconds;
        }
    } catch(e) {}
    return frames * frameDuration;
}

// followTargets=true → ターゲットトラックのみ / false → 全トラック
function shouldProcess(track, followTargets) {
    if (track.isLocked()) return false;
    if (!followTargets) return true;
    if (typeof track.isTargeted === "function") return track.isTargeted();
    if (typeof track.isTargeted !== "undefined") return !!track.isTargeted;
    return true;
}

function getDisabledState(clip) {
    if (typeof clip.disabled !== "undefined") return !!clip.disabled;
    if (typeof clip.enabled  !== "undefined") return !clip.enabled;
    if (typeof clip.isMuted  === "function")  return clip.isMuted();
    return null;
}

// ── 範囲選択（実行ボタン） ────────────────
// mode: 0=部分一致, 1=前方一致, 2=完全一致

function rangeSelector(followTargets, excludeOriginal, marginFrames, mode) {
    var seq = app.project.activeSequence;
    if (!seq) { alert("シーケンスを開いてアクティブにしてください。"); return; }

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) { alert("基準となるクリップを1つ以上選択してください。"); return; }

    var marginSec = framesToSec(seq, marginFrames || 0);

    var zones = [], originals = [];
    for (var i = 0; i < selectedClips.length; i++) {
        var clip = selectedClips[i];
        if (!clip || !clip.start || !clip.end) continue;
        var s = clip.start.seconds, e = clip.end.seconds;
        zones.push({ zStart: s - marginSec, zEnd: e + marginSec });
        originals.push({ start: s, end: e, name: clip.name });
    }
    if (zones.length === 0) return;

    if (excludeOriginal) {
        for (var i = 0; i < selectedClips.length; i++) selectedClips[i].setSelected(false, false);
    }

    function matchesZone(tS, tE, z) {
        switch (mode) {
            case 0: return tS < z.zEnd && tE > z.zStart;              // 部分一致
            case 1: return tS <= z.zStart && tE > z.zStart;           // 前方一致
            case 2: return tS >= z.zStart && tE <= z.zEnd;            // 完全一致
            default: return tS < z.zEnd && tE > z.zStart;
        }
    }

    function isOriginalClip(tS, tE, name) {
        for (var o = 0; o < originals.length; o++) {
            var orig = originals[o];
            if (Math.abs(tS - orig.start) < 0.001 && Math.abs(tE - orig.end) < 0.001 && name === orig.name) return true;
        }
        return false;
    }

    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            if (!shouldProcess(tracks[t], followTargets)) continue;
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var tc = clips[c];
                var tS = tc.start.seconds, tE = tc.end.seconds;
                var matched = false;
                for (var r = 0; r < zones.length; r++) {
                    if (matchesZone(tS, tE, zones[r])) { matched = true; break; }
                }
                if (!matched) continue;
                if (excludeOriginal && isOriginalClip(tS, tE, tc.name)) continue;
                tc.setSelected(true, true);
            }
        }
    }
    processTracks(seq.videoTracks);
    processTracks(seq.audioTracks);
}

// ── 同名全選択 ────────────────────────────

function selectSameName(followTargets, excludeOriginal, marginFrames, mode) {
    var seq = app.project.activeSequence;
    if (!seq) { alert("シーケンスを開いてアクティブにしてください。"); return; }

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) { alert("基準となるクリップを1つ選択してください。"); return; }

    var targetName = selectedClips[0].name || (selectedClips[0].projectItem ? selectedClips[0].projectItem.name : "");
    if (!targetName) { alert("クリップの名前を正確に取得できませんでした。"); return; }

    for (var i = 0; i < selectedClips.length; i++) selectedClips[i].setSelected(false, false);

    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            if (!shouldProcess(tracks[t], followTargets)) continue;
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                var name = clip.name || (clip.projectItem ? clip.projectItem.name : "");
                if (name === targetName) clip.setSelected(true, true);
            }
        }
    }
    processTracks(seq.videoTracks);
    processTracks(seq.audioTracks);
}

// ── 無効選択 ──────────────────────────────

function selectDisabled(followTargets, excludeOriginal, marginFrames, mode) {
    var seq = app.project.activeSequence;
    if (!seq) { alert("シーケンスを開いてアクティブにしてください。"); return; }

    var sel = seq.getSelection();
    for (var i = 0; i < sel.length; i++) sel[i].setSelected(false, false);

    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            if (!shouldProcess(tracks[t], followTargets)) continue;
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var disabled = getDisabledState(clips[c]);
                if (disabled === null) continue;
                if (disabled) clips[c].setSelected(true, true);
            }
        }
    }
    if (seq.videoTracks) processTracks(seq.videoTracks);
    if (seq.audioTracks) processTracks(seq.audioTracks);
}

// ── 有効選択 ──────────────────────────────

function selectEnabled(followTargets, excludeOriginal, marginFrames, mode) {
    var seq = app.project.activeSequence;
    if (!seq) { alert("シーケンスを開いてアクティブにしてください。"); return; }

    var sel = seq.getSelection();
    for (var i = 0; i < sel.length; i++) sel[i].setSelected(false, false);

    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            if (!shouldProcess(tracks[t], followTargets)) continue;
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                var disabled = getDisabledState(clips[c]);
                if (disabled === null) continue;
                if (!disabled) clips[c].setSelected(true, true);
            }
        }
    }
    if (seq.videoTracks) processTracks(seq.videoTracks);
    if (seq.audioTracks) processTracks(seq.audioTracks);
}
