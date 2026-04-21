/*
アクティブなアートボードをPNG形式で書き出すスクリプト
*/

// イラレの不具合？で、アートボードサイズが192ｘ108になってしまう。1920x1080のアートボードが350個あるドキュメントなので、それが原因かも？
// しょうがないので、720dpiにすることで10倍サイズにすることで対処。dpiは印刷時に使う項目（しかも印刷時に変更もできる）で、データに直接的な影響はない。
var resolution = 720;

// Illustratorに「再描画・アラート表示を抑えてね」という指示を出すことで、スクリプト中の軽微な処理を高速化します。
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

function showExportSuccessPopup(fileName, filePath) {
    var win = new Window("dialog", "書き出し完了");
    var fileNameText = win.add("statictext", undefined, "ファイル名：\n" + fileName + "\n\n" + "保存先：\n" + decodeURI(filePath), { multiline: true });
    var okButton = win.add("button", undefined, "OK", { name: "ok" });
    okButton.alignment = "center";
    win.show();
}

function exportActiveArtboardToPNG() {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var doc = app.activeDocument;
    var activeArtboardIndex = doc.artboards.getActiveArtboardIndex();
    var artboard = doc.artboards[activeArtboardIndex];

    // ファイル名
    var fileName = artboard.name + ".png";
    // 保存先のファイルパス
    var filePath = new File(doc.path + "/" + fileName);

    // PNG書き出しオプション
    var pngOpt = new ImageCaptureOptions();
    pngOpt.resolution = resolution;
    pngOpt.antiAliasing = true; // アンチエイリアス
    pngOpt.transparency = true; // 透過設定

    // 書き出す範囲を指定するためにアクティブなアートボードの大きさを取得
    var rect = artboard.artboardRect;

    // アートボードのサイズが1920x1080であるか確認
    // if (Math.abs(Math.round(rect[2] - rect[0]) - 1920) > 1 || Math.abs(Math.round(rect[1] - rect[3]) - 1080) > 1) {
    //     alert("アートボードのサイズが1920x1080ではありません。");
    //     return;
    // }
    // alert( "x: " + ( rect[2] - rect[0] ) + ", y: " + ( rect[1] - rect[3] ) );

    try {
        // 書き出しを実行
        doc.imageCapture(filePath, rect, pngOpt);

        // ファイルの存在確認
        if (filePath.exists) {
            showExportSuccessPopup(fileName, filePath);
        } else {
            alert("ファイルの書き出しに失敗しました。");
        }
    } catch (e) {
        alert("エラーが発生しました: " + e.toString());
    }
}

exportActiveArtboardToPNG();
app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;