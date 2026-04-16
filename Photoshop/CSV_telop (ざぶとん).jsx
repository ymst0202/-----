/*
  CSV読み込み ＋ 特定文字（スラッシュ囲み）座布団生成スクリプト
  （強調テキストスタイル選択 ＋ 座布団スタイル選択 ＋ ライブプレビュー ＋ ％指定版）
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
        var templateAb = doc.activeLayer;

        if (templateAb.typename !== "LayerSet") {
            alert("テンプレートのアートボードを選択してから実行してください。");
            return;
        }

        var initialState = doc.activeHistoryState;

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
        var win = new Window("dialog", "座布団テロップ生成（完全版）");
        win.alignChildren = "fill";

        var pnlZabuton = win.add("panel", undefined, "座布団の余白設定");
        pnlZabuton.orientation = "row";
        pnlZabuton.add("statictext", undefined, "余白サイズ:");
        var inpPaddingPercent = pnlZabuton.add("edittext", undefined, "0"); 
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
        
        // ★ 強調テキストのスタイル設定
        var grpTextStyle = pnlStyle.add("group");
        grpTextStyle.add("statictext", undefined, "強調文字のスタイル:");
        var dropTextStyle = grpTextStyle.add("dropdownlist", undefined, availableStyles);
        dropTextStyle.selection = 0; 
        
        // 座布団のスタイル設定
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

        // 設定値を取得
        function getSettings() {
            var selectedZabutonStyle = dropZabutonStyle.selection ? dropZabutonStyle.selection.text : "";
            if (selectedZabutonStyle === "(スタイルを使用しない)") selectedZabutonStyle = "";

            var selectedTextStyle = dropTextStyle.selection ? dropTextStyle.selection.text : "";
            if (selectedTextStyle === "(スタイルを使用しない)") selectedTextStyle = "";

            return {
                paddingPercent: parseFloat(inpPaddingPercent.text) || 0,
                gap: parseFloat(inpGap.text) || 0,
                useEffects: chkEffects.value,
                zabutonStyleName: selectedZabutonStyle, 
                textStyleName: selectedTextStyle, // 追加：テキストのスタイル
                transparentBase: chkTransparent.value, 
                color: [
                    parseFloat(inpR.text) || 0,
                    parseFloat(inpG.text) || 0,
                    parseFloat(inpB.text) || 0
                ]
            };
        }

        // ライブプレビュー実行
        function updatePreview() {
            try {
                doc.activeHistoryState = initialState;
                var currentTemplateAb = doc.activeLayer; 
                var targetTextLayer = findTextLayer(currentTemplateAb);
                if (!targetTextLayer) return;

                var previewText = targetTextLayer.textItem.contents;
                if (previewText.indexOf("/") === -1) {
                    previewText = "サンプル/プレビュー/確認用";
                }

                var origBounds = targetTextLayer.bounds;
                var origCenterX = origBounds[0].value + (origBounds[2].value - origBounds[0].value) / 2;
                
                var settings = getSettings();
                buildTextGroup(currentTemplateAb, targetTextLayer, previewText, origCenterX, settings);
                
                app.refresh(); 
            } catch(e) {}
        }

        // 入力変更時のリスナー
        inpPaddingPercent.onChange = updatePreview;
        inpGap.onChange = updatePreview;
        chkEffects.onClick = updatePreview;
        dropZabutonStyle.onChange = updatePreview; 
        dropTextStyle.onChange = updatePreview; // テキストスタイル変更時もプレビュー
        chkTransparent.onClick = updatePreview; 
        inpR.onChange = updatePreview;
        inpG.onChange = updatePreview;
        inpB.onChange = updatePreview;

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

        var csvFile = File.openDialog("CSVファイルを選択してください (UTF-8推奨)");
        if (!csvFile) {
            app.preferences.rulerUnits = originalRulerUnits;
            app.preferences.typeUnits = originalTypeUnits;
            app.displayDialogs = originalDialogMode;
            return;
        }

        csvFile.open("r");
        var content = csvFile.read();
        csvFile.close();

        content = content.replace(/^\uFEFF/, '');
        var lines = content.split(/\r\n|\r|\n/);
        var data = [];
        
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].length > 0) data.push(lines[i]);
        }

        doc.suspendHistory("CSVテロップ自動生成", "runCSVProcess(data, templateAb, finalSettings)");
        alert("完了しました！");

    } catch (e) {
        alert("エラーが発生しました: " + e);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
        app.preferences.typeUnits = originalTypeUnits;
        app.displayDialogs = originalDialogMode;
    }
}

function runCSVProcess(data, templateAb, settings) {
    var marginX = 500;
    var marginY = 300;
    var abWidth = 1920;
    var abHeight = 1080;
    var maxRows = 10;

    for (var j = 0; j < data.length; j++) {
        var textValue = data[j].replace(/"/g, "");

        var newAb = templateAb.duplicate();
        var cleanName = textValue.replace(/\//g, ""); 
        newAb.name = (j + 1) + "_" + (cleanName.length > 15 ? cleanName.substring(0, 15) : cleanName);

        var col = Math.floor(j / maxRows);
        var row = j % maxRows;
        var offsetX = col * (abWidth + marginX);
        var offsetY = row * (abHeight + marginY);
        newAb.translate(offsetX, offsetY);

        var targetTextLayer = findTextLayer(newAb);
        if (!targetTextLayer) continue;

        var origBounds = targetTextLayer.bounds;
        var origCenterX = origBounds[0].value + (origBounds[2].value - origBounds[0].value) / 2;

        buildTextGroup(newAb, targetTextLayer, textValue, origCenterX, settings);
    }
    templateAb.remove();
}

function buildTextGroup(targetAb, targetTextLayer, textValue, origCenterX, settings) {
    if (textValue.indexOf("/") === -1) {
        targetTextLayer.textItem.contents = textValue;
        return;
    }

    var parts = textValue.split("/");
    var group = targetAb.layerSets.add();
    group.name = "テキストグループ";

    var partsData = [];
    var totalWidth = 0;

    // 各パーツのサイズを正確に計測（テキストスタイルを適用した状態のサイズを測る）
    for (var i = 0; i < parts.length; i++) {
        var partText = parts[i];
        if (!partText || partText.length === 0) continue;

        var isZabuton = (i % 2 !== 0);

        // 計測用の一時レイヤー
        var tempMeasureLayer = targetTextLayer.duplicate();
        tempMeasureLayer.textItem.contents = partText;
        try { tempMeasureLayer.textItem.justification = Justification.LEFT; } catch(e) {}

        // ★強調テキストの場合はスタイルを適用してから測る
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

        tempMeasureLayer.remove(); // 計測用レイヤーを削除
    }

    var startX = origCenterX - (totalWidth / 2);
    var currentX = startX;
    var textLayersToZabuton = [];

    // 実際の配置
    for (var k = 0; k < partsData.length; k++) {
        var dataInfo = partsData[k];
        
        var newLayer = targetTextLayer.duplicate();
        newLayer.name = dataInfo.text;
        newLayer.textItem.contents = dataInfo.text;
        try { newLayer.textItem.justification = Justification.LEFT; } catch(e) {}
        newLayer.move(group, ElementPlacement.PLACEATEND);

        // ★強調テキストへのスタイル適用
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

function findTextLayer(layerSet) {
    for (var k = 0; k < layerSet.layers.length; k++) {
        var child = layerSet.layers[k];
        if (child.kind === LayerKind.TEXT) {
            return child;
        } else if (child.typename === "LayerSet") {
            var found = findTextLayer(child);
            if (found) return found;
        }
    }
    return null;
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
    shapeLayer.name = "座布団_" + targetLayer.name;

    // 座布団スタイルの適用
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