#target premierepro

/**
 * 目的：SE素材挿入の効率化
 * 処理：指定したビデオトラックのクリップ開始点に合わせて、
 * Projectパネルで選択中のSEをオーディオトラックに配置する
 */

function placeSelectedSEToActiveTracks() {
    
    var log = "SE一括配置ログ:\n";

    // --- ユーザー設定 ---
    // 基準とするビデオトラック（強調テロップがあるトラック）のインデックス（0始まり：V1=0, V2=1...）
    var referenceVideoTrackIndex = 1; // 例: V2を基準にする場合は 1

    // SEを配置するオーディオトラックのインデックス（0始まり：A1=0, A2=1...）
    var targetAudioTrackIndex = 1;    // 例: A2に配置する場合は 1
    // --------------------

    var project = app.project;
    if (!project) { alert("プロジェクトが開かれていません。"); return; }

    var sequence = project.activeSequence;
    if (!sequence) { alert("アクティブなシーケンスがありません。"); return; }

    // 1. プロジェクトパネルで選択されているSEを取得
    var selectedItems = project.getSelection();
    if (selectedItems.length === 0) {
        alert("エラー: Projectパネルで配置したいSE（クリップ）を選択してください。");
        return;
    }
    var seProjectItem = selectedItems[0]; // 複数選択時は最初の1つを使用
    
    // 選択アイテムがフッテージか確認（ビンなどを除外）
    if (seProjectItem.type === 2) { // 2 = BIN
         alert("エラー: ビンが選択されています。音声クリップを選択してください。");
         return;
    }

    log += "選択中SE: " + seProjectItem.name + "\n";

    // 2. トラックの取得と検証
    if (referenceVideoTrackIndex >= sequence.videoTracks.numTracks) {
        alert("エラー: 指定された基準ビデオトラック(V" + (referenceVideoTrackIndex + 1) + ")が存在しません。");
        return;
    }
    if (targetAudioTrackIndex >= sequence.audioTracks.numTracks) {
        alert("エラー: 指定された配置先オーディオトラック(A" + (targetAudioTrackIndex + 1) + ")が存在しません。");
        return;
    }

    var baseTrack = sequence.videoTracks[referenceVideoTrackIndex];
    var targetTrack = sequence.audioTracks[targetAudioTrackIndex];

    // 3. 基準トラックのクリップ位置情報を収集
    var timeInfos = [];
    if (baseTrack.clips.numItems === 0) {
        alert("基準ビデオトラック(V" + (referenceVideoTrackIndex+1) + ")にクリップがありません。");
        return;
    }

    for (var i = 0; i < baseTrack.clips.numItems; i++) {
        var clip = baseTrack.clips[i];
        // SEなので終了時間は同期させず、開始時間のみ取得する
        timeInfos.push(clip.start.seconds);
    }
    log += "配置箇所: " + timeInfos.length + "件\n";

    // 4. SEの配置処理
    var placedCount = 0;
    var errorCount = 0;

    for (var j = 0; j < timeInfos.length; j++) {
        try {
            var placementTime = new Time();
            placementTime.seconds = timeInfos[j];

            // オーディオトラックに上書き配置
            // note: overwriteClipはビデオ/オーディオ問わず使用可能ですが、配置先がAudioTrackオブジェクトである必要があります
            targetTrack.overwriteClip(seProjectItem, placementTime);
            
            placedCount++;
        } catch (e) {
            log += "配置エラー (" + j + "番目): " + e.toString() + "\n";
            errorCount++;
        }
    }

    // 結果表示
    var summary = "処理完了:\n" +
                  "配置SE: " + seProjectItem.name + "\n" +
                  "基準トラック: V" + (referenceVideoTrackIndex + 1) + "\n" +
                  "配置トラック: A" + (targetAudioTrackIndex + 1) + "\n\n" +
                  "成功: " + placedCount + "件\n" +
                  "失敗: " + errorCount + "件";
    
    // エラーがあればログも表示、なければサマリーのみ
    if(errorCount > 0){
        alert(summary + "\n\n詳細ログ:\n" + log);
    } else {
        alert(summary);
    }
}

try {
    placeSelectedSEToActiveTracks();
} catch (e_global) {
    alert("致命的なエラー:\n" + e_global.toString());
}