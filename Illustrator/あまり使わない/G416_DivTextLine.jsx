SEL = activeDocument.selection
m1 = "分割する文字を入力してください"

MAINfn()

function MAINfn(){
	if(SEL.length==0) return
	DSP = prompt(m1,"")
	if(!DSP) return
	for(s=0; s<SEL.length; s++) SELfn(SEL[s])
}

function SELfn(ss){
	if(ss.typename != 'TextFrame') return
	LIN = ss.lines
	a1=[], max=0
	for(n=0; n<LIN.length; n++){
		sp = LIN[n].contents.split(DSP)
		a1.push(sp)
		max = Math.max(max, sp.length)
	}

	b1=[]
	for(m=0; m<max; m++){
		val = ""
		for(a=0; a<a1.length; a++){
			a2 = a1[a]
			if(m >= a2.length){
				val += "\r"
			} else {
				val += a2[m] + "\r"
			}
		}
		b1.push(val)
	}

	ss.contents = b1[0]
	siz = ss.textRange.characterAttributes.size
	tx = ss.width + siz

	

	for(b=1; b<b1.length; b++){
		dup = ss.duplicate()
		dup.translate(tx, 0)
		dup.contents = b1[b]
		tx += dup.width + siz
	}
}