#target illustrator

// ドキュメントが開いているか確認
if (app.documents.length > 0) {
  try {
    // "デフォルトアクション"セット内の "アクション1" を実行
    app.doScript("center, bottom, y-14px (x10)", "Yuya");
    // alert("アクションを実行しました。");
  } catch (e) {
    alert("アクションの実行に失敗しました。\nエラー: " + e);
  }
} else {
  alert("実行対象のドキュメントが開かれていません。");
}