/*
  アートボード番号検索＆全画面ズームスクリプト（真・最速版）
  ※DOM操作の速さを活かしつつ、第一階層のみを検索することでフリーズを完全に排除しました。
*/

#target photoshop
app.bringToFront();

function main() {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var doc = app.activeDocument;

    // --- ダイアログの作成 ---
    var win = new Window("dialog", "アートボード検索＆ズーム");
    win.alignChildren = "fill";

    var grpInput = win.add("group");
    grpInput.add("statictext", undefined, "表示する番号:");
    var inpNumber = grpInput.add("edittext", undefined, "");
    inpNumber.characters = 5;
    inpNumber.active = true; 

    var btnGrp = win.add("group");
    btnGrp.alignment = "center";
    var btnOk = btnGrp.add("button", undefined, "OK", {name: "ok"});
    btnGrp.add("button", undefined, "キャンセル", {name: "cancel"});

    win.defaultElement = btnOk;

    // OKボタンの処理
    btnOk.onClick = function() {
        var targetNum = inpNumber.text.replace(/\s+/g, ""); 
        if (targetNum === "") return;

        // 超高速なDOM検索（第一階層のみ）
        var targetLayer = findTargetLayerFast(doc, targetNum);

        if (targetLayer !== null) {
            win.close(); 
            // レイヤーを選択してズーム処理
            doc.activeLayer = targetLayer;
            fitArtboardToScreenAM();
        } else {
            alert("番号「" + targetNum + "」が見つかりませんでした。");
            inpNumber.active = true;
            inpNumber.selectAll();
        }
    };

    win.show();
}

// --------------------------------------------------------
// 超高速なDOM検索（アートボードの中身は探さないのでフリーズしない）
// --------------------------------------------------------
function findTargetLayerFast(doc, targetNum) {
    var suffix = "_" + targetNum; 
    var prefix = targetNum + "_"; 
    
    // doc.layers は第一階層（ルート）にあるレイヤー・アートボードのみのリスト
    var topLayers = doc.layers;

    for (var i = 0; i < topLayers.length; i++) {
        var lyr = topLayers[i];
        var name = lyr.name;

        // 名前が一致するかチェック
        if (name === targetNum || 
            name.slice(-suffix.length) === suffix ||
            name.substring(0, prefix.length) === prefix) {
            return lyr;
        }
    }
    return null; // 見つからなかった場合も、中身を探さないので一瞬でここに来る
}

// --------------------------------------------------------
// 選択中のアートボード単体を画面いっぱいに表示する（スパッと版）
// --------------------------------------------------------
function fitArtboardToScreenAM() {
    try {
        var descFit = new ActionDescriptor();
        var refFit = new ActionReference();
        refFit.putEnumerated(charIDToTypeID("Mn  "), charIDToTypeID("MnIt"), stringIDToTypeID("fitArtboardOnScreen"));
        descFit.putReference(charIDToTypeID("null"), refFit);
        executeAction(charIDToTypeID("slct"), descFit, DialogModes.NO);
    } catch (e) {
        // 万が一のための保険コマンド
        try {
            var descFit2 = new ActionDescriptor();
            var refFit2 = new ActionReference();
            refFit2.putEnumerated(charIDToTypeID("Mn  "), charIDToTypeID("MnIt"), stringIDToTypeID("fitLayerOnScreen"));
            descFit2.putReference(charIDToTypeID("null"), refFit2);
            executeAction(charIDToTypeID("slct"), descFit2, DialogModes.NO);
        } catch(e2) {}
    }
}

main();