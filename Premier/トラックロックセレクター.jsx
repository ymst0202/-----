(function() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            alert("アクティブなシーケンスが見つかりません。");
            return;
        }

        // 配列に値が含まれるかチェックする関数
        function contains(array, value) {
            for (var i = 0; i < array.length; i++) {
                if (array[i] === value) return true;
            }
            return false;
        }

        var videoTrackCount = seq.videoTracks.numTracks;
        var audioTrackCount = seq.audioTracks.numTracks;

        var targetedVideoTrackIndices = [];
        var targetedAudioTrackIndices = [];
        var hasAnyTarget = false;

        // 1. ビデオトラックを走査してターゲットがオンのトラックを特定
        for (var i = 0; i < videoTrackCount; i++) {
            var track = seq.videoTracks[i];
            // トラックのターゲット状態を確認
            if (track.isTargeted && track.isTargeted()) {
                targetedVideoTrackIndices.push(i);
                hasAnyTarget = true;
            }
        }

        // 2. オーディオトラックを走査してターゲットがオンのトラックを特定
        for (var i = 0; i < audioTrackCount; i++) {
            var track = seq.audioTracks[i];
            // トラックのターゲット状態を確認
            if (track.isTargeted && track.isTargeted()) {
                targetedAudioTrackIndices.push(i);
                hasAnyTarget = true;
            }
        }

        // 3. ターゲットチェック（一つもターゲットがオンになっていない場合）
        if (!hasAnyTarget) {
            alert("ターゲットがオンになっているトラックがありません。\nロック解除しておきたいトラックのターゲット（V1, A1など）をオンにしてから実行してください。");
            return;
        }

        // 4. トラックのロック状態を更新 (ビデオ)
        for (var i = 0; i < videoTrackCount; i++) {
            var track = seq.videoTracks[i];
            // ターゲットが含まれない場合はロック
            var shouldLock = !contains(targetedVideoTrackIndices, i);
            var lockParam = shouldLock ? 1 : 0; 
            track.setLocked(lockParam);
        }

        // 5. トラックのロック状態を更新 (オーディオ)
        for (var i = 0; i < audioTrackCount; i++) {
            var track = seq.audioTracks[i];
            // ターゲットが含まれない場合はロック
            var shouldLock = !contains(targetedAudioTrackIndices, i);
            var lockParam = shouldLock ? 1 : 0; 
            track.setLocked(lockParam);
        }
        
    } catch (e) {
        alert("エラーが発生しました（行 " + e.line + "）: " + e.message);
    }
})();