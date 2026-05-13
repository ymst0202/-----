/*
 * 同名クリップ一括選択スクリプト（名前取得 厳密版） for JSXLauncher
 * 選択したクリップと「正確に同じ名前のクリップ」を、シーケンス全体から一括選択します。
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスを開いてアクティブにしてください。");
        return;
    }

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) {
        alert("基準となるクリップを1つ選択してください。");
        return;
    }

    // ==========================================
    // 1. ターゲットとなる正確な名前を取得する
    // ==========================================
    var targetClip = selectedClips[0];
    var targetName = targetClip.name;
    
    // タイムライン上の名前が空っぽの場合は、大元のプロジェクトアイテムの名前を取得
    if (!targetName && targetClip.projectItem) {
        targetName = targetClip.projectItem.name;
    }

    // それでも名前が取れない場合はエラーで止める（全選択の暴走防止）
    if (!targetName) {
        alert("クリップの名前を正確に取得できませんでした。");
        return;
    }

    // 元の選択状態をクリア
    for (var i = 0; i < selectedClips.length; i++) {
        selectedClips[i].setSelected(false, false);
    }

    // ==========================================
    // 2. 全トラックを走査して同じ名前のクリップを選択
    // ==========================================
    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            
            // ロックされているトラックは無視
            if (track.isLocked()) continue;

            var clips = track.clips;
            for (var c = 0; c < clips.numItems; c++) {
                var currentClip = clips[c];
                var currentName = currentClip.name;
                
                // 比較対象のクリップも同様に、空なら大元から名前を取得
                if (!currentName && currentClip.projectItem) {
                    currentName = currentClip.projectItem.name;
                }

                // 正確に名前が一致した場合のみ選択する
                if (currentName === targetName) {
                    currentClip.setSelected(true, true);
                }
            }
        }
    }

    processTracks(seq.videoTracks);
    processTracks(seq.audioTracks);

})();