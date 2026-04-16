(function() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return alert("シーケンスが見つかりません。");

        var selectedClip = null;
        for (var i = 0; i < seq.videoTracks.numTracks; i++) {
            var track = seq.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                if (track.clips[j].isSelected()) {
                    selectedClip = track.clips[j];
                    break;
                }
            }
            if(selectedClip) break;
        }

        if (!selectedClip) return alert("テキストクリップを選択してください。");

        var report = "【クリップの全内部データ スキャン結果】\n\n";
        var components = selectedClip.components;

        if (components.numItems === 0) {
            report += "※このクリップには読み取れるコンポーネントが0個です。\n（APIから完全に隠蔽されています）";
        } else {
            // クリップが持つすべてのコンポーネントとプロパティを無条件で書き出す
            for (var c = 0; c < components.numItems; c++) {
                var comp = components[c];
                report += "■ [" + c + "] コンポーネント名: " + comp.displayName + "\n";
                
                for (var p = 0; p < comp.properties.numItems; p++) {
                    var prop = comp.properties[p];
                    report += "   - プロパティ: " + prop.displayName + "\n";
                }
                report += "-----------------------------------\n";
            }
        }

        // 結果を表示するウィンドウ
        var win = new Window("dialog", "全ダンプ スキャン結果");
        var editText = win.add("edittext", [0, 0, 500, 500], report, {multiline: true, scrolling: true});
        win.add("button", undefined, "閉じる", {name: "ok"});
        win.center();
        win.show();

    } catch (e) {
        alert("エラー: " + e.message);
    }
})();