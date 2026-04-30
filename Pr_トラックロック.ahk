#Requires AutoHotkey v2.0
#SingleInstance Force

; ▼▼ Premiere Proが手前にある時だけ動く制限 ▼▼
#HotIf WinActive("ahk_exe Adobe Premiere Pro.exe")

; ▼▼ TourBox用ショートカット：Ctrl + Alt + Shift + Z ▼▼
^+!z:: {
    CoordMode "Pixel", "Screen"
    CoordMode "Mouse", "Screen"

    ; 現在のマウスの座標を記憶しておく
    MouseGetPos &OrigX, &OrigY

    ; 許容誤差「*80」で画像を検索
    if ImageSearch(&FoundX, &FoundY, 0, 0, A_ScreenWidth, A_ScreenHeight, "*80 image_0.png") {
        
        ; 画像の左上から少し右・下へズラした位置（ボタンの中心付近）を計算
        TargetX := FoundX + 50
        TargetY := FoundY + 20
        
        ; 対象の座標をクリック！
        Click TargetX, TargetY

        ; クリック直後に0.05秒だけ待つ（移動コマンドが無視されるのを防ぐ）
        Sleep 50

        ; 記憶しておいた元の位置へマウスを戻す（最後の「0」は瞬間移動）
        MouseMove OrigX, OrigY, 0

        ; ▼▼ 追加箇所：タイムラインをアクティブにする ▼▼
        ; 動作を安定させるため少しだけ待ってから「2」（テンキーではない方）を押す
        Sleep 50
        Send "2"

    } else {
        ; 失敗した時はエラー音とメッセージを出す
        SoundBeep 150, 400
        ToolTip "画像が見つかりませんでした"
        SetTimer () => ToolTip(), -2000
    }
}

; ▼▼ 条件設定をここで終わらせる ▼▼
#HotIf