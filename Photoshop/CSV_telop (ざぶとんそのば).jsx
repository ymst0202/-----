/*
  単体テキスト用 座布団テロップ分割生成スクリプト
  （テキスト入力ダイアログ ＋ 強調・座布団スタイル ＋ ライブプレビュー）
*/

#target photoshop
app.bringToFront();

function main() {
    var originalDialogMode = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    
    var originalRulerUnits = app.preferences.rulerUnits;
    var originalTypeUnits = app.preferences.typeUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;

    try {
        if (app.documents.length === 0) {
            alert("ドキュメントが開かれていません。");
            return;
        }

        var doc = app.activeDocument;
        var targetTextLayer = doc.activeLayer;

        if (targetTextLayer.kind !== LayerKind.TEXT) {
            alert("テキストレイヤーを選択してから実行してください。");
            return;
        }

        var initialState = doc.activeHistoryState;
        var initialText = targetTextLayer.textItem.contents;

        // Photoshop内のスタイルリストを取得
        function getStylesList() {
            var styles = ["(スタイルを使用しない)"];
            try {
                var ref = new ActionReference();
                ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("presetManager"));
                ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
                var appDesc = executeActionGet(ref);
                var presetManager = appDesc.getList(stringIDToTypeID("presetManager"));
                var styleObj = presetManager.getObjectValue(3); 
                var nameList = styleObj.getList(charIDToTypeID("Nm  "));
                for (var i = 0; i < nameList.count; i++) {
                    styles.push(nameList.getString(i));
                }
            } catch (e) {}
            return styles;
        }
        var availableStyles = getStylesList();

        // --- 設定ダイアログの作成 ---
        var win = new Window("dialog", "座布団テロップ生成（単体レイヤー用）");
        win.alignChildren = "fill";

        // ★ 新規追加：テキスト編集パネル
        var pnlText = win.add("panel", undefined, "テキストの分割設定（ スラッシュ / で囲んだ部分が座布団になります ）");
        pnlText.orientation = "column";
        pnlText.alignChildren = "fill";
        var inpText = pnlText.add("edittext", undefined, initialText);
        inpText.characters = 40; // 幅を広めにする

        var pnlZabuton = win.add("panel", undefined, "座布団の余白設定");
        pnlZabuton.orientation = "row";
        pnlZabuton.add("statictext", undefined, "余白サイズ:");
        var inpPaddingPercent = pnlZabuton.add("edittext", undefined, "10"); 
        inpPaddingPercent.characters = 4;
        pnlZabuton.add("statictext", undefined, "% （テキストの高さ基準）");

        var pnlLayout = win.add("panel", undefined, "レイアウト設定");
        pnlLayout.orientation = "column";
        pnlLayout.alignChildren = "left";

        var grpGap = pnlLayout.add("group");
        grpGap.add("statictext", undefined, "文字と文字の間隔 (px):");
        var inpGap = grpGap.add("edittext", undefined, "0"); inpGap.characters = 4;

        var chkEffects = pnlLayout.add("checkbox", undefined, "レイヤースタイルの大きさを含める（シャドウ切れ防止）");
        chkEffects.value = true;

        // --- スタイル設定パネル ---
        var pnlStyle = win.add("panel", undefined, "デザイン・スタイル設定");
        pnlStyle.orientation = "column";
        pnlStyle.alignChildren = "left";
        
        var grpTextStyle = pnlStyle.add("group");
        grpTextStyle.add("statictext", undefined, "強調文字のスタイル:");
        var dropTextStyle = grpTextStyle.add("dropdownlist", undefined, availableStyles);
        dropTextStyle.selection = 0; 
        
        var grpZabutonStyle = pnlStyle.add("group");
        grpZabutonStyle.add("statictext", undefined, "座布団のスタイル　:");
        var dropZabutonStyle = grpZabutonStyle.add("dropdownlist", undefined, availableStyles);
        dropZabutonStyle.selection = 0; 
        
        var chkTransparent = pnlStyle.add("checkbox", undefined, "座布団スタイル適用時にベースの色を消す（塗り0%）");
        chkTransparent.value = true; 

        var grpColor = pnlStyle.add("group");
        grpColor.add("statictext", undefined, "座布団のベース色 (R,G,B):");
        var inpR = grpColor.add("edittext", undefined, "255"); inpR.characters = 3;
        var inpG = grpColor.add("edittext", undefined, "0"); inpG.characters = 3;
        var inpB = grpColor.add("edittext", undefined, "255"); inpB.characters = 3;

        var btnGrp = win.add("group");
        btnGrp.alignment = "center";
        btnGrp.add("button", undefined, "OK", {name: "ok"});
        btnGrp.add("button", undefined, "キャンセル", {name: "cancel"});

        function getSettings() {
            var selectedZabutonStyle = dropZabutonStyle.selection ? dropZabutonStyle.selection.text : "";
            if (selectedZabutonStyle === "(スタイルを使用しない)") selectedZabutonStyle = "";

            var selectedTextStyle = dropTextStyle.selection ? dropTextStyle.selection.text : "";
            if (selectedTextStyle === "(スタイルを使用しない)") selectedTextStyle = "";

            return {
                textValue: inpText.text,
                paddingPercent: parseFloat(inpPaddingPercent.text) || 0,
                gap: parseFloat(inpGap.text) || 0,
                useEffects: chkEffects.value,
                zabutonStyleName: selectedZabutonStyle, 
                textStyleName: selectedTextStyle, 
                transparentBase: chkTransparent.value, 
                color: [
                    parseFloat(inpR.text) || 0,
                    parseFloat(inpG.text) || 0,
                    parseFloat(inpB.text) || 0
                ]
            };
        }

        var parentLayerSet = targetTextLayer.parent;

        // ライブプレビュー実行
        function updatePreview() {
            try {
                doc.activeHistoryState = initialState;
                var currentTarget = doc.activeLayer; 
                if (currentTarget.kind !== LayerKind.TEXT) return;

                var origBounds = currentTarget.bounds;
                var origCenterX = origBounds[0].value + (origBounds[2].value - origBounds[0].value) / 2;
                
                var settings = getSettings();
                buildTextGroup(parentLayerSet, currentTarget, settings, origCenterX);
                
                app.refresh(); 
            } catch(e) {}
        }

        // 入力変更時のリスナー (onChangingでリアルタイム反映)
        inpText.onChanging = updatePreview; 
        inpPaddingPercent.onChanging = updatePreview;
        inpGap.onChanging = updatePreview;
        chkEffects.onClick = updatePreview;
        dropZabutonStyle.onChange = updatePreview; 
        dropTextStyle.onChange = updatePreview; 
        chkTransparent.onClick = updatePreview; 
        inpR.onChanging = updatePreview;
        inpG.onChanging = updatePreview;
        inpB.onChanging = updatePreview;

        win.onShow = function() { updatePreview(); };

        if (win.show() !== 1) {
            doc.activeHistoryState = initialState;
            app.preferences.rulerUnits = originalRulerUnits;
            app.preferences.typeUnits = originalTypeUnits;
            app.displayDialogs = originalDialogMode;
            return;
        }

        // --- 本番処理 ---
        var finalSettings = getSettings();
        doc.activeHistoryState = initialState; 
        doc.suspendHistory("座布団テロップ生成", "runProcess(doc, finalSettings)");

    } catch (e) {
        alert("エラーが発生しました: " + e);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
        app.preferences.typeUnits = originalTypeUnits;
        app.displayDialogs = originalDialogMode;
    }
}

