#target premierepro

function forceFixTextAndPosition() {
    var seq = app.project.activeSequence;
    if (!seq) { alert("シーケンスが見つかりません。"); return; }
    
    var sel = seq.getSelection();
    if (sel.length === 0) { alert("クリップを1つ選択してください。"); return; }
    
    var clip = sel[0];
    
    // 画面サイズ取得
    var w = seq.getSettings().videoFrameWidth;
    var h = seq.getSettings().videoFrameHeight;
    var centerX = w / 2;
    var centerY = h / 2;

    var log = "";
    var isTextFixed = false;
    var isPositionFixed = false;

    if (clip.components) {
        for (var i = 0; i < clip.components.numItems; i++) {
            var comp = clip.components[i];
            
            // ---------------------------------------------------
            // 1. テキストの左揃え (AE.ADBE Text)
            // ---------------------------------------------------
            if (comp.matchName === "AE.ADBE Text") {
                // プロパティを全検索 (0番目だけに限らない)
                for (var j = 0; j < comp.properties.numItems; j++) {
                    var prop = comp.properties[j];
                    try {
                        var val = prop.getValue();
                        // 値が文字列で、かつJSONの特徴("textEditValue")を含んでいるか探す
                        if (typeof val === "string" && val.indexOf("textEditValue") !== -1) {
                            var json = JSON.parse(val);
                            // 見つけた！ -> 左揃え(0)に書き換え
                            if (json.textEditValue) {
                                json.textEditValue.justification = 0; // 0=Left, 1=Center, 2=Right
                                prop.setValue(JSON.stringify(json));
                                isTextFixed = true;
                                log += "テキスト設定を書き換えました (Prop index: " + j + ")\n";
                            }
                        }
                    } catch(e) {
                        // パースエラーは無視して次を探す
                    }
                }
            }

            // ---------------------------------------------------
            // 2. 位置とアンカーポイントのリセット (Vector Motion)
            // ---------------------------------------------------
            // ベクトルモーション (Graphic Group) を優先
            if (comp.matchName === "AE.ADBE Graphic Group" || comp.matchName === "AE.ADBE Vector Motion") {
                for (var k = 0; k < comp.properties.numItems; k++) {
                    var p = comp.properties[k];
                    
                    // (A) 位置 (Position) を中央へ
                    if (p.matchName.indexOf("Position") !== -1 && !p.isTimeVarying()) {
                        p.setValue([centerX, centerY], true);
                        isPositionFixed = true;
                    }

                    // (B) アンカーポイント (Anchor Point) も中央へリセット！
                    // これがズレていると、位置を直しても見た目がおかしくなります
                    if (p.matchName.indexOf("Anchor") !== -1 && !p.isTimeVarying()) {
                        p.setValue([centerX, centerY], true);
                    }
                }
            }
        }
    }

    // 結果報告
    if (isTextFixed && isPositionFixed) {
        // 成功時は作業の邪魔にならないようアラートを出さない（必要なら以下を解除）
        // alert("成功しました！\n" + log);
    } else {
        var msg = "処理結果:\n" + log;
        if (!isTextFixed) msg += "⚠️ テキスト設定データが見つかりませんでした。\n";
        if (!isPositionFixed) msg += "⚠️ 位置プロパティが見つかりませんでした。\n";
        alert(msg);
    }
}

forceFixTextAndPosition();