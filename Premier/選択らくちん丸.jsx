/*
 * Sync Selector風スクリプト（ラベルカラー・ターゲット版） for JSXLauncher
 * 選択中のクリップと同じ時間位置にある、指定した色のクリップを一括選択します。
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスを開いてアクティブにしてください。");
        return;
    }

    // ==========================================
    // 【設定】用途に合わせて数値を変更してください
    // ==========================================

    // 1. ターゲットとするラベルカラー（0-15の整数）
    // Premiere Proのデフォルトの色とインデックスは以下の通りです。
    // ※ ユーザー設定で色名を変更していても、インデックス（0-15）は固定です。
    // 0: バイオレット (Violet)
    // 1: アイリス (Iris)
    // 2: カリビアン (Caribbean)
    // 3: ラベンダー (Lavender)
    // 4: セルリアン (Cerulean)
    // 5: フォレスト (Forest)
    // 6: ローズ (Rose)
    // 7: マンゴー (Mango)
    // 8: パープル (Purple)
    // 9: ブルー (Blue)
    // 10: ティール (Teal)
    // 11: マゼンタ (Magenta)
    // 12: タン (Tan)
    // 13: グリーン (Green)
    // 14: イエロー (Yellow)
    // 15: オレンジ (Orange)
    var TARGET_COLOR_INDEX = 9; // デフォルト: ブルー

    // 2. マッチモード
    // 0 = 部分一致（少しでも時間が重なっているクリップを選択）
    // 1 = 前方一致（開始位置が同じクリップを選択）
    // 2 = 完全一致（選択範囲の開始・終了に完全に収まるクリップを選択）
    var MATCH_MODE = 0;

    // 3. 実行後に、基準とした元のクリップの選択を解除するか
    // true = 解除してターゲットだけを選択 / false = 解除せずに両方選択
    var DESELECT_ORIGINAL = true;

    // ==========================================

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) {
        alert("基準となるクリップを1つ以上選択してください。");
        return;
    }

    // 選択されたクリップの時間範囲を記録
    var timeRanges = [];
    for (var i = 0; i < selectedClips.length; i++) {
        var clip = selectedClips[i];
        if (clip && clip.start && clip.end) {
            timeRanges.push({
                start: clip.start.seconds,
                end: clip.end.seconds
            });
        }
    }

    // 元の選択を解除
    if (DESELECT_ORIGINAL) {
        for (var i = 0; i < selectedClips.length; i++) {
            selectedClips[i].setSelected(false, false);
        }
    }

    var epsilon = 0.005; // 誤差吸収用のフレームマージン（約0.005秒）

    // トラックを検索して選択する共通関数
    function processTracks(tracks) {
        // すべてのトラックを処理
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            var clips = track.clips;

            for (var c = 0; c < clips.numItems; c++) {
                var targetClip = clips[c];
                var tStart = targetClip.start.seconds;
                var tEnd = targetClip.end.seconds;

                // --- 色のチェック ---
                // クリップのラベルインデックス(0-15)を取得
                var clipColor = targetClip.color; 
                // 設定した色と一致しなければスキップ
                if (clipColor !== TARGET_COLOR_INDEX) {
                    continue;
                }
                // ------------------

                var isMatch = false;

                // --- 時間位置のチェック ---
                for (var r = 0; r < timeRanges.length; r++) {
                    var rStart = timeRanges[r].start;
                    var rEnd = timeRanges[r].end;

                    if (MATCH_MODE === 0) {
                        // 部分一致（時間的な重なり）
                        if (tStart < rEnd && tEnd > rStart) isMatch = true;
                    } else if (MATCH_MODE === 1) {
                        // 前方一致（開始位置がほぼ同じ）
                        if (Math.abs(tStart - rStart) < epsilon) isMatch = true;
                    } else if (MATCH_MODE === 2) {
                        // 完全一致（すっぽり収まる）
                        if (tStart >= rStart - epsilon && tEnd <= rEnd + epsilon) isMatch = true;
                    }
                }

                // 条件に合致したら選択する
                if (isMatch) {
                    targetClip.setSelected(true, true);
                }
            }
        }
    }

    // ビデオとオーディオそれぞれ処理を実行（すべてのトラックをスキャン）
    processTracks(seq.videoTracks);
    processTracks(seq.audioTracks);

})();