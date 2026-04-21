(function() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            alert("アクティブなシーケンスがありません。");
            return;
        }

        // --- ユーザー入力 (テンキーのみ) ---
        var msg = "アンカーポイントの位置をテンキー(1〜9)で入力\n\n" +
                  " [7]左上  [8]上中央  [9]右上\n" +
                  " [4]左中央 [5]中央    [6]右中央\n" +
                  " [1]左下  [2]下中央  [3]右下";
        
        var userInput = prompt(msg, "8");
        if (userInput === null) return;

        var posKey = userInput.replace(/\s/g, "");
        var xMult = 0.5; var yMult = 0.5;

        switch(posKey) {
            case "7": xMult = 0.0; yMult = 0.0; break;
            case "8": xMult = 0.5; yMult = 0.0; break;
            case "9": xMult = 1.0; yMult = 0.0; break;
            case "4": xMult = 0.0; yMult = 0.5; break;
            case "5": xMult = 0.5; yMult = 0.5; break;
            case "6": xMult = 1.0; yMult = 0.5; break;
            case "1": xMult = 0.0; yMult = 1.0; break;
            case "2": xMult = 0.5; yMult = 1.0; break;
            case "3": xMult = 1.0; yMult = 1.0; break;
            default:
                alert("1〜9の半角数字を入力してください。");
                return;
        }

        // シーケンス解像度の取得
        var seqWidth = 1920;
        var seqHeight = 1080;
        if (seq.frameSizeHorizontal && seq.frameSizeVertical) {
            seqWidth = seq.frameSizeHorizontal;
            seqHeight = seq.frameSizeVertical;
        }

        var videoTracks = seq.videoTracks;
        var modifiedCount = 0;

        for (var i = 0; i < videoTracks.numTracks; i++) {
            var track = videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                
                if (clip.isSelected()) {
                    var sourceWidth = 0;
                    var sourceHeight = 0;
                    
                    if (clip.projectItem) {
                        // XMLメタデータを文字列として丸ごと取得
                        var pMeta = clip.projectItem.getProjectMetadata() || "";
                        var xMeta = clip.projectItem.getXMPMetadata() || "";
                        
                        // 【超強化版1】Premiere特有の「1920 x 1080 (1.0)」のような記述をタグ名無視で強制抽出
                        var pRegex1 = />(?:<!\[CDATA\[)?\s*(\d{3,5})\s*[xX]\s*(\d{3,5})\s*(?:\([^)]+\))?\s*(?:\]\]>)?</i;
                        var match1 = pMeta.match(pRegex1);
                        if (match1) {
                            sourceWidth = parseInt(match1[1], 10);
                            sourceHeight = parseInt(match1[2], 10);
                        }
                        
                        // 【超強化版2】それでもダメなら、文字の羅列から「数字 x 数字」を無差別に抽出
                        if (!sourceWidth || !sourceHeight) {
                            var pRegex2 = /(?:>|\[CDATA\[|\s)(\d{3,5})\s*[xX]\s*(\d{3,5})(?:<|\]\]>|\s|\()/i;
                            var match2 = pMeta.match(pRegex2);
                            if (match2) {
                                sourceWidth = parseInt(match2[1], 10);
                                sourceHeight = parseInt(match2[2], 10);
                            }
                        }

                        // 【画像用フォールバック】XMP内部の各タグを網羅検索
                        if (!sourceWidth || !sourceHeight) {
                            var wMatch = xMeta.match(/<tiff:ImageWidth>(\d+)<\/tiff:ImageWidth>/i) ||
                                         xMeta.match(/<exif:PixelXDimension>(\d+)<\/exif:PixelXDimension>/i) ||
                                         xMeta.match(/<stDim:w>(\d+)<\/stDim:w>/i) ||
                                         xMeta.match(/stDim:w="(\d+)"/i);
                                         
                            var hMatch = xMeta.match(/<tiff:ImageLength>(\d+)<\/tiff:ImageLength>/i) ||
                                         xMeta.match(/<exif:PixelYDimension>(\d+)<\/exif:PixelYDimension>/i) ||
                                         xMeta.match(/<stDim:h>(\d+)<\/stDim:h>/i) ||
                                         xMeta.match(/stDim:h="(\d+)"/i);
                                         
                            if (wMatch && hMatch) {
                                sourceWidth = parseInt(wMatch[1], 10);
                                sourceHeight = parseInt(hMatch[1], 10);
                            }
                        }
                    }

                    // 万が一の最終防衛ライン
                    if (!sourceWidth || !sourceHeight) {
                        var fallback = prompt("【確認】サイズを自動取得できませんでした。\n手動で入力してください。", "1920x1080");
                        if (fallback) {
                            var sizes = fallback.toLowerCase().split("x");
                            sourceWidth = parseInt(sizes[0], 10) || seqWidth;
                            sourceHeight = parseInt(sizes[1], 10) || seqHeight;
                        } else {
                            continue;
                        }
                    }

                    // --- アンカーと位置の補正処理 ---
                    for (var c = 0; c < clip.components.numItems; c++) {
                        var comp = clip.components[c];
                        if (comp.displayName === "Motion" || comp.displayName === "モーション") {
                            
                            var posProp = null;
                            var scaleProp = null;
                            var anchorProp = null;

                            for (var p = 0; p < comp.properties.numItems; p++) {
                                var prop = comp.properties[p];
                                if (prop.displayName === "Position" || prop.displayName === "位置") {
                                    posProp = prop;
                                } else if (prop.displayName === "Scale" || prop.displayName === "スケール") {
                                    scaleProp = prop;
                                } else if (prop.displayName === "Anchor Point" || prop.displayName === "アンカーポイント") {
                                    anchorProp = prop;
                                }
                            }
                            
                            if (posProp && anchorProp && scaleProp) {
                                var currentPos = posProp.getValue();
                                var currentAnchor = anchorProp.getValue();
                                var currentScale = scaleProp.getValue();
                                
                                var newAnchorNorm = [xMult, yMult];
                                
                                var deltaAnchorNormX = newAnchorNorm[0] - currentAnchor[0];
                                var deltaAnchorNormY = newAnchorNorm[1] - currentAnchor[1];
                                
                                // あぶり出した正確なサイズで計算
                                var pixelMoveX = deltaAnchorNormX * sourceWidth * (currentScale / 100);
                                var pixelMoveY = deltaAnchorNormY * sourceHeight * (currentScale / 100);
                                
                                var deltaPosNormX = pixelMoveX / seqWidth;
                                var deltaPosNormY = pixelMoveY / seqHeight;
                                
                                var newPosNorm = [
                                    currentPos[0] + deltaPosNormX,
                                    currentPos[1] + deltaPosNormY
                                ];
                                
                                anchorProp.setValue(newAnchorNorm, 1);
                                posProp.setValue(newPosNorm, 1);
                                
                                modifiedCount++;
                            }
                        }
                    }
                }
            }
        }
        
        if (modifiedCount === 0) {
            alert("クリップが選択されていないか、処理できませんでした。");
        }

    } catch (e) {
        alert("実行エラー: " + e.toString());
    }
})();