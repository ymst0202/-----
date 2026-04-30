(function() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) { alert("アクティブなシーケンスが見つかりません"); return; }

        app.enableQE();
        var qeSeq = qe.project.getActiveSequence();
        if (!qeSeq) { alert("QEシーケンスが取得できません"); return; }

        var playhead = seq.getPlayerPosition();
        var ph = playhead.seconds;
        var timecode = qeSeq.CTI.timecode; // "HH:MM:SS:FF" 形式

        var cutCount = 0;

        // ビデオトラック：再生ヘッドをまたぐ選択クリップがあるトラックを切る
        for (var i = 0; i < seq.videoTracks.numTracks; i++) {
            var clips = seq.videoTracks[i].clips;
            for (var j = 0; j < clips.numItems; j++) {
                var c = clips[j];
                var selected = (c.isSelected && typeof c.isSelected === "function") ? c.isSelected() : c.isSelected;
                if (selected && c.start.seconds < ph && c.end.seconds > ph) {
                    qeSeq.getVideoTrackAt(i).razor(timecode);
                    cutCount++;
                    break;
                }
            }
        }

        // オーディオトラック
        for (var i = 0; i < seq.audioTracks.numTracks; i++) {
            var clips = seq.audioTracks[i].clips;
            for (var j = 0; j < clips.numItems; j++) {
                var c = clips[j];
                var selected = (c.isSelected && typeof c.isSelected === "function") ? c.isSelected() : c.isSelected;
                if (selected && c.start.seconds < ph && c.end.seconds > ph) {
                    qeSeq.getAudioTrackAt(i).razor(timecode);
                    cutCount++;
                    break;
                }
            }
        }

        if (cutCount === 0) {
            alert("再生ヘッドの位置に選択されたクリップがありません");
        }

    } catch (e) {
        alert("エラーが発生しました（行 " + e.line + "）: " + e.message);
    }
})();
