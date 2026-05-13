(function() {
    // 置き換える対象のマルチカメラシーケンス名を指定させる
    var targetName = prompt("プロジェクトパネルにある置き換え先の「マルチカメラシーケンス名」を正確に入力してください:", "");
    
    if (!targetName) {
        return; // キャンセルされた場合は終了
    }

    var proj = app.project;
    var targetItem = findProjectItem(proj.rootItem, targetName);

    if (!targetItem) {
        alert("エラー: 「" + targetName + "」という名前のアイテムがプロジェクト内に見つかりません。");
        return;
    }

    var seq = proj.activeSequence;
    if (!seq) {
        alert("エラー: タイムライン（シーケンス）がアクティブになっていません。");
        return;
    }

    var clipsToReplace = [];

    // 1. タイムライン上の「選択されているクリップ」の情報を収集
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
        var track = seq.videoTracks[i];
        for (var j = 0; j < track.clips.numItems; j++) {
            var clip = track.clips[j];
            if (clip.isSelected()) {
                clipsToReplace.push({
                    track: track,
                    clip: clip,
                    start: clip.start,
                    inPoint: clip.inPoint,
                    outPoint: clip.outPoint
                });
            }
        }
    }

    if (clipsToReplace.length === 0) {
        alert("エラー: タイムライン上で置き換えたいクリップを選択してください。");
        return;
    }

    // 2. 収集した情報をもとに、マルチカムシーケンスで上書きしていく
    var successCount = 0;
    for (var k = 0; k < clipsToReplace.length; k++) {
        var data = clipsToReplace[k];
        
        try {
            // プロジェクトアイテム（マルチカム）のイン点・アウト点を選択クリップと同じに設定
            // 254 は Ticks（Premiere内部の最小時間単位）を指定するフォーマットID
            targetItem.setInPoint(data.inPoint.ticks, 254);
            targetItem.setOutPoint(data.outPoint.ticks, 254);

            // 同じトラックの、同じ開始位置に上書き（実質的なリプレイス）
            data.track.overwriteClip(targetItem, data.start.ticks);
            successCount++;
        } catch (e) {
            // エラーをスキップ
        }
    }

    alert(successCount + " 個のクリップを「" + targetName + "」に置き換えました！");

    // プロジェクトアイテムを再帰的に検索するヘルパー関数
    function findProjectItem(root, name) {
        for (var i = 0; i < root.children.numItems; i++) {
            var item = root.children[i];
            if (item.name === name) {
                return item;
            }
            if (item.type === 2) { // 2 = Bin（フォルダ）
                var found = findProjectItem(item, name);
                if (found) return found;
            }
        }
        return null;
    }
})();