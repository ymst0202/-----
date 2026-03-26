#target premierepro

// 指定されたパスでビンを検索し、そのビン内のアイテム名でアイテムを返す関数
function findItemByPathRecursive(baseItem, pathArray, itemName) {
    var currentSearchItem = baseItem;
    var targetBin = null;

    // 1. 階層をたどって目的のビンを見つける
    if (pathArray && pathArray.length > 0 && pathArray[0] !== "") {
        var currentPathPart = pathArray[0];
        var remainingPathArray = pathArray.slice(1);
        var foundNextBin = null;

        if (currentSearchItem && currentSearchItem.children) {
            for (var i = 0; i < currentSearchItem.children.numItems; i++) {
                var child = currentSearchItem.children[i];
                if (child.name === currentPathPart && child.children) { // ビンであると仮定
                    foundNextBin = child;
                    break;
                }
            }
        }
        if (foundNextBin) {
            // 再帰的呼び出しで深い階層へ
            return findItemByPathRecursive(foundNextBin, remainingPathArray, itemName);
        } else {
            // 途中のビンが見つからない
            return null;
        }
    } else {
        // pathArrayが空か、最後の要素に到達したので、現在のcurrentSearchItem (目的のビンのはず) 内でitemNameを探す
        targetBin = currentSearchItem;
    }

    // 2. 最終的なビン (targetBin) の中でアイテムを名前で検索
    if (targetBin && targetBin.children) {
        for (var k = 0; k < targetBin.children.numItems; k++) {
            var itemInBin = targetBin.children[k];
            if (itemInBin.name === itemName) {
                // ProjectItemType.CLIP (1) であることを確認するのが望ましい
                // if (itemInBin.type === 1) { return itemInBin; }
                return itemInBin; // 今回は名前一致のみ
            }
        }
    }
    return null; // アイテムが見つからなければ null
}

function placeImportedImagesWithFullPathBin() {

    var log = "画像配置(階層ビン対応)ログ:\n";

    // --- ユーザー設定 ---
    var pngFilePrefix = "t 2 #2 ";
    var projectBinPath = "03_Works/ai_telop"; // 例: "フォルダA/サブフォルダB" ルートは ""
    var baseTrackIndex = 1; //ゼロはじまり
    var targetTrackIndex = 2;
    // --- ここまで
    var pngStartNumber = 1;
    var pngDigits = 1;
    // --------------------

    var project = app.project;
    if (!project) { log += "エラー: プロジェクトなし\n"; alert(log); return; }
    var sequence = project.activeSequence;
    if (!sequence) { log += "エラー: シーケンスなし\n"; alert(log); return; }

    // (ログやトラック取得は同様)
    var baseTrack = sequence.videoTracks[baseTrackIndex];
    var targetTrack = sequence.videoTracks[targetTrackIndex];
    if (!baseTrack || !targetTrack || baseTrackIndex === targetTrackIndex) {
         log += "エラー: トラック設定誤り\n"; alert(log); return;
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
        var currentFileNumber = pngStartNumber + j;
        var numberString = currentFileNumber.toString();
        while (numberString.length < pngDigits) { numberString = "0" + numberString; }
        var targetItemName = pngFilePrefix + numberString + ".png";

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
    } // end of for loop

    var summary = "処理完了:\n" +
                  "試行アイテム数: " + timeInfos.length + "\n" +
                  "配置成功: " + placedCount + "件\n" +
                  "アイテム未発見: " + notFoundCount + "件\n" +
                  "配置/調整エラー: " + placementErrorCount + "件\n\n" +
                  "";
                //   "詳細ログ:\n" + log;
    alert(summary);
}

try {
    placeImportedImagesWithFullPathBin();
} catch (e_global) {
    alert("グローバルスコープで致命的なエラー:\n" + e_global.toString());
}