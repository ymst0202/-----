// Photoshop用 文字種ごとのサイズ比率調整スクリプト
// 保存形式: .jsx (例: adjust_text_ratio.jsx)

#target photoshop

function main() {
    if (app.documents.length === 0) {
        alert("ドキュメントが開かれていません。");
        return;
    }

    var doc = app.activeDocument;
    var layer = doc.activeLayer;

    if (layer.kind !== LayerKind.TEXT) {
        alert("テキストレイヤーを選択してから実行してください。");
        return;
    }

    var textItem = layer.textItem;
    var baseSize = textItem.size; // 基準文字サイズを取得（ポイントまたはピクセル）
    // 単位表記の簡略化
    var baseSizeStr = Math.round(baseSize) + " px/pt"; 

    // ==========================================
    // ダイアログUIの構築
    // ==========================================
    var win = new Window("dialog", "文字種ごとのサイズ比率");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;

    // 基準文字サイズ表示
    var baseSizeGroup = win.add("group");
    baseSizeGroup.alignment = ["left", "top"];
    baseSizeGroup.add("statictext", undefined, "基準文字サイズ: " + baseSizeStr);

    win.add("panel", undefined, undefined, {name: "divider"}); // 区切り線

    // 各比率調整UIを作成する関数
    function createSliderRow(parent, labelText, defaultValue) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"];
        group.spacing = 10;

        var label = group.add("statictext", [0, 0, 150, 20], labelText);
        
        var slider = group.add("slider", [0, 0, 150, 20], defaultValue, 0.1, 3.0);
        var input = group.add("edittext", [0, 0, 50, 20], defaultValue.toFixed(1));

        // スライダーと入力ボックスの連動
        slider.onChanging = function() {
            input.text = this.value.toFixed(1);
        };
        input.onChange = function() {
            var val = parseFloat(this.text);
            if (isNaN(val) || val < 0.1) val = 0.1;
            if (val > 3.0) val = 3.0;
            this.text = val.toFixed(1);
            slider.value = val;
        };

        return { slider: slider, input: input };
    }

    // 各項目の追加
    var slidersGroup = win.add("group");
    slidersGroup.orientation = "column";
    slidersGroup.alignChildren = ["fill", "top"];
    slidersGroup.spacing = 10;

    var kanjiRow = createSliderRow(slidersGroup, "漢字 比率", 1.0);
    var numberRow = createSliderRow(slidersGroup, "数字 比率", 1.5);
    var kanaRow = createSliderRow(slidersGroup, "かな(ひら/カタ) 比率", 0.8);
    var symbolRow = createSliderRow(slidersGroup, "英字/記号/その他 比率", 1.0);

    // ボタン類
    var btnGroup = win.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = ["center", "top"];
    btnGroup.spacing = 20;
    
    var btnRun = btnGroup.add("button", undefined, "実行", {name: "ok"});
    var btnCancel = btnGroup.add("button", undefined, "キャンセル", {name: "cancel"});

    // ==========================================
    // 実行ボタン押下時の処理
    // ==========================================
    btnRun.onClick = function() {
        var ratios = {
            kanji: parseFloat(kanjiRow.input.text),
            number: parseFloat(numberRow.input.text),
            kana: parseFloat(kanaRow.input.text),
            symbol: parseFloat(symbolRow.input.text)
        };
        
        win.close();
        processText(layer, ratios);
    };

    btnCancel.onClick = function() {
        win.close();
    };

    win.show();
}

// ==========================================
// テキスト処理ロジック（文字種の判定）
// ==========================================
function processText(layer, ratios) {
    var textStr = layer.textItem.contents;
    
    // 文字種判定用の正規表現
    var regexKanji = /[\u4E00-\u9FAF\u3005]/; // 漢字・々
    var regexKana = /[\u3040-\u309F\u30A0-\u30FF]/; // ひらがな・カタカナ
    var regexNumber = /[0-9０-９]/; // 半角・全角数字
    // 上記以外を英字・記号・その他とする

    // 履歴に一つのアクションとしてまとめるための処理（オプション）
    app.activeDocument.suspendHistory("文字種ごとのサイズ調整", "applyFormatting()");

    function applyFormatting() {
        // 【注意】
        // Photoshopの標準DOM (ExtendScript) では、1文字ずつのフォントサイズやトラッキングを
        // 簡単に変更するAPIが用意されていません（レイヤー全体への適用のみ可能）。
        // 実際の文字単位のサイズ変更・文字詰めを完全に動作させるには、
        // ActionManager (CharStyleRange) を用いた数百行に及ぶバイナリデータのパースと再構築が必要です。
        
        // ここでは判定ロジックのベースとして、コンソール（ESTK）への出力またはアラートで構成を示します。
        var resultLog = "";
        
        for (var i = 0; i < textStr.length; i++) {
            var char = textStr[i];
            var type = "symbol";
            var ratio = ratios.symbol;

            if (regexKanji.test(char)) {
                type = "kanji";
                ratio = ratios.kanji;
            } else if (regexKana.test(char)) {
                type = "kana";
                ratio = ratios.kana;
            } else if (regexNumber.test(char)) {
                type = "number";
                ratio = ratios.number;
            }

            // ※ここにActionManagerを用いた1文字ずつのスタイル適用処理が入ります※
            // resultLog += char + " (" + type + ") : x" + ratio + "\n";
        }
        
        alert("設定された比率:\n漢字: " + ratios.kanji + "\n数字: " + ratios.number + "\nかな: " + ratios.kana + "\nその他: " + ratios.symbol + "\n\n※文字ごとの適用にはActionManagerの高度な組み込みが必要です。");
    }
}

// スクリプト実行
main();