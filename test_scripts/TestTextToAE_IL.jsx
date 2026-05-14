// TestTextToAE_IL.jsx - Execute isso no Illustrator (Arquivo > Scripts > Outro Script...)
try {
    var doc = app.activeDocument;
    if (doc.selection.length === 0) {
        alert("Ops! Por favor, selecione APENAS UM texto no Illustrator antes de executar.");
    } else {
        var item = doc.selection[0];
        if (item.typename !== "TextFrame") {
            alert("O item selecionado não é um texto puro! Selecionado: " + item.typename);
        } else {
            // Pegar coordenadas do Artboard Ativo
            var abIdx = doc.artboards.getActiveArtboardIndex();
            var ab = doc.artboards[abIdx].artboardRect;
            var abLeft = ab[0];
            var abTop = ab[1];
            
            var rot = 0;
            try {
                if (item.matrix) {
                    rot = -Math.atan2(item.matrix.mValueB, item.matrix.mValueA) * 180.0 / Math.PI;
                }
            } catch(e){}

            var isPoint = 0;
            var aeX = 0, aeY = 0;
            
            try {
                if (item.kind && item.kind.toString().indexOf("POINT") > -1) isPoint = 1;
                
                // Conversão temporária para AreaText p/ ver a matriz 100% real
                if (Math.abs(rot) < 0.1 && isPoint === 1) {
                    try {
                        var dup = item.duplicate();
                        dup.convertPointObjectToAreaObject();
                        if (dup.matrix) rot = -Math.atan2(dup.matrix.mValueB, dup.matrix.mValueA) * 180.0 / Math.PI;
                        dup.remove();
                    } catch(e) {}
                }

                // O SEGREDO MESTRE DA POSIÇÃO: Usar SEMPRE o bounding box (mesmo rotacionado)
                var b = item.geometricBounds;
                aeX = ((b[0] + b[2]) / 2) - abLeft;
                aeY = abTop - ((b[1] + b[3]) / 2);
            } catch(e) {
                var b2 = item.geometricBounds;
                aeX = ((b2[0] + b2[2]) / 2) - abLeft;
                aeY = abTop - ((b2[1] + b2[3]) / 2);
            }
            
            var txt = item.contents || "";
            // Preservar quebras de linha substituindo \r e \n pelo literal \r da string JSON
            var safeTxt = txt.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\r").replace(/"/g, "\\\"");
            
            var size = 50, font = "Arial";
            var colorArr = [1, 1, 1]; // Branco por padrao
            var just = 0; // AE-Left default
            try {
                var attrs = item.textRange.characterAttributes;
                if (attrs.size) size = Math.round(attrs.size);
                if (attrs.textFont) font = attrs.textFont.name;
                
                var c = attrs.fillColor;
                if (c) {
                    if (c.typename === "RGBColor") colorArr = [c.red/255, c.green/255, c.blue/255];
                    else if (c.typename === "CMYKColor") { 
                        var cy=c.cyan/100, m=c.magenta/100, y=c.yellow/100, k=c.black/100; 
                        colorArr = [(1-cy)*(1-k), (1-m)*(1-k), (1-y)*(1-k)]; 
                    }
                    else if (c.typename === "GrayColor") { var gv=1-c.gray/100; colorArr=[gv,gv,gv]; }
                    else if (c.typename === "SpotColor" && c.spot.color) {
                        var sc = c.spot.color;
                        if (sc.typename === "RGBColor") colorArr = [sc.red/255, sc.green/255, sc.blue/255];
                    }
                }
                
                var pAttrs = item.textRange.paragraphAttributes;
                if (pAttrs.justification) {
                    var jstr = pAttrs.justification.toString();
                    if (jstr.indexOf("CENTER") > -1) just = 1;
                    else if (jstr.indexOf("RIGHT") > -1) just = 2;
                }
            } catch(e){}
            
            rot = Math.round(rot * 100) / 100;

            var jsonStr = "{\n" +
                "  \"text\": \"" + safeTxt + "\",\n" +
                "  \"x\": " + aeX + ",\n" +
                "  \"y\": " + aeY + ",\n" +
                "  \"rotation\": " + rot + ",\n" +
                "  \"kind\": " + isPoint + ",\n" +
                "  \"fontSize\": " + size + ",\n" +
                "  \"color\": [" + colorArr.join(", ") + "],\n" +
                "  \"justification\": " + just + ",\n" +
                "  \"fontName\": \"" + font + "\"\n" +
                "}";
                
            var f = new File("C:/AEGP/test_text.json");
            f.open("w");
            f.write(jsonStr);
            f.close();
            
            alert("Texto extraído com SUCESSO!\n\nString gerada em C:/AEGP/test_text.json\n\nRotação detectada: " + rot + "°\nTipo PointText: " + (isPoint ? "Sim" : "Não"));
        }
    }
} catch(e) {
    alert("Erro na extração: " + e.message);
}
