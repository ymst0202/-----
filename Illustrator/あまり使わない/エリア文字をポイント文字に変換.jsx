//########################
//IllustratorCS4でTEXTを行で分割-縦
//たけうちとおる
//########################

var myPt = 1;
main();
function main(){
	if (app.documents.length == 0){
		alert("ドキュメントを開いてください");
		return;
	}
	if (app.selection.length == 0){
		alert("テキストフレームを1つ以上選択してください");
		return;
	}
	var sele_count = app.selection.length;
	for(s = 0;s < sele_count; s++){
		app.activeDocument.selection[0].convertAreaObjectToPointObject();
	}
}