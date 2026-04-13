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

        // 2. ターゲット（アクティブ）なビデオトラックを特定
        var videoTracks = seq.videoTracks;
        var targetTrack = null;

        // 上のトラックから順にチェックし、最初にターゲット指定されているものを採用
        for (var i = videoTracks.numTracks - 1; i >= 0; i--) {
            if (videoTracks[i].isTargeted()) {
                targetTrack = videoTracks[i];
                break;
            }
        }

        // ターゲットされているトラックがない場合は、一番下のトラック（V1）をデフォルトにするか警告
        if (!targetTrack) {
            alert("ターゲット指定（V1, V2などのボタンがオン）されているビデオトラックが見つかりません。");
            return;
        }

        // 3. トラック名を取得してファイル名を決定
        var trackName = targetTrack.name ? targetTrack.name : "Video Track";
        // ファイル名に使えない文字を置換（念のため）
        var safeTrackName = trackName.replace(/[\\\/:*?"<>|]/g, "_");

        // 4. 保存先ダイアログ（デフォルトファイル名をトラック名に設定）
        var saveFile = File.saveDialog("CSVファイルの保存先を選択", safeTrackName + ".csv");
        if (!saveFile) {
            return; // キャンセルされた場合は終了
        }

        // 5. データ抽出処理
        var clips = targetTrack.clips;
        var csvData = [];

        for (var i = 0; i < clips.numItems; i++) {
            var clipName = clips[i].name;
            csvData.push([clipName]);
        }

        // 6. CSVフォーマットへの変換
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

        alert("トラック「" + trackName + "」の書き出しが完了しました。\n保存先: " + saveFile.fsName);

    } catch (e) {
        alert("エラーが発生しました: " + e.message);
    }
})();