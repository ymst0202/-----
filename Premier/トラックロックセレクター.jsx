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

        var selectedVideoTrackIndices = [];
        var selectedAudioTrackIndices = [];
        var hasAnySelection = false;

        // 1. ビデオトラックを走査して選択クリップを特定
        for (var i = 0; i < videoTrackCount; i++) {
            var track = seq.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                if (track.clips[j].isSelected()) {
                    selectedVideoTrackIndices.push(i);
                    hasAnySelection = true;
                    break;
                }
            }
        }

        // 2. オーディオトラックを走査して選択クリップを特定
        for (var i = 0; i < audioTrackCount; i++) {
            var track = seq.audioTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                if (track.clips[j].isSelected()) {
                    selectedAudioTrackIndices.push(i);
                    hasAnySelection = true;
                    break;
                }
            }
        }

        // 3. 選択チェック
        if (!hasAnySelection) {
            alert("クリップが一つも選択されていません。\nロック解除しておきたいトラック上のクリップを選択してから実行してください。");
            return;
        }

        // 4. トラックのロック状態を更新 (ビデオ)
        for (var i = 0; i < videoTrackCount; i++) {
            var track = seq.videoTracks[i];
            // 選択クリップが含まれない場合はロック
            var shouldLock = !contains(selectedVideoTrackIndices, i);
            
            // 【修正ポイント】 true/false を 1(ロック) / 0(解除) の数値に変換
            var lockParam = shouldLock ? 1 : 0; 
            track.setLocked(lockParam);
        }

        // 5. トラックのロック状態を更新 (オーディオ)
        for (var i = 0; i < audioTrackCount; i++) {
            var track = seq.audioTracks[i];
            var shouldLock = !contains(selectedAudioTrackIndices, i);
            
            // 【修正ポイント】 true/false を 1/0 に変換
            var lockParam = shouldLock ? 1 : 0; 
            track.setLocked(lockParam);
        }
        
    } catch (e) {
        alert("エラーが発生しました（行 " + e.line + "）: " + e.message);
    }
})();