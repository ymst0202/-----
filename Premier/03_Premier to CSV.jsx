#target premierepro

(function() {
    try {
        // 1. アクティブなシーケンスの取得
        var appProject = app.project;
        if (!appProject) {
            alert("プロジェクトが開かれていません。");
            return;
        }

        var seq = appProject.activeSequence;
        if (!seq) {
            alert("アクティブなシーケンスがありません。タイムラインを選択してから実行してください。");
            return;
        }

        // 2. ビデオトラックのリストを作成
        var videoTracks = seq.videoTracks;
        var numTracks = videoTracks.numTracks;
        
        if (numTracks === 0) {
            alert("ビデオトラックが存在しません。");
            return;
        }

        // 3. トラック選択ダイアログ
        var trackNamesStr = "テキストを書き出すビデオトラックの番号（1〜" + numTracks + "）を半角数字で入力してください:\n\n";
        for (var i = 0; i < numTracks; i++) {
            var trackName = videoTracks[i].name ? videoTracks[i].name : "ビデオトラック " + (i + 1);
            trackNamesStr += (i + 1) + ": " + trackName + "\n";
        }

        var userInput = prompt(trackNamesStr, "1");
        
        // キャンセルされた場合
        if (userInput === null) {
            return; 
        }

        var selectedTrackIndex = parseInt(userInput, 10) - 1;
        
        // 入力値のチェック
        if (isNaN(selectedTrackIndex) || selectedTrackIndex < 0 || selectedTrackIndex >= numTracks) {
            alert("無効な番号が入力されました。処理を中止します。");
            return;
        }

        // 4. 保存先ダイアログ
        var saveFile = File.saveDialog("CSVファイルの保存先を選択", "*.csv");
        if (!saveFile) {
            return; // キャンセルされた場合は終了
        }

        // 5. データ抽出処理（クリップ名のみ）
        var targetTrack = videoTracks[selectedTrackIndex];
        var clips = targetTrack.clips;
        
        // ヘッダー行（もし「クリップ名」という見出しも不要な場合は、この1行を var csvData = []; に変更してください）
        var csvData = [];

        // クリップをループして名前だけを取得
        for (var i = 0; i < clips.numItems; i++) {
            var clipName = clips[i].name;
            csvData.push([clipName]);
        }

        // 6. CSVフォーマットへの変換
        function escapeCSV(str) {
            if (str === null || str === undefined) return '""';
            str = str.toString();
            // カンマや改行が含まれる場合はダブルクォーテーションで囲む
            if (str.search(/("|,|\n|\r)/g) >= 0) {
                str = '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }

        var csvString = "";
        for (var i = 0; i < csvData.length; i++) {
            var row = csvData[i];
            for (var j = 0; j < row.length; j++) {
                row[j] = escapeCSV(row[j]);
            }
            csvString += row.join(",") + "\n";
        }

        // 7. ファイルの保存 (BOM付きUTF-8)
        saveFile.encoding = "UTF-8";
        saveFile.open("w");
        saveFile.write("\uFEFF"); // BOM
        saveFile.write(csvString);
        saveFile.close();

        alert("CSVの書き出しが完了しました。\n保存先: " + saveFile.fsName);

    } catch (e) {
        alert("エラーが発生しました: " + e.message);
    }
})();