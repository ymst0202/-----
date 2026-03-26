/*
MultiSplitText_v13.jsx
指定した区切り文字でテキストレイヤーを複数のパーツに分割するスクリプト
（V13：入力欄に元テキストをプリセット・スペース区切り対応版）
*/

#target photoshop

app.bringToFront();

function main() {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var doc = app.activeDocument;
    var selectedLayers = getSelectedLayers(doc);

    if (selectedLayers.length === 0) {
        alert("レイヤーが選択されていません。");
        return;
    }

    // 単位をピクセルに固定
    var originalRulerUnits = app.preferences.rulerUnits;
    var originalTypeUnits = app.preferences.typeUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;

    try {
        var targetLayer = selectedLayers[0];
        
        if (targetLayer.kind != LayerKind.TEXT) {
            alert("テキストレイヤーを選択してください。");
            return;
        }

        var fullText = targetLayer.textItem.contents;

        // --- 入力ダイアログ ---
        // 第2引数に fullText を指定し、最初から文字が入っている状態にします
        var inputString = prompt(
            "分割したい箇所に「、」または「スペース」を入れてください。\n" +
            "※文字を削除・変更するとエラーになる場合があります。\n\n" +
            "【操作例】\n" +
            "元：自分は大切な存在だった\n" +
            "↓\n" +
            "入：自分、は、大切、な、存在、だった",
            fullText // ← ここに元のテキストを初期値としてセット
        );

        if (!inputString) return; // キャンセル

        // 「、」「,」「スペース（全角・半角）」で分割して配列にする
        var segments = inputString.split(/[、, \u3000\t]+/);

        // 空の要素を除去
        var cleanSegments = [];
        for (var k = 0; k < segments.length; k++) {
            if (segments[k] && segments[k].length > 0) {
                cleanSegments.push(segments[k]);
            }
        }
        segments = cleanSegments;

        // --- 検証 ---
        var joinedCheck = segments.join("");
        if (joinedCheck.replace(/\s/g, "") !== fullText.replace(/\s/g, "")) {
            if (joinedCheck !== fullText) {
                var confirmContinue = confirm(
                    "警告：入力されたテキストが元の内容と完全には一致しません。\n" +
                    "（区切り文字以外の文字が変更されている可能性があります）\n\n" +
                    "元: " + fullText + "\n" +
                    "入: " + joinedCheck + "\n\n" +
                    "このまま処理を続行しますか？"
                );
                if (!confirmContinue) return;
            }
        }

        // 実行
        doc.suspendHistory("テキスト複数分割", "processMultiSplit(doc, targetLayer, segments)");

    } catch (e) {
        alert("エラーが発生しました: " + e + "\nライン: " + e.line);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
        app.preferences.typeUnits = originalTypeUnits;
    }
}

function processMultiSplit(doc, sourceLayer, segments) {
    // 1. 正確な基準位置（インク基準）の取得
    var refLayer = sourceLayer.duplicate();
    doc.activeLayer = refLayer;
    removeAllEffects(); 
    try { refLayer.rasterize(RasterizeType.ENTIRELAYER); } catch(e) {}
    var refBounds = refLayer.bounds; 
    var trueCenterX = (refBounds[0].value + refBounds[2].value) / 2;
    var trueCenterY = (refBounds[1].value + refBounds[3].value) / 2;
    refLayer.remove(); 

    // 2. 作業用ベースレイヤー
    var workLayer = sourceLayer.duplicate();
    workLayer.name = "Work_Temp";
    try {
        if (workLayer.textItem.kind != TextType.POINTTEXT) {
            workLayer.textItem.kind = TextType.POINTTEXT;
        }
        workLayer.textItem.justification = Justification.LEFT;
    } catch(e) {}

    var group = doc.layerSets.add();
    group.name = sourceLayer.name + "_分割";

    var rulerLayer = workLayer.duplicate();
    
    // 3. ループ処理
    var accumStr = "";

    for (var i = 0; i < segments.length; i++) {
        var partText = segments[i];
        
        // 累積テキスト更新
        accumStr += partText;

        // 位置計算
        rulerLayer.textItem.contents = accumStr;
        var accumRight = rulerLayer.bounds[2].value;

        var tempMeasure = workLayer.duplicate();
        tempMeasure.textItem.contents = partText;
        var partWidth = tempMeasure.bounds[2].value - tempMeasure.bounds[0].value;
        tempMeasure.remove();

        var targetLeft = accumRight - partWidth;

        // 生成
        var newLayer = workLayer.duplicate();
        newLayer.name = partText;
        newLayer.textItem.contents = partText;
        newLayer.move(group, ElementPlacement.INSIDE);

        var currentLeft = newLayer.bounds[0].value;
        newLayer.translate(targetLeft - currentLeft, 0);
    }

    rulerLayer.remove();
    workLayer.remove();

    // 4. 最終位置補正
    var tempGroup = group.duplicate();
    removeEffectsFromGroup(tempGroup);
    var mergedLayer = tempGroup.merge();
    var mBounds = mergedLayer.bounds;
    var currentCenterX = (mBounds[0].value + mBounds[2].value) / 2;
    var currentCenterY = (mBounds[1].value + mBounds[3].value) / 2;
    mergedLayer.remove();

    var offsetX = trueCenterX - currentCenterX;
    var offsetY = trueCenterY - currentCenterY;

    translateLayerSet(group, offsetX, offsetY);

    sourceLayer.visible = false;
}

// --- ユーティリティ ---
function removeAllEffects() {
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putEnumerated( charIDToTypeID( "Lyr " ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Trgt" ) );
        desc.putReference( charIDToTypeID( "null" ), ref );
        executeAction( stringIDToTypeID( "deleteAllLayerEffects" ), desc, DialogModes.NO );
    } catch(e) {}
}

function removeEffectsFromGroup(layerSet) {
    for (var i = 0; i < layerSet.layers.length; i++) {
        var layer = layerSet.layers[i];
        if (layer.typename == "ArtLayer") {
            app.activeDocument.activeLayer = layer;
            removeAllEffects();
        }
    }
}

function translateLayerSet(layerSet, dx, dy) {
    for (var i = 0; i < layerSet.layers.length; i++) {
        var layer = layerSet.layers[i];
        layer.translate(dx, dy);
    }
}

function getSelectedLayers(doc) {
    var selectedLayers = [];
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        desc.putReference(charIDToTypeID("null"), ref);
        var result = executeAction(charIDToTypeID("getd"), desc, DialogModes.NO);
        if (!result.hasKey(stringIDToTypeID("targetLayers"))) {
            return [doc.activeLayer];
        }
        var targetLayers = result.getList(stringIDToTypeID("targetLayers"));
        selectedLayers.push(doc.activeLayer); 
    } catch (e) {
        if (doc.activeLayer) selectedLayers.push(doc.activeLayer);
    }
    return selectedLayers;
}

main();