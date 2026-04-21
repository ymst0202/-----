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
	var myRU = app.activeDocument.rulerUnits;
	if(myRU == RulerUnits.Centimeters){myPt = 28.3466796875;}
	else if(myRU == RulerUnits.Millimeters){myPt = 2.83466796875;}
    
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
	for(p = 0;p < para_count; p++){
		var mySize = mysele.paragraphs[p].size;
		var plusH = mysele.paragraphs[p].leading;
		if(plusH == 0){plusH = mySize*1.2};
		var cont_ary = mysele.paragraphs[p].contents.split("\\");
		for(c = 0;c < cont_ary.length; c++){
			var dup_text_frame = mysele.duplicate(documents[0].activeLayer);
			dup_text_frame.contents = cont_ary[c];
			var moveX = myX + (mySize*5*c)
			dup_text_frame.position = Array(moveX,myY);
		}
		myY = myY - plusH;
	}
	//mysele.contents = mysele.paragraphs[p].contents;
	//mysele.position = Array(myX,myY);
}