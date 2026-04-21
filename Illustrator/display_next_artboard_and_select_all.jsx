/*
  Next Artboard with Relative View & Auto-Select
  表示位置（ズームと相対位置）を維持したまま次のアートボードへ移動し、
  そのアートボード上のオブジェクトを全選択するスクリプト
*/

(function() {
    // ドキュメントが開かれていない場合は終了
    if (app.documents.length === 0) {
        return;
    }

    var doc = app.activeDocument;
    var artboards = doc.artboards;
    var activeIndex = artboards.getActiveArtboardIndex();
    
    // 次のアートボードのインデックスを計算
    var nextIndex = activeIndex + 1;
    if (nextIndex >= artboards.length) {
        nextIndex = 0;
    }

    // 現在のビュー情報の取得
    var view = doc.views[0];
    var currentZoom = view.zoom;
    var currentViewCenter = view.centerPoint; // [x, y]

    // 現在のアートボードの中心座標を計算
    var currentRect = artboards[activeIndex].artboardRect; // [Left, Top, Right, Bottom]
    var currentAbCenterX = (currentRect[0] + currentRect[2]) / 2;
    var currentAbCenterY = (currentRect[1] + currentRect[3]) / 2;

    // アートボード中心から見た、現在の画面中心のオフセット（ズレ）を計算
    var offsetX = currentViewCenter[0] - currentAbCenterX;
    var offsetY = currentViewCenter[1] - currentAbCenterY;

    // --- 次のアートボードへ切り替えと選択処理 ---
    
    // 1. 次のアートボードをアクティブにする
    artboards.setActiveArtboardIndex(nextIndex);

    // 2. 既存の選択を一度解除する（これをしないと前のページのオブジェクトも選択されたままになります）
    doc.selection = null;

    // 3. アクティブになったアートボード上のすべてのオブジェクトを選択
    // ※ロックされているオブジェクトや非表示レイヤーのものは除外されます
    doc.selectObjectsOnActiveArtboard();

    // --- ビューの調整 ---

    // 次のアートボードの中心座標を計算
    var nextRect = artboards[nextIndex].artboardRect;
    var nextAbCenterX = (nextRect[0] + nextRect[2]) / 2;
    var nextAbCenterY = (nextRect[1] + nextRect[3]) / 2;

    // オフセットを適用して新しい画面中心を設定
    var newViewCenterX = nextAbCenterX + offsetX;
    var newViewCenterY = nextAbCenterY + offsetY;

    // ビューを更新
    view.centerPoint = [newViewCenterX, newViewCenterY];
    view.zoom = currentZoom;

})();