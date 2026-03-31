/*
  テキストレイヤー用 座布団（シェイプ）生成スクリプト
*/

#target photoshop
app.bringToFront();

function main() {
    // 1. ドキュメントとレイヤーの確認
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }
    
    var doc = app.activeDocument;
    var targetLayer = doc.activeLayer;

    if (targetLayer.kind !== LayerKind.TEXT) {
        alert("テキストレイヤーを選択してから実行してください。");
        return;
    }

    // 2. ダイアログの作成（余白設定用）
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

    var btnGrp = win.add("group");
    btnGrp.alignment = "center";
    btnGrp.add("button", undefined, "OK", {name: "ok"});
    btnGrp.add("button", undefined, "キャンセル", {name: "cancel"});

    // 3. ダイアログの表示と処理
    if (win.show() === 1) {
        // 入力値の取得（数値に変換）
        var pTop = parseFloat(inpTop.text) || 0;
        var pBottom = parseFloat(inpBottom.text) || 0;
        var pLeft = parseFloat(inpLeft.text) || 0;
        var pRight = parseFloat(inpRight.text) || 0;

        // 単位設定を一時的にピクセルに変更
        var originalRulerUnits = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // テキストのサイズ（バウンディングボックス）を取得
        var bounds = targetLayer.bounds;
        var left = bounds[0].value - pLeft;
        var top = bounds[1].value - pTop;
        var right = bounds[2].value + pRight;
        var bottom = bounds[3].value + pBottom;

        // シェイプの描画
        createShapeLayer(top, left, bottom, right);

        // 生成したシェイプ（現在のアクティブレイヤー）をテキストの下に移動
        var shapeLayer = doc.activeLayer;
        shapeLayer.name = "座布団_" + targetLayer.name;
        shapeLayer.move(targetLayer, ElementPlacement.PLACEAFTER);

        // 単位設定を元に戻す
        app.preferences.rulerUnits = originalRulerUnits;
    }
}

// 四角形のシェイプレイヤーを作成する関数
function createShapeLayer(top, left, bottom, right) {
    var doc = app.activeDocument;
    
    // パスの頂点を定義
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

    // 一時的なパスを作成
    var myPathItem = doc.pathItems.add("TempPath", [lineSubPathArray]);

    // べた塗りレイヤー（シェイプレイヤー）を作成するActionManagerコード
    var desc1 = new ActionDescriptor();
    var ref1 = new ActionReference();
    ref1.putClass( stringIDToTypeID( "contentLayer" ) );
    desc1.putReference( charIDToTypeID( "null" ), ref1 );
    var desc2 = new ActionDescriptor();
    var desc3 = new ActionDescriptor();
    var desc4 = new ActionDescriptor();
    // デフォルトの座布団の色（ここではライトグレー：RGB 200,200,200）
    desc4.putDouble( charIDToTypeID( "Rd  " ), 200.0 ); 
    desc4.putDouble( charIDToTypeID( "Grn " ), 200.0 );
    desc4.putDouble( charIDToTypeID( "Bl  " ), 200.0 );
    desc3.putObject( charIDToTypeID( "Clr " ), charIDToTypeID( "RGBC" ), desc4 );
    desc2.putObject( charIDToTypeID( "Type" ), stringIDToTypeID( "solidColorLayer" ), desc3 );
    desc1.putObject( charIDToTypeID( "Usng" ), stringIDToTypeID( "contentLayer" ), desc2 );
    executeAction( charIDToTypeID( "Mk  " ), desc1, DialogModes.NO );

    // 一時的なパスを削除
    myPathItem.remove();
}

// 実行
main();