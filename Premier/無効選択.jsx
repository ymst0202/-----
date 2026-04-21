/*
 * アクティブ(ターゲット)トラックの無効化クリップ選択スクリプト for JSXLauncher
 * ターゲットになっているトラック上にある、有効化されていない(グレーアウトした)クリップを一括選択します。
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスを開いてアクティブにしてください。");
        return;
    }

    // まずは現在の選択状態をすべてクリア
    var selectedClips = seq.getSelection();
    for (var i = 0; i < selectedClips.length; i++) {
        selectedClips[i].setSelected(false, false);
    }

    // 選択されたクリップのカウント用
    var selectedCount = 0;

    // ==========================================\
    // トラックを走査して条件に合うクリップを選択
    // ==========================================\
    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            
            // 1. ロックされているトラックは無視
            if (track.isLocked()) continue;

            // 2. トラックがアクティブ（ターゲット）かどうかを判定
            // ※ バージョンによってプロパティかメソッドか異なるため両方チェック
            var isTrackTargeted = false;
            if (typeof track.isTargeted === "function") {
                isTrackTargeted = track.isTargeted();
            } else if (typeof track.isTargeted !== "undefined") {
                isTrackTargeted = track.isTargeted;
            } else {
                // APIにターゲット判定機能がないPremiereバージョンの場合、
                // 絞り込めないため全トラックを対象(true)として処理を進めます。
                isTrackTargeted = true; 
            }

            // ターゲットされていないトラックはスキップ
            if (!isTrackTargeted) continue;

            // 3. トラック内のクリップを走査
            var clips = track.clips;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                
                // 4. クリップが「無効(Disable)」になっているか判定
                // ※ Premiereのバージョンによって判定用のプロパティが異なります
                var isDisabled = false;
                
                if (typeof clip.disabled !== "undefined") {
                    isDisabled = clip.disabled; // 最新付近のバージョン
                } else if (typeof clip.enabled !== "undefined") {
                    isDisabled = !clip.enabled; // enabledの反転
                } else if (typeof clip.isMuted === "function") {
                    isDisabled = clip.isMuted(); // 古いバージョンの一部
                } else {
                    // どうしても判定できない場合はスキップ
                    continue;
                }

                // 無効なクリップであれば選択する
                if (isDisabled) {
                    clip.setSelected(true, true);
                    selectedCount++;
                }
            }
        }
    }

    // ビデオトラックとオーディオトラックの両方を処理
    if (seq.videoTracks) processTracks(seq.videoTracks);
    if (seq.audioTracks) processTracks(seq.audioTracks);

    // 結果の通知（不要であればコメントアウトしてください）
    if (selectedCount === 0) {
        // alert("該当する無効クリップは見つかりませんでした。");
    }

})();