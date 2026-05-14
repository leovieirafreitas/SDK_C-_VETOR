// CriarComp.jsx - Avaliado no Illustrator via CEP panel
(function() {
    var doc; 
    try { doc = app.activeDocument; } 
    catch(e) { alert("Abra um documento no Illustrator!"); return; }
    
    var abIdx = doc.artboards.getActiveArtboardIndex();
    var ab = doc.artboards[abIdx];
    var abRect = ab.artboardRect;
    
    // Calcula largura e altura usando pontos absolutos
    var abW = abRect[2] - abRect[0];
    var abH = abRect[1] - abRect[3]; // Y cresce para cima no Illustrator, entao top - bottom
    
    // Usa nome do artboard se for util, ou o nome do .ai
    var nameToUse = ab.name || doc.name || "Comp";
    nameToUse = nameToUse.replace(".ai", "");

    if (BridgeTalk.isRunning("aftereffects")) {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        
        // Em AE, compoe o script de execucao:
        var req = "app.beginUndoGroup('Create Comp');\n";
        req += "try {\n";
        req += "var comp = app.project.items.addComp('" + nameToUse.replace(/'/g, "\\'") + "', " + Math.round(abW) + ", " + Math.round(abH) + ", 1, 10, 24);\n";
        req += "comp.bgColor = [0,0,0];\n";
        req += "comp.openInViewer();\n";
        req += "} catch(e) { alert('Erro ao criar Comp no AE: ' + e.toString()); }\n";
        req += "app.endUndoGroup();\n";
        
        bt.body = req;
        bt.send();
    } else {
        alert("O After Effects precisa estar aberto!");
    }
})();
