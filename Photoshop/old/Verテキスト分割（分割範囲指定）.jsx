/*
ExtractText_v1.jsx
指定した文字列をテキストレイヤーから切り出すスクリプト
（マウス選択範囲は取得できないため、ダイアログで指定します）
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
        // 対象レイヤー（1つ目を対象とする）
        var targetLayer = selectedLayers[0];
        
        if (targetLayer.kind != LayerKind.TEXT) {
            alert("テキストレイヤーを選択してください。");
            return;
        }

        // 入力ダイアログを表示
        var fullText = targetLayer.textItem.contents;
        var inputString = prompt("分割（切り出し）したい文字列を入力してください\n\n元テキスト: " + fullText, "");

        if (!inputString) return; // キャンセルまたは空欄なら終了

        // 文字列が含まれているかチェック
        var matchIndex = fullText.indexOf(inputString);
        if (matchIndex === -1) {
            alert("指定された文字列「" + inputString + "」は見つかりませんでした。");
            return;
        }

        // ヒストリー記録
        doc.suspendHistory("指定文字の分割", "processSplit(doc, targetLayer, inputString, matchIndex)");

    } catch (e) {
        alert("エラーが発生しました: " + e + "\nライン: " + e.line);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
        app.preferences.typeUnits = originalTypeUnits;
    }
}

function processSplit(doc, sourceLayer, splitStr, index) {
    var fullText = sourceLayer.textItem.contents;
    
    // 文字列を3つのパーツに分ける
    // 1. 前半 (Prefix)
    // 2. 指定文字 (Target)
    // 3. 後半 (Suffix)
    
    var strPrefix = fullText.substring(0, index);
    var strTarget = splitStr;
    var strSuffix = fullText.substring(index + splitStr.length);

    // ---------------------------------------------------------
    // 1. 正確な位置基準の取得（インク基準）
    // ---------------------------------------------------------
    var refLayer = sourceLayer.duplicate();
    doc.activeLayer = refLayer;
    removeAllEffects(); 
    try { refLayer.rasterize(RasterizeType.ENTIRELAYER); } catch(e) {}
    var refBounds = refLayer.bounds; 
    var trueCenterX = (refBounds[0].value + refBounds[2].value) / 2;
    var trueCenterY = (refBounds[1].value + refBounds[3].value) / 2;
    refLayer.remove(); 

    // ---------------------------------------------------------
    // 2. 作業用ベースレイヤーの準備
    // ---------------------------------------------------------
    var workLayer = sourceLayer.duplicate();
    workLayer.name = "Work_Temp";
    try {
        if (workLayer.textItem.kind != TextType.POINTTEXT) {
            workLayer.textItem.kind = TextType.POINTTEXT;
        }
        workLayer.textItem.justification = Justification.LEFT;
    } catch(e) {}

    // グループ作成
    var group = doc.layerSets.add();
    group.name = sourceLayer.name + "_切り出し";

    // 幅計測用の定規レイヤー
    var rulerLayer = workLayer.duplicate();
    var baseLeftX = rulerLayer.bounds[0].value;

    // ---------------------------------------------------------
    // 3. パーツごとの生成と配置
    // ---------------------------------------------------------
    
    // パーツ情報の配列
    var parts = [
        { text: strPrefix, type: "prefix" },
        { text: strTarget, type: "target" },
        { text: strSuffix, type: "suffix" }
    ];

    // 全体の長さ文字数（計算用）
    var currentLength = 0;

    for (var i = 0; i < parts.length; i++) {
        var partText = parts[i].text;
        if (partText.length === 0) continue; // 空の部分は作らない

        // --- 位置計算 (V10ロジック: 逆算配置) ---
        // 配置すべき文字列全体（ここまでの累積）を作る
        // 例: Prefix配置時は "Prefix" の右端を見る
        // Target配置時は "PrefixTarget" の右端を見る
        
        var accumStr = strPrefix;
        if (parts[i].type == "target") accumStr += strTarget;
        if (parts[i].type == "suffix") accumStr += strTarget + strSuffix;
        
        // ターゲット位置の計算
        var targetLeft = baseLeftX;

        if (parts[i].type == "prefix") {
            // 前半はそのまま左端基準
            targetLeft = baseLeftX;
        } else {
            // TargetとSuffixは「累積文字列の右端」から「自分の幅」を引く
            
            // A. 累積文字列の右端を取得
            rulerLayer.textItem.contents = accumStr;
            var accumRight = rulerLayer.bounds[2].value;

            // B. 自分の幅を取得
            var tempMeasure = workLayer.duplicate();
            tempMeasure.textItem.contents = partText;
            var partWidth = tempMeasure.bounds[2].value - tempMeasure.bounds[0].value;
            tempMeasure.remove();

            // C. 逆算配置
            targetLeft = accumRight - partWidth;
        }

        // レイヤー作成
        var newLayer = workLayer.duplicate();
        newLayer.name = partText;
        newLayer.textItem.contents = partText;
        newLayer.move(group, ElementPlacement.INSIDE);

        // レイヤー名に注釈をつける（分かりやすくするため）
        if (parts[i].type == "target") {
            newLayer.name = "[選択] " + partText;
            // 選択した部分だけ色を変えるなどの処理をしたい場合はここに記述可能
            // newLayer.textItem.color = ...
        }

        // 移動
        var currentLeft = newLayer.bounds[0].value;
        newLayer.translate(targetLeft - currentLeft, 0);
    }

    rulerLayer.remove();
    workLayer.remove();

    // ---------------------------------------------------------
    // 4. 最終位置補正
    // ---------------------------------------------------------
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