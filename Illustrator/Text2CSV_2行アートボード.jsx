/*
  Artboards With 2 Objects to CSV Exporter
  オブジェクトが2つ含まれるアートボードの名前をCSVに書き出す。
  selectObjectsOnActiveArtboard を使わず pageItems を一度だけ走査して高速化。
*/

(function() {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var doc = app.activeDocument;
    var artboards = doc.artboards;

    var fileObj = File.saveDialog("CSVファイルの保存先を指定してください", "*.csv");
    if (!fileObj) return;

    // アートボードごとのオブジェクト数カウント配列を初期化
    var counts = [];
    for (var i = 0; i < artboards.length; i++) {
        counts[i] = 0;
    }

    // 全pageItemsを一度だけ走査し、中心点がどのアートボードに属するか判定
    var items = doc.pageItems;
    for (var j = 0; j < items.length; j++) {
        try {
            var b = items[j].geometricBounds; // [left, top, right, bottom]
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;

            for (var i = 0; i < artboards.length; i++) {
                var ab = artboards[i].artboardRect; // [left, top, right, bottom]
                if (cx >= ab[0] && cx <= ab[2] && cy <= ab[1] && cy >= ab[3]) {
                    counts[i]++;
                    break; // 1つのアートボードに属したら次のオブジェクトへ
                }
            }
        } catch(e) {
            // 取得できないオブジェクトはスキップ
        }
    }

    // 該当アートボード名をCSV用配列に格納
    var csvContent = [];
    for (var i = 0; i < artboards.length; i++) {
        if (counts[i] === 2) {
            csvContent.push(formatForCSV(artboards[i].name));
        }
    }

    var success = writeCSV(fileObj, csvContent);

    if (success) {
        alert("書き出しが完了しました。\nオブジェクトが2つのアートボード数: " + csvContent.length + " / " + artboards.length);
    } else {
        alert("ファイルの書き込みに失敗しました。");
    }

    function formatForCSV(text) {
        if (!text || text === "") return '""';
        var temp = text.replace(/"/g, '""');
        return '"' + temp + '"';
    }

    function writeCSV(file, dataArray) {
        try {
            if (file.open("w")) {
                file.encoding = "UTF-8";
                for (var i = 0; i < dataArray.length; i++) {
                    file.writeln(dataArray[i]);
                }
                file.close();
                return true;
            } else {
                return false;
            }
        } catch(e) {
            alert(e);
            return false;
        }
    }

})();
