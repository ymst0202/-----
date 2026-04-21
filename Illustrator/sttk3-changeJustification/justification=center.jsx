/**
  * @file 選択したテキストフレームの位置を変えずに行揃えを変更する。縦組み／横組みは問わない。<br />
  * Illustratorのバグの影響で，左揃えの場合は以下のように動く（はず）<br />
  * 〜CS3：普通に左揃えにする<br />
  * CS4〜CS5：均等配置（最終行左揃え）にする<br />
  * CS6〜：アクション即時生成により左揃えにする
  * @version 1.1.0
  * @author sttk3.com
  * @copyright © 2021 sttk3.com
*/

//#target 'illustrator'

(function(argv) {
  if(app.documents.length <= 0) {return ;}
  var doc = app.documents[0] ;
  var sel = allPageItemOfSelection(doc.selection) ;
  if(sel.length <= 0) {return ;}
  var targetItems = filterItems(function(aItem) {return /^TextFrame$/.test(aItem.constructor.name)}, sel) ;
  var len = targetItems.length ;
  if(len <= 0) {return ;}
  var aiVersion = appVersion()[0] ;

  // 実行中のスクリプトのファイル名を取得
  var thisFile = new File($.fileName) ;
  var tempName = thisFile.name ;
  
  // ファイル名から引数を生成
  var filenameStr = decodeURIComponent(tempName.replace(/\.js(?:x|xbin)?$/i, '')) ;
  var matchObj = filenameStr.match(/^justification[\s　]*[=＝][\s　]*(argv|FULLJUSTIFYLASTLINELEFT|FULLJUSTIFYLASTLINECENTER|FULLJUSTIFYLASTLINERIGHT|FULLJUSTIFY|LEFT|CENTER|RIGHT)$/i) ;
  if(matchObj) {
    var jstStr = matchObj[1].toString().toUpperCase() ;
  } else {
    return ;
  }
  
  // jstStrの部分が'argv'だったらargumentsでjstStrを指定されているとみなす
  if(jstStr == 'ARGV') {
    jstStr = [$.getenv('sttk3_arguments')] ;
    if(jstStr == null || jstStr == '') {
      if(argv.length <= 0) {return ;}
    }
    jstStr = argv[0].toString().toUpperCase() ;
  }

  var justificationTable = {
    'LEFT': Justification.LEFT, 
    'CENTER': Justification.CENTER, 
    'RIGHT': Justification.RIGHT, 
    'FULLJUSTIFYLASTLINELEFT': Justification.FULLJUSTIFYLASTLINELEFT, 
    'FULLJUSTIFYLASTLINECENTER': Justification.FULLJUSTIFYLASTLINECENTER, 
    'FULLJUSTIFYLASTLINERIGHT': Justification.FULLJUSTIFYLASTLINERIGHT, 
    'FULLJUSTIFY': Justification.FULLJUSTIFY
  } ;
  var newJustification = justificationTable[jstStr] ;
  if(newJustification == null) {return ;}
  
  // 左/上揃え設定が無視されるIllustrator CS4からのバグのため，均等配置（最終行左揃え）で進行する。
  // CS6以上なら最終的にアクションで左/上揃えにするが，それ未満は（JSでは）打つ手がないので均等配置のまま終了する
  var needAction = false ;
  if(newJustification == Justification.LEFT && aiVersion >= 14) {
    newJustification = Justification.FULLJUSTIFYLASTLINELEFT ;
    needAction = true ;
  }
  
  var modified = false ;
  var currentFrame, pos ;
  for(var i = 0 ; i < len ; i++) {
    currentFrame = targetItems[i] ;
    
    // 行揃え変更
    pos = currentFrame.position ;
    try {
      if(currentFrame.story.textRange.justification != newJustification) {
        currentFrame.story.textRange.justification = newJustification ;
        if(currentFrame.kind == TextType.POINTTEXT) {
          currentFrame.position = pos ;
        }
        modified = true ;
      }
    } catch(e) {
      // 孤立点はエラー。スキップして次へ
    }
  }
  
  // 左/上揃え仕上げ処理。アクション即時生成を使うのでCS6以上が必要
  if(needAction && modified && aiVersion >= 16) {
    var actionCode = template(function(expr) {/*
/version 3
/name [ 23
	5f5f7374746b335f6a757374696669636174696f6e5f5f
]
/isOpen 1
/actionCount 1
/action-1 {
	/name [ 4
		6c656674
	]
	/keyIndex 0
	/colorIndex 0
	/isOpen 0
	/eventCount 1
	/event-1 {
		/useRulersIn1stQuadrant 0
		/internalName (adobe_SLOParagraphPalette)
		/localizedName [ 6
			e6aeb5e890bd
		]
		/isOpen 0
		/isOn 1
		/hasDialog 0
		/parameterCount 1
		/parameter-1 {
			/key 1634494830
			/showInPalette 4294967295
			/type (enumerated)
			/name [ 9
				e5b7a6e68f83e38188
			]
			/value 0
		}
	}
}
*/ return eval(expr) ;}) ;
    
    // 左揃えを実行する
    tempAction(actionCode, function(actionItems) {
      actionItems[0].exec(false) ;
    }) ;
  }
})(arguments) ;
interpolate = hexToString = ActionItem = ActionItems = null ;

