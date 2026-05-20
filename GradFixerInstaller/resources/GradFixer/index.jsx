// host/index.jsx â€” FlashFill backend (avaliado pelo Adobe)
var extRoot = new File($.fileName).parent.parent.fsName.replace(/\\/g, "/");

function runCriarComp() {
    try {
        var paths = [
            extRoot + "/CriarComp.jsx",
            "C:/Users/FELIPE BARROSO/Documents/SDKAFTERGRADIENTE/CriarComp.jsx"
        ];
        for (var i = 0; i < paths.length; i++) {
            var f = new File(paths[i]);
            if (f.exists) {
                $.evalFile(f);
                return "true";
            }
        }
        alert("CriarComp.jsx nao encontrado em C:/AEGP/ nem em Documentos.");
        return "false";
    } catch(e) {
        alert("Erro: " + e.toString() + " (linha " + e.line + ")");
        return "false";
    }
}

function runExtrairGradiente(customExportPath) {
    try {
        $.flashFillMode = ""; // modo padrao = Split Layer
        $.flashFillExportPath = customExportPath || "C:/AEGP/img_export";
        var paths = [
            extRoot + "/ExtrairGradiente.jsx",
            "C:/Users/FELIPE BARROSO/Documents/SDKAFTERGRADIENTE/ExtrairGradiente.jsx"
        ];
        for (var i = 0; i < paths.length; i++) {
            var f = new File(paths[i]);
            if (f.exists) {
                $.evalFile(f);
                return "true";
            }
        }
        alert("ExtrairGradiente.jsx nao encontrado em C:/AEGP/ nem em Documentos.");
        return "false";
    } catch(e) {
        alert("Erro: " + e.toString() + " (linha " + e.line + ")");
        return "false";
    }
}

function runExtrairForSplitGroup(customExportPath) {
    try {
        $.flashFillMode = "group"; // Seta flag: BridgeTalk vai rodar SplitGroup.jsx no AE
        $.flashFillExportPath = customExportPath || "C:/AEGP/img_export";
        var paths = [
            extRoot + "/ExtrairGradiente.jsx",
            "C:/Users/FELIPE BARROSO/Documents/SDKAFTERGRADIENTE/ExtrairGradiente.jsx"
        ];
        for (var i = 0; i < paths.length; i++) {
            var f = new File(paths[i]);
            if (f.exists) {
                $.evalFile(f);
                return "true";
            }
        }
        alert("ExtrairGradiente.jsx nao encontrado.");
        return "false";
    } catch(e) {
        alert("Erro SplitGroup extract: " + e.toString());
        return "false";
    }
}

function runApplyGradients() {
    try {
        var gCmd = app.findMenuCommandId("GRAD FIXER: Aplicar Gradientes");
        if (gCmd > 0) { app.executeCommand(gCmd); return "true"; }
        alert("Plugin GRAD FIXER nao encontrado no menu. Reinstale o .aex.");
        return "false";
    } catch(e) {
        alert("Erro AE: " + e.toString());
        return "false";
    }
}

function runSplitGroup() {
    try {
        var paths = [
            extRoot + "/SplitGroup.jsx",
            "C:/Users/FELIPE BARROSO/Documents/SDKAFTERGRADIENTE/SplitGroup.jsx"
        ];
        for (var i = 0; i < paths.length; i++) {
            var f = new File(paths[i]);
            if (f.exists) { 
                var bt = new BridgeTalk();
                bt.target = "aftereffects";
                bt.body = "var f = new File('" + f.fsName.replace(/\\/g, "\\\\") + "'); if(f.exists) { f.open('r'); eval(f.read()); f.close(); }";
                bt.send();
                return "true"; 
            }
        }
        alert("SplitGroup.jsx nao encontrado em C:/AEGP/");
        return "false";
    } catch(e) {
        alert("Erro SplitGroup: " + e.toString() + " (linha " + e.line + ")");
        return "false";
    }
}

