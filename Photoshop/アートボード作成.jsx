/*
  アートボード（グループ）一括複製・整列スクリプト（ズレない爆速・完成版）
  ※ActionManager(Photoshop深層API)を使用し、正確な計算のまま処理速度を極限まで高めました。
*/

#target photoshop
app.bringToFront();

function main() {
    var originalDialogMode = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;

    var originalRulerUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    try {
        if (app.documents.length === 0) {
            alert("ドキュメントが開かれていません。");
            return;
        }

        var doc = app.activeDocument;
        var targetLayer = doc.activeLayer;

        if (!targetLayer) {
            alert("複製元となるアートボードを選択してください。");
            return;
        }

        var initialState = doc.activeHistoryState;

        // --- 設定ダイアログの作成 ---
        var win = new Window("dialog", "アートボード一括複製（爆速版）");
        win.alignChildren = "fill";

        var pnlCount = win.add("panel", undefined, "複製の数");
        pnlCount.orientation = "row";
        pnlCount.alignChildren = "center";
        pnlCount.add("statictext", undefined, "追加作成する数:");
        var inpCopies = pnlCount.add("edittext", undefined, "20"); 
        inpCopies.characters = 4;
        pnlCount.add("statictext", undefined, "個");

        var pnlLayout = win.add("panel", undefined, "配置レイアウト設定（縦並びベース）");
        pnlLayout.orientation = "column";
        pnlLayout.alignChildren = "left";

        var grpRows = pnlLayout.add("group");
        grpRows.add("statictext", undefined, "縦に並べる最大数:");
        var inpMaxRows = grpRows.add("edittext", undefined, "5"); 
        inpMaxRows.characters = 4;
        grpRows.add("statictext", undefined, "（この数を超えると横の列へ移動します）");

        var grpSpaceX = pnlLayout.add("group");
        grpSpaceX.add("statictext", undefined, "横方向の間隔 (px):");
        var inpSpaceX = grpSpaceX.add("edittext", undefined, "200"); 
        inpSpaceX.characters = 5;

        var grpSpaceY = pnlLayout.add("group");
        grpSpaceY.add("statictext", undefined, "縦方向の間隔 (px):");
        var inpSpaceY = grpSpaceY.add("edittext", undefined, "200"); 
        inpSpaceY.characters = 5;

        var btnGrp = win.add("group");
        btnGrp.alignment = "center";
        btnGrp.add("button", undefined, "OK", {name: "ok"});
        btnGrp.add("button", undefined, "キャンセル", {name: "cancel"});

        // ダイアログ表示
        if (win.show() !== 1) {
            app.preferences.rulerUnits = originalRulerUnits;
            app.displayDialogs = originalDialogMode;
            return;
        }

        // 入力値の取得
        var settings = {
            copies: parseInt(inpCopies.text, 10),
            maxRows: parseInt(inpMaxRows.text, 10),
            spaceX: parseFloat(inpSpaceX.text),
            spaceY: parseFloat(inpSpaceY.text)
        };

        if (isNaN(settings.copies) || settings.copies <= 0) {
            alert("作成する数は1以上の数値を入力してください。");
            return;
        }
        if (isNaN(settings.maxRows) || settings.maxRows <= 0) settings.maxRows = 5;
        if (isNaN(settings.spaceX)) settings.spaceX = 200;
        if (isNaN(settings.spaceY)) settings.spaceY = 200;

        // 本番処理をヒストリーにまとめる
        doc.suspendHistory("アートボード一括複製", "runDuplication(targetLayer, settings)");
        alert("完了しました！");

    } catch (e) {
        alert("エラーが発生しました: " + e);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
        app.displayDialogs = originalDialogMode;
    }
}

// --------------------------------------------------------
// アートボードの「本当のサイズ」を正確に取得する関数
// --------------------------------------------------------
function getRealDimensions(layer) {
    try {
        var ref = new ActionReference();
        ref.putIdentifier(charIDToTypeID("Lyr "), layer.id);
        var desc = executeActionGet(ref);
        
        if (desc.hasKey(stringIDToTypeID("artboard"))) {
            var abDesc = desc.getObjectValue(stringIDToTypeID("artboard"));
            var rect = abDesc.getObjectValue(stringIDToTypeID("artboardRect"));
            var w = rect.getDouble(stringIDToTypeID("right")) - rect.getDouble(stringIDToTypeID("left"));
            var h = rect.getDouble(stringIDToTypeID("bottom")) - rect.getDouble(stringIDToTypeID("top"));
            return { width: w, height: h };
        }
    } catch (e) {}

    var bounds = layer.bounds;
    return { width: bounds[2].value - bounds[0].value, height: bounds[3].value - bounds[1].value };
}

// --------------------------------------------------------
// ActionManager ヘルパー関数（PhotoshopのコアAPIを直接叩いて超高速化）
// --------------------------------------------------------

function selectLayerByID(id) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putIdentifier(charIDToTypeID("Lyr "), id);
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putBoolean(charIDToTypeID("MkVs"), false);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function duplicateLayerAM() {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putInteger(stringIDToTypeID("version"), 5);
    executeAction(charIDToTypeID("Dplc"), desc, DialogModes.NO);
}

function renameLayerAM(newName) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    var descName = new ActionDescriptor();
    descName.putString(charIDToTypeID("Nm  "), newName);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), descName);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function translateLayerAM(dx, dy) {
    if (dx === 0 && dy === 0) return;
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    var descOffset = new ActionDescriptor();
    descOffset.putUnitDouble(charIDToTypeID("Hrzn"), charIDToTypeID("#Pxl"), dx);
    descOffset.putUnitDouble(charIDToTypeID("Vrtc"), charIDToTypeID("#Pxl"), dy);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Ofst"), descOffset);
    executeAction(charIDToTypeID("move"), desc, DialogModes.NO);
}

function deleteLayerAM() {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("Dlt "), desc, DialogModes.NO);
}

// --------------------------------------------------------
// 複製と整列のコア処理（爆速版）
// --------------------------------------------------------
function runDuplication(targetLayer, settings) {
    // 誤作動のない正確なサイズを取得
    var dims = getRealDimensions(targetLayer);
    var layerWidth = dims.width;
    var layerHeight = dims.height;

    // テンプレートレイヤーのIDと名前を記憶しておく
    var targetId = targetLayer.id;
    var targetName = targetLayer.name;

    for (var i = 0; i < settings.copies; i++) {
        // 1. 元のテンプレートを選択
        selectLayerByID(targetId);

        // 2. 超高速複製（複製されたものが自動的にアクティブになる）
        duplicateLayerAM();

        // 3. 超高速リネーム
        renameLayerAM(targetName + "_" + (i + 1));

        // 4. 新しいグリッド内での列・行の計算
        var col = Math.floor(i / settings.maxRows); 
        var row = i % settings.maxRows;             

        // テンプレートからの移動量を計算
        var offsetX = col * (layerWidth + settings.spaceX);
        var offsetY = row * (layerHeight + settings.spaceY);

        // 5. 超高速移動
        translateLayerAM(offsetX, offsetY);
    }

    // 全て終わったら元のテンプレートを選択して超高速削除
    selectLayerByID(targetId);
    deleteLayerAM();
}

main();