//  script.description = splits selected texFrame into separate characters;  
//  script.required = select a point text textFrame before running;  
//  script.parent = CarlosCanto;  // 3/5/11  
//  script.elegant = false;  

var idoc = app.activeDocument;  
var tWord = idoc.selection[0];  
var xpos = tWord.position[0];  
var ypos = tWord.position[1];  
var charCount = tWord.characters.length;  

for (i=charCount-1 ; i>=0 ; i--)  
     {  
          var ichar = tWord.duplicate();  
          ichar.contents = tWord.characters[i].contents;  
          tWord.characters[i].remove();  
          var width = tWord.width;  
          ichar.position = [xpos+width,ypos];  
     }  
tWord.remove(); 