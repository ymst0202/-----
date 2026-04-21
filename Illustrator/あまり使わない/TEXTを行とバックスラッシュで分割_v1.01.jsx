//########################
//IllustratorCS4でTEXTを行で分割-縦
//たけうちとおる
//########################

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
	var mysele = new Array();
	for(s = 0;s < sele_count; s++){
		mysele[s] = app.documents[0].selection[s];
	}
	for(s = 0;s < sele_count; s++){
		var mypageitem_type = mysele[s].typename;
		if(mypageitem_type == "TextFrame"){
			dup_text_frames(mysele[s]);
		}
		mysele[s].remove();
	}
}

function dup_text_frames(mysele){
	var para_count = mysele.paragraphs.length;
	var mysele_pos = mysele.position;
	var myX = mysele_pos[0];
	var myY = mysele_pos[1];
	var para_H = mysele.paragraphs[0].length;
	for(p = 0; p < para_count; p++){
		try {
			var thisPara = mysele.paragraphs[p];
			var mySize = thisPara.size;
			var plusH = thisPara.leading;
			if(plusH == 0){ plusH = mySize * 1.2; }
	
			var cont_ary = thisPara.contents.split("\\");
			for(c = 0; c < cont_ary.length; c++){
				var dup_text_frame = mysele.duplicate(documents[0].activeLayer);
				dup_text_frame.contents = cont_ary[c];
				var moveX = myX + (mySize * 5 * c);
				dup_text_frame.position = Array(moveX, myY);
			}
			myY = myY - plusH;
		} catch(e) {
			alert( (s+1) + " 個目のテキストでエラーが発生しました。\n---\n"+ mysele.paragraphs +"\n--- " + e);
			continue;
		}
	}
	//mysele.contents = mysele.paragraphs[p].contents;
	//mysele.position = Array(myX,myY);
}