function runRasterize(scaleStr) {
    try {
        if (app.documents.length === 0) return "Erro: Abra um documento.";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Erro: Selecione algo para rasterizar.";
        
        var file = File.saveDialog("Onde quer salvar este PNG?", "PNG Files:*.png");
        if (!file) return "Cancelado";
        
        if (!file.name.match(/\.png$/i)) { file = new File(file.fsName + ".png"); }
        
        var scale = parseFloat(scaleStr);
        if (isNaN(scale)) scale = 4.0;
        
        // Calcular o centro da seleÃ§Ã£o no Artboard Original
        var left = 999999, top = -999999, right = -999999, bottom = 999999;
        var sel = doc.selection;
        for (var i = 0; i < sel.length; i++) {
            var b = sel[i].visibleBounds;
            if (b[0] < left) left = b[0];
            if (b[1] > top) top = b[1];
            if (b[2] > right) right = b[2];
            if (b[3] < bottom) bottom = b[3];
        }
        var centerX = (left + right) / 2.0;
        var centerY = (top + bottom) / 2.0;

        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        var abRect = ab.artboardRect; // [left, top, right, bottom] (onde top > bottom)
        var relX = centerX - abRect[0];
        var relY = abRect[1] - centerY;

        app.copy();
        var tempDoc = app.documents.add(DocumentColorSpace.RGB);
        app.paste();
        
        // Fit artboard to selection
        var vBounds = tempDoc.visibleBounds;
        tempDoc.artboards[0].artboardRect = vBounds;
        
        var opts = new ExportOptionsPNG24();
        opts.antiAliasing = true;
        opts.transparency = true;
        opts.artBoardClipping = true;
        opts.horizontalScale = scale * 100;
        opts.verticalScale = scale * 100;
        opts.saveAsHTML = false;
        
        tempDoc.exportFile(file, ExportType.PNG24, opts);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        // Send to After Effects
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var pathForAE = file.fsName.replace(/\\/g, "\\\\");
        var aeScale = 100.0 / scale;
        
        var aeScript = "app.beginUndoGroup('Rasterizar para PNG'); " +
                       "var f = new File('" + pathForAE + "'); " +
                       "if(f.exists) { " +
                           "var io = new ImportOptions(f); " +
                           "var item = app.project.importFile(io); " +
                           "if(app.project.activeItem && app.project.activeItem instanceof CompItem) { " +
                                "var layer = app.project.activeItem.layers.add(item); " +
                                "layer.property('Scale').setValue([" + aeScale + ", " + aeScale + "]); " +
                                "layer.property('Position').setValue([" + relX + ", " + relY + "]); " +
                           "} " +
                       "} " +
                       "app.endUndoGroup(); " +
                       "app.activate();";
        bt.body = aeScript;
        bt.send();
        
        return "true";
    } catch(e) {
        return "Erro Rasterize: " + e.toString() + " (linha " + e.line + ")";
    }
}

