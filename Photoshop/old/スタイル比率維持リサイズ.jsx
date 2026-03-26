/*
ResizeWithStyles_v7.jsx
テキストサイズ（pt）を指定して、サイズとレイヤースタイル比率を同時に変更するスクリプト
（V7：pt差分から変形率を逆算し、スタイル維持変形を実行する完全版）
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

    // 1つ目のレイヤーを対象にする
    var targetLayer = selectedLayers[0];
    
    // テキストレイヤーの場合のみ「pt指定モード」へ
    if (targetLayer.kind == LayerKind.TEXT) {
        runSmartResize(doc, targetLayer);
    } else {
        // 画像などの場合は従来の％モード
        runPercentMode(doc, selectedLayers);
    }
}

// ---------------------------------------------------------
// スマートリサイズ（pt指定 → 比率計算 → スタイル維持変形）
// ---------------------------------------------------------
function runSmartResize(doc, layer) {
    var currentSize = 0;
    try {
        // 現在のフォントサイズを取得
        currentSize = layer.textItem.size.value;
    } catch(e) {
        alert("テキストサイズが正しく取得できませんでした。\n（サイズが混在している可能性があります）");
        return;
    }

    // 入力ダイアログ
    var inputSize = prompt("変更後のサイズ(pt)を入力してください\n現在のサイズ: " + currentSize + " pt", currentSize);
    
    if (inputSize == null) return;
    
    // 全角数字を半角へ
    inputSize = toHalfWidth(inputSize);
    var targetSize = parseFloat(inputSize);

    if (isNaN(targetSize)) {
        alert("数値を入力してください。");
        return;
    }
    if (targetSize === currentSize) return;

    // ★ここが核心：目標サイズになるための「変形率(%)」を計算する
    // 例：現在60pt → 目標30pt ＝ 50%の変形が必要
    var scalePercent = (targetSize / currentSize) * 100;

    try {
        doc.suspendHistory("サイズ指定リサイズ(V7)", "transformLayerWithStyles(doc, layer, scalePercent)");
    } catch(e) {
        alert("エラーが発生しました: " + e);
    }
}

// ---------------------------------------------------------
// 変形実行関数（スタイル維持ON）
// ---------------------------------------------------------
function transformLayerWithStyles(doc, layer, scalePercent) {
    // 強制的にアクティブにする（重要）
    doc.activeLayer = layer;
    
    // ロック解除
    if (layer.allLocked) layer.allLocked = false;
    if (layer.positionLocked) layer.positionLocked = false;

    try {
        // ActionManagerによる「変形(Transform)」コマンドの構築
        var desc = new ActionDescriptor();
        
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        desc.putReference(charIDToTypeID("null"), ref);

        var transformDesc = new ActionDescriptor();
        
        // 基準点：中心 (Qcs0)
        transformDesc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcs0"));
        
        // オフセットなし
        var offsetDesc = new ActionDescriptor();
        offsetDesc.putUnitDouble(charIDToTypeID("Hrzn"), charIDToTypeID("#Pxl"), 0.0);
        offsetDesc.putUnitDouble(charIDToTypeID("Vrtc"), charIDToTypeID("#Pxl"), 0.0);
        transformDesc.putObject(charIDToTypeID("Ofst"), charIDToTypeID("Ofst"), offsetDesc);

        // 幅・高さ（計算された％を指定）
        transformDesc.putUnitDouble(charIDToTypeID("Wdth"), charIDToTypeID("#Prc"), scalePercent);
        transformDesc.putUnitDouble(charIDToTypeID("Hght"), charIDToTypeID("#Prc"), scalePercent);

        // ★最重要：「スタイルを拡大・縮小」をONにする
        transformDesc.putBoolean(stringIDToTypeID("scaleStyles"), true);

        // 実行
        desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Trnf"), transformDesc);
        executeAction(charIDToTypeID("Trnf"), desc, DialogModes.NO);

    } catch (e) {
        alert("変形処理に失敗しました: " + e);
    }
}

// ---------------------------------------------------------
// ％指定モード（テキスト以外用）
// ---------------------------------------------------------
function runPercentMode(doc, layers) {
    var inputScale = prompt("拡大・縮小率（%）を入力してください", "100");
    if (inputScale == null) return;
    inputScale = toHalfWidth(inputScale);
    var scalePercent = parseFloat(inputScale);
    if (isNaN(scalePercent)) return;
    
    for (var i = 0; i < layers.length; i++) {
        transformLayerWithStyles(doc, layers[i], scalePercent);
    }
}

// ---------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------
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
        // 確実性のためアクティブレイヤーをリスト化
        selectedLayers = collectSelectedLayers(doc);
    } catch (e) {
        if (doc.activeLayer) selectedLayers.push(doc.activeLayer);
    }
    return selectedLayers;
}

function collectSelectedLayers(doc) {
    var layers = [];
    try {
        var ref = new ActionReference();
        ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("targetLayers"));
        ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var desc = executeAction(charIDToTypeID("getd"), ref, DialogModes.NO);
        if (desc.hasKey(stringIDToTypeID("targetLayers"))) {
            var list = desc.getList(stringIDToTypeID("targetLayers"));
            for (var i = 0; i < list.count; i++) {
                var index = list.getReference(i).getIndex();
                layers.push(getLayerByIndex(index));
            }
        } else {
            layers.push(doc.activeLayer);
        }
    } catch(e) {
        layers.push(doc.activeLayer);
    }
    return layers;
}

function getLayerByIndex(index) {
    var ref = new ActionReference();
    ref.putIndex(charIDToTypeID("Lyr "), index);
    var desc = executeAction(charIDToTypeID("getd"), ref, DialogModes.NO);
    var id = desc.getInteger(stringIDToTypeID("layerID"));
    return getLayerByID(app.activeDocument, id);
}

function getLayerByID(parent, id) {
    for (var i = 0; i < parent.layers.length; i++) {
        var layer = parent.layers[i];
        if (layer.id == id) return layer;
        if (layer.typename == "LayerSet") {
            var found = getLayerByID(layer, id);
            if (found) return found;
        }
    }
    return null;
}

function toHalfWidth(str) {
    return str.replace(/[０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

main();