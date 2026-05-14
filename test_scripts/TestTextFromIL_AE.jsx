// TestTextFromIL_AE.jsx - Execute isso no After Effects (File > Scripts > Run Script File...)
try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Ops! Por favor, selecione (abra) a Composição correta no After Effects antes de executar.");
    } else {
        var f = new File("C:/AEGP/test_text.json");
        if (!f.exists) {
            alert("O arquivo C:/AEGP/test_text.json não foi encontrado. Você gerou pelo Illustrator primeiro?");
        } else {
            f.open("r");
            var jsonStr = f.read();
            f.close();
            
            // Um eval simples para importar as chaves em um objeto limpo 
            var sd = eval("(" + jsonStr + ")");
            
            app.beginUndoGroup("TestTextFromIL");
            
            // Cria a layer de texto cravada
            var finalTxt = (sd.text || "").replace(/\r?\n|\r/g, "\r");
            var txtLyr = comp.layers.addText(finalTxt);
            txtLyr.name = "Teste de Texto Extraído";
            
            // Injela as propriedades de fonte
            var textProp = txtLyr.property("Source Text");
            var textDoc = textProp.value;
            textDoc.fontSize = sd.fontSize;
            textDoc.font = sd.fontName;
            if (sd.color) {
                textDoc.fillColor = sd.color;
            }
            try {
                var aeJust = ParagraphJustification.LEFT_JUSTIFY;
                if (sd.justification === 1) aeJust = ParagraphJustification.CENTER_JUSTIFY;
                if (sd.justification === 2) aeJust = ParagraphJustification.RIGHT_JUSTIFY;
                textDoc.justification = aeJust;
            } catch(e){}
            textProp.setValue(textDoc);
            
            // Puxa a guia principal e ajusta as matemáticas de Anchor e Pivo
            var txtTr = txtLyr.property("ADBE Transform Group");
            
            // IMPORTANTE: Respeitar a ancoragem
            var tb = txtLyr.sourceRectAtTime(0, false);
            var tcx = tb.left + (tb.width/2);
            var tcy = tb.top  + (tb.height/2);
            txtTr.property("ADBE Anchor Point").setValue([tcx, tcy]); // Eixo guiado ao centro
            
            // Posiciona perfeitamente a coordernada vinda do IL
            txtTr.property("ADBE Position").setValue([sd.x, sd.y]);
            
            // Aplica a Rotação (A Magia acontece aqui)
            if (sd.rotation !== undefined && sd.rotation !== 0) {
                txtTr.property("ADBE Rotate Z").setValue(sd.rotation);
            }
            
            app.endUndoGroup();
            
            alert("Texto Inserido com SUCESSO!\n\nFoi aplicado:\nRotação: " + sd.rotation + "°\nCoordenadas do Anchor: " + sd.x + ", " + sd.y + "\n" + (sd.kind===1? "No modo PointText [0,0]" : "Centro BoundingBox."));
        }
    }
} catch(e) {
    alert("Erro na reconstrução (AE): " + e.message + " | Linha: " + e.line);
}