function runExportAI() {
    try {
        if (app.documents.length === 0) return "Erro: Abra um documento.";
        var doc = app.activeDocument;
        var docPath;
        try {
            docPath = doc.fullName;
        } catch(e) {
            return "Erro: Salve o arquivo .ai do Illustrator localmente (Ctrl+S) pelo menos uma vez.";
        }
        
        if (!doc.saved) {
            doc.save();
        }
        
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        var abRect = ab.artboardRect;
        var left = 999999, top = -999999, right = -999999, bottom = 999999;
        var sel = doc.selection;
        if (sel.length > 0) {
            for (var i = 0; i < sel.length; i++) {
                var b = sel[i].visibleBounds;
                if (b[0] < left) left = b[0];
                if (b[1] > top) top = b[1];
                if (b[2] > right) right = b[2];
                if (b[3] < bottom) bottom = b[3];
            }
        } else {
            left = abRect[0]; top = abRect[1]; right = abRect[2]; bottom = abRect[3];
        }
        var centerX = (left + right) / 2.0;
        var centerY = (top + bottom) / 2.0;
        var relX = centerX - abRect[0];
        var relY = abRect[1] - centerY;

        var pathForAE = docPath.fsName.replace(/\\/g, "\\\\");
        
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScript = "try { " +
                       "app.beginUndoGroup('Importar Dynamic Link .ai'); " +
                       "var f = new File('" + pathForAE + "'); " +
                       "if(f.exists) { " +
                           "var io = new ImportOptions(f); " +
                           "io.importAs = ImportAsType.COMP_CROPPED_LAYERS; " +
                           "io.sequence = false; " +
                           "io.forceAlphabetical = false; " +
                           "var importedComp = app.project.importFile(io); " +
                               "var activeComp = app.project.activeItem; " +
                               "if(activeComp && activeComp instanceof CompItem && importedComp instanceof CompItem) { " +
                                    "var docParts = f.name.split('.'); docParts.pop(); var docName = docParts.join('.'); " +
                                    "var guide = activeComp.layers.addShape(); " +
                                    "guide.name = '# ' + docName; " +
                                    "guide.guideLayer = true; " +
                                    "var targetX = activeComp.width/2 + (" + relX + " - importedComp.width/2); " +
                                    "var targetY = activeComp.height/2 + (" + relY + " - importedComp.height/2); " +
                                    "guide.property('Position').setValue([targetX, targetY]); " +
                                    "for (var i = importedComp.layers.length; i >= 1; i--) { " +
                                        "var sourceLayer = importedComp.layers[i]; " +
                                        "var newLayer = activeComp.layers.add(sourceLayer.source); " +
                                        "var origP = sourceLayer.property('Position').value; " +
                                        "newLayer.property('Position').setValue([activeComp.width/2 + (origP[0] - importedComp.width/2), activeComp.height/2 + (origP[1] - importedComp.height/2)]); " +
                                        "newLayer.parent = guide; " +
                                    "} " +
                               "} else { alert('Nenhuma composição ativa no AE encontrada. Abra uma onde quer inserir.'); } " +
                       "} else { alert('Arquivo não encontrado: ' + f.fsName); } " +
                       "app.endUndoGroup(); " +
                       "app.activate(); " +
                       "} catch(eae) { alert('Erro no AE (Import AI): ' + eae.toString() + ' (L' + eae.line + ')'); }";
        bt.body = aeScript;
        
        var btErr = "";
        bt.onError = function(err) { btErr = err.body; };
        bt.onResult = function(res) {};
        bt.send(10);
        
        if (btErr !== "") {
            return "BT Erro: " + btErr;
        }
        return "true";
    } catch(e) {
        return "Erro Import AI IL: " + e.toString() + " (linha " + e.line + ")";
    }
}






// ======= FUNCOES PARA O AFTER EFFECTS ACIONAR O ILLUSTRATOR =======
function aeTriggerIlst(scriptToRun) {
    try {
        if (!BridgeTalk.isRunning("illustrator")) {
            return "Illustrator nao esta aberto ou reconhecido.";
        }
        var bt = new BridgeTalk();
        bt.target = "illustrator";
        bt.body = scriptToRun + ";";
        bt.send();
        return "true";
    } catch(e) {
        return "Erro BridgeTalk (AE->ILST): " + e.toString();
    }
}
function aeTriggerIlstSafe(scriptFileName, scaleVal) {
    try {
        if (!BridgeTalk.isRunning("illustrator")) {
            return "Illustrator nao esta aberto.";
        }
        var bt = new BridgeTalk();
        bt.target = "illustrator";
        
        var req = "try {";
        req += "var f = new File('C:/Users/FELIPE BARROSO/Documents/SDKAFTERGRADIENTE/' + '" + scriptFileName + "');";
        req += "if (!f.exists) f = new File('C:/AEGP/' + '" + scriptFileName + "');";
        if (scriptFileName === "ExtrairGradiente.jsx") {
            req += "$.flashFillMode = '';";
        } else if (scriptFileName === "ExtrairForSplitGroup.jsx") {
            req += "$.flashFillMode = 'group';";
        }
        
        if (scriptFileName === "Rasterizar.jsx" && scaleVal) {
            req += "var scaleVal = " + scaleVal + ";";
        }

        req += "if (f.exists) { $.evalFile(f); } else { alert('Arquivo nao encontrado: ' + '" + scriptFileName + "'); }";
        req += "} catch(e) { alert('Erro no Illustrator: ' + e.toString()); }";
        
        bt.body = req;
        bt.send();
        return "true";
    } catch(e) {
        return "Erro BridgeTalk: " + e.toString();
    }
}
function aeTriggerIlstSafe(scriptFileName, mode, scaleVal) {
    try {
        if (!BridgeTalk.isRunning("illustrator")) {
            return "Illustrator nao esta aberto.";
        }
        var bt = new BridgeTalk();
        bt.target = "illustrator";
        
        var req = "try {";
        req += "var f = new File('C:/Users/FELIPE BARROSO/Documents/SDKAFTERGRADIENTE/' + '" + scriptFileName + "');";
        req += "if (!f.exists) f = new File('C:/AEGP/' + '" + scriptFileName + "');";
        
        if (mode === "group") {
            req += "$.flashFillMode = 'group';";
        } else if (mode === "layer") {
            req += "$.flashFillMode = '';";
        }
        
        if (scriptFileName === "Rasterizar.jsx" && scaleVal) {
            req += "var scaleVal = " + scaleVal + ";";
        }

        req += "if (f.exists) { $.evalFile(f); } else { alert('Arquivo nao encontrado no ILST: ' + '" + scriptFileName + "'); }";
        req += "} catch(e) { alert('Erro no Illustrator: ' + e.toString()); }";
        
        bt.body = req;
        bt.send();
        return "true";
    } catch(e) {
        return "Erro BridgeTalk: " + e.toString();
    }
}

