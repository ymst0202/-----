/*
指定した文字列でアクティブなアートボードの名前を変更する
*/

app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

// ドキュメントとアートボード情報を取得
var doc = app.activeDocument;
var activeIndex = doc.artboards.getActiveArtboardIndex();
var currentName = doc.artboards[activeIndex].name;

// ScriptUIでダイアログを作成
var win = new Window("dialog", "アートボード名の変更");
win.orientation = "column";
win.alignChildren = ["fill", "top"];

// テキスト入力欄（初期値にアートボード名をセット）
var input = win.add("edittext", undefined, currentName);
input.characters = 30;
input.active = true;

// ボタン行
var buttonGroup = win.add("group");
buttonGroup.orientation = "row";
var okButton = buttonGroup.add("button", undefined, "OK");
var cancelButton = buttonGroup.add("button", undefined, "キャンセル");

// Enter / Escape キーをキャッチして処理（Illustrator本体に伝えない）
win.addEventListener("keydown", function (k) {
    if (k.keyName === "Enter") {
        okButton.notify();
        k.preventDefault();
    } else if (k.keyName === "Escape") {
        cancelButton.notify();
        k.preventDefault();
    }
});

// OKボタンでアートボード名を更新
okButton.onClick = function () {
    var inputText = input.text;

    if (inputText !== "") {
        var sanitizedText = inputText.replace(/[\/\\\:\*\?\"\<\>\|]/g, "_");
        doc.artboards[activeIndex].name = sanitizedText;
    }

    win.close();
};

// キャンセル処理
cancelButton.onClick = function () {
    win.close();
};

// ダイアログ表示
win.center();
win.show();

