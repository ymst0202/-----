/*
  CSV読み込み ＋ 2行対応（1行目/2行目レイヤー完全独立処理）
  （プレビューフリーズ完全根絶 ＋ 大成功1行版ロジック移植版）
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

        // プレビュー用に初期状態とアートボードの名前を記憶
        var initialState = doc.activeHistoryState;
        var templateAbName = templateAb.name;

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

        var win = new Window("dialog", "座布団テロップ生成（1行目/2行目 独立処理）");
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
        grpGap.add("statictext", undefined, "文字間隔 (px):");
        var inpGap = grpGap.add("edittext", undefined, "0"); inpGap.characters = 4;

        var chkEffects = pnlLayout.add("checkbox", undefined, "レイヤースタイルの大きさを含める");
        chkEffects.value = true;

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
        
        var chkTransparent = pnlStyle.add("checkbox", undefined, "座布団の塗りを0%にする");
        chkTransparent.value = true; 

        var grpColor = pnlStyle.add("group");
        grpColor.add("statictext", undefined, "座布団のベース色 (RGB):");
        var inpR = grpColor.add("edittext", undefined, "255"); inpR.characters = 3;
        var inpG = grpColor.add("edittext", undefined, "0"); inpG.characters = 3;
        var inpB = grpColor.add("edittext", undefined, "255"); inpB.characters = 3;

        var btnGrp = win.add("group");
        btnGrp.alignment = "center";
        btnGrp.add("button", undefined, "OK", {name: "ok"});
        btnGrp.add("button", undefined, "キャンセル", {name: "cancel"});

        function getSettings() {
            var zStyle = dropZabutonStyle.selection ? dropZabutonStyle.selection.text : "";
            if (zStyle === "(スタイルを使用しない)") zStyle = "";
            var tStyle = dropTextStyle.selection ? dropTextStyle.selection.text : "";
            if (tStyle === "(スタイルを使用しない)") tStyle = "";

            return {
                paddingPercent: parseFloat(inpPaddingPercent.text) || 0,
                gap: parseFloat(inpGap.text) || 0,
                useEffects: chkEffects.value,
                zabutonStyleName: zStyle, 
                textStyleName: tStyle,
                transparentBase: chkTransparent.value, 
                color: [parseFloat(inpR.text) || 0, parseFloat(inpG.text) || 0, parseFloat(inpB.text) || 0]
            };
        }

        // ★ プレビュー停止バグを完全に修正した超・安定システム
        function updatePreview() {
            try {
                doc.activeHistoryState = initialState;
                
                // 【重要】Photoshopの気まぐれな選択状態を無視し、確実にテンプレートアートボードをロックオンする
                var currentAb = null;
                try {
                    // まず参照が生きているかテスト
                    var test = templateAb.layers.length;
                    currentAb = templateAb;
                } catch(e) {
                    // もし参照が切れていたら、ドキュメント全体から名前で強制的に探し出す
                    for (var i = 0; i < doc.layerSets.length; i++) {
                        if (doc.layerSets[i].name === templateAbName) {
                            currentAb = doc.layerSets[i];
                            break;
                        }
                    }
                }
                
                // 万が一見つからなかった場合は安全に処理を抜ける（エラー落ちさせない）
                if (!currentAb) return;

                var settings = getSettings();
                var layer1 = findLayerByName(currentAb, "1行目");
                var layer2 = findLayerByName(currentAb, "2行目");

                if (layer1) {
                    var text1 = layer1.textItem.contents;
                    if (!text1 || text1 === "" || text1.indexOf("/") === -1) text1 = "1行目の/強調内容/プレビュー";
                    buildSingleLine(currentAb, layer1, text1, settings);
                }
                if (layer2) {
                    var text2 = layer2.textItem.contents;
                    if (!text2 || text2 === "" || text2.indexOf("/") === -1) text2 = "2行目の/確認用/テキスト";
                    buildSingleLine(currentAb, layer2, text2, settings);
                }
                
                app.refresh(); 
            } catch(e) {}
        }

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
            return;
        }

        var finalSettings = getSettings();
        doc.activeHistoryState = initialState; 

        var csvFile = File.openDialog("CSVファイルを選択してください (UTF-8推奨)");
        if (!csvFile) return;

        csvFile.open("r");
        var content = csvFile.read();
        csvFile.close();

        content = content.replace(/^\uFEFF/, '');
        var data = parseCSV(content);

        if (data.length === 0) {
            alert("処理できるテキストデータが見つかりませんでした。");
            return;
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

function parseCSV(content) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < content.length; i++) {
        var c = content.charAt(i);
        if (inQuotes) {
            if (c === '"') {
                if (i + 1 < content.length && content.charAt(i + 1) === '"') { field += '"'; i++; } 
                else { inQuotes = false; }
            } else { field += c; }
        } else {
            if (c === '"') { inQuotes = true; } 
            else if (c === ',') { row.push(field); field = ""; } 
            else if (c === '\n' || c === '\r') {
                if (c === '\r' && i + 1 < content.length && content.charAt(i + 1) === '\n') { i++; }
                row.push(field); rows.push(row); row = []; field = "";
            } else { field += c; }
        }
    }
    if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
    var result = [];
    for (var j = 0; j < rows.length; j++) {
        if (rows[j].length > 0 && rows[j][0] !== "") { result.push(rows[j][0]); }
    }
    return result;
}

// ★ エラー防止：確実にテキストレイヤーだけを探し出す関数（安全装置付き）
function findLayerByName(parent, name) {
    if (!parent || !parent.layers) return null; // フォルダじゃないものが渡されたら即座にストップ（エラー回避）
    
    for (var i = 0; i < parent.layers.length; i++) {
        var layer = parent.layers[i];
        if (layer.typename === "ArtLayer") {
            if (layer.kind === LayerKind.TEXT && layer.name.indexOf(name) !== -1) {
                return layer;
            }
        } else if (layer.typename === "LayerSet") {
            var found = findLayerByName(layer, name);
            if (found) return found;
        }
    }
    return null;
}

function runCSVProcess(data, templateAb, settings) {
    var marginX = 500, marginY = 300, abWidth = 1920, abHeight = 1080, maxRows = 10;

    for (var j = 0; j < data.length; j++) {
        var textValue = data[j].replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\\n/g, "\n");
        var newAb = templateAb.duplicate();
        newAb.name = (j + 1) + "_" + textValue.replace(/[\/\n]/g, "").substring(0, 15);

        var col = Math.floor(j / maxRows), row = j % maxRows;
        newAb.translate(col * (abWidth + marginX), row * (abHeight + marginY));

        var lines = textValue.split("\n");
        
        var layer1 = findLayerByName(newAb, "1行目");
        var layer2 = findLayerByName(newAb, "2行目");

        if (lines.length > 0 && lines[0] !== "" && layer1) {
            buildSingleLine(newAb, layer1, lines[0], settings);
        } else if (layer1) {
            layer1.remove();
        }

        if (lines.length > 1 && lines[1] !== "" && layer2) {
            buildSingleLine(newAb, layer2, lines[1], settings);
        } else if (layer2) {
            layer2.remove();
        }
    }
    templateAb.remove();
}

// ★★★ 大成功1行版の完璧ロジック ★★★
function buildSingleLine(targetAb, targetTextLayer, textValue, settings) {
    if (!textValue || textValue === "") return;

    var origCenterX = 0;
    try {
        var origBounds = targetTextLayer.bounds;
        origCenterX = origBounds[0].value + (origBounds[2].value - origBounds[0].value) / 2;
    } catch(e) {
        try { origCenterX = targetTextLayer.textItem.position[0].value; } catch(ex) { origCenterX = 0; }
    }

    if (textValue.indexOf("/") === -1) {
        targetTextLayer.textItem.contents = textValue;
        return;
    }

    var parts = textValue.split("/");
    var group = targetAb.layerSets.add();
    group.name = targetTextLayer.name + "のテロップ";

    var normalWorkLayer = targetTextLayer.duplicate();
    normalWorkLayer.name = "Work_Normal";
    try {
        if (normalWorkLayer.textItem.kind != TextType.POINTTEXT) normalWorkLayer.textItem.kind = TextType.POINTTEXT;
        normalWorkLayer.textItem.justification = Justification.LEFT;
    } catch(e) {}

    var zabutonWorkLayer = targetTextLayer.duplicate();
    zabutonWorkLayer.name = "Work_Zabuton";
    try {
        if (zabutonWorkLayer.textItem.kind != TextType.POINTTEXT) zabutonWorkLayer.textItem.kind = TextType.POINTTEXT;
        zabutonWorkLayer.textItem.justification = Justification.LEFT;
    } catch(e) {}
    
    if (settings.textStyleName !== "") {
        try { zabutonWorkLayer.applyStyle(settings.textStyleName); } catch(e){}
    }

    var partsData = [];
    var totalWidth = 0;

    for (var i = 0; i < parts.length; i++) {
        var partText = parts[i];
        if (!partText || partText.length === 0) continue;

        var isZabuton = (i % 2 !== 0);
        var workLayer = isZabuton ? zabutonWorkLayer : normalWorkLayer;
        
        workLayer.textItem.contents = partText;
        
        var b = [0,0,0,0];
        try {
            var tempB = settings.useEffects ? workLayer.bounds : workLayer.boundsNoEffects;
            b = [tempB[0].value, tempB[1].value, tempB[2].value, tempB[3].value];
        } catch(e) {}
        
        var tLeft = b[0];
        var tTop = b[1];
        var tRight = b[2];
        var tBottom = b[3];
        
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
    }

    var startX = origCenterX - (totalWidth / 2);
    var currentX = startX;
    var textLayersToZabuton = [];

    for (var k = 0; k < partsData.length; k++) {
        var dataInfo = partsData[k];
        var sourceWorkLayer = dataInfo.isZabuton ? zabutonWorkLayer : normalWorkLayer;
        var newLayer = sourceWorkLayer.duplicate();
        newLayer.name = dataInfo.text;
        newLayer.textItem.contents = dataInfo.text;
        newLayer.move(group, ElementPlacement.PLACEATEND);

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

    normalWorkLayer.remove();
    zabutonWorkLayer.remove();
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