#target illustrator

// ゼロ始まり（レイヤーパネルの上から数える）
var num_target_layer = 7;

// ドキュメントが存在しない場合は処理を中断
if (app.documents.length === 0) {
  alert("開いているドキュメントがありません。");
  exit();
}

var doc = app.activeDocument;
var sel = doc.selection;

// 選択オブジェクトがない場合は処理を中断
if (sel.length === 0) {
  alert("オブジェクトが選択されていません。");
  exit();
}

// レイヤーの存在数をチェック
if (doc.layers.length <= num_target_layer) {
  alert("指定されたターゲットレイヤーが存在しません。\nレイヤー番号は0から始まります。現在のアクティブドキュメントには " + doc.layers.length + " 個のレイヤーがあります。");
  exit();
}

// ターゲットレイヤーを取得
var targetLayer = doc.layers[num_target_layer];

// ターゲットレイヤーの元の状態を保存
var originalTargetLayerVisible = targetLayer.visible;
var originalTargetLayerLocked = targetLayer.locked;

// ターゲットレイヤーのロックと非表示を一時的に解除
if (!targetLayer.visible) {
  targetLayer.visible = true;
}
if (targetLayer.locked) {
  targetLayer.locked = false;
}

// 選択オブジェクトをループ処理
for (var i = 0; i < sel.length; i++) {
  var currentObject = sel[i];

  // オブジェクトの現在のレイヤーがターゲットレイヤーでない場合のみ移動
  if (currentObject.layer != targetLayer) {
    currentObject.moveToEnd(targetLayer);
  }
}

// ターゲットレイヤーの状態を元に戻す
targetLayer.visible = originalTargetLayerVisible;
targetLayer.locked = originalTargetLayerLocked;

// alert("選択したオブジェクトをレイヤー \"" + targetLayer.name + "\" に移動しました。");