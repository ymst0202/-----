(function() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) { alert("アクティブなシーケンスが見つかりません"); return; }

        app.enableQE();
        var qeSeq = qe.project.getActiveSequence();
        if (!qeSeq) { alert("QEシーケンスが取得できません"); return; }

        var timecode = qeSeq.CTI.timecode;
        var cutCount = 0;

        for (var i = 0; i < seq.videoTracks.numTracks; i++) {
            if (seq.videoTracks[i].isTargeted && seq.videoTracks[i].isTargeted()) {
                qeSeq.getVideoTrackAt(i).razor(timecode);
                cutCount++;
            }
        }

        for (var i = 0; i < seq.audioTracks.numTracks; i++) {
            if (seq.audioTracks[i].isTargeted && seq.audioTracks[i].isTargeted()) {
                qeSeq.getAudioTrackAt(i).razor(timecode);
                cutCount++;
            }
        }

        if (cutCount === 0) {
            alert("アクティブなトラックがありません");
        }

    } catch (e) {
        alert("エラーが発生しました（行 " + e.line + "）: " + e.message);
    }
})();
