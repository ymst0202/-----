/*
  テキストレイヤー用 座布団（シェイプ）生成スクリプト（単体・グループ両対応版）
*/

#target photoshop
app.bringToFront();

// 処理を1つのヒストリー（取り消し）にまとめるための変数
var ZABUTON_SETTINGS = {};

function main() {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }
    
    var doc = app.activeDocument;
    var activeLyr = doc.activeLayer;
    var textLayersToProcess = [];

    // 1. 選択されているレイヤーの種類を判定し、処理対象をリストアップする
    if (activeLyr.typename === "LayerSet") {
        // ▼ パターンA：グループ（フォルダ）が選択されている場合 ▼
        for (var i = 0; i < activeLyr.layers.length; i++) {
            var childLayer = activeLyr.layers[i];
            if (childLayer.kind === LayerKind.TEXT) {
                textLayersToProcess.push(childLayer);
            }
        }
    } else if (activeLyr.kind === LayerKind.TEXT) {
        // ▼ パターンB：テキストレイヤー単体が選択されている場合 ▼
        textLayersToProcess.push(activeLyr);
    } else {
        // どちらでもない（通常の画像レイヤー等が選ばれている）場合
        alert("テキストレイヤー、またはテキストを含むグループ（フォルダ）を選択してから実行してください。");
        return;
    }

    if (textLayersToProcess.length === 0) {
        alert("処理対象となるテキストレイヤーが見つかりませんでした。");
        return;
    }

    // 2. ダイアログの作成
    var win = new Window("dialog", "座布団の余白設定");
    win.alignChildren = "fill";

    var pnl = win.add("panel", undefined, "余白サイズ (px)");
    pnl.alignChildren = "right";

    var grpTop = pnl.add("group");
    grpTop.add("statictext", undefined, "上:");
    var inpTop = grpTop.add("edittext", undefined, "10");
    inpTop.characters = 5;

    var grpBottom = pnl.add("group");
    grpBottom.add("statictext", undefined, "下:");
    var inpBottom = grpBottom.add("edittext", undefined, "15");
    inpBottom.characters = 5;

    var grpLeft = pnl.add("group");
    grpLeft.add("statictext", undefined, "左:");
    var inpLeft = grpLeft.add("edittext", undefined, "30");
    inpLeft.characters = 5;

    var grpRight = pnl.add("group");
    grpRight.add("statictext", undefined, "右:");
    var inpRight = grpRight.add("edittext", undefined, "30");
    inpRight.characters = 5;

    var pnlOptions = win.add("panel", undefined, "オプション");
    pnlOptions.alignChildren = "left";
    var chkEffects = pnlOptions.add("checkbox", undefined, "レイヤースタイルの大きさを含める");
    chkEffects.value = true;

    var btnGrp = win.add("group");
    btnGrp.alignment = "center";
    btnGrp.add("button", undefined, "OK", {name: "ok"});
    btnGrp.add("button", undefined, "キャンセル", {name: "cancel"});

    // 3. 実行処理
    if (win.show() === 1) {
        // 設定値を保存
        ZABUTON_SETTINGS.pTop = parseFloat(inpTop.text) || 0;
        ZABUTON_SETTINGS.pBottom = parseFloat(inpBottom.text) || 0;
        ZABUTON_SETTINGS.pLeft = parseFloat(inpLeft.text) || 0;
        ZABUTON_SETTINGS.pRight = parseFloat(inpRight.text) || 0;
        ZABUTON_SETTINGS.chkEffects = chkEffects.value;
        ZABUTON_SETTINGS.targets = textLayersToProcess; // 判定で集めたテキストレイヤーの配列

        var originalRulerUnits = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // 単体でもグループでも、まとめて1つのヒストリー（取り消し）にする
        app.activeDocument.suspendHistory("座布団の生成", "processAllTargetLayers()");

        app.preferences.rulerUnits = originalRulerUnits;
    }
}

// 収集したテキストレイヤーをループ処理する関数
function processAllTargetLayers() {
    var doc = app.activeDocument;
    var targets = ZABUTON_SETTINGS.targets;

    for (var i = 0; i < targets.length; i++) {
        var targetLayer = targets[i];
        
        // 処理対象のレイヤーをアクティブにする
        doc.activeLayer = targetLayer;

        var bounds;
        try {
            if (ZABUTON_SETTINGS.chkEffects) {
                bounds = targetLayer.bounds;
            } else {
                bounds = targetLayer.boundsNoEffects; 
            }
        } catch(e) {
            bounds = targetLayer.bounds; 
        }

        var left = bounds[0].value - ZABUTON_SETTINGS.pLeft;
        var top = bounds[1].value - ZABUTON_SETTINGS.pTop;
        var right = bounds[2].value + ZABUTON_SETTINGS.pRight;
        var bottom = bounds[3].value + ZABUTON_SETTINGS.pBottom;

        // シェイプの描画
        createShapeLayer(top, left, bottom, right);

        // 生成したシェイプをテキストの下に移動
        var shapeLayer = doc.activeLayer;
        shapeLayer.name = "座布団_" + targetLayer.name;
        shapeLayer.move(targetLayer, ElementPlacement.PLACEAFTER);
    }
}

// 四角形のシェイプレイヤーを作成する関数
function createShapeLayer(top, left, bottom, right) {
    var doc = app.activeDocument;
    
    var lineArray = [];
    var corners = [[left, top], [right, top], [right, bottom], [left, bottom]];
    
    for (var i = 0; i < 4; i++) {
        lineArray[i] = new PathPointInfo;
        lineArray[i].kind = PointKind.CORNERPOINT;
        lineArray[i].anchor = corners[i];
        lineArray[i].leftDirection = corners[i];
        lineArray[i].rightDirection = corners[i];
    }

    var lineSubPathArray = new SubPathInfo();
    lineSubPathArray.closed = true;
    lineSubPathArray.operation = ShapeOperation.SHAPEADD;
    lineSubPathArray.entireSubPath = lineArray;

    var myPathItem = doc.pathItems.add("TempPath", [lineSubPathArray]);

    var desc1 = new ActionDescriptor();
    var ref1 = new ActionReference();
    ref1.putClass( stringIDToTypeID( "contentLayer" ) );
    desc1.putReference( charIDToTypeID( "null" ), ref1 );
    var desc2 = new ActionDescriptor();
    var desc3 = new ActionDescriptor();
    var desc4 = new ActionDescriptor();
    
    // 色指定（RGB 200,200,200）
    desc4.putDouble( charIDToTypeID( "Rd  " ), 200.0 ); 
    desc4.putDouble( charIDToTypeID( "Grn " ), 200.0 );
    desc4.putDouble( charIDToTypeID( "Bl  " ), 200.0 );
    desc3.putObject( charIDToTypeID( "Clr " ), charIDToTypeID( "RGBC" ), desc4 );
    desc2.putObject( charIDToTypeID( "Type" ), stringIDToTypeID( "solidColorLayer" ), desc3 );
    desc1.putObject( charIDToTypeID( "Usng" ), stringIDToTypeID( "contentLayer" ), desc2 );
    executeAction( charIDToTypeID( "Mk  " ), desc1, DialogModes.NO );

    myPathItem.remove();
}

// 実行
main();