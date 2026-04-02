#target premierepro

// 指定されたパスでビンを検索し、そのビン内のアイテム名でアイテムを返す関数
function findItemByPathRecursive(baseItem, pathArray, itemName) {
    var currentSearchItem = baseItem;
    var targetBin = null;

    if (pathArray && pathArray.length > 0 && pathArray[0] !== "") {
        var currentPathPart = pathArray[0];
        var remainingPathArray = pathArray.slice(1);
        var foundNextBin = null;

        if (currentSearchItem && currentSearchItem.children) {
            for (var i = 0; i < currentSearchItem.children.numItems; i++) {
                var child = currentSearchItem.children[i];
                if (child.name === currentPathPart && child.children) {
                    foundNextBin = child;
                    break;
                }
            }
        }
        if (foundNextBin) {
            return findItemByPathRecursive(foundNextBin, remainingPathArray, itemName);
        } else {
            return null;
        }
    } else {
        targetBin = currentSearchItem;
    }

    if (targetBin && targetBin.children) {
        for (var k = 0; k < targetBin.children.numItems; k++) {
            var itemInBin = targetBin.children[k];
            if (itemInBin.name === itemName) {
                return itemInBin; 
            }
        }
    }
    return null;
}

function placeImportedImagesWithFullPathBin() {

    // ==========================================
    // --- ユーザー入力ダイアログ処理（JSXLauncher対応版） ---
    // ==========================================
    
    // 1. 画像名の接頭辞
    var filePrefix = prompt("1/5: 画像名の接頭辞 (Prefix) を入力してください:", "t 2 #2 ");
    if (filePrefix === null) return; // キャンセルされたら終了

    // 2. 拡張子の指定
    var fileExt = prompt("2/5: 画像の拡張子を入力してください（例: .png, .jpg, .psd）", ".png");
    if (fileExt === null) return;
    
    // 入力された拡張子の先頭に「.」がない場合は自動で付与する
    if (fileExt.charAt(0) !== '.') {
        fileExt = '.' + fileExt;
    }

    // 3. ビンパス
    var projectBinPath = prompt("3/5: 画像が格納されているビンパスを入力してください:\n（プロジェクト直下の場合は空欄にしてください）", "03_Works/ai_telop");
    if (projectBinPath === null) return;

    // 4. トラック情報
    var tracksInput = prompt("4/5: 【トラック設定】\n「基準となるビデオトラック番号」と「画像を配置するビデオトラック番号」を半角カンマ区切りで入力してください。\n（例: V2を基準にしてV3に置く場合 → 2,3）", "2,3");
    if (tracksInput === null) return;
    var trackParts = tracksInput.split(",");
    if (trackParts.length < 2) {
        alert("トラック番号が正しく入力されませんでした。処理を中止します。");
        return;
    }
    var baseTrackIndex = parseInt(trackParts[0], 10) - 1; // 内部的には0始まり
    var targetTrackIndex = parseInt(trackParts[1], 10) - 1;
    
    if (isNaN(baseTrackIndex) || isNaN(targetTrackIndex) || baseTrackIndex < 0 || targetTrackIndex < 0) {
        alert("無効なトラック番号です。処理を中止します。");
        return;
    }

    // 5. 連番設定
    var numberInput = prompt("5/5: 【連番設定】\n「開始番号」と「桁数」を半角カンマ区切りで入力してください。\n（例: 1から開始でゼロ埋めなし → 1,1 \n 001から開始で3桁 → 1,3）", "1,1");
    if (numberInput === null) return;
    var numParts = numberInput.split(",");
    if (numParts.length < 2) {
        alert("連番設定が正しく入力されませんでした。処理を中止します。");
        return;
    }
    var startNumber = parseInt(numParts[0], 10);
    var numDigits = parseInt(numParts[1], 10);

    if (isNaN(startNumber) || isNaN(numDigits)) {
        alert("無効な数値です。処理を中止します。");
        return;
    }
    // ==========================================
    // --- ここまで ---
    // ==========================================

    var log = "画像配置(階層ビン対応)ログ:\n";
    var project = app.project;
    if (!project) { log += "エラー: プロジェクトなし\n"; alert(log); return; }
    var sequence = project.activeSequence;
    if (!sequence) { log += "エラー: シーケンスなし\n"; alert(log); return; }

    var baseTrack = sequence.videoTracks[baseTrackIndex];
    var targetTrack = sequence.videoTracks[targetTrackIndex];
    if (!baseTrack || !targetTrack || baseTrackIndex === targetTrackIndex) {
         log += "エラー: トラック設定誤り(指定されたトラックが存在しない、または同じトラックです)\n"; alert(log); return;
    }
    
    var timeInfos = [];
    if (baseTrack.clips.numItems === 0) {
        log += "エラー: 基準クリップなし\n"; alert(log); return;
    }
    for (var i = 0; i < baseTrack.clips.numItems; i++) {
        var clip = baseTrack.clips[i];
        timeInfos.push({ startSeconds: clip.start.seconds, endSeconds: clip.end.seconds });
    }
    log += "基準クリップ情報 " + timeInfos.length + "件収集\n";
    if (timeInfos.length === 0) { log+="収集0件\n"; alert(log); return; }

    var placedCount = 0;
    var notFoundCount = 0;
    var placementErrorCount = 0;
    
    var pathArrayForSearch = [];
    if (projectBinPath && projectBinPath !== "") {
        pathArrayForSearch = projectBinPath.replace(/\\/g, "/").split('/');
    }

    for (var j = 0; j < timeInfos.length; j++) {
        var currentFileNumber = startNumber + j;
        var numberString = currentFileNumber.toString();
        while (numberString.length < numDigits) { numberString = "0" + numberString; }
        
        // ★修正ポイント: 入力された拡張子をファイル名に結合
        var targetItemName = filePrefix + numberString + fileExt;

        log += "処理中: " + targetItemName + " (ビンパス: " + projectBinPath + ")\n";

        var projectItemToPlace = findItemByPathRecursive(project.rootItem, pathArrayForSearch, targetItemName);

        if (!projectItemToPlace) {
            log += "  -> 見つからず\n";
            notFoundCount++;
            continue;
        }
        log += "  -> 発見: " + projectItemToPlace.name + " (型: " + projectItemToPlace.type + ")\n";

        try {
            var placementStartTimeObj = new Time();
            placementStartTimeObj.seconds = timeInfos[j].startSeconds;
            
            targetTrack.overwriteClip(projectItemToPlace, placementStartTimeObj);
            
            var placedClip = null;
            for (var l = targetTrack.clips.numItems - 1; l >= 0; l--) {
                var clipOnTrack = targetTrack.clips[l];
                if (clipOnTrack.projectItem && clipOnTrack.projectItem.nodeId === projectItemToPlace.nodeId &&
                    Math.abs(clipOnTrack.start.seconds - placementStartTimeObj.seconds) < (1/sequence.timebase)/2 ) {
                    placedClip = clipOnTrack; break;
                }
            }
            
            if (placedClip) {
                var placementEndTimeObj = new Time();
                placementEndTimeObj.seconds = timeInfos[j].endSeconds;
                placedClip.end = placementEndTimeObj;
                
                if (Math.abs(placedClip.end.seconds - placementEndTimeObj.seconds) < (1/sequence.timebase)/2) {
                    log += "  -> 配置・デュレーション調整成功\n";
                    placedCount++;
                } else {
                    log += "  -> 警告: デュレーション調整ズレの可能性\n";
                    placementErrorCount++; 
                }
            } else {
                log += "  -> エラー: 配置後クリップ確認失敗\n";
                placementErrorCount++;
            }
        } catch (e_placement) {
            log += "  -> エラー: タイムライン配置中: " + e_placement.toString() + "\n";
            placementErrorCount++;
        }
    } 

    var summary = "処理完了:\n" +
                  "試行アイテム数: " + timeInfos.length + "\n" +
                  "配置成功: " + placedCount + "件\n" +
                  "アイテム未発見: " + notFoundCount + "件\n" +
                  "配置/調整エラー: " + placementErrorCount + "件\n\n";
    alert(summary);
}

try {
    placeImportedImagesWithFullPathBin();
} catch (e_global) {
    alert("グローバルスコープで致命的なエラー:\n" + e_global.toString());
}