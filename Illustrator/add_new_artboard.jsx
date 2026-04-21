// artboardRect は [left, top, right, bottom] (AIのY座標は上が正)
var doc = app.activeDocument;
var abIndex = doc.artboards.getActiveArtboardIndex();
var rectA = doc.artboards[abIndex].artboardRect;

// 現在のキャンバスビュー位置を保存
var view = doc.views[0];
var savedCenter = view.centerPoint;

var W = rectA[2] - rectA[0];
var H = rectA[1] - rectA[3];
var gap = 20;

// 全アートボードの最下端を探し、その下に新規アートボードを配置（他と重ならないように）
var minY = rectA[3];
for (var i = 0; i < doc.artboards.length; i++) {
    var r = doc.artboards[i].artboardRect;
    if (r[3] < minY) minY = r[3];
}
var newRect = [rectA[0], minY - gap, rectA[2], minY - gap - H];

var targetIndex = abIndex + 1;

// 末尾に1回だけ追加
var newArtboard = doc.artboards.add(newRect);
var newName = newArtboard.name;
var newIndex = doc.artboards.length - 1;

// targetIndex〜newIndex-1 のデータを先読み（書き込み前に全て取得）
var savedRects = [];
var savedNames = [];
for (var i = targetIndex; i < newIndex; i++) {
    savedRects.push(doc.artboards[i].artboardRect);
    savedNames.push(doc.artboards[i].name);
}

// targetIndex に新規アートボードのデータを書き込む
doc.artboards[targetIndex].artboardRect = newRect;
doc.artboards[targetIndex].name = newName;

// targetIndex+1 以降を1つずつ後ろにずらす
for (var i = 0; i < savedRects.length; i++) {
    doc.artboards[targetIndex + 1 + i].artboardRect = savedRects[i];
    doc.artboards[targetIndex + 1 + i].name = savedNames[i];
}

// 新規アートボードをアクティブに設定
doc.artboards.setActiveArtboardIndex(targetIndex);

// キャンバスビューを元の位置に戻す
view.centerPoint = savedCenter;
