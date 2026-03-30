/*
 * Sync Selector風スクリプト（ズレ許容・ポップアップ指定版） for JSXLauncher
 * 実行時に表示されるポップアップに「V2 3」のように入力し、トラックと許容フレームを指定します。
 */
(function() {
    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスを開いてアクティブにしてください。");
        return;
    }

    var selectedClips = seq.getSelection();
    if (selectedClips.length === 0) {
        alert("基準となるクリップを1つ以上選択してください。");
        return;
    }

    // ==========================================
    // 入力ポップアップ（トラック名 + 許容フレーム数）
    // ==========================================
    var userInput = prompt(
        "ターゲットトラックと許容するズレ（コマ数）を入力してください。\n" +
        "（例: 「V2 3」と入力すると、V2トラックで前後3フレーム分のズレまで許容して選択します。\n" +
        "コマ数を省略して「V2」のみにした場合はズレを許容しません）", 
        "V2 3"
    );

    // キャンセルボタンが押されたか、空欄の場合は処理を終了
    if (!userInput) {
        return;
    }

    // 全角スペースなどを半角に整形
    var cleanInput = userInput.replace(/[　、，,]/g, " ").trim();
    
    // 入力された文字を解析（例: "V2 5" -> トラックV2、許容5コマ）
    var match = cleanInput.match(/^([vVaA])\s*(\d+)(?:\s+(\d+))?$/);
    if (!match) {
        alert("入力形式が正しくありません。\n半角で「V2」や「A1 5」のように入力してください。");
        return;
    }

    var trackType = match[1].toUpperCase(); // "V" か "A"
    var trackNumber = parseInt(match[2], 10);
    var trackIndex = trackNumber - 1; 

    // 許容フレーム数を取得（省略された場合は0）
    var marginFrames = match[3] ? parseInt(match[3], 10) : 0;
    
    // フレーム数を「秒数」に変換（※一般的な30fps=約0.033秒で計算し、余裕を持たせます）
    var marginSeconds = marginFrames * 0.034;

    // ==========================================

    // 選択されたクリップの時間範囲を記録
    var timeRanges = [];
    for (var i = 0; i < selectedClips.length; i++) {
        var clip = selectedClips[i];
        if (clip && clip.start && clip.end) {
            timeRanges.push({
                start: clip.start.seconds,
                end: clip.end.seconds
            });
        }
    }

    // 元の選択を解除
    for (var i = 0; i < selectedClips.length; i++) {
        selectedClips[i].setSelected(false, false);
    }

    // ターゲットとするトラックのまとまりを取得
    var targetTracks;
    if (trackType === "V") {
        targetTracks = seq.videoTracks;
    } else {
        targetTracks = seq.audioTracks;
    }

    // 入力されたトラックが存在するかどうかチェック
    if (trackIndex < 0 || trackIndex >= targetTracks.numTracks) {
        alert("指定されたトラック (" + trackType + trackNumber + ") は存在しません。");
        return;
    }

    // 指定されたトラックを処理
    var track = targetTracks[trackIndex];
    var clips = track.clips;

    for (var c = 0; c < clips.numItems; c++) {
        var targetClip = clips[c];
        var tStart = targetClip.start.seconds;
        var tEnd = targetClip.end.seconds;
        var isMatch = false;

        // 時間が重なっているかチェック（許容秒数分だけ判定エリアを前後・左右に広げる）
        for (var r = 0; r < timeRanges.length; r++) {
            var rStart = timeRanges[r].start - marginSeconds;
            var rEnd = timeRanges[r].end + marginSeconds;

            if (tStart < rEnd && tEnd > rStart) {
                isMatch = true;
                break;
            }
        }

        // 重なっていれば選択
        if (isMatch) {
            targetClip.setSelected(true, true);
        }
    }

})();