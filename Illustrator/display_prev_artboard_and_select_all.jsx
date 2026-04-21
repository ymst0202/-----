/*
  Previous Artboard with Relative View & Auto-Select
  表示位置（ズームと相対位置）を維持したまま「1つ前」のアートボードへ移動し、
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
    
    // 前のアートボードのインデックスを計算
    // 現在が0番目（最初）なら、最後のインデックス（length - 1）にループさせる
    var prevIndex = activeIndex - 1;
    if (prevIndex < 0) {
        prevIndex = artboards.length - 1;
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

    // --- 前のアートボードへ切り替えと選択処理 ---
    
    // 1. 前のアートボードをアクティブにする
    artboards.setActiveArtboardIndex(prevIndex);

    // 2. 既存の選択を一度解除する
    doc.selection = null;

    // 3. アクティブになったアートボード上のすべてのオブジェクトを選択
    doc.selectObjectsOnActiveArtboard();

    // --- ビューの調整 ---

    // 移動先のアートボードの中心座標を計算
    var targetRect = artboards[prevIndex].artboardRect;
    var targetAbCenterX = (targetRect[0] + targetRect[2]) / 2;
    var targetAbCenterY = (targetRect[1] + targetRect[3]) / 2;

    // オフセットを適用して新しい画面中心を設定
    var newViewCenterX = targetAbCenterX + offsetX;
    var newViewCenterY = targetAbCenterY + offsetY;

    // ビューを更新
    view.centerPoint = [newViewCenterX, newViewCenterY];
    view.zoom = currentZoom;

})();