function runProcess(doc, settings) {
    var targetLayer = doc.activeLayer;
    var origBounds = targetLayer.bounds;
    var origCenterX = origBounds[0].value + (origBounds[2].value - origBounds[0].value) / 2;
    var parentLayerSet = targetLayer.parent;

    buildTextGroup(parentLayerSet, targetLayer, settings, origCenterX);
}

function buildTextGroup(parentObj, targetTextLayer, settings, origCenterX) {
    var textValue = settings.textValue;

    if (textValue.indexOf("/") === -1) {
        targetTextLayer.textItem.contents = textValue;
        return;
    }

    var parts = textValue.split("/");
    var group = parentObj.layerSets.add();
    var cleanName = textValue.replace(/\//g, "");
    group.name = "座布団_" + (cleanName.length > 15 ? cleanName.substring(0, 15) : cleanName);

    var partsData = [];
    var totalWidth = 0;

    for (var i = 0; i < parts.length; i++) {
        var partText = parts[i];
        if (!partText || partText.length === 0) continue;

        var isZabuton = (i % 2 !== 0);

        var tempMeasureLayer = targetTextLayer.duplicate();
        tempMeasureLayer.textItem.contents = partText;
        try { tempMeasureLayer.textItem.justification = Justification.LEFT; } catch(e) {}

        if (isZabuton && settings.textStyleName !== "") {
            try { tempMeasureLayer.applyStyle(settings.textStyleName); } catch(e) {}
        }
        
        var bounds = settings.useEffects ? tempMeasureLayer.bounds : tempMeasureLayer.boundsNoEffects;
        var tLeft = bounds[0].value;
        var tTop = bounds[1].value;
        var tRight = bounds[2].value;
        var tBottom = bounds[3].value;
        
        var tWidth = tRight - tLeft;
        var tHeight = tBottom - tTop;

        var paddingPx = tHeight * (settings.paddingPercent / 100);
        var partTotalWidth = isZabuton ? (paddingPx + tWidth + paddingPx) : tWidth;

        partsData.push({
            text: partText,
            width: tWidth,
            tLeft: tLeft,
            top: tTop,
            bottom: tBottom,
            isZabuton: isZabuton,
            partTotalWidth: partTotalWidth,
            paddingPx: paddingPx
        });

        totalWidth += partTotalWidth;
        if (i < parts.length - 1) {
            totalWidth += settings.gap;
        }

        tempMeasureLayer.remove(); 
    }

    var startX = origCenterX - (totalWidth / 2);
    var currentX = startX;
    var textLayersToZabuton = [];

    for (var k = 0; k < partsData.length; k++) {
        var dataInfo = partsData[k];
        
        var newLayer = targetTextLayer.duplicate();
        newLayer.name = dataInfo.text;
        newLayer.textItem.contents = dataInfo.text;
        try { newLayer.textItem.justification = Justification.LEFT; } catch(e) {}
        newLayer.move(group, ElementPlacement.PLACEATEND);

        if (dataInfo.isZabuton && settings.textStyleName !== "") {
            try { newLayer.applyStyle(settings.textStyleName); } catch(e) {}
        }

        var targetTextLeft = dataInfo.isZabuton ? (currentX + dataInfo.paddingPx) : currentX;
        var translateX = targetTextLeft - dataInfo.tLeft;
        newLayer.translate(translateX, 0);

        if (dataInfo.isZabuton) {
            textLayersToZabuton.push({
                layer: newLayer,
                left: targetTextLeft,
                top: dataInfo.top,
                right: targetTextLeft + dataInfo.width,
                bottom: dataInfo.bottom,
                paddingPx: dataInfo.paddingPx
            });
        }

        currentX += dataInfo.partTotalWidth;
        if (k < partsData.length - 1) {
            currentX += settings.gap;
        }
    }

    targetTextLayer.remove();

    for (var m = 0; m < textLayersToZabuton.length; m++) {
        var z = textLayersToZabuton[m];
        createZabutonByMath(z.layer, z.left, z.top, z.right, z.bottom, z.paddingPx, settings);
    }
}

function createZabutonByMath(targetLayer, textLeft, textTop, textRight, textBottom, paddingPx, settings) {
    var doc = app.activeDocument;
    
    var safeDummyLayer = doc.artLayers.add();
    safeDummyLayer.move(targetLayer, ElementPlacement.PLACEAFTER);
    doc.activeLayer = safeDummyLayer;
    
    var left = textLeft - paddingPx;
    var top = textTop - paddingPx;
    var right = textRight + paddingPx;
    var bottom = textBottom + paddingPx;

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
    
    desc4.putDouble( charIDToTypeID( "Rd  " ), settings.color[0] ); 
    desc4.putDouble( charIDToTypeID( "Grn " ), settings.color[1] );
    desc4.putDouble( charIDToTypeID( "Bl  " ), settings.color[2] );
    
    desc3.putObject( charIDToTypeID( "Clr " ), charIDToTypeID( "RGBC" ), desc4 );
    desc2.putObject( charIDToTypeID( "Type" ), stringIDToTypeID( "solidColorLayer" ), desc3 );
    desc1.putObject( charIDToTypeID( "Usng" ), stringIDToTypeID( "contentLayer" ), desc2 );
    executeAction( charIDToTypeID( "Mk  " ), desc1, DialogModes.NO );

    myPathItem.remove();

    var shapeLayer = doc.activeLayer;
    shapeLayer.name = "背景_" + targetLayer.name;

    if (settings.zabutonStyleName && settings.zabutonStyleName !== "") {
        try {
            shapeLayer.applyStyle(settings.zabutonStyleName);
            if (settings.transparentBase) {
                shapeLayer.fillOpacity = 0; 
            }
        } catch (e) {}
    }
    
    if (safeDummyLayer !== shapeLayer) {
        try { safeDummyLayer.remove(); } catch(e){}
    }
}

main();