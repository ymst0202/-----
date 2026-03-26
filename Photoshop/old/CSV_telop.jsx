(function() {
    var csvFile = File.openDialog("CSVファイルを選択してください (UTF-8推奨)");
    if (!csvFile) return;

    csvFile.open("r");
    var content = csvFile.read();
    csvFile.close();

    var lines = content.split(/\r\n|\r|\n/);
    var data = [];
    for (var i = 1; i < lines.length; i++) {
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

    for (var j = 0; j < data.length; j++) {
        var textValue = data[j].replace(/"/g, "");
        
        var newAb = templateAb.duplicate();
        newAb.name = (j + 1) + "_" + textValue;

        // グリッド計算
        var col = Math.floor(j / maxRows); // 何列目か
        var row = j % maxRows;             // 何行目か

        // 移動量の計算（j=0の時は 0,0 になるように設定）
        // duplicate直後はテンプレートと同じ位置にいるので、そこからの相対移動
        var offsetX = col * (abWidth + marginX);
        var offsetY = row * (abHeight + marginY);
        
        // 最初の1つ目は移動させず、2つ目以降を計算位置へ
        if (j > -1) { 
            newAb.translate(offsetX, offsetY);
        }

        // テキスト書き換え
        var found = false;
        for (var k = 0; k < newAb.layers.length; k++) {
            var lyr = newAb.layers[k];
            if (lyr.kind === LayerKind.TEXT) {
                lyr.textItem.contents = textValue;
                found = true;
                break; 
            }
        }
    }
    
    alert(data.length + "件のテロップを10個ずつの列で配置しました。");
})();