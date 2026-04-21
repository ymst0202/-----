/*
  Illustrator Text to CSV Exporter (Multi-text Merge / Clean & Uniq Version)
  アートボードごとにテキストを抽出し、CSVに保存する。
  機能:
  - Y座標順に結合
  - 空のテキスト/空行の削除
  - 重複テキストの削除
*/

(function() {
    // ドキュメントが開かれているか確認
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var doc = app.activeDocument;
    var artboards = doc.artboards;
    var csvContent = []; // CSVのデータを格納する配列

    // ユーザーに保存先を指定させる
    var fileObj = File.saveDialog("CSVファイルの保存先を指定してください", "*.csv");
    if (!fileObj) return; // キャンセルされた場合

    // 全アートボードをループ処理
    for (var i = 0; i < artboards.length; i++) {
        doc.artboards.setActiveArtboardIndex(i); // アートボードをアクティブにする
        doc.selection = null; // 選択を解除
        
        // アクティブなアートボード上のオブジェクトをすべて選択
        doc.selectObjectsOnActiveArtboard();
        
        var sel = doc.selection;
        var textFramesOnArtboard = [];

        // 選択アイテムからテキストフレームだけを配列に格納
        for (var j = 0; j < sel.length; j++) {
            if (sel[j].typename === "TextFrame") {
                textFramesOnArtboard.push(sel[j]);
            }
        }

        // Y座標（top）をもとに並べ替え（上から下へ）
        textFramesOnArtboard.sort(function(a, b) {
            var yDiff = b.top - a.top; 
            if (yDiff === 0) {
                return a.left - b.left;
            }
            return yDiff;
        });

        // テキストを処理・結合する
        var validTexts = []; // 有効なテキストを格納するリスト
        var seenTexts = {};  // 重複チェック用オブジェクト

        for (var k = 0; k < textFramesOnArtboard.length; k++) {
            var rawText = textFramesOnArtboard[k].contents;
            
            // 1. テキスト内の改行コードを統一し、空行を削除する処理
            // 改行コードを \n に統一
            var cleanText = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            
            // 連続する改行を1つにまとめる（テキストボックス内の空行詰め）
            cleanText = cleanText.replace(/\n+/g, "\n");
            
            // 前後の空白・改行を削除
            cleanText = trimString(cleanText);

            // 2. 空テキストならスキップ
            if (cleanText === "") {
                continue;
            }

            // 3. 重複チェック（既に同じテキストが登場していたらスキップ）
            // チェック用に一時キーを作成（一応区別のため）
            var checkKey = cleanText; 
            if (seenTexts[checkKey]) {
                continue; // 既出なので無視
            }

            // 有効なテキストとして登録
            validTexts.push(cleanText);
            seenTexts[checkKey] = true;
        }

        // 配列に入ったテキストを改行で結合
        var combinedText = validTexts.join("\n");

        // CSV用に整形して配列に追加
        csvContent.push(formatForCSV(combinedText));
    }

    // 選択状態を解除
    doc.selection = null;

    // ファイル書き込み処理
    var success = writeCSV(fileObj, csvContent);

    if (success) {
        alert("書き出しが完了しました。\nアートボード数: " + artboards.length + "\n出力行数: " + csvContent.length);
    } else {
        alert("ファイルの書き込みに失敗しました。");
    }

    // --- ヘルパー関数 ---

    // 文字列の前後の空白（改行含む）を削除する関数（古いJS環境互換）
    function trimString(str) {
        return str.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
    }

    // CSV用にテキストを整形する関数
    function formatForCSV(text) {
        if (!text || text === "") return '""';
        
        // データ内のダブルクォートを2重にする
        var temp = text.replace(/"/g, '""');
        
        // 全体をダブルクォートで囲む
        return '"' + temp + '"';
    }

    // ファイル書き込み関数
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