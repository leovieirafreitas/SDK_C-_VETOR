// host/index.jsx Ã¢â‚¬â€ FlashFill backend (avaliado pelo Adobe)
var extRoot = Folder.userData.fsName.replace(/\\/g, "/") + "/Adobe/CEP/extensions/GradFixer";

function runCriarComp() {
    try {
        var paths = [
            extRoot + "/CriarComp.jsx"
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
            extRoot + "/ExtrairGradiente.jsx"
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
            extRoot + "/ExtrairGradiente.jsx"
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
            extRoot + "/SplitGroup.jsx"
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
        
        // Calcular o centro da seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Artboard Original
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
            if (!docPath) throw new Error("No path");
        } catch(e) {
            return "Erro: Salve o arquivo .ai do Illustrator localmente (Ctrl+S) pelo menos uma vez.";
        }
        
        if (!doc.saved) {
            try {
                doc.save();
            } catch (e) {
                return "Erro: Salve o arquivo .ai do Illustrator localmente (Ctrl+S) pelo menos uma vez.";
            }
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
                               "} else { alert('Nenhuma composiÃƒÂ§ÃƒÂ£o ativa no AE encontrada. Abra uma onde quer inserir.'); } " +
                       "} else { alert('Arquivo nÃƒÂ£o encontrado: ' + f.fsName); } " +
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
        req += "var extPath = Folder.userData.fsName.replace(/\\\\/g, '/') + '/Adobe/CEP/extensions/GradFixer/';";
        req += "var f = new File(extPath + '" + scriptFileName + "');";
        req += "if (!f.exists) f = new File(extPath + 'host/' + '" + scriptFileName + "');";
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
        req += "var extPath = Folder.userData.fsName.replace(/\\\\/g, '/') + '/Adobe/CEP/extensions/GradFixer/';";
        req += "var f = new File(extPath + '" + scriptFileName + "');";
        req += "if (!f.exists) f = new File(extPath + 'host/' + '" + scriptFileName + "');";
        
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
        req += 'var hostIndex = Folder.userData.fsName.replace(/\\\\/g, \"/\") + \"/Adobe/CEP/extensions/GradFixer/host/index.jsx\"; ';
        req += 'var f = new File(hostIndex); ';
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

function runPrecomp() {
    try {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScript =
            "try {" +
            "app.beginUndoGroup('FlashFill: Precomp');" +
            "var comp = app.project.activeItem;" +
            "if (!comp || !(comp instanceof CompItem)) { alert('Abra uma Composicao no AE.'); app.endUndoGroup(); } else {" +
            "var rawSel = comp.selectedLayers;" +
            "if (rawSel.length === 0) { alert('Selecione pelo menos uma layer.'); app.endUndoGroup(); } else {" +
            "var layersToComp = [];" +
            "if (rawSel.length === 1 && rawSel[0].guideLayer) {" +
            "  var guideRef = rawSel[0];" +
            "  layersToComp.push(guideRef);" +
            "  for (var k = 1; k <= comp.layers.length; k++) {" +
            "    if (comp.layers[k].index !== guideRef.index &&" +
            "        comp.layers[k].parent && comp.layers[k].parent.index === guideRef.index) {" +
            "      layersToComp.push(comp.layers[k]);" +
            "    }" +
            "  }" +
            "} else {" +
            "  for (var k3 = 0; k3 < rawSel.length; k3++) layersToComp.push(rawSel[k3]);" +
            "}" +
            "var idxArr = [];" +
            "for (var j = 0; j < layersToComp.length; j++) idxArr.push(layersToComp[j].index);" +
            "var t = comp.time;" +
            "var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;" +
            "for (var i = 0; i < layersToComp.length; i++) {" +
            "  var src = layersToComp[i].source;" +
            "  if (src && src.width) {" +
            "    var pos = layersToComp[i].property('Position').valueAtTime(t, false);" +
            "    var w2 = src.width/2, h2 = src.height/2;" +
            "    if (pos[0]-w2 < minX) minX = pos[0]-w2;" +
            "    if (pos[1]-h2 < minY) minY = pos[1]-h2;" +
            "    if (pos[0]+w2 > maxX) maxX = pos[0]+w2;" +
            "    if (pos[1]+h2 > maxY) maxY = pos[1]+h2;" +
            "  }" +
            "}" +
            "if (!isFinite(minX)) { minX=0; minY=0; maxX=comp.width; maxY=comp.height; }" +
            "var bW = Math.ceil(maxX-minX), bH = Math.ceil(maxY-minY);" +
            "if (bW < 1) bW = comp.width; if (bH < 1) bH = comp.height;" +
            "var newComp = comp.layers.precompose(idxArr, 'Precomp', true);" +
            "if (newComp && newComp instanceof CompItem) { newComp.width = bW; newComp.height = bH; }" +
            "}" + 
            "}" + 
            "app.endUndoGroup();" +
            "app.activate();" +
            "} catch(eae) { alert('FlashFill Precomp: ' + eae.toString() + ' L' + eae.line); }";
        bt.body = aeScript;
        bt.send();
        return "true";
    } catch(e) {
        return "Erro Precomp: " + e.toString();
    }
}

function runDecomp() {
    try {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScript =
            "try {" +
            "var comp = app.project.activeItem;" +
            "if (!comp || !(comp instanceof CompItem)) { alert('Abra uma Composicao no AE.'); } else {" +
            "var sel = comp.selectedLayers;" +
            "if (sel.length === 0) { alert('Selecione uma Precomp.'); } else {" +
            "var target = sel[0];" +
            "if (!(target.source instanceof CompItem)) {" +
            "  alert('Selecione uma layer do tipo Precomp.');" +
            "} else {" +

            "var parentComp = comp;" +
            "var nested = target.source;" +

            // Calculate exact offset
            "var tPos = target.property('Position').value;" +
            "var tAP = target.property('Anchor Point').value;" +
            "var bX = tPos[0] - tAP[0];" +
            "var bY = tPos[1] - tAP[1];" +

            // Tag target for safe removal later
            "target.name = '__ff_target_precomp';" +
            "target.selected = false;" + // Deselect it

            // Open nested comp and select ALL layers
            "nested.openInViewer();" +
            "var nc = app.project.activeItem;" +
            "if (nc && nc instanceof CompItem) {" +
            "  for (var si = 1; si <= nc.layers.length; si++) nc.layers[si].selected = true;" +
            "}" +

            // Copy
            "app.executeCommand(19);" +

            // Switch to parent comp and paste
            "parentComp.openInViewer();" +
            "app.executeCommand(20);" +

            // Pasted layers are now selected in parentComp
            "var pastedLayers = parentComp.selectedLayers;" +
            
            // Get a FRESH reference to the target layer (because paste invalidates old layer references)
            "var freshTarget = null;" +
            "for (var i = 1; i <= parentComp.layers.length; i++) {" +
            "  if (parentComp.layers[i].name === '__ff_target_precomp') {" +
            "    freshTarget = parentComp.layers[i];" +
            "    break;" +
            "  }" +
            "}" +

            // Shift position so they sit exactly where the Precomp was
            "for (var pl = 0; pl < pastedLayers.length; pl++) {" +
            "  var layer = pastedLayers[pl];" +
            "  if (!layer.parent) {" +
            "    var posProp = layer.property('Position');" +
            "    if (posProp) {" +
            "      if (posProp.dimensionsSeparated) {" +
            "        var xP = layer.property('X Position');" +
            "        var yP = layer.property('Y Position');" +
            "        if (xP) xP.setValue(xP.value + bX);" +
            "        if (yP) yP.setValue(yP.value + bY);" +
            "      } else {" +
            "        var cp = posProp.value;" +
            "        posProp.setValue([cp[0] + bX, cp[1] + bY]);" +
            "      }" +
            "    }" +
            "  }" +
            "}" +

            // MOVE PASTED LAYERS BEFORE THE TARGET (Z-INDEX REORDER)
            "if (freshTarget) {" +
            "  for (var mpl = 0; mpl < pastedLayers.length; mpl++) {" +
            "    pastedLayers[mpl].moveBefore(freshTarget);" +
            "  }" +
            "  freshTarget.remove();" + // Remove safely
            "}" +
            "if (nested.usedIn.length === 0) nested.remove();" +

            "}" + 
            "}" + 
            "}" + 
            "app.activate();" +
            "} catch(eae) { alert('FlashFill Decomp: Error: ' + eae.toString() + ' L' + eae.line); }";
        bt.body = aeScript;
        bt.send();
        return "true";
    } catch(e) {
        return "Erro Decomp: " + e.toString();
    }
}

function runToggle() {
    try {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScript =
            "try {" +
            "var comp = app.project.activeItem;" +
            "if (!comp || !(comp instanceof CompItem)) { alert('Abra uma Composicao no AE.'); } else {" +
            "  var targetState = null;" +
            "  var guides = [];" +
            "  for(var i=1; i<=comp.layers.length; i++) {" +
            "    if(comp.layers[i].guideLayer) {" +
            "      guides.push(comp.layers[i]);" +
            "      if (targetState === null) targetState = !comp.layers[i].enabled;" +
            "    }" +
            "  }" +
            "  if(guides.length > 0) {" +
            "    app.beginUndoGroup('FlashFill: Toggle Groups');" +
            "    for(var j=0; j<guides.length; j++) guides[j].enabled = targetState;" +
            "    app.endUndoGroup();" +
            "  }" +
            "}" +
            "} catch(eae) { alert('FlashFill Toggle: Error: ' + eae.toString() + ' L' + eae.line); }";
        bt.body = aeScript;
        bt.send();
        return "true";
    } catch(e) {
        return "Erro Toggle: " + e.toString();
    }
}
