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
        var trackNamesStr = "【実験的XML解析版】\nテキストを書き出すビデオトラックの番号（1〜" + numTracks + "）を半角数字で入力してください:\n\n";
        for (var i = 0; i < numTracks; i++) {
            var trackName = videoTracks[i].name ? videoTracks[i].name : "ビデオトラック " + (i + 1);
            trackNamesStr += (i + 1) + ": " + trackName + "\n";
        }

        var userInput = prompt(trackNamesStr, "1");
        if (userInput === null) return; 

        var selectedTrackIndex = parseInt(userInput, 10) - 1;
        if (isNaN(selectedTrackIndex) || selectedTrackIndex < 0 || selectedTrackIndex >= numTracks) {
            alert("無効な番号が入力されました。処理を中止します。");
            return;
        }

        // 4. 保存先ダイアログ
        var saveFile = File.saveDialog("CSVファイルの保存先を選択", "*.csv");
        if (!saveFile) return;

        // ==========================================
        // 5. 【ハック処理】裏でFCP XMLを書き出して解析
        // ==========================================
        
        // 一時ファイルのパスを作成
        var tempXML = new File(Folder.temp.fsName + "/temp_sequence_export.xml");
        
        // XMLをバックグラウンドで書き出し（1 = UI非表示）
        seq.exportAsFinalCutProXML(tempXML.fsName, 1);

        // XMLを読み込む
        if (!tempXML.exists) {
            alert("XMLの一時書き出しに失敗しました。");
            return;
        }
        tempXML.open("r");
        tempXML.encoding = "UTF-8";
        var xmlContent = tempXML.read();
        tempXML.close();

        var csvData = [];
        
        // <video>タグ内を抽出
        var videoBlockMatch = xmlContent.match(/<video>([\s\S]*?)<\/video>/);
        if (videoBlockMatch) {
            var videoBlock = videoBlockMatch[1];
            // トラックごとに分割（XMLの構造上、tracks[1]がV1になる）
            var tracks = videoBlock.split("<track>");
            var targetTrackData = tracks[selectedTrackIndex + 1];
            
            if (targetTrackData) {
                // クリップごとに分割
                var clips = targetTrackData.split("<clipitem");
                
                for (var i = 1; i < clips.length; i++) {
                    var clipStr = clips[i];
                    
                    // 基本のクリップ名を取得（ここで「グラフィック」になりがち）
                    var nameMatch = clipStr.match(/<name>([^<]*)<\/name>/);
                    var clipText = nameMatch ? nameMatch[1] : "";

                    // もし「グラフィック」だった場合、中身をさらに解析
                    if (clipText === "グラフィック" || clipText === "Graphic" || clipText === "") {
                        var bestText = clipText;
                        var maxLength = 0;
                        
                        // クリップ内のすべての <value> タグの中身を抽出
                        var valMatches = clipStr.match(/<value>([\s\S]*?)<\/value>/g);
                        if (valMatches) {
                            for (var j = 0; j < valMatches.length; j++) {
                                var valStr = valMatches[j].replace(/<\/?value>/g, "");
                                // XMLエスケープを解除
                                valStr = valStr.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#13;/g, "\n").replace(/&#10;/g, "\n");
                                var trimStr = valStr.replace(/^\s+|\s+$/g, ''); // トリム
                                
                                // 明らかにシステム設定値（数字、true/false等）であるものを除外
                                if (isNaN(trimStr) && trimStr !== "true" && trimStr !== "false" && trimStr !== "Normal" && trimStr !== "グラフィック" && trimStr !== "Graphic") {
                                    // ヒューリスティック：最も文字数が長いものをユーザーのテキスト（テロップ）と推測する
                                    if (trimStr.length > maxLength) {
                                        bestText = valStr;
                                        maxLength = trimStr.length;
                                    }
                                }
                            }
                        }
                        clipText = bestText; // 一番それっぽいテキストを採用
                    }
                    
                    if (clipText) {
                        csvData.push([clipText]);
                    }
                }
            }
        }

        // 用が済んだ一時XMLファイルをお掃除（削除）
        tempXML.remove();

        if (csvData.length === 0) {
            alert("指定したトラックからテキストを抽出できませんでした。\n※クリップが無いか、Premiereの仕様によりテキストが暗号化されている可能性があります。");
            return;
        }

        // ==========================================
        // 6. CSVフォーマットへの変換と保存
        // ==========================================
        function escapeCSV(str) {
            if (str === null || str === undefined) return '""';
            str = str.toString();
            if (str.search(/("|,|\n|\r)/g) >= 0) {
                str = '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }

        var csvString = "";
        for (var i = 0; i < csvData.length; i++) {
            var row = csvData[i];
            row[0] = escapeCSV(row[0]);
            csvString += row.join(",") + "\n";
        }

        saveFile.encoding = "UTF-8";
        saveFile.open("w");
        saveFile.write("\uFEFF"); // BOM
        saveFile.write(csvString);
        saveFile.close();

        alert("CSVの書き出しが完了しました！\n保存先: " + saveFile.fsName);

    } catch (e) {
        alert("エラーが発生しました: " + e.message);
    }
})();