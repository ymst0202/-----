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

        // 2. ターゲット（アクティブ）なビデオトラックをすべて特定
        var videoTracks = seq.videoTracks;
        var targetedTracks = [];

        for (var i = 0; i < videoTracks.numTracks; i++) {
            if (videoTracks[i].isTargeted()) {
                var tName = videoTracks[i].name;
                // トラック名が手動で設定されていない（空欄の）場合は「V1」「V2」等の名前にする
                if (!tName || tName === "") {
                    tName = "V" + (i + 1); 
                }
                
                targetedTracks.push({
                    track: videoTracks[i],
                    name: tName
                });
            }
        }

        // ターゲットされているトラックがない場合
        if (targetedTracks.length === 0) {
            alert("ターゲット指定（V1, V2などのボタンがオン）されているビデオトラックが見つかりません。");
            return;
        }

        // 3. 保存先フォルダの指定（パス入力 or 選択ダイアログ）
        var saveFolder = null;
        var pathInput = prompt("保存先のフォルダパスを貼り付けてください。\n(Windowsのエクスプローラー等からコピーしたパス)\n\n※空欄のまま「OK」を押すと、通常のフォルダ選択画面が開きます。", "");

        if (pathInput === null) {
            // キャンセルされた場合は終了
            return; 
        } else if (pathInput !== "") {
            // パスが入力された場合
            saveFolder = new Folder(pathInput);
            
            // 指定されたパスのフォルダが存在しない場合の処理
            if (!saveFolder.exists) {
                var doCreate = confirm("指定されたフォルダが存在しません。新しく作成しますか？\n" + pathInput);
                if (doCreate) {
                    saveFolder.create();
                } else {
                    return; // 作成しない場合は終了
                }
            }
        } else {
            // 空欄の場合は通常のダイアログ
            saveFolder = Folder.selectDialog("CSVファイルを保存するフォルダを選択してください");
            if (!saveFolder) {
                return; // キャンセルされた場合は終了
            }
        }

        // CSVエスケープ用の関数
        function escapeCSV(str) {
            if (str === null || str === undefined) return '""';
            str = str.toString();
            if (str.search(/("|,|\n|\r)/g) >= 0) {
                str = '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }

        var savedFileNames = [];

        // 4. 各トラックごとにデータ抽出とファイル保存を実行
        for (var t = 0; t < targetedTracks.length; t++) {
            var currentTrack = targetedTracks[t].track;
            var currentTrackName = targetedTracks[t].name;
            
            // ファイル名に使えない文字を置換
            var safeTrackName = currentTrackName.replace(/[\\\/:*?"<>|]/g, "_");
            
            var csvData = [];
            var clips = currentTrack.clips;

            // クリップ名の抽出
            for (var i = 0; i < clips.numItems; i++) {
                var clipName = clips[i].name;
                csvData.push([clipName]);
            }

            // CSVテキストの構築
            var csvString = "";
            for (var i = 0; i < csvData.length; i++) {
                var row = csvData[i];
                for (var j = 0; j < row.length; j++) {
                    row[j] = escapeCSV(row[j]);
                }
                csvString += row.join(",") + "\n";
            }

            // ファイルの保存 (BOM付きUTF-8)
            var saveFile = new File(saveFolder.fsName + "/" + safeTrackName + ".csv");
            saveFile.encoding = "UTF-8";
            saveFile.open("w");
            saveFile.write("\uFEFF"); // BOM
            saveFile.write(csvString);
            saveFile.close();

            savedFileNames.push(safeTrackName + ".csv");
        }

        // 5. 完了通知
        alert(targetedTracks.length + "つのトラックを個別のCSVとして書き出しました。\n\n保存先:\n" + saveFolder.fsName + "\n\n書き出したファイル:\n" + savedFileNames.join("\n"));

    } catch (e) {
        alert("エラーが発生しました: " + e.message);
    }
})();