/*
  アートボード番号検索＆全画面ズームスクリプト（極限スリム・スパッと版）
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

        var targetId = findTargetLayerIDAM(targetNum);

        if (targetId !== null) {
            win.close(); 
            selectAndFit(targetId);
        } else {
            alert("番号「" + targetNum + "」が見つかりませんでした。");
            inpNumber.active = true;
            inpNumber.selectAll();
        }
    };

    win.show();
}

// --------------------------------------------------------
// ActionManagerを使った爆速検索
// --------------------------------------------------------
function findTargetLayerIDAM(targetNum) {
    var suffix = "_" + targetNum; 
    var prefix = targetNum + "_"; 

    var refDoc = new ActionReference();
    refDoc.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var docDesc = executeActionGet(refDoc);
    var numLayers = docDesc.getInteger(stringIDToTypeID("numberOfLayers"));

    for (var i = numLayers; i > 0; i--) {
        try {
            var ref = new ActionReference();
            ref.putIndex(charIDToTypeID("Lyr "), i);
            var desc = executeActionGet(ref);
            
            var name = desc.getString(charIDToTypeID("Nm  "));
            
            if (name === targetNum || 
                name.slice(-suffix.length) === suffix ||
                name.substring(0, prefix.length) === prefix) {
                return desc.getInteger(stringIDToTypeID("layerID"));
            }
        } catch (e) {
            continue;
        }
    }
    return null; 
}

// --------------------------------------------------------
// レイヤー選択とズームを一度に行う（UI更新の無駄を削減）
// --------------------------------------------------------
function selectAndFit(id) {
    // 1. レイヤーを裏側で選択
    var descSelect = new ActionDescriptor();
    var refSelect = new ActionReference();
    refSelect.putIdentifier(charIDToTypeID("Lyr "), id);
    descSelect.putReference(charIDToTypeID("null"), refSelect);
    descSelect.putBoolean(charIDToTypeID("MkVs"), false);
    executeAction(charIDToTypeID("slct"), descSelect, DialogModes.NO);

    // 2. ズームコマンドを1発だけ叩く
    try {
        var descFit = new ActionDescriptor();
        var refFit = new ActionReference();
        refFit.putEnumerated(charIDToTypeID("Mn  "), charIDToTypeID("MnIt"), stringIDToTypeID("fitArtboardOnScreen"));
        descFit.putReference(charIDToTypeID("null"), refFit);
        executeAction(charIDToTypeID("slct"), descFit, DialogModes.NO);
    } catch (e) {
        // 万が一古いPhotoshop等でコマンド名が違う場合の保険
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