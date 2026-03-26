#target premierepro

function fixTextAlignmentFinal() {
    var project = app.project;
    if (!project || !project.activeSequence) {
        alert("プロジェクトまたはシーケンスが開かれていません。");
        return;
    }

    var selections = project.activeSequence.getSelection();
    if (selections.length === 0) {
        alert("クリップを選択してください。");
        return;
    }

    var count = 0;
    var log = "";

    for (var i = 0; i < selections.length; i++) {
        var clip = selections[i];
        if (clip.type !== 1) continue; // クリップ以外は無視

        // コンポーネントを走査
        for (var c = 0; c < clip.components.numItems; c++) {
            var comp = clip.components[c];

            // プロパティを走査
            for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];

                // 【重要】IDではなく、解析画像で確認された「名前」で特定する
                var pName = prop.displayName;
                if (pName === "ソーステキスト" || pName === "Source Text") {
                    
                    var val = prop.getValue();
                    var modified = false;

                    // パターンA: データが「オブジェクト」の場合 (今の環境はこっちの可能性大)
                    if (val && typeof val === 'object') {
                        try {
                            // 直接プロパティを書き換える
                            // 0 = 左揃え (Left), 1 = 中央 (Center), 2 = 右 (Right)
                            if (val.justification !== undefined) {
                                val.justification = 0;
                                modified = true;
                            }
                            
                            //念のため textEditValue などの階層もチェック
                            if (val.textEditValue) {
                                // 構造が深い場合
                                if (val.textEditValue.properties) {
                                    val.textEditValue.properties.justification = 0;
                                    modified = true;
                                }
                            }

                            if (modified) {
                                prop.setValue(val);
                                count++;
                                log += clip.name + ": 左揃え(Obj)成功\n";
                            } else {
                                // プロパティが見つからないが、オブジェクトだった場合
                                // 強引に justification プロパティを追加してみる
                                try {
                                    val.justification = 0;
                                    prop.setValue(val);
                                    count++;
                                    log += clip.name + ": 左揃え(強制Obj)成功\n";
                                } catch(e2) {
                                    log += clip.name + ": Obj書換失敗\n";
                                }
                            }
                        } catch(e) {
                            log += clip.name + ": Objエラー " + e.toString() + "\n";
                        }
                    } 
                    // パターンB: データが「文字列(JSON)」の場合 (従来の方法)
                    else if (typeof val === 'string') {
                        var newVal = val;
                        // 正規表現で強制置換
                        newVal = newVal.replace(/\"justification\"\s*:\s*[0-9]+/g, '"justification":0');
                        newVal = newVal.replace(/\"alignment\"\s*:\s*[0-9]+/g, '"alignment":0');
                        
                        if (newVal !== val) {
                            prop.setValue(newVal);
                            count++;
                            log += clip.name + ": 左揃え(String)成功\n";
                        }
                    }
                }
            }
        }
    }

    if (count > 0) {
        alert("成功しました！\n左揃え適用数: " + count + "件\n\n(※位置の数値は変更していないため、画面上では右にズレたように見えますが、これが正常な左揃えの状態です)");
    } else {
        alert("適用できませんでした。\nログ:\n" + log);
    }
}

fixTextAlignmentFinal();