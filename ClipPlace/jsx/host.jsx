// クリップ配置 – host.jsx

function isTrackTargeted(track) {
    try {
        if (typeof track.isTargeted === "function") return track.isTargeted();
        if (typeof track.isTargeted !== "undefined") return !!track.isTargeted;
    } catch(e) {}
    return false;
}

// ターゲットトラック番号取得（1始まり、未選択は -1）
function getTargetedTracks() {
    var seq = app.project.activeSequence;
    if (!seq) return "ERROR:シーケンスなし";
    var vTrack = -1, aTrack = -1;
    for (var v = 0; v < seq.videoTracks.numTracks; v++) {
        if (isTrackTargeted(seq.videoTracks[v])) { vTrack = v + 1; break; }
    }
    for (var a = 0; a < seq.audioTracks.numTracks; a++) {
        if (isTrackTargeted(seq.audioTracks[a])) { aTrack = a + 1; break; }
    }
    return "OK:" + vTrack + ":" + aTrack;
}

// 挿入ビンのクリップ一覧取得
// 戻り値: "OK:ビン名\tname1\tnodeId1\tname2\tnodeId2\t..."
// エラー: "ERROR:..."
function getBinItems() {
    var bin = null;
    try { bin = app.project.getInsertionBin(); } catch(e) {}
    if (!bin) return "ERROR:ビンが取得できません";

    var parts = [bin.name];
    if (bin.children) {
        for (var i = 0; i < bin.children.numItems; i++) {
            var child = bin.children[i];
            if (!child) continue;
            var t = 0;
            try { t = child.type; } catch(et) {}
            if (t === 2 || t === 3) continue; // ビン・ルートをスキップ
            var nodeId = "";
            try { nodeId = child.nodeId; } catch(en) {}
            if (!nodeId) continue;
            parts.push(child.name);
            parts.push(nodeId);
        }
    }

    if (parts.length <= 1) return "ERROR:ビン「" + bin.name + "」にクリップがありません";
    return "OK:" + parts.join("\t");
}

// nodeId でプロジェクトアイテムを再帰検索
function findByNodeId(item, nodeId) {
    if (!item) return null;
    try { if (item.nodeId === nodeId) return item; } catch(e) {}
    try {
        if (item.children) {
            for (var i = 0; i < item.children.numItems; i++) {
                var result = findByNodeId(item.children[i], nodeId);
                if (result) return result;
            }
        }
    } catch(e) {}
    return null;
}

// メイン配置処理
// nodeIdsStr : カンマ区切りの nodeId 文字列（UIで選択した順）
// refTrackType / destTrackType : 0=ビデオ, 1=オーディオ
// refTrackNum  / destTrackNum  : 1始まり
// matchDuration                : true=基準クリップ長に合わせる
function placeClipsByNodeIds(nodeIdsStr, refTrackType, refTrackNum, destTrackType, destTrackNum, matchDuration) {
    var seq = app.project.activeSequence;
    if (!seq) return "ERROR:シーケンスを開いてアクティブにしてください";

    var refTracks  = (refTrackType  === 0) ? seq.videoTracks : seq.audioTracks;
    var destTracks = (destTrackType === 0) ? seq.videoTracks : seq.audioTracks;
    var refTrack   = refTracks [refTrackNum  - 1];
    var destTrack  = destTracks[destTrackNum - 1];

    if (!refTrack)                     return "ERROR:基準トラックが存在しません (トラック" + refTrackNum  + ")";
    if (!destTrack)                    return "ERROR:配置先トラックが存在しません (トラック" + destTrackNum + ")";
    if (refTrack.clips.numItems === 0) return "ERROR:基準トラックにクリップがありません";

    // nodeId → ProjectItem
    var nodeIds = nodeIdsStr.split(",");
    var projectItems = [];
    for (var n = 0; n < nodeIds.length; n++) {
        var found = findByNodeId(app.project.rootItem, nodeIds[n]);
        if (found) projectItems.push(found);
    }
    if (projectItems.length === 0) return "ERROR:クリップが見つかりません（ビンを再読み込みしてください）";

    // タイムラインで基準クリップが選択されていれば対象を絞る
    var seqSel = seq.getSelection();
    var selectedTimes = {};
    for (var s = 0; s < seqSel.length; s++) {
        selectedTimes[seqSel[s].start.seconds.toFixed(6)] = true;
    }
    var hasTimelineSelection = (seqSel.length > 0);

    var refInfos = [];
    for (var c = 0; c < refTrack.clips.numItems; c++) {
        var rc = refTrack.clips[c];
        if (hasTimelineSelection && !selectedTimes[rc.start.seconds.toFixed(6)]) continue;
        refInfos.push({ start: rc.start.seconds, end: rc.end.seconds });
    }
    if (refInfos.length === 0) return "ERROR:基準となるクリップが見つかりません";

    // 1クリップ選択 → 全基準位置に繰り返し配置
    // 複数クリップ選択 → 1対1で順番に配置
    var count  = (projectItems.length === 1) ? refInfos.length
                                              : Math.min(projectItems.length, refInfos.length);
    var placed = 0, errors = 0;

    for (var j = 0; j < count; j++) {
        var item    = (projectItems.length === 1) ? projectItems[0] : projectItems[j];
        var refInfo = refInfos[j];
        try {
            var startTime = new Time();
            startTime.seconds = refInfo.start;
            destTrack.overwriteClip(item, startTime);
            placed++;

            if (matchDuration) {
                for (var k = destTrack.clips.numItems - 1; k >= 0; k--) {
                    var pc = destTrack.clips[k];
                    if (Math.abs(pc.start.seconds - refInfo.start) < 0.001) {
                        try {
                            var endTime = new Time();
                            endTime.seconds = refInfo.end;
                            pc.end = endTime;
                        } catch(e2) {}
                        break;
                    }
                }
            }
        } catch(e) { errors++; }
    }

    var msg = placed + "件配置";
    if (errors > 0) msg += " (" + errors + "件失敗)";
    return "OK:" + msg;
}
