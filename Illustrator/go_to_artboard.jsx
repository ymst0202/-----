var doc = app.activeDocument;

var input = prompt("アートボード名の番号を入力", "");
if (input !== null && input !== "") {
    input = input.replace(/^\s+|\s+$/g, "");
    var targetIndex = -1;
    var num = parseFloat(input);

    // 末尾の数字でアートボードを検索（例: "t 47" -> 47、"t 80.1" -> 80.1 で一致）
    if (!isNaN(num) && String(num) === input) {
        for (var i = 0; i < doc.artboards.length; i++) {
            var parts = doc.artboards[i].name.split(" ");
            if (parts[parts.length - 1] === String(num)) {
                targetIndex = i;
                break;
            }
        }
    }

    // 名前で完全一致検索
    if (targetIndex === -1) {
        for (var i = 0; i < doc.artboards.length; i++) {
            if (doc.artboards[i].name === input) {
                targetIndex = i;
                break;
            }
        }
    }

    if (targetIndex === -1) {
        alert("見つかりませんでした: " + input);
    } else {
        var view = doc.views[0];

        // setActiveArtboardIndex() を呼ぶ前に全情報を取得（座標系のずれを防ぐ）
        var rect = doc.artboards[targetIndex].artboardRect;
        var centerX = (rect[0] + rect[2]) / 2;
        var centerY = (rect[1] + rect[3]) / 2;
        var abW = rect[2] - rect[0];
        var abH = rect[1] - rect[3];

        var bounds = view.bounds;
        var viewW = Math.abs(bounds[2] - bounds[0]);
        var viewH = Math.abs(bounds[1] - bounds[3]);
        var currentZoom = view.zoom;

        // ダブルクリックと同様にアートボードをウィンドウにフィットするズームを計算
        var newZoom = Math.min(
            currentZoom * viewW / (abW * 1.1),
            currentZoom * viewH / (abH * 1.1)
        );
        newZoom = Math.max(0.02, Math.min(64, newZoom));

        // ズームと位置を移動
        view.zoom = newZoom;
        view.centerPoint = [centerX, centerY];

        // 1. まず対象のアートボードをアクティブにする（ここで指定しないと次の選択がずれる）
        doc.artboards.setActiveArtboardIndex(targetIndex);

        // 2. 移動先のアートボード上のオブジェクトを選択
        doc.selection = null;
        doc.selectObjectsOnActiveArtboard();

        // 3. 【修正箇所】オブジェクト選択によってIllustratorが勝手に別のアートボードをアクティブにしてしまうのを防ぐため、念押しでもう一度セット！
        doc.artboards.setActiveArtboardIndex(targetIndex);

        // パネルの表示を確実に更新させる
        app.redraw();
    }
}