/**
  * スクリプト実行元アプリケーションのバージョンを取得して数値の配列にする。16.0.4の場合[16, 0, 4]
  * @return {Array of numbers}
*/
function appVersion() {
  var tmp = app.version.toString().split('.') ;
  var res = [] ;
  for(var i = 0, len = tmp.length ; i < len ; i++) {
    res.push(Number(tmp[i])) ;
  }
  return res ;
}

/**
  * 複数行の文字を簡単に記述するための機能。func内のコメントで囲まれた部分の文字を取り出す<br />
  * ${ 式 } という形で式展開できる。\} とエスケープすれば } という文字も使える<br />
  * '''や"""のようなトリプルクォートで書けることがわかりいらなくなった。ただCS4未満でも構文チェックに通るようにしたいときは使えるかもしれない
  * @param {Function} func テキストを記入するFunction
  * @return {String} 
*/
function template(func) {
  var interpolate = function(str) {
    // 正規表現のループ展開で，式展開の中身をキャプチャするモデル
    // Prefix Start Space ( Normal* (?: Escape Normal* )* ) Space End
    // 例えば ${ expression } の場合
    // /\$\{\s*([^\}\\]*(?:\\}[^\}\\]*)*)\s*\}/g
    
    // 変更可能な設定。#{ } でも %r| | でも好きなのを書けば良し。
    // 目的の文字が正規表現のメタキャラクタの場合はエスケープが必要
    var strPrefix = '\\$' ;
    var strStart = '\\{' ; // 1文字限定
    var strEnd = '\\}' ; // 1文字限定
    
    // 変更しない設定
    var strBS = String.fromCharCode(92) ; // backslash
    var strSpace = strBS + 's*' ;
    var strNormal = '[^' + strBS + strEnd + strBS + strBS + ']' ;
    var strEscape = strBS + strBS + strEnd ;
    var strWhole = strPrefix + strStart + strSpace + '(' + strNormal + '*(?:' + strEscape + strNormal + '*)*)' + strSpace + strEnd ;
    var reg = new RegExp(strWhole, 'g') ;
    
    return str.replace(reg, function(m0, m1) {
      var v = '' ;
      try {
        v = func(m1) ; 
      } catch(e) {
        v = e ;
      }
      return v ;
    }) ;
  } ;
  
  var outgoingStr = func.toString().match(/\/\*\s*([^]+?)\s*\*\//)[1] ;
  outgoingStr = interpolate(outgoingStr) ;
  return outgoingStr ;
}

/**
  * アクションを文字列から生成し実行するブロック構文。終了時・エラー発生時の後片付けは自動
  * @param {String} actionCode アクションのソースコード
  * @param {Function} func ブロック内処理をここに記述する
  * @return なし
*/
function tempAction(actionCode, func) {
  // utf8の16進数文字コードをJavaScript内部で扱える文字列に変換する
  var hexToString = function(hex) {
    var res = decodeURIComponent(hex.replace(/(.{2})/g, '%$1')) ;
    return res ;
  } ;

  // ActionItemのconstructor。ActionItem.exec()を使えばわざわざ名前を直接指定しなくても実行できる
  var ActionItem = function ActionItem(index, name, parent) {
    this.index = index ;
    this.name = name ; // actionName
    this.parent = parent ; // setName
  } ;
  ActionItem.prototype.exec = function(showDialog) {
    doScript(this.name, this.parent, showDialog) ;
  } ;
  
  // ActionItemsのconstructor。
  // ActionItems['actionName'],  ActionItems.getByName('actionName'),  
  // ActionItems[0],  ActionItems.index(-1)
  // などの形式で中身のアクションを取得できる
  var ActionItems = function ActionItems() {
    this.length = 0 ;
  } ;
  ActionItems.prototype.getByName = function(nameStr) {
    for(var i = 0, len = this.length ; i < len ; i++) {
      if(this[i].name == nameStr) {return this[i] ;}
    }
  } ;
  ActionItems.prototype.index = function(keyNumber) {
    var res ;
    if(keyNumber >= 0) {
      res = this[keyNumber] ;
    } else {
      res = this[this.length + keyNumber] ;
    }
    return res ;
  } ;
  
  // アクションセット名を取得
  var regExpSetName = /^\/name\s+\[\s+\d+\s+([^\]]+?)\s+\]/m ;
  var setName = hexToString(actionCode.match(regExpSetName)[1].replace(/\s+/g, '')) ;
  
  // セット内のアクションを取得
  var regExpActionNames = /^\/action-\d+\s+\{\s+\/name\s+\[\s+\d+\s+([^\]]+?)\s+\]/mg ;
  var actionItemsObj = new ActionItems() ;
  var i = 0 ;
  var matchObj ;
  while(matchObj = regExpActionNames.exec(actionCode)) {
    var actionName = hexToString(matchObj[1].replace(/\s+/g, '')) ;
    var actionObj = new ActionItem(i, actionName, setName) ;
    actionItemsObj[actionName] = actionObj ;
    actionItemsObj[i] = actionObj ;
    i++ ;
    if(i > 1000) {break ;} // limiter
  }
  actionItemsObj.length = i ;
  
  // aiaファイルとして書き出し
  var failed = false ;
  var aiaFileObj = new File(Folder.temp + '/tempActionSet.aia') ;
  try {
    aiaFileObj.open('w') ;
    aiaFileObj.write(actionCode) ;
  } catch(e) {
    failed = true ;
    alert(e) ;
    return ;
  } finally {
    aiaFileObj.close() ;
    if(failed) {try {aiaFileObj.remove() ;} catch(e) {}}
  }
  
  // 同名アクションセットがあったらunloadする。これは余計なお世話かもしれない
  try {app.unloadAction(setName, '') ;} catch(e) {}
  
  // アクションを読み込み実行する
  var actionLoaded = false ;
  try {
    app.loadAction(aiaFileObj) ;
    actionLoaded = true ;
    func.call(func, actionItemsObj) ;
  } catch(e) {
    alert(e) ;
  } finally {
    // 読み込んだアクションと，そのaiaファイルを削除
    if(actionLoaded) {app.unloadAction(setName, '') ;}
    aiaFileObj.remove() ;
  }
}

/**
  * selectionからgroupItemの中身を含めたすべてのpageItemを返す
  * @param {Array} sel selection
  * @return {Array}
*/
function allPageItemOfSelection(sel) {
  var res = [] ;
  for(var i = 0, len = sel.length ; i < len ; i++) {
    var currentItem = sel[i] ;
    switch(currentItem.constructor.name) {
      case 'GroupItem' :
        res.push(currentItem) ;
        res = res.concat(arguments.callee(currentItem.pageItems)) ;
        break ;
      default :
        res.push(currentItem) ;
        break ;
    }
  }

  return res ;
}

/**
  * Array.filterみたいなもの
  * @param {Function} func 条件式
  * @param {Array} targetItems 対象のArrayかcollection。lengthとindexがあれば何でもいい
  * @return {Array}
*/
function filterItems(func, targetItems) {
  var res = [] ;
  for(var i = 0, len = targetItems.length ; i < len ; i++) {
    if(i in targetItems) {
      var val = targetItems[i] ;
      if(func.call(targetItems, val, i)) {res.push(val) ;}
    }
  }
  return res ;
}