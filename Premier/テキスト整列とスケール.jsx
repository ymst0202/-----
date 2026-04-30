#target premierepro

(function () {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("アクティブなシーケンスがありません。");
        return;
    }

    var selections = seq.getSelection();
    if (selections.length === 0) {
        alert("クリップを選択してください。");
        return;
    }

    // =====================
    // ダイアログ
    // =====================
    var dlg = new Window("dialog", "テキスト整列 & スケール変更");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 10;
    dlg.margins = 15;

    // --- テキスト整列 ---
    var alignPanel = dlg.add("panel", undefined, "テキスト整列");
    alignPanel.orientation = "column";
    alignPanel.alignChildren = ["left", "top"];
    alignPanel.spacing = 8;
    alignPanel.margins = [10, 15, 10, 10];

    var applyAlignCb = alignPanel.add("checkbox", undefined, "テキスト整列を適用");
    applyAlignCb.value = true;

    var rbRow = alignPanel.add("group");
    rbRow.orientation = "row";
    rbRow.spacing = 15;
    var rbLeft   = rbRow.add("radiobutton", undefined, "左揃え");
    var rbCenter = rbRow.add("radiobutton", undefined, "中央揃え");
    var rbRight  = rbRow.add("radiobutton", undefined, "右揃え");
    rbLeft.value = true;

    // --- スケール ---
    var scalePanel = dlg.add("panel", undefined, "変形スケール (モーション)");
    scalePanel.orientation = "column";
    scalePanel.alignChildren = ["left", "top"];
    scalePanel.spacing = 8;
    scalePanel.margins = [10, 15, 10, 10];

    var applyScaleCb = scalePanel.add("checkbox", undefined, "スケールを適用");
    applyScaleCb.value = true;

    var scaleRow = scalePanel.add("group");
    scaleRow.orientation = "row";
    var scaleInput = scaleRow.add("edittext", undefined, "100");
    scaleInput.preferredSize.width = 70;
    scaleRow.add("statictext", undefined, "%");

    // --- ボタン ---
    var btnRow = dlg.add("group");
    btnRow.orientation = "row";
    btnRow.alignment = "center";
    var btnOK     = btnRow.add("button", undefined, "OK");
    var btnCancel = btnRow.add("button", undefined, "キャンセル");

    btnOK.onClick = function () {
        if (!applyAlignCb.value && !applyScaleCb.value) {
            alert("適用する項目を1つ以上選択してください。");
            return;
        }
        var sv = parseFloat(scaleInput.text);
        if (applyScaleCb.value && (isNaN(sv) || sv <= 0)) {
            alert("有効なスケール値を入力してください（例: 100）");
            return;
        }
        dlg.close(1);
    };
    btnCancel.onClick = function () { dlg.close(0); };

    if (dlg.show() !== 1) return;

    // ダイアログ値を確定
    var doAlign       = applyAlignCb.value;
    var doScale       = applyScaleCb.value;
    // justification: 0=左揃え / 1=中央揃え / 2=右揃え
    var justification = rbCenter.value ? 1 : (rbRight.value ? 2 : 0);
    var scaleVal      = parseFloat(scaleInput.text);

    // =====================
    // 適用
    // =====================
    var alignCount = 0;
    var scaleCount = 0;
    var errLog     = "";

    for (var i = 0; i < selections.length; i++) {
        var clip = selections[i];
        if (clip.type !== 1) continue;

        for (var c = 0; c < clip.components.numItems; c++) {
            var comp     = clip.components[c];
            var compName = comp.displayName;

            // --- スケール変更（モーションエフェクト）---
            if (doScale && (compName === "Motion" || compName === "モーション")) {
                for (var p = 0; p < comp.properties.numItems; p++) {
                    var prop = comp.properties[p];
                    if (prop.displayName === "Scale" || prop.displayName === "スケール") {
                        try {
                            prop.setValue(scaleVal, 1);
                            scaleCount++;
                        } catch (e) {
                            errLog += "[" + clip.name + "] スケールエラー: " + e.toString() + "\n";
                        }
                        break;
                    }
                }
            }

            // --- テキスト整列（ソーステキスト）---
            if (doAlign) {
                for (var q = 0; q < comp.properties.numItems; q++) {
                    var prop2 = comp.properties[q];
                    if (prop2.displayName !== "ソーステキスト" && prop2.displayName !== "Source Text") continue;

                    try {
                        var val = prop2.getValue();

                        if (val && typeof val === "object") {
                            // オブジェクト形式
                            val.justification = justification;
                            prop2.setValue(val);
                            alignCount++;
                        } else if (typeof val === "string") {
                            // JSON文字列形式
                            var newVal = val
                                .replace(/\"justification\"\s*:\s*[0-9]+/g, '"justification":' + justification)
                                .replace(/\"alignment\"\s*:\s*[0-9]+/g,     '"alignment":'     + justification);
                            if (newVal !== val) {
                                prop2.setValue(newVal);
                                alignCount++;
                            } else {
                                // 強制追記パターン
                                try {
                                    val.justification = justification;
                                    prop2.setValue(val);
                                    alignCount++;
                                } catch (e2) {
                                    errLog += "[" + clip.name + "] 整列(強制)エラー: " + e2.toString() + "\n";
                                }
                            }
                        }
                    } catch (e) {
                        errLog += "[" + clip.name + "] 整列エラー: " + e.toString() + "\n";
                    }
                    break;
                }
            }
        }
    }

    // =====================
    // 結果表示
    // =====================
    var alignLabel = ["左揃え", "中央揃え", "右揃え"][justification] || "";
    var msg = "";
    if (doAlign) msg += "テキスト整列 (" + alignLabel + "): " + alignCount + "件適用\n";
    if (doScale) msg += "スケール変更 (" + scaleVal + "%): " + scaleCount + "件適用\n";
    if (errLog)  msg += "\nエラー:\n" + errLog;

    if (alignCount + scaleCount === 0 && !errLog) {
        msg = "適用できるプロパティが見つかりませんでした。\n\n" +
              "【テキスト整列】Essential Graphicsのテキストクリップを選択してください。\n" +
              "【スケール変更】映像クリップを選択してください。";
    }

    alert(msg.replace(/\n+$/, ""));
})();
