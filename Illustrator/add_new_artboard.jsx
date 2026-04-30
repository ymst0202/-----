// artboardRect は [left, top, right, bottom] (AIのY座標は上が正)
var doc = app.activeDocument;
var abIndex = doc.artboards.getActiveArtboardIndex();
var rectA = doc.artboards[abIndex].artboardRect;
var originalName = doc.artboards[abIndex].name; // 元のアートボード名を取得

// 現在のズームを保存（新しいアートボードに移動後も同倍率を維持するため）
var view = doc.views[0];
var savedZoom = view.zoom;

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

// --- 新しいアートボード名の連番生成 ---
var newName = "";
// 末尾が「.数字」になっているか正規表現でチェック
var match = originalName.match(/^(.*)\.(\d+)$/);
if (match) {
    var base = match[1]; // 「.」の前の文字列
    var num = parseInt(match[2], 10); // 現在の番号
    newName = base + "." + (num + 1); // 番号に1を足す
} else {
    // 末尾に「.数字」がない場合は「.1」を付与
    newName = originalName + ".1";
}

var targetIndex = abIndex + 1;

// 末尾に1回だけ追加
var newArtboard = doc.artboards.add(newRect);
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
doc.artboards[targetIndex].name = newName; // 連番の名前を設定

// targetIndex+1 以降を1つずつ後ろにずらす
for (var i = 0; i < savedRects.length; i++) {
    doc.artboards[targetIndex + 1 + i].artboardRect = savedRects[i];
    doc.artboards[targetIndex + 1 + i].name = savedNames[i];
}

// --- 元のアートボードのオブジェクトを複製して移動 ---
doc.artboards.setActiveArtboardIndex(abIndex); // 元のアートボードをアクティブに
doc.selection = null; // 現在の選択をクリア
doc.selectObjectsOnActiveArtboard(); // アクティブなアートボード上のオブジェクトを選択

var sel = doc.selection;
if (sel.length > 0) {
    // 新旧アートボードの左上座標の差分を計算
    var dx = newRect[0] - rectA[0];
    var dy = newRect[1] - rectA[1];

    // 選択されたオブジェクトを1つずつ複製して移動
    for (var j = 0; j < sel.length; j++) {
        var newItem = sel[j].duplicate();
        newItem.translate(dx, dy);
    }
}
doc.selection = null; // 複製完了後に選択をクリア

// --- 新しいアートボードをアクティブにして視点を合わせる ---

// 新しいアートボードをアクティブに設定
doc.artboards.setActiveArtboardIndex(targetIndex);
doc.artboards.setActiveArtboardIndex(targetIndex);

// 新しいアートボードの中心にビューを移動（ズームは維持）
var newCenterX = newRect[0] + (newRect[2] - newRect[0]) / 2;
var newCenterY = newRect[1] + (newRect[3] - newRect[1]) / 2;
view.zoom = savedZoom;
view.centerPoint = [newCenterX, newCenterY];

// パネルの表示を確実に更新させる
app.redraw();