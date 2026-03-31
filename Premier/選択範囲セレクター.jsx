/*
 * 選択範囲セレクター（両端5%マージン・ダイナミック面判定版）
 * 基準クリップの長さを計算し、両端から「5%」だけ内側に狭めた範囲と
 * 重なっているクリップをアクティブトラックから選択します。
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスを開いてアクティブにしてください。");
        return;
    }

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) {
        alert("基準となるクリップを1つ以上選択してください。");
        return;
    }

    // ==========================================
    // 1. 基準クリップの「5%内側の範囲」を計算して記録
    // ==========================================
    var targetZones = [];
    var originalClipsInfo = [];

    for (var i = 0; i < selectedClips.length; i++) {
        var clip = selectedClips[i];
        if (clip && clip.start && clip.end) {
            var startSec = clip.start.seconds;
            var endSec = clip.end.seconds;
            
            // クリップの全体の長さを計算
            var duration = endSec - startSec;
            
            // ★全体の長さの「5%」を計算
            var margin = duration * 0.05;
            
            targetZones.push({
                zStart: startSec + margin, // 開始位置から5%内側へ
                zEnd: endSec - margin      // 終了位置から5%内側へ
            });
            
            originalClipsInfo.push({
                start: startSec,
                end: endSec,
                name: clip.name
            });
        }
    }

    // 元の選択を解除
    for (var i = 0; i < selectedClips.length; i++) {
        selectedClips[i].setSelected(false, false);
    }

    // ==========================================
    // 2. トラックをスキャンして選択
    // ==========================================
    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];

            if (!(track.isTargeted && track.isTargeted())) continue;
            if (track.isLocked()) continue;

            var clips = track.clips;
            for (var c = 0; c < clips.numItems; c++) {
                var targetClip = clips[c];
                var tStart = targetClip.start.seconds;
                var tEnd = targetClip.end.seconds;
                var isMatch = false;

                // ターゲットクリップが、両端5%を削った安全エリアに少しでも触れているか
                for (var r = 0; r < targetZones.length; r++) {
                    if (tStart < targetZones[r].zEnd && tEnd > targetZones[r].zStart) {
                        isMatch = true;
                        break;
                    }
                }

                // 元のクリップ除外
                var isOriginal = false;
                for (var o = 0; o < originalClipsInfo.length; o++) {
                    var orig = originalClipsInfo[o];
                    if (Math.abs(tStart - orig.start) < 0.001 && Math.abs(tEnd - orig.end) < 0.001 && targetClip.name === orig.name) {
                        isOriginal = true;
                        break;
                    }
                }

                if (isMatch && !isOriginal) {
                    targetClip.setSelected(true, true);
                }
            }
        }
    }

    processTracks(seq.videoTracks);
    processTracks(seq.audioTracks);

})();