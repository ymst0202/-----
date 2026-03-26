﻿/**
 * StackClipsAcrossTracks_2026fix.jsx
 * Premiere 2026 (Win) 対応修正版
 * - insertClip の time は Time オブジェクトで渡す（number環境差対策）
 * - findItemsMatchingMediaPath のパス正規化＆strictフォールバック＆最終走査で解決率UP
 * - insertClip の戻り値(TrackItem)から duration を算出（クリップ順問題を回避）
 */

(function () {
  var TICKS_PER_SECOND = 254016000000;

  function info(msg){ try{app.setSDKEventMessage(msg,"info");}catch(e){$.writeln(msg);} }
  function err (msg){ try{app.setSDKEventMessage(msg,"error");}catch(e){$.writeln("[ERROR] "+msg);} }

  function ensureActiveSequence() {
    var seq = app.project.activeSequence;
    if (!seq) throw new Error("アクティブなシーケンスがありません。タイムラインをアクティブにして再実行してください。");
    return seq;
  }

  function pickFiles() {
    var files = File.openDialog("並べたい素材を複数選択", "*.*", true);
    if (!files) return null;
    if (files instanceof File) files = [files];
    var paths = [];
    for (var i=0; i<files.length; i++){
      if (files[i] && files[i].fsName) paths.push(files[i].fsName);
    }
    return paths;
  }

  function importIfNeeded(paths) {
    var ok = app.project.importFiles(paths, true, app.project.rootItem, false);
    if (!ok) info("importFiles: 一部または全てが既にインポート済みの可能性があります。続行します。");
  }

  // ---- Windowsパス正規化：\ → /、余計な // を削除 ----
  function normalizePath(p){
    if (p === null || p === undefined) return "";
    p = String(p);
    p = p.replace(/\\/g, "/");
    p = p.replace(/\/+/g, "/");
    return p;
  }

  // ---- ProjectItem の mediaPath 取得（環境差対応）----
  function getMediaPathSafe(item){
    try{
      if (item && item.getMediaPath) return normalizePath(item.getMediaPath());
    }catch(e){}
    return "";
  }

  // ---- 全プロジェクト走査（最後の保険）----
  function collectAllProjectItems(root){
    var out = [];
    function walk(bin){
      if (!bin) return;
      for (var i=0; i<bin.numItems; i++){
        var it = bin.children[i];
        if (!it) continue;
        out.push(it);
        // Bin の場合は更に潜る
        if (it.type === ProjectItemType.BIN) walk(it);
      }
    }
    walk(root);
    return out;
  }

  // ---- パスから ProjectItem を解決（strict→loose→全走査）----
  function resolveItemsByPaths(paths) {
    var root = app.project.rootItem;
    var items = [];
    var allCache = null;

    for (var i=0; i<paths.length; i++) {
      var raw = paths[i];
      var p1 = raw;
      var p2 = normalizePath(raw);

      var found = null;

      // 1) strict=true を raw / normalized 両方で
      try {
        var list1 = root.findItemsMatchingMediaPath(p1, true);
        if (list1 && list1.length) found = list1[0];
      } catch(e){}
      if (!found) {
        try {
          var list2 = root.findItemsMatchingMediaPath(p2, true);
          if (list2 && list2.length) found = list2[0];
        } catch(e){}
      }

      // 2) strict=false フォールバック
      if (!found) {
        try {
          var list3 = root.findItemsMatchingMediaPath(p1, false);
          if (list3 && list3.length) found = list3[0];
        } catch(e){}
      }
      if (!found) {
        try {
          var list4 = root.findItemsMatchingMediaPath(p2, false);
          if (list4 && list4.length) found = list4[0];
        } catch(e){}
      }

      // 3) 最終：全走査して mediaPath の末尾一致（ドライブ文字大小文字・スラッシュ差吸収）
      if (!found) {
        if (!allCache) allCache = collectAllProjectItems(root);
        var needle = p2.toLowerCase();
        for (var k=0; k<allCache.length; k++){
          var it = allCache[k];
          var mp = getMediaPathSafe(it);
          if (!mp) continue;
          var hay = mp.toLowerCase();
          if (hay === needle || hay.indexOf(needle) >= 0) { found = it; break; }
        }
      }

      if (found) {
        items.push(found);
      } else {
        err("プロジェクト内に見つかりません: " + raw + "（インポート失敗/オフライン/パス不一致の可能性）");
      }
    }
    return items;
  }

  // ---- ビデオトラック増設（標準API→QE）----
  function ensureVideoTracksAtLeast(seq, neededCount) {
    // 標準APIが使えるならそれが最優先
    try {
      while (seq.videoTracks.numTracks < neededCount) {
        if (seq.videoTracks.addTrack) seq.videoTracks.addTrack();
        else throw new Error("seq.videoTracks.addTrack が見つからない");
      }
      return;
    } catch (e) {}

    // QE フォールバック
    try {
      app.enableQE && app.enableQE();
      var qeseq = (typeof qe !== "undefined" && qe && qe.project && qe.project.getActiveSequence)
        ? qe.project.getActiveSequence()
        : null;
      if (!qeseq) throw new Error("QE sequence が取得できません。");

      while (seq.videoTracks.numTracks < neededCount) {
        if (qeseq.addVideoTrack) qeseq.addVideoTrack();
        else if (qeseq.addTracks) qeseq.addTracks(1, 0);
        else throw new Error("QE addVideoTrack / addTracks が利用できません。");
      }
    } catch (qeErr) {
      throw new Error("ビデオトラックの増設に失敗: " + qeErr.message);
    }
  }

  // ---- 秒→Time オブジェクト ----
  function secondsToTime(sec){
    var tm = new Time();
    tm.seconds = sec;
    return tm;
  }

  // ---- TrackItem から duration(sec) を取る（最も安定）----
  function durationSecFromTrackItem(ti){
    try{
      if (ti && ti.start && ti.end && ti.start.ticks !== undefined && ti.end.ticks !== undefined){
        var dt = ti.end.ticks - ti.start.ticks;
        if (dt > 0) return dt / TICKS_PER_SECOND;
      }
    }catch(e){}
    return 0;
  }

  try {
    var seq = ensureActiveSequence();

    var paths = pickFiles();
    if (!paths) { info("キャンセルされました。"); return; }
    if (paths.length === 0) throw new Error("素材が選択されていません。");

    info("選択数: " + paths.length + " 件。インポート確認中…");
    importIfNeeded(paths);

    var items = resolveItemsByPaths(paths);
    if (!items.length) throw new Error("有効な素材が1件も見つかりませんでした。");

    ensureVideoTracksAtLeast(seq, items.length);

    var t = 0.0; // 次のクリップを置くタイム（秒）
    info("配置開始…");

    for (var i=0; i<items.length; i++){
      var targetIndex = i; // V1=0, V2=1, …

      ensureVideoTracksAtLeast(seq, targetIndex + 1);

      var track = seq.videoTracks[targetIndex];
      if (!track) throw new Error("V" + (targetIndex+1) + " を取得できませんでした。");

      var pi = items[i];

      // ★2026対策：Time オブジェクトで渡す
      var tm = secondsToTime(t);

      var inserted = null;
      try { inserted = track.insertClip(pi, tm); } catch (e) { inserted = null; }

      if (!inserted) {
        err("配置に失敗: " + pi.name + " @ V" + (targetIndex+1) + " / " + t.toFixed(3) + "s");
        continue;
      }

      var d = durationSecFromTrackItem(inserted);
      if (d <= 0) d = 1.0; // 静止画など不明時の保険
      t += d;
    }

    info("完了：V1〜V" + items.length + " を自動増設＆順送りで配置しました。");

  } catch (e) {
    err("スクリプトエラー: " + e.message);
  }
})();
