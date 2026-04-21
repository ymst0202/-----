/*
  CSV読み込み ＋ 特定文字（スラッシュ囲み）座布団生成スクリプト（完全版）
  （強調・座布団スタイル選択 ＋ プレビュー選択 ＋ 1行自動下段 ＋ 生成間隔調整）
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
        var templateGroup = doc.activeLayer;

        if (templateGroup.typename !== "LayerSet") {
            alert("テンプレートとなる「グループ（フォルダ）」を選択してから実行してください。");
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

        // プレビュー対象の選択
        var pnlPreviewTarget = win.add("panel", undefined, "プレビュー対象");
        pnlPreviewTarget.orientation = "row";
        var radPreview1 = pnlPreviewTarget.add("radiobutton", undefined, "1行目をプレビュー");
        var radPreview2 = pnlPreviewTarget.add("radiobutton", undefined, "2行目をプレビュー");
        radPreview1.value = true; // デフォルトは1行目

        var pnlZabuton = win.add("panel", undefined, "座布団の余白設定");
        pnlZabuton.orientation = "row";
        pnlZabuton.add("statictext", undefined, "余白サイズ:");
        var inpPaddingPercent = pnlZabuton.add("edittext", undefined, "0"); 
        inpPaddingPercent.characters = 4;
        pnlZabuton.add("statictext", undefined, "% （テキストの高さ基準）");

        var pnlLayout = win.add("panel", undefined, "テキスト内のレイアウト");
        pnlLayout.orientation = "column";
        pnlLayout.alignChildren = "left";

        var grpGap = pnlLayout.add("group");
        grpGap.add("statictext", undefined, "文字と文字の間隔 (px):");
        var inpGap = grpGap.add("edittext", undefined, "0"); inpGap.characters = 4;

        var chkEffects = pnlLayout.add("checkbox", undefined, "レイヤースタイルの大きさを含める（シャドウ切れ防止）");
        chkEffects.value = true;

        // ★新規追加：CSV展開時の間隔設定
        var pnlCsvLayout = win.add("panel", undefined, "CSV展開時の配置（テロップ同士が連なる隙間）");
        pnlCsvLayout.orientation = "column";
        pnlCsvLayout.alignChildren = "left";

        var grpCsvMargin = pnlCsvLayout.add("group");
        grpCsvMargin.add("statictext", undefined, "横の間隔 (px):");
        var inpMarginX = grpCsvMargin.add("edittext", undefined, "500"); inpMarginX.characters = 4;
        grpCsvMargin.add("statictext", undefined, "   縦の間隔 (px):");
        var inpMarginY = grpCsvMargin.add("edittext", undefined, "300"); inpMarginY.characters = 4;
        
        var grpCsvRows = pnlCsvLayout.add("group");
        grpCsvRows.add("statictext", undefined, "縦に並べる最大行数:");
        var inpMaxRows = grpCsvRows.add("edittext", undefined, "10"); inpMaxRows.characters = 4;

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

        // 設定値を取得
        function getSettings() {
            var selectedZabutonStyle = dropZabutonStyle.selection ? dropZabutonStyle.selection.text : "";
            if (selectedZabutonStyle === "(スタイルを使用しない)") selectedZabutonStyle = "";

            var selectedTextStyle = dropTextStyle.selection ? dropTextStyle.selection.text : "";
            if (selectedTextStyle === "(スタイルを使用しない)") selectedTextStyle = "";

            // CSVの行数が未入力や0の場合はエラーを防ぐため10をセット
            var parsedMaxRows = parseInt(inpMaxRows.text, 10);
            if (isNaN(parsedMaxRows) || parsedMaxRows <= 0) parsedMaxRows = 10;

            return {
                paddingPercent: parseFloat(inpPaddingPercent.text) || 0,
                gap: parseFloat(inpGap.text) || 0,
                useEffects: chkEffects.value,
                marginX: parseFloat(inpMarginX.text) || 0,     // 追加分
                marginY: parseFloat(inpMarginY.text) || 0,     // 追加分
                maxRows: parsedMaxRows,                        // 追加分
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

        // ライブプレビュー実行
        function updatePreview() {
            try {
                doc.activeHistoryState = initialState;
                var currentTemplateGroup = doc.activeLayer; 
                var textLayers = getTextLayers(currentTemplateGroup);
                if (textLayers.length === 0) return;

                var settings = getSettings();
                var layersToDelete = [];

                if (radPreview1.value && textLayers.length >= 1) {
                    var t1 = textLayers[0];
                    var previewText1 = t1.textItem.contents;
                    if (previewText1.indexOf("/") === -1) previewText1 = "1行目/プレビュー/確認用";
                    var origCenterX1 = getCenterX(t1.bounds);
                    buildTextGroup(currentTemplateGroup, t1, previewText1, origCenterX1, settings, "1行目", layersToDelete);
                } else if (radPreview2.value && textLayers.length >= 2) {
                    var t2 = textLayers[1];
                    var previewText2 = t2.textItem.contents;
                    if (previewText2.indexOf("/") === -1) previewText2 = "2行目/プレビュー/確認用";
                    var origCenterX2 = getCenterX(t2.bounds);
                    buildTextGroup(currentTemplateGroup, t2, previewText2, origCenterX2, settings, "2行目", layersToDelete);
                }
                
                app.refresh(); 
            } catch(e) {}
        }

        // 入力・選択変更時のリスナー
        radPreview1.onClick = updatePreview; 
        radPreview2.onClick = updatePreview; 
        inpPaddingPercent.onChange = updatePreview;
        inpGap.onChange = updatePreview;
        chkEffects.onClick = updatePreview;
        dropZabutonStyle.onChange = updatePreview; 
        dropTextStyle.onChange = updatePreview;
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

        doc.suspendHistory("CSVテロップ自動生成(2行版)", "runCSVProcess(data, templateGroup, finalSettings)");
        alert("完了しました！");

    } catch (e) {
        alert("エラーが発生しました: " + e);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
        app.preferences.typeUnits = originalTypeUnits;
        app.displayDialogs = originalDialogMode;
    }
}

// 中心座標の取得ヘルパー
function getCenterX(bounds) {
    return bounds[0].value + (bounds[2].value - bounds[0].value) / 2;
}

// 簡易CSVパーサー（バックスラッシュ区切りを配列に変換）
function parseCSVLine(str) {
    var arr = [];
    var quote = false;
    var col = "";
    for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c === '"' && str[i+1] === '"') { 
            col += '"'; i++; 
        } else if (c === '"') { 
            quote = !quote; 
        } else if (c === '\\' && !quote) { 
            arr.push(col); 
            col = ""; 
        } else { 
            col += c; 
        }
    }
    arr.push(col);
    return arr;
}

// グループ内の全テキストレイヤーを上から順に取得する
function getTextLayers(layerSet) {
    var arr = [];
    for (var k = 0; k < layerSet.layers.length; k++) {
        var child = layerSet.layers[k];
        if (child.kind === LayerKind.TEXT) {
            arr.push(child);
        } else if (child.typename === "LayerSet") {
            arr = arr.concat(getTextLayers(child));
        }
    }
    return arr;
}

function runCSVProcess(data, templateGroup, settings) {
    // ダイアログからの設定値を適用
    var marginX = settings.marginX;
    var marginY = settings.marginY;
    var maxRows = settings.maxRows;
    
    var abWidth = 1920;  // 基準の幅（キャンバスの基本サイズ等）
    var abHeight = 1080; // 基準の高さ

    for (var j = 0; j < data.length; j++) {
        var cols = parseCSVLine(data[j]);
        var textValue1 = cols[0] ? cols[0].replace(/^"|"$/g, "") : ""; // 1列目
        var textValue2 = cols[1] ? cols[1].replace(/^"|"$/g, "") : ""; // 2列目

        // CSVのデータが1行分（1列）しかない場合は、自動で2行目（下段）に配置する
        if (textValue1 !== "" && textValue2 === "") {
            textValue2 = textValue1;
            textValue1 = "";
        }

        if (!textValue1 && !textValue2) continue;

        var newGroup = templateGroup.duplicate();
        var cleanName1 = textValue1.replace(/\//g, "");
        var cleanName2 = textValue2.replace(/\//g, "");
        
        var cleanNameArr = [];
        if (cleanName1) cleanNameArr.push(cleanName1);
        if (cleanName2) cleanNameArr.push(cleanName2);
        var cleanName = cleanNameArr.join("_");
        
        newGroup.name = (j + 1) + "_" + (cleanName.length > 15 ? cleanName.substring(0, 15) : cleanName);

        // 位置の計算処理
        var col = Math.floor(j / maxRows);
        var row = j % maxRows;
        var offsetX = col * (abWidth + marginX);
        var offsetY = row * (abHeight + marginY);
        newGroup.translate(offsetX, offsetY);

        var textLayers = getTextLayers(newGroup);
        var t1 = textLayers.length >= 1 ? textLayers[0] : null;
        var t2 = textLayers.length >= 2 ? textLayers[1] : null;

        var layersToDelete = []; 

        // 1行目の処理
        if (t1) {
            if (textValue1) {
                var origCenterX1 = getCenterX(t1.bounds);
                buildTextGroup(newGroup, t1, textValue1, origCenterX1, settings, "1行目", layersToDelete);
            } else {
                layersToDelete.push(t1);
            }
        }

        // 2行目の処理
        if (t2) {
            if (textValue2) {
                var origCenterX2 = getCenterX(t2.bounds);
                buildTextGroup(newGroup, t2, textValue2, origCenterX2, settings, "2行目", layersToDelete);
            } else {
                layersToDelete.push(t2);
            }
        }

        // 処理が完走してから、安全に元のテキストレイヤーを削除する
        for (var d = 0; d < layersToDelete.length; d++) {
            try { layersToDelete[d].remove(); } catch(e) {}
        }
    }
    templateGroup.remove(); // テンプレートを削除
}

function buildTextGroup(targetGroup, targetTextLayer, textValue, origCenterX, settings, lineName, layersToDelete) {
    if (textValue.indexOf("/") === -1) {
        targetTextLayer.textItem.contents = textValue;
        return; 
    }

    var parts = textValue.split("/");
    var group = targetGroup.layerSets.add();
    group.name = "テキストグループ_" + lineName;
    group.move(targetTextLayer, ElementPlacement.PLACEBEFORE); 

    var partsData = [];
    var totalWidth = 0;

    // 各パーツのサイズを正確に計測
    for (var i = 0; i < parts.length; i++) {
        var partText = parts[i];
        if (!partText || partText.length === 0) continue;

        var isZabuton = (i % 2 !== 0);

        app.activeDocument.activeLayer = targetTextLayer;
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

    // 実際の配置
    for (var k = 0; k < partsData.length; k++) {
        var dataInfo = partsData[k];
        
        app.activeDocument.activeLayer = targetTextLayer;
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

    targetTextLayer.visible = false;
    if (layersToDelete) layersToDelete.push(targetTextLayer);

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

    var pathName = "TempPath_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    var myPathItem = doc.pathItems.add(pathName, [lineSubPathArray]);

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