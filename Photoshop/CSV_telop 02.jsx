(function() {
    var csvFile = File.openDialog("CSVファイルを選択してください (UTF-8推奨)");
    if (!csvFile) return;

    csvFile.open("r");
    var content = csvFile.read();
    csvFile.close();

    // CSV保存時の見えない文字（UTF-8のBOM）が先頭に付着している場合の除去
    content = content.replace(/^\uFEFF/, '');

    var lines = content.split(/\r\n|\r|\n/);
    var data = [];
    
    // 1行目から読み込む
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].length > 0) data.push(lines[i]);
    }

    var doc = app.activeDocument;
    var templateAb = doc.activeLayer;

    if (templateAb.typename !== "LayerSet") {
        alert("テンプレートのアートボードを選択してから実行してください。");
        return;
    }

    // 配置の設定（1920x1080のアートボードを想定）
    var marginX = 500;  // 横の間隔（列の間）
    var marginY = 300;  // 縦の間隔（行の間）
    var abWidth = 1920;
    var abHeight = 1080;
    var maxRows = 10;   // 10個で次の列へ

    // 複製と配置のループ
    for (var j = 0; j < data.length; j++) {
        var textValue = data[j].replace(/"/g, "");
        
        var newAb = templateAb.duplicate();
        newAb.name = (j + 1) + "_" + textValue;

        // グリッド計算
        var col = Math.floor(j / maxRows); // 何列目か
        var row = j % maxRows;             // 何行目か

        // 移動量の計算
        var offsetX = col * (abWidth + marginX);
        var offsetY = row * (abHeight + marginY);

        // アートボードを移動
        newAb.translate(offsetX, offsetY);

        // テキストレイヤーを探して中身を書き換え
        var textLayer = findTextLayer(newAb);
        if (textLayer) {
            textLayer.textItem.contents = textValue;
        }
    }

    // 【追加】すべての複製が終わった後、元のテンプレートアートボードを削除する
    templateAb.remove();

    // テキストレイヤーを再帰的に探す関数
    function findTextLayer(layerSet) {
        for (var k = 0; k < layerSet.layers.length; k++) {
            var child = layerSet.layers[k];
            if (child.kind === LayerKind.TEXT) {
                return child;
            } else if (child.typename === "LayerSet") {
                var found = findTextLayer(child);
                if (found) return found;
            }
        }
        return null;
    }

    alert("完了しました！");
})();