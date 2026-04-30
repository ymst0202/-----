(function() {
    // アクティブなシーケンスを取得
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスが開かれていません。");
        return;
    }

    // CSVファイルを選択
    var csvFile = File.openDialog("2行検知のCSVファイルを選択してください", "*.csv");
    if (!csvFile) {
        return;
    }

    // CSVの読み込み
    var targetClips = {};
    csvFile.open("r");
    while (!csvFile.eof) {
        var line = csvFile.readln();
        var clipName = line.replace(/"/g, "").replace(/^\s+|\s+$/g, "");
        if (clipName !== "") {
            targetClips[clipName] = true;
        }
    }
    csvFile.close();

    var changedCount = 0;

    // ビデオトラックを処理
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
        var track = seq.videoTracks[i];
        for (var j = 0; j < track.clips.numItems; j++) {
            var clip = track.clips[j];
            
            // クリップが存在しない、または名前がない場合はスキップ
            if (!clip || typeof clip.name !== "string") {
                continue;
            }

            // 拡張子（.pngなど）を安全に消す処理
            var clipNameWithoutExt = clip.name;
            var lastDotIndex = clipNameWithoutExt.lastIndexOf(".");
            if (lastDotIndex > 0) {
                // 最後の「.」より前の部分だけを切り出す（例："t 1.png" -> "t 1"）
                clipNameWithoutExt = clipNameWithoutExt.substring(0, lastDotIndex);
            }
            
            // 完全一致、または拡張子抜きで一致するかチェック
            if (targetClips[clip.name] || targetClips[clipNameWithoutExt]) {
                if (clip.projectItem) {
                    clip.projectItem.setColorLabel(1); 
                }
                clip.setSelected(1, 1);
                changedCount++;
            } else {
                clip.setSelected(0, 1);
            }
        }
    }

    alert(changedCount + " 個のクリップのラベルカラーを変更し、選択状態にしました。");
})();