/**
 * StackTimeline_AutoClean.jsx
 * - v25確定版: addTracks(audioCount, videoCount) ← 副作用考慮済み
 * - ビデオ増設時にオーディオも+1される副作用を利用して効率化
 */
(function () {
  var TICKS_PER_SECOND = 254016000000;

  function info(msg) { try { app.setSDKEventMessage(msg, "info");  } catch(e) { $.writeln(msg); } }
  function err(msg)  { try { app.setSDKEventMessage(msg, "error"); } catch(e) { $.writeln("[ERROR] " + msg); } }

  function secondsToTime(sec) {
    var tm = new Time();
    tm.seconds = sec;
    return tm;
  }

  function ticksToTime(ticks) {
    var tm = new Time();
    tm.ticks = ticks;
    return tm;
  }

  /**
   * ビデオ・オーディオトラックを必要数まで増設（v25副作用考慮版）
   * - ビデオ: addTracks(diff, 0) で一括増設可能
   * - オーディオ: ビデオ増設のたびに+1の副作用があるため、
   *   ビデオ増設後に残り差分だけループで補う
   * @param {Object} qeSeq       - QEシーケンス
   * @param {number} neededVideo - 必要なビデオトラック総数
   * @param {number} neededAudio - 必要なオーディオトラック総数
   * @returns {boolean}
   */
  function addTracksIfNeeded(qeSeq, neededVideo, neededAudio) {
    var seq = app.project.activeSequence;

    // ── Step A: ビデオを一括増設（副作用でオーディオも増える）──
    var diffVideo = neededVideo - seq.videoTracks.numTracks;
    if (diffVideo > 0) {
      qeSeq.addTracks(diffVideo, 0); // ビデオ+diffVideo、オーディオ+1（副作用）
      seq = app.project.activeSequence;
      info("ビデオ増設後: V=" + seq.videoTracks.numTracks + " / A=" + seq.audioTracks.numTracks);
    }

    // ── Step B: 副作用込みでオーディオの残り差分を補う ──
    var maxRetry = 100;
    var count    = 0;
    while (app.project.activeSequence.audioTracks.numTracks < neededAudio) {
      qeSeq.addTracks(0, 0); // オーディオのみ+1（ビデオ増設なし）
      if (++count >= maxRetry) { err("オーディオトラック増設が上限に達しました。"); break; }
    }

    seq = app.project.activeSequence;
    info("増設完了: V=" + seq.videoTracks.numTracks + " / A=" + seq.audioTracks.numTracks);

    return seq.videoTracks.numTracks >= neededVideo &&
           seq.audioTracks.numTracks >= neededAudio;
  }

  /**
   * クリップ群を指定トラックリストへ階段状に配置
   */
  function placeClipsStaircase(clipDataArr, trackList, label, startIndex) {
    if (clipDataArr.length === 0) return;

    var currentStartSec = clipDataArr[0].startTicks / TICKS_PER_SECOND;

    for (var k = 0; k < clipDataArr.length; k++) {
      var trackIndex = startIndex + k;
      var data  = clipDataArr[k];
      var track = trackList[trackIndex];

      if (!track) {
        err(label + (trackIndex + 1) + " トラックが見つかりません。スキップします。");
        continue;
      }

      var durationSec = data.durationTicks / TICKS_PER_SECOND;
      if (durationSec <= 0) durationSec = 1.0;

      var inserted = track.overwriteClip(data.pItem, secondsToTime(currentStartSec));

      if (inserted) {
        inserted.inPoint  = ticksToTime(data.inPointTicks);
        inserted.outPoint = ticksToTime(data.outPointTicks);
      } else {
        err(label + (trackIndex + 1) + " への配置に失敗しました。");
      }

      currentStartSec += durationSec;
    }
  }

  // ─── メイン処理 ───────────────────────────────────────────────

  try {
    var seq = app.project.activeSequence;
    if (!seq) throw new Error("アクティブなシーケンスがありません。");

    var sel = seq.getSelection();
    if (!sel || sel.length === 0) throw new Error("タイムライン上で対象のクリップを選択してください。");

    var videoClipData    = [];
    var audioClipData    = [];
    var allOriginalClips = [];
    var videoStartTicks  = {};

    // パス1：ビデオ系を収集
    for (var i = 0; i < sel.length; i++) {
      var clip = sel[i];
      if (!clip.projectItem || clip.mediaType === "Audio") continue;
      allOriginalClips.push(clip);
      videoClipData.push({
        pItem:         clip.projectItem,
        startTicks:    clip.start.ticks,
        inPointTicks:  clip.inPoint.ticks,
        outPointTicks: clip.outPoint.ticks,
        durationTicks: clip.end.ticks - clip.start.ticks
      });
      videoStartTicks[clip.start.ticks] = true;
    }

    // パス2：オーディオを収集
    for (var ii = 0; ii < sel.length; ii++) {
      var aclip = sel[ii];
      if (!aclip.projectItem || aclip.mediaType !== "Audio") continue;
      allOriginalClips.push(aclip);
      if (!videoStartTicks[aclip.start.ticks]) {
        audioClipData.push({
          pItem:         aclip.projectItem,
          startTicks:    aclip.start.ticks,
          inPointTicks:  aclip.inPoint.ticks,
          outPointTicks: aclip.outPoint.ticks,
          durationTicks: aclip.end.ticks - aclip.start.ticks
        });
      }
    }

    if (videoClipData.length === 0 && audioClipData.length === 0) {
      throw new Error("配置可能なクリップが選択範囲に含まれていません。");
    }

    videoClipData.sort(function(a, b) { return a.startTicks - b.startTicks; });
    audioClipData.sort(function(a, b) { return a.startTicks - b.startTicks; });

    var neededVideo     = videoClipData.length;
    var audioStartIndex = videoClipData.length;
    var neededAudio     = audioStartIndex + audioClipData.length;

    info("ビデオ系: " + neededVideo + " 件 / 単体オーディオ: " + audioClipData.length + " 件");
    if (audioClipData.length > 0) {
      info("WAV配置先: A" + (audioStartIndex + 1) + "〜A" + neededAudio);
    }

    // Step 1: QE API を初期化
    app.enableQE();
    var qeSeq = qe.project.getActiveSequence();
    if (!qeSeq || !qeSeq.addTracks) throw new Error("QE API が使用できません。");

    // Step 2: トラック増設（削除前に実施・副作用考慮）
    var ok = addTracksIfNeeded(qeSeq, neededVideo, neededAudio);
    if (!ok) throw new Error(
      "トラックの増設に失敗しました。" +
      "手動で V" + neededVideo + " / A" + neededAudio + " まで追加してから再実行してください。"
    );

    // Step 3: 元クリップを全削除
    for (var j = 0; j < allOriginalClips.length; j++) {
      try { allOriginalClips[j].remove(false, false); } catch(e) {}
    }

    // Step 4: 階段状に配置
    seq = app.project.activeSequence;
    placeClipsStaircase(videoClipData, seq.videoTracks, "V", 0);
    placeClipsStaircase(audioClipData, seq.audioTracks, "A", audioStartIndex);

    info("完了：V1〜V" + neededVideo + " / A" + (audioStartIndex + 1) + "〜A" + neededAudio + " に階段状に再配置しました。");

  } catch(e) {
    err("スクリプトエラー: " + e.message);
  }

})();