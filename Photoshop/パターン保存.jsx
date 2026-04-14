// Photoshopでパターンを定義（保存）するスクリプト

function definePattern(patternName) {
    try {
        var idMk = charIDToTypeID( "Mk  " );
        var desc1 = new ActionDescriptor();
        
        var idnull = charIDToTypeID( "null" );
        var ref1 = new ActionReference();
        var idPtrn = charIDToTypeID( "Ptrn" );
        ref1.putClass( idPtrn );
        desc1.putReference( idnull, ref1 );
        
        var idUsng = charIDToTypeID( "Usng" );
        var ref2 = new ActionReference();
        var idPrpr = charIDToTypeID( "Prpr" );
        var idfsel = charIDToTypeID( "fsel" );
        ref2.putProperty( idPrpr, idfsel );
        var idDcmn = charIDToTypeID( "Dcmn" );
        var idOrdn = charIDToTypeID( "Ordn" );
        var idTrgt = charIDToTypeID( "Trgt" );
        ref2.putEnumerated( idDcmn, idOrdn, idTrgt );
        desc1.putReference( idUsng, ref2 );
        
        // パターン名の設定
        var idNm = charIDToTypeID( "Nm  " );
        desc1.putString( idNm, patternName );
        
        // アクションの実行
        executeAction( idMk, desc1, DialogModes.NO );
        
        alert("パターン「" + patternName + "」を保存しました！");
    } catch (e) {
        alert("エラーが発生しました。ドキュメントが開かれているか確認してください。\n" + e);
    }
}

// ドキュメントが開かれているかチェック
if (app.documents.length > 0) {
    // ユーザーにパターン名を入力させるダイアログを表示
    var myPatternName = prompt("保存するパターンの名前を入力してください:", "新規パターン");
    
    // キャンセルされなかった場合のみ実行
    if (myPatternName !== null && myPatternName !== "") {
        definePattern(myPatternName);
    }
} else {
    alert("パターンとして保存するドキュメントを開いてください。");
}