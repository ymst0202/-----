/**
 * RenameTrack_prompt.jsx
 * アクティブ（ターゲット）なトラックをまとめてリネームする。
 * - ターゲット状態のビデオ・オーディオトラックを全て取得
 * - ScriptUI が使える環境なら一括ダイアログ（Tabキーで移動）
 * - 使えない環境ではトラックごとに順番にプロンプト表示
 * - 改名は QE API に一本化
 */

(function () {
  function info(msg){ try{app.setSDKEventMessage(msg,"info");}catch(e){$.writeln(msg);} }
  function err (msg){ try{app.setSDKEventMessage(msg,"error");}catch(e){$.writeln("[ERROR] "+msg);} }

  function activeSeq() {
    var s = app.project.activeSequence;
    if (!s) throw new Error("アクティブシーケンスがありません。タイムラインをクリックしてから実行してください。");
    return s;
  }

  function qeSeq() {
    app.enableQE && app.enableQE();
    if (!(qe && qe.project && qe.project.getActiveSequence)) {
      throw new Error("QE API が利用できません。Premiere を安定版で実行してください。");
    }
    var q = qe.project.getActiveSequence();
    if (!q) throw new Error("QE アクティブシーケンスが取得できません。");
    return q;
  }

  function getTargetedTracks(seq) {
    var tracks = [];
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
      var t = seq.videoTracks[i];
      if (t.isTargeted && t.isTargeted()) {
        tracks.push({ kind: "video", index: i, label: "V" + (i + 1), currentName: t.name || "" });
      }
    }
    for (var j = 0; j < seq.audioTracks.numTracks; j++) {
      var a = seq.audioTracks[j];
      if (a.isTargeted && a.isTargeted()) {
        tracks.push({ kind: "audio", index: j, label: "A" + (j + 1), currentName: a.name || "" });
      }
    }
    return tracks;
  }

  function renameQE(qeseq, kind, index, newName) {
    if (kind === "video") {
      var vt = qeseq.getVideoTrackAt(index);
      if (!vt) throw new Error("V" + (index + 1) + " が取得できません。");
      if (vt.setName) vt.setName(newName); else vt.name = newName;
    } else {
      var at = qeseq.getAudioTrackAt(index);
      if (!at) throw new Error("A" + (index + 1) + " が取得できません。");
      if (at.setName) at.setName(newName); else at.name = newName;
    }
  }

  // ScriptUI 一括ダイアログ
  function showScriptUIDialog(tracks) {
    var WinCls = $.global["Window"];
    var dlg = new WinCls("dialog", "トラック名変更");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 10;
    dlg.margins = 16;

    var inputs = [];
    for (var i = 0; i < tracks.length; i++) {
      var grp = dlg.add("group");
      grp.orientation = "row";
      grp.alignChildren = ["left", "center"];
      grp.spacing = 8;

      var lbl = grp.add("statictext", undefined, tracks[i].label + ":");
      lbl.preferredSize.width = 36;

      var inp = grp.add("edittext", undefined, tracks[i].currentName);
      inp.preferredSize.width = 260;
      inputs.push(inp);
    }

    var sep = dlg.add("panel");
    sep.alignment = "fill";

    var btnGrp = dlg.add("group");
    btnGrp.orientation = "row";
    btnGrp.alignment = "right";
    btnGrp.spacing = 8;

    var cancelBtn = btnGrp.add("button", undefined, "キャンセル", { name: "cancel" });
    var okBtn     = btnGrp.add("button", undefined, "OK",         { name: "ok" });

    cancelBtn.onClick = function () { dlg.close(0); };
    okBtn.onClick     = function () { dlg.close(1); };

    if (inputs.length > 0) inputs[0].active = true;

    var result = dlg.show();
    if (result !== 1) return null;

    var names = [];
    for (var j = 0; j < inputs.length; j++) {
      names.push(inputs[j].text);
    }
    return names;
  }

  // prompt() フォールバック（1トラックずつ）
  function showPromptFallback(tracks) {
    var names = [];
    var total = tracks.length;
    for (var i = 0; i < total; i++) {
      var t = tracks[i];
      var msg = (total > 1)
        ? "[" + (i + 1) + "/" + total + "] " + t.label + " の新しい名前:"
        : t.label + " の新しい名前:";
      var n = prompt(msg, t.currentName);
      if (n === null) return null; // キャンセル
      names.push(n);
    }
    return names;
  }

  try {
    var seq = activeSeq();
    var q   = qeSeq();

    var targets = getTargetedTracks(seq);
    if (targets.length === 0) {
      throw new Error("ターゲット状態のトラックがありません。トラックをターゲット(アクティブ)にしてから実行してください。");
    }

    var newNames;
    var WinCls = $.global["Window"];
    if (typeof WinCls === "function") {
      try {
        newNames = showScriptUIDialog(targets);
      } catch (uiErr) {
        newNames = showPromptFallback(targets);
      }
    } else {
      newNames = showPromptFallback(targets);
    }

    if (!newNames) { info("キャンセルされました。"); return; }

    var renamed = [];
    for (var i = 0; i < targets.length; i++) {
      var name = newNames[i];
      if (name !== "") {
        renameQE(q, targets[i].kind, targets[i].index, name);
        renamed.push(targets[i].label + "→「" + name + "」");
      }
    }

    if (renamed.length > 0) {
      info(renamed.join(", ") + " に変更しました。");
    } else {
      info("変更なし（名前が空のためスキップ）。");
    }

  } catch (e) {
    err("エラー: " + e.message);
  }
})();
