//########################
// TEXTを改行とバックスラッシュで分割
// 最適化版
//########################

main();

function main() {
    if (app.documents.length === 0) {
        alert("ドキュメントを開いてください");
        return;
    }

    if (app.selection.length === 0) {
        alert("テキストフレームを1つ以上選択してください");
        return;
    }

    // 高速化①：警告を出さないように設定
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    // 高速化②：プレビュー表示を切り替えて軽量化（アウトラインモード）
    app.executeMenuCommand('preview');

	var selection = app.selection;
    var selectedFrames = [];

    // テキストフレームのみ抽出
    for (var i = 0; i < selection.length; i++) {
        if (selection[i].typename === "TextFrame") {
            selectedFrames.push(selection[i]);
        }
    }

    if (selectedFrames.length === 0) {
        alert("テキストフレームが選択されていません");
        return;
    }

    // 各フレームを処理
    for (var i = 0; i < selectedFrames.length; i++) {
        processTextFrame(selectedFrames[i]);
        selectedFrames[i].remove();
    }

    // 高速化③：描画は最後に一度だけ実行
    app.redraw();

    // 後処理：元に戻す（任意）
    app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
	app.executeMenuCommand('preview');
}

function processTextFrame(textFrame) {
    var originalX = textFrame.position[0];
    var originalY = textFrame.position[1];
    var paragraphs = textFrame.paragraphs;

    for (var i = 0; i < paragraphs.length; i++) {
		try {
			var para = paragraphs[i];
			if (para.length === 0) continue;

			var fontSize = para.characters[0].size;
			var leading = para.leading || fontSize * 1.2;
			var lines = para.contents.split("\\");
			var totalCharsBefore = 0; // 累積文字数カウント
			
			for (var j = 0; j < lines.length; j++) {
				var text = lines[j];
				var newFrame = textFrame.duplicate(app.activeDocument.activeLayer);
                // 横にずらす距離（適宜調整可能）
                var offsetX = fontSize * .85 * totalCharsBefore;

				// 左寄せになる
                // newFrame.contents = text;
                // newFrame.position = [originalX + offsetX, originalY - (leading * i)];

				// 中央寄せになる
                newFrame.position = [originalX + offsetX, originalY - (leading * i)];
                newFrame.contents = text;

				newFrame.textRange.size = fontSize;

				// 幅を文字に合わせて調整（pointTextの場合はwidth調整不要）
				try {
					if (newFrame.kind === TextType.AREATEXT) {
						newFrame.textRange.size = fontSize;
						newFrame.fit(FitOptions.FRAME_TO_CONTENT);
					}
				} catch (e) {
					var msg = "リサイズエラー：" + e;
					alert(msg);
					$.writeln(msg);
				}

				// 累積文字数に今回のテキストの長さを加算
				totalCharsBefore += text.length;
			}
        } catch (e) {
			var contentPreview = textFrame.contents.substr(0, 20).replace(/\r|\n/g, " "); // エラー時用プレビュー
            var msg = "段落 " + i+1 + " でエラー発生\n" +
                      "元テキスト: \"" + contentPreview + "...\"\n" +
                      "エラー内容: " + e;
            alert(msg);
            $.writeln(msg);
            continue;
        }
    }
}
