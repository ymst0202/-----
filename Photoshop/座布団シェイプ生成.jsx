/*
  テキストレイヤー用 座布団（シェイプ）生成スクリプト
  ※フォルダ選択対応＆複数レイヤー同時適用版
*/

#target photoshop
app.bringToFront();

function main() {
    // 1. ドキュメントの確認
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }
    
    var doc = app.activeDocument;

    // 2. 選択されている全レイヤー（またはフォルダ）を取得
    var selectedLayers = getSelectedLayersDOM();
    var textLayers = [];

    // 3. 選択されたレイヤー群の中からテキストレイヤーを抽出（フォルダの中身も自動チェック）
    for (var i = 0; i < selectedLayers.length; i++) {
        extractTextLayers(selectedLayers[i], textLayers);
    }

    // 重複排除（フォルダとその中のレイヤーを両方選択していた場合などの保険）
    var uniqueTextLayers = [];
    for (var i = 0; i < textLayers.length; i++) {
        var isDuplicate = false;
        for (var j = 0; j < uniqueTextLayers.length; j++) {
            if (textLayers[i] === uniqueTextLayers[j]) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) uniqueTextLayers.push(textLayers[i]);
    }
    textLayers = uniqueTextLayers;

    if (textLayers.length === 0) {
        alert("選択範囲（またはフォルダ内）にテキストレイヤーが含まれていません。\nテキストレイヤーか、テキストが入ったフォルダを選択して実行してください。");
        return;
    }

    // 4. ダイアログの作成（余白設定用）
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

    // 5. ダイアログの表示と処理
    if (win.show() === 1) {
        var pTop = parseFloat(inpTop.text) || 0;
        var pBottom = parseFloat(inpBottom.text) || 0;
        var pLeft = parseFloat(inpLeft.text) || 0;
        var pRight = parseFloat(inpRight.text) || 0;

        var originalRulerUnits = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // 6. 取得した全テキストレイヤーに対して順番に処理を実行
        for (var j = 0; j < textLayers.length; j++) {
            var targetLayer = textLayers[j];

            try {
                // 対象のテキストレイヤーをアクティブにする
                doc.activeLayer = targetLayer;
                
                var bounds;
                if (chkEffects.value) {
                    bounds = targetLayer.bounds;
                } else {
                    bounds = targetLayer.boundsNoEffects; 
                }

                // 位置座標を計算
                var left = bounds[0].value - pLeft;
                var top = bounds[1].value - pTop;
                var right = bounds[2].value + pRight;
                var bottom = bounds[3].value + pBottom;

                // シェイプの描画
                createShapeLayer(top, left, bottom, right);

                // 生成したシェイプの移動とリネーム
                var shapeLayer = doc.activeLayer;
                shapeLayer.name = "座布団_" + targetLayer.name;
                shapeLayer.move(targetLayer, ElementPlacement.PLACEAFTER);

            } catch(e) {
                continue;
            }
        }

        // 単位設定を元に戻す
        app.preferences.rulerUnits = originalRulerUnits;
        
        // 処理完了後、元のレイヤー群を選択状態に戻す
        restoreSelection(selectedLayers);
    }
}

// --- ユーティリティ関数群 ---

// フォルダ内のテキストレイヤーを再帰的に抽出する関数
function extractTextLayers(layer, arr) {
    if (layer.typename === "ArtLayer") {
        if (layer.kind === LayerKind.TEXT) {
            arr.push(layer);
        }
    } else if (layer.typename === "LayerSet") {
        // フォルダ（グループ）の場合は中身をループ
        for (var i = 0; i < layer.layers.length; i++) {
            extractTextLayers(layer.layers[i], arr);
        }
    }
}

// 選択中の全レイヤーをDOMオブジェクトとして取得
function getSelectedLayersDOM() {
    var domLayers = [];
    var doc = app.activeDocument;
    var ids = [];
    
    try {
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var desc = executeActionGet(ref);

        if (desc.hasKey(stringIDToTypeID('targetLayers'))) {
            var descList = desc.getList(stringIDToTypeID('targetLayers'));
            for (var i = 0; i < descList.count; i++) {
                try {
                    var idx = descList.getReference(i).getIndex();
                    var ref2 = new ActionReference();
                    ref2.putIndex(charIDToTypeID("Lyr "), idx);
                    var layerDesc = executeActionGet(ref2);
                    ids.push(layerDesc.getInteger(stringIDToTypeID("layerID")));
                } catch(e) {}
            }
        } else {
            var ref2 = new ActionReference();
            ref2.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            ids.push(executeActionGet(ref2).getInteger(stringIDToTypeID("layerID")));
        }
    } catch (e) {}

    for (var k = 0; k < ids.length; k++) {
        try {
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putIdentifier(charIDToTypeID("Lyr "), ids[k]);
            desc.putReference(charIDToTypeID("null"), ref);
            desc.putBoolean(charIDToTypeID("makeVisible"), false);
            executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
            domLayers.push(doc.activeLayer);
        } catch(e) {}
    }
    return domLayers;
}

// 処理後に元の選択状態を復元する関数
function restoreSelection(layersArray) {
    if (layersArray.length === 0) return;
    try {
        app.activeDocument.activeLayer = layersArray[0];
        for (var i = 1; i < layersArray.length; i++) {
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putName(charIDToTypeID("Lyr "), layersArray[i].name);
            desc.putReference(charIDToTypeID("null"), ref);
            desc.putEnumerated(stringIDToTypeID("selectionModifier"), stringIDToTypeID("selectionModifierType"), stringIDToTypeID("addToSelection"));
            desc.putBoolean(charIDToTypeID("makeVisible"), false);
            executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
        }
    } catch(e) {}
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