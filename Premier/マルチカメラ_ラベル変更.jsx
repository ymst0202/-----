/*
 * クリップ名別 自動色分けスクリプト for JSXLauncher
 * 選択したクリップの名前を読み取り、名前（カメラ）ごとに異なるラベルカラーを自動で割り当てます。
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスを開いてアクティブにしてください。");
        return;
    }

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) {
        alert("色分けしたいクリップをすべて選択してから実行してください。");
        return;
    }

    // ==========================================
    // 見分けやすいラベルカラーのリスト（Premiereのインデックス）
    // アイリス, カリビアン, セルリアン, フォレスト, ローズ, マンゴー...などを順番に使います
    // ==========================================
    var colors = [1, 2, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15];
    
    var nameColorMap = {};
    var colorCounter = 0;

    // 選択されたクリップを一つずつチェック
    for (var i = 0; i < selectedClips.length; i++) {
        var clip = selectedClips[i];
        
        // クリップが存在し、プロジェクトパネルの大元データ（projectItem）とリンクしているか
        if (clip && clip.name && clip.projectItem) {
            var clipName = clip.name;

            // 新しいカメラ名（クリップ名）を見つけたら、辞書に新しい色を登録する
            if (nameColorMap[clipName] === undefined) {
                // 用意した色リストから順番に割り当て（リストをループします）
                nameColorMap[clipName] = colors[colorCounter % colors.length];
                colorCounter++;
            }

            // クリップの大元（プロジェクトアイテム）のラベルカラーを変更する
            clip.projectItem.setColorLabel(nameColorMap[clipName]);
        }
    }

})();