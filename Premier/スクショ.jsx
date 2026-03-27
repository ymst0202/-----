(function() {
    app.enableQE();
    var qeSeq = qe.project.getActiveSequence();
    if (!qeSeq) {
        alert("アクティブなシーケンスが見つかりません。タイムラインを選択してください。");
        return;
    }

    var timecode = qeSeq.CTI.timecode;
    var downloadsFolder = new Folder("~/Downloads");
    if (!downloadsFolder.exists) {
        alert("ダウンロードフォルダが見つかりません。");
        return;
    }

    // Windowsのパス区切り文字(\)に確実に変換
    var downloadsPath = downloadsFolder.fsName.replace(/\//g, "\\");
    var baseFilePath = downloadsPath + "\\pr_temp_frame_" + new Date().getTime() + ".png";
    
    try {
        // フレームを書き出し
        qeSeq.exportFramePNG(timecode, baseFilePath);
        
        var retries = 0;
        var actualFilePath = baseFilePath;
        var fileExists = false;
        
        // 書き出し完了を待機
        while(retries < 15) {
            $.sleep(200);
            if (new File(baseFilePath).exists) {
                fileExists = true;
                break;
            } else if (new File(baseFilePath + ".png").exists) {
                actualFilePath = baseFilePath + ".png";
                fileExists = true;
                break;
            }
            retries++;
        }

        if (!fileExists) {
            alert("フレームの保存に失敗しました（タイムアウト）。");
            return;
        }

        // ==========================================
        // 修正ポイント: system.callSystem が使えないため
        // 動的に .bat ファイルを作成して実行(execute)する
        // ==========================================
        
        var batFilePath = downloadsPath + "\\pr_copy_to_clip.bat";
        var batFile = new File(batFilePath);
        batFile.encoding = "system"; // 日本語パス対策
        batFile.open("w");
        
        // PowerShellのコマンド (画像コピー → メモリ解放 → PNGファイル削除)
        var psCommand = "Add-Type -AssemblyName System.Windows.Forms; ";
        psCommand += "$img = [System.Drawing.Image]::FromFile('" + actualFilePath + "'); ";
        psCommand += "[System.Windows.Forms.Clipboard]::SetImage($img); ";
        psCommand += "$img.Dispose(); ";
        psCommand += "Remove-Item -Path '" + actualFilePath + "';"; 
        
        // batファイルの内容 (PowerShell実行後、自分自身(.bat)も削除する)
        var batContent = "@echo off\n";
        batContent += 'powershell -sta -NoProfile -WindowStyle Hidden -Command "' + psCommand + '"\n';
        batContent += 'del "%~f0"';
        
        batFile.write(batContent);
        batFile.close();
        
        // batファイルを実行（OS標準機能で実行）
        batFile.execute();
        
    } catch (e) {
        alert("実行中にエラーが発生しました: " + e.message);
    }
})();