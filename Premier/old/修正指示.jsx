/*
  Premiere Pro Marker Import Script
  Source format: [00:00:00;00] - Comment OR 00:00:00;00 - Comment
*/

(function() {
    // 1. アクティブなシーケンスを取得
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("エラー: アクティブなシーケンスが見つかりません。\nシーケンスを開いてから実行してください。");
        return;
    }

    // 2. テキストファイルを選択
    var file = File.openDialog("マーカーリストのテキストファイルを選択してください (*.txt)");
    if (!file) return; // キャンセルされた場合

    // ファイル読み込み
    var encoding = "UTF-8"; // ファイルのエンコードに合わせて変更してください
    file.encoding = encoding;
    file.open("r");
    var content = file.read();
    file.close();

    // 行ごとに分割
    var lines = content.split(/\r\n|\r|\n/);

    // シーケンスのフレームレートを取得（タイムコード計算用）
    var fps = 29.97; // デフォルト
    if (seq.getSettings) {
        var settings = seq.getSettings();
        if (settings.videoFrameRate) {
            // Tickベースの計算からFPSを算出 (1秒 = 254016000000 ticks)
            fps = 1 / (settings.videoFrameDuration.seconds);
        }
    }

    var markerCount = 0;
    var markers = seq.markers;

    // 3. 各行を解析してマーカーを配置
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        
        // 正規表現: タイムコードとコメントを抽出
        // パターン: (任意の開始記号)(HH:MM:SS;FF)(任意の終了時間や記号) - (コメント)
        // 例1: [00:02:32;22 - 00:02:32;22] - コメント
        // 例2: 00:02:37;08 - コメント
        var regex = /(?:\[)?(\d{1,2}:\d{2}:\d{2}[;:]\d{2})(?:.*?)?\s*-\s*(.*)/;
        var match = line.match(regex);

        if (match) {
            var tcString = match[1]; // タイムコード (例: 00:02:32;22)
            var commentText = match[2]; // コメント本文

            // タイムコードを秒数に変換
            var timeInSeconds = parseTimecode(tcString, fps);

            // マーカーを作成
            var newMarker = markers.createMarker(timeInSeconds);
            newMarker.name = "Imported"; // マーカー名
            newMarker.comments = commentText; // コメント本文
            newMarker.duration = 0; // 必要に応じて長さを設定

            markerCount++;
        }
    }

    alert("完了: " + markerCount + " 個のマーカーを追加しました。");


    // --- ヘルパー関数: タイムコード文字列を秒数に変換 ---
    function parseTimecode(tc, frameRate) {
        // 区切り文字 (: または ;) で分割
        var parts = tc.split(/[:;]/);
        if (parts.length !== 4) return 0;

        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var s = parseInt(parts[2], 10);
        var f = parseInt(parts[3], 10);

        // 総秒数を計算
        var totalSeconds = (h * 3600) + (m * 60) + s + (f / frameRate);
        return totalSeconds;
    }

})();