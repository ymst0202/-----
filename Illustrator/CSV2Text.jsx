/**
 * 流し込みを始める行の指定
 * 
 * 253行目から流し込む等の調整を行いたい場合は、以下のstartRowで調整します。
 * 1行目＝0、253行目＝252
 */

var startRow = 0;





// https://kan-getsu.hatenablog.com/entry/2021/07/25/193014

function csvToArray(csvStrings) {
    // セルに改行コードを含むデータは Utilities.parseCsv() では parse できないため実装
    // ref. https://qiita.com/weal/items/5aa94235c40d60ef2f0c
    var i, c, r, q, v, j;
    var rows = [], row = [];

    var dataLen = csvStrings.length;
    var retCode = csvStrings.indexOf('\r\n') === -1 ? (csvStrings.indexOf('\r') === -1 ? '\n' : '\r') : '\r\n';  // 改行コードを取得
    var retCodeLen = retCode.length;

    for (i = 0, c = r = -1; i < dataLen; i++) {
        if (csvStrings.charAt(i) === '"') {  // quoted
            for (j = 0, q = i + 1; q < dataLen; j++, q++) {  // 閉 quote を探す
                var qIndex = csvStrings.indexOf('"', q);
                q = qIndex === -1 ? dataLen + 1 : qIndex;  // quote の位置, 無いなら末尾まで
                if (csvStrings.charAt(++q) !== '"') {
                    break;  //  "" なら継続
                }
            }
            row.push((v = csvStrings.substring(i + 1, (i = q) - 1), j) ? v.replace(/""/g, '"') : v);
        } else {  // not quoted
            if (c < i) {
                var commaIndex = csvStrings.indexOf(',', i);
                c = commaIndex === -1 ? dataLen : commaIndex;  // 直近のカンマ位置と
            }
            if (r < i) {
                var retCodecIndex = csvStrings.indexOf(retCode, i);
                r = retCodecIndex === -1 ? dataLen : retCodecIndex;  // 直近の改行位置を調べ
            }
            row.push(csvStrings.substring(i, (i = c < r ? c : r)));  // そこまでを値とする
        }
        if (i === r || retCode === (retCodeLen > 1 ? csvStrings.substr(i, retCodeLen) : csvStrings.charAt(i))) {
            rows.push(row);
            row = [];
            i += retCodeLen - 1;
        }
    }

    csvStrings.charAt(i - 1) === ',' && row.push('');  // , で終わる
    row.length && rows.push(row);
    return rows;
}





// 参考： https://damema.net/article/100/

var docObj = activeDocument;
var targetObj = [];
var result = [];

// ドキュメント内からテキストのみを取り出す
for( var i = 0; i < docObj.pageItems.length; i++ ){
    typ = docObj.pageItems[i].typename;
    if ( typ != "TextFrame" ) continue; // テキスト以外は無視
    targetObj.unshift( docObj.pageItems[i] ); // 対象を格納
}

filename = File.openDialog( "開くCSVファイルを指定してください", "*.csv" );
var fileObj = new File( filename );

var flag = fileObj.open( "r", "", "" );
if ( flag ){
    var docRef = app.activeDocument;
    var tmp = fileObj.read();
    var arr_csv = csvToArray( tmp );

    for( var i = 0; i < targetObj.length; i++ ){
        if ( arr_csv.length - startRow > i ){
            targetObj[i].contents = arr_csv[ i + startRow ][0]; // 使用するのは1列目だけ
        }
    }
}