function aeTriggerIlstCommand(cmdString) {
    try {
        if (!BridgeTalk.isRunning('illustrator')) return 'Illustrator nao esta aberto.';
        var bt = new BridgeTalk();
        bt.target = 'illustrator';
        var req = 'try { ';
        req += 'if (typeof runCriarComp === \"undefined\") { ';
        req += 'var f = new File(\"C:/Users/FELIPE BARROSO/AppData/Roaming/Adobe/CEP/extensions/GradFixer/host/index.jsx\"); ';
        req += 'if (f.exists) $.evalFile(f); ';
        req += '} ';
        req += cmdString + '; ';
        req += '} catch(e) { alert(\"Erro Ilst: \" + e.toString()); }';
        bt.body = req;
        bt.send();
        return 'true';
    } catch(e) {
        return 'Erro BT: ' + e.toString();
    }
}

function runTransferGuides() {
    try {
        if (app.documents.length === 0) return "Erro: Abra um documento no Illustrator.";
        var doc = app.activeDocument;
        
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        var abRect = ab.artboardRect;
        var abLeft = abRect[0];
        var abTop = abRect[1];
        
        var guidesList = [];
        var allPaths = doc.pathItems;
        for (var i = 0; i < allPaths.length; i++) {
            var item = allPaths[i];
            if (item.guides === true) {
                try { if (item.hidden) continue; } catch(e){}
                try { if (item.layer && !item.layer.visible) continue; } catch(e){}
                
                var bounds = item.geometricBounds; // [left, top, right, bottom]
                var w = bounds[2] - bounds[0];
                var h = bounds[1] - bounds[3];
                if (w < 0.1) {
                    var x = bounds[0] - abLeft;
                    guidesList.push({ type: "v", pos: x });
                } else if (h < 0.1) {
                    var y = abTop - bounds[1];
                    guidesList.push({ type: "h", pos: y });
                }
            }
        }
        
        if (guidesList.length === 0) {
            alert("Nenhuma regua/guia encontrada no Illustrator.");
            return "Nenhuma regua encontrada.";
        }
        
        if (!BridgeTalk.isRunning("aftereffects")) {
            alert("O After Effects precisa estar aberto!");
            return "AE nao aberto.";
        }
        
        var aeScript = "try {\n";
        aeScript += "var comp = app.project.activeItem;\n";
        aeScript += "if (comp && comp instanceof CompItem) {\n";
        aeScript += "  app.beginUndoGroup('Importar Reguas/Guias');\n";
        for (var j = 0; j < guidesList.length; j++) {
            var g = guidesList[j];
            var dir = g.type === "h" ? 0 : 1;
            aeScript += "  comp.addGuide(" + dir + ", " + Math.round(g.pos) + ");\n";
        }
        aeScript += "  app.endUndoGroup();\n";
        aeScript += "} else {\n";
        aeScript += "  alert('Por favor, selecione ou abra uma composicao no After Effects.');\n";
        aeScript += "}\n";
        aeScript += "} catch(e) { alert('Erro no AE ao importar guias: ' + e.toString()); }\n";
        
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        bt.body = aeScript;
        bt.send();
        
        return "true";
    } catch(e) {
        alert("Erro ao transferir guias: " + e.toString() + " (linha " + e.line + ")");
        return "false";
    }
}
