var doc = app.activeDocument;
var sel = doc.selection;

if (sel.length === 0) {
    alert("オブジェクトを選択してください");
} else {
    // アクティブなアートボードの中心X座標を取得
    var abIndex = doc.artboards.getActiveArtboardIndex();
    var abRect = doc.artboards[abIndex].artboardRect;
    var abCenterX = (abRect[0] + abRect[2]) / 2;

    // 各オブジェクトの中心をアートボードの中心X座標に揃える
    for (var i = 0; i < sel.length; i++) {
        var b = sel[i].geometricBounds;
        var objCenterX = (b[0] + b[2]) / 2;
        sel[i].translate(abCenterX - objCenterX, 0);
    }

    app.redraw();
}
