/*
 * Sync Selector風スクリプト（ポップアップ指定版） for JSXLauncher
 * 実行時に表示されるポップアップに「V2」や「A1」と入力してターゲットを決定します。
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
    // 確実に出る標準ポップアップでターゲットを入力させる
    // ==========================================
    var userInput = prompt("ターゲットにするトラックを入力してください。\n（例: V1, V2, A1, A2 など）", "V2");

    // キャンセルボタンが押されたか、空欄の場合は処理を終了
    if (!userInput) {
        return;
    }

    // 入力された文字を解析（VかA、その後ろの数字を読み取る。大文字小文字は問わない）
    var match = userInput.match(/^([vVaA])\s*(\d+)$/);
    if (!match) {
        alert("入力形式が正しくありません。\n半角で「V2」や「A1」のように入力してください。");
        return;
    }

    var trackType = match[1].toUpperCase(); // "V" か "A"
    var trackNumber = parseInt(match[2], 10);
    var trackIndex = trackNumber - 1; // プログラム内部ではトラック番号は0から始まるため -1 する

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

        // 時間が重なっているかチェック（部分一致モード）
        for (var r = 0; r < timeRanges.length; r++) {
            var rStart = timeRanges[r].start;
            var rEnd = timeRanges[r].end;

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