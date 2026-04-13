/**
 * StackTimeline_AutoClean.jsx
 * - タイムラインで選択したクリップを階段状に再配置
 * - 足りないトラックを自動で増設
 * - 配置完了後、元のクリップ（音声含む）を自動で削除
 */
(function () {
  var TICKS_PER_SECOND = 254016000000;

  function info(msg){ try{app.setSDKEventMessage(msg,"info");}catch(e){$.writeln(msg);} }
  function err (msg){ try{app.setSDKEventMessage(msg,"error");}catch(e){$.writeln("[ERROR] "+msg);} }

  function secondsToTime(sec){
    var tm = new Time();
    tm.seconds = sec;
    return tm;
  }

  // トラックを自動で一括増設する関数
  function addTracksIfNeeded(seq, neededCount) {
    var currentCount = seq.videoTracks.numTracks;
    if (currentCount >= neededCount) return true;

    var diff = neededCount - currentCount;
    
    try {
      app.enableQE();
      var qeSeq = qe.project.getActiveSequence();
      if (qeSeq && qeSeq.addTracks) {
        qeSeq.addTracks(diff, 0); // ビデオトラックのみ必要な分を追加
        return true;
      }
    } catch (e) {}

    // フォールバック（標準API）
    try {
      for (var i = 0; i < diff; i++) {
        seq.videoTracks.addTrack();
      }
    } catch (e) {}
    
    return true;
  }

  try {
    var seq = app.project.activeSequence;
    if (!seq) throw new Error("アクティブなシーケンスがありません。");

    var sel = seq.getSelection();
    if (!sel || sel.length === 0) {
      throw new Error("タイムライン上で対象のクリップを選択してください。");
    }

    var videoClipData = [];
    var allOriginalClips = [];

    // 1. 選択されたクリップの「情報だけ」を抜き出し、本体は削除リストに入れる
    for (var i = 0; i < sel.length; i++) {
      allOriginalClips.push(sel[i]);

      // ビデオクリップのみを階段状の対象とする
      if (sel[i].mediaType === "Video" && sel[i].projectItem) {
        videoClipData.push({
          pItem: sel[i].projectItem,
          startTicks: sel[i].start.ticks,
          inPointTicks: sel[i].inPoint.ticks, // トリミング状態を保存
          outPointTicks: sel[i].outPoint.ticks,
          durationTicks: sel[i].end.ticks - sel[i].start.ticks
        });
      }
    }

    if (videoClipData.length === 0) {
      throw new Error("選択範囲にビデオクリップが含まれていません。");
    }

    // タイムライン上の元の配置順（左から右）に並び替え
    videoClipData.sort(function(a, b){ return a.startTicks - b.startTicks; });

    info("選択数: " + videoClipData.length + " 件。再構築を開始します…");

    // 2. 配置が被らないよう、先に元のクリップ（音声含む）を全削除して更地にする
    for (var j = 0; j < allOriginalClips.length; j++) {
      try {
        // remove(false, false) = 他のクリップを詰めない設定で削除
        allOriginalClips[j].remove(false, false);
      } catch(e) {}
    }

    // 3. トラックが足りない場合は自動増設
    addTracksIfNeeded(seq, videoClipData.length);
    seq = app.project.activeSequence; // トラック追加後に情報をリフレッシュ

    if (seq.videoTracks.numTracks < videoClipData.length) {
      throw new Error("Premiereの仕様によりトラックの自動増設が追いつきませんでした。手動でV" + videoClipData.length + "まで追加してから再実行してください。");
    }

    // 4. 保存しておいた情報をもとに、階段状に新規配置
    var currentStartTimeSec = videoClipData[0].startTicks / TICKS_PER_SECOND;

    for (var k = 0; k < videoClipData.length; k++) {
      var data = videoClipData[k];
      var track = seq.videoTracks[k]; // V1から順番に配置
      
      if (!track) continue;

      var insertTime = secondsToTime(currentStartTimeSec);
      var durationSec = data.durationTicks / TICKS_PER_SECOND;
      if (durationSec <= 0) durationSec = 1.0;

      // クリップを上書き配置
      var inserted = track.overwriteClip(data.pItem, insertTime);

      if (inserted) {
        // 元のクリップがトリミングされていた場合、その長さを復元する
        var newIn = new Time(); newIn.ticks = data.inPointTicks;
        var newOut = new Time(); newOut.ticks = data.outPointTicks;
        inserted.inPoint = newIn;
        inserted.outPoint = newOut;
      } else {
        err("V" + (k + 1) + " への配置に失敗しました。");
      }

      // 次のクリップの開始時間を「直前のクリップの長さ分」だけ後ろにずらす
      currentStartTimeSec += durationSec;
    }

    info("完了：元のクリップを削除し、V1〜V" + videoClipData.length + " に階段状に再配置しました。");

  } catch (e) {
    err("スクリプトエラー: " + e.message);
  }
})();