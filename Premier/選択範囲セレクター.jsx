/*
 * 選択範囲セレクター（中心点基準・全自動版） for JSXLauncher
 * 選択中のクリップの「中心時間」が重なるクリップを、ロックされていない全トラックから一括選択します。
 * ダイアログ入力の手間を省き、1クリックで即実行されます。
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
    // 1. 基準クリップの「中心時間」と「情報」を記録
    // ==========================================
    var centerTimes = [];
    var originalClipsInfo = [];

    for (var i = 0; i < selectedClips.length; i++) {
        var clip = selectedClips[i];
        if (clip && clip.start && clip.end) {
            var startSec = clip.start.seconds;
            var endSec = clip.end.seconds;
            
            // 中心時間を計算して保存
            centerTimes.push((startSec + endSec) / 2);

            // 後で「元のクリップ」を再選択しないように情報を保存しておく
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
    // 2. トラックをスキャンして選択する処理
    // ==========================================
    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];

            // ★トラックがロック（鍵マーク）されている場合は無視する
            if (track.isLocked()) {
                continue;
            }

            var clips = track.clips;
            for (var c = 0; c < clips.numItems; c++) {
                var targetClip = clips[c];
                var tStart = targetClip.start.seconds;
                var tEnd = targetClip.end.seconds;
                var isMatch = false;

                // 基準クリップの「中心時間」が、ターゲットクリップの(開始〜終了)の範囲内に収まっているか
                for (var r = 0; r < centerTimes.length; r++) {
                    var center = centerTimes[r];
                    if (tStart <= center && tEnd >= center) {
                        isMatch = true;
                        break;
                    }
                }

                // 「基準にした元のクリップ自身」が再選択されるのを防ぐ処理
                var isOriginal = false;
                for (var o = 0; o < originalClipsInfo.length; o++) {
                    var orig = originalClipsInfo[o];
                    // 時間とクリップ名が完全に一致したら除外する
                    if (Math.abs(tStart - orig.start) < 0.001 && Math.abs(tEnd - orig.end) < 0.001 && targetClip.name === orig.name) {
                        isOriginal = true;
                        break;
                    }
                }

                // 条件に合致し、かつ元のクリップでなければ選択
                if (isMatch && !isOriginal) {
                    targetClip.setSelected(true, true);
                }
            }
        }
    }

    // ビデオとオーディオの両方をスキャンして実行
    processTracks(seq.videoTracks);
    processTracks(seq.audioTracks);

})();