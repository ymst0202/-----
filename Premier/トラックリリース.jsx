(function () {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            alert("アクティブなシーケンスが見つかりません。");
            return;
        }

        var i, track;

        for (i = 0; i < seq.videoTracks.numTracks; i++) {
            track = seq.videoTracks[i];
            if (track.setTargeted) track.setTargeted(false, true);
            track.setLocked(0);
        }

        for (i = 0; i < seq.audioTracks.numTracks; i++) {
            track = seq.audioTracks[i];
            if (track.setTargeted) track.setTargeted(false, true);
            track.setLocked(0);
        }

    } catch (e) {
        alert("エラーが発生しました（行 " + e.line + "）: " + e.message);
    }
})();
