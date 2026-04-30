#target premierepro

(function () {
    var seq = app.project.activeSequence;
    if (!seq) { alert("アクティブなシーケンスがありません。"); return; }

    var selections = seq.getSelection();
    if (selections.length === 0) { alert("クリップを選択してください。"); return; }

    // ── ダイアログ ──────────────────────────
    var dlg = new Window("dialog", "テキストスケール変更");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.margins = 20;
    dlg.spacing = 12;

    var row = dlg.add("group");
    row.orientation = "row";
    row.alignment = "center";
    row.add("statictext", undefined, "スケール:");
    var input = row.add("edittext", undefined, "100");
    input.preferredSize.width = 80;
    row.add("statictext", undefined, "%");

    var btnRow = dlg.add("group");
    btnRow.orientation = "row";
    btnRow.alignment = "center";
    var btnOK     = btnRow.add("button", undefined, "OK");
    var btnCancel = btnRow.add("button", undefined, "キャンセル");

    btnOK.onClick = function () {
        if (isNaN(parseFloat(input.text)) || parseFloat(input.text) <= 0) {
            alert("有効な数値を入力してください。");
            return;
        }
        dlg.close(1);
    };
    btnCancel.onClick = function () { dlg.close(0); };

    if (dlg.show() !== 1) return;

    var scaleVal = parseFloat(input.text);

    // ── 適用 ────────────────────────────────
    // モーション以外も含む全コンポーネントを対象に "スケール"/"Scale" を検索
    var count = 0;
    var errLog = "";
    var debugLines = [];

    for (var i = 0; i < selections.length; i++) {
        var clip = selections[i];
        if (clip.type !== 1) continue;

        for (var c = 0; c < clip.components.numItems; c++) {
            var comp = clip.components[c];
            var compName = comp.displayName;

            for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                var propName = prop.displayName;

                debugLines.push(compName + " > " + propName);

                if (propName === "Scale" || propName === "スケール") {
                    try {
                        prop.setValue(scaleVal, 1);
                        count++;
                    } catch (e) {
                        errLog += compName + " > " + propName + ": " + e.toString() + "\n";
                    }
                }
            }
        }
    }

    // ── 結果 ────────────────────────────────
    if (count > 0) {
        alert(count + "件のスケールを " + scaleVal + "% に変更しました。");
    } else {
        // 見つからない場合はコンポーネント一覧を表示してデバッグに使う
        var msg = "「スケール」プロパティが見つかりませんでした。\n\n";
        msg += "検出されたプロパティ一覧:\n";
        msg += debugLines.join("\n");
        if (errLog) msg += "\n\nエラー:\n" + errLog;
        alert(msg);
    }
})();
