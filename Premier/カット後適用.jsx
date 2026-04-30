// Premiere Pro スクリプト: 選択したクリップのイン点をプロジェクトアイテムにコピーする
function syncInPointForReplace() {
    var proj = app.project;
    if (!proj) return;
    
    var seq = proj.activeSequence;
    var projSel = proj.getProjectViewSelection();

    if (!seq) {
        alert("アクティブなシーケンスがありません。");
        return;
    }
    if (projSel.length === 0) {
        alert("プロジェクトパネルで置き換え先となるアイテム（マルチカメラクリップ等）を選択してください。");
        return;
    }

    var targetProjItem = projSel[0];
    var targetTrackItem = null;

    // タイムラインの選択クリップを取得 (ビデオトラックを走査)
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
        var track = seq.videoTracks[i];
        for (var j = 0; j < track.clips.numTracks; j++) {
            if (track.clips[j].isSelected()) {
                targetTrackItem = track.clips[j];
                break;
            }
        }
        if (targetTrackItem) break;
    }

    if (!targetTrackItem) {
        alert("タイムライン上で置き換え元となるクリップを選択してください。");
        return;
    }

    try {
        // タイムライン上のクリップのイン点（メディア内の開始タイムコード）を取得
        var inTicks = targetTrackItem.inPoint.ticks;
        
        // プロジェクトアイテムにイン点をセット (1=Video, 2=Audio)
        targetProjItem.setInPoint(inTicks, 1);
        targetProjItem.setInPoint(inTicks, 2);

        alert("✅ 準備完了!\n\nマルチカメラクリップのイン点を「" + targetTrackItem.name + "」の開始位置に合わせました。\n\nこのまま ALT (Option) + Drag でクリップを置き換えてください。");
    } catch (e) {
        alert("エラーが発生しました: " + e.toString());
    }
}

syncInPointForReplace();