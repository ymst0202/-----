(function() {
    var doc = app.activeDocument;
    var layers = doc.layers;
    
    // ダイアログを表示してベースとなる名前を入力してもらう
    var baseName = prompt("アートボードの共通名を入力してください。\n（例：「telop ポジティブ」と入力すると「telop ポジティブ 1, 2...」になります）", "telop");
    
    // キャンセルボタンが押された場合、または空欄のままOKされた場合は処理を中断
    if (baseName === null || baseName === "") {
        return;
    }

    var count = 1;

    // レイヤーパネルの「上」から順に連番を振ります
    for (var i = 0; i < layers.length; i++) {
        var ab = layers[i];
        
        // レイヤーセット（アートボード）のみを対象とする
        if (ab.typename === "LayerSet") {
            // 新しい名前を設定（入力した名前 + 半角スペース + 連番）
            ab.name = baseName + " " + count;
            count++;
        }
    }

    alert("連番の振り直しが完了しました！");
})();