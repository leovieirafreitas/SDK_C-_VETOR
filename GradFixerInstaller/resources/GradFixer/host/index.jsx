// host/index.jsx - FlashFill backend (avaliado pelo Adobe)
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
        alert("CriarComp.jsx nao encontrado.");
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
        alert("ExtrairGradiente.jsx nao encontrado.");
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

// Para manter compatibilidade se o painel chamar runExtrairForSplitGroup(customExportPath, scaleVal) ou similar
function aeTriggerIlstSafe(scriptFileName, modeOrScale, scaleVal) {
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
        
        var finalMode = "";
        var finalScale = null;
        if (typeof modeOrScale === "string") {
            finalMode = modeOrScale;
            if (scaleVal !== undefined) finalScale = scaleVal;
        } else if (typeof modeOrScale === "number") {
            finalScale = modeOrScale;
        }
        
        if (finalMode === "group") {
            req += "$.flashFillMode = 'group';";
        } else if (finalMode === "layer") {
            req += "$.flashFillMode = '';";
        } else if (scriptFileName === "ExtrairGradiente.jsx") {
            req += "$.flashFillMode = '';";
        } else if (scriptFileName === "ExtrairForSplitGroup.jsx") {
            req += "$.flashFillMode = 'group';";
        }
        
        if (scriptFileName === "Rasterizar.jsx" && finalScale) {
            req += "var scaleVal = " + finalScale + ";";
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
        alert("SplitGroup.jsx nao encontrado.");
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
        var abRect = ab.artboardRect;
        var relX = centerX - abRect[0];
        var relY = abRect[1] - centerY;

        app.copy();
        var tempDoc = app.documents.add(DocumentColorSpace.RGB);
        app.paste();
        
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
                               "} else { alert('Nenhuma composicao ativa no AE encontrada.'); } " +
                       "} else { alert('Arquivo nao encontrado: ' + f.fsName); } " +
                       "app.endUndoGroup(); " +
                       "app.activate(); " +
                       "} catch(eae) { alert('Erro no AE (Import AI): ' + eae.toString() + ' (L' + eae.line + ')'); }";
        bt.body = aeScript;
        
        var btErr = "";
        bt.onError = function(err) { btErr = err.body; };
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
            "try {" + "  try { app.endUndoGroup(); } catch(e) {}" +
            "  try { app.endUndoGroup(); } catch(e) {}" + 
            "  app.beginUndoGroup('FlashFill: Precomp');" +
            "  var comp = app.project.activeItem;" +
            "  if (!comp || !(comp instanceof CompItem)) { alert('Abra uma Composicao no AE.'); } else {" +
            "    var rawSel = comp.selectedLayers;" +
            "    if (rawSel.length === 0) { alert('Selecione pelo menos uma layer.'); } else {" +
            "      var layersToComp = [];" +
            "      if (rawSel.length === 1 && rawSel[0].guideLayer) {" +
            "        var guideRef = rawSel[0];" +
            "        layersToComp.push(guideRef);" +
            "        for (var k = 1; k <= comp.layers.length; k++) {" +
            "          if (comp.layers[k].index !== guideRef.index &&" +
            "              comp.layers[k].parent && comp.layers[k].parent.index === guideRef.index) {" +
            "            layersToComp.push(comp.layers[k]);" +
            "          }" +
            "        }" +
            "      } else {" +
            "        for (var k3 = 0; k3 < rawSel.length; k3++) layersToComp.push(rawSel[k3]);" +
            "      }" +
            "      var idxArr = [];" +
            "      for (var j = 0; j < layersToComp.length; j++) idxArr.push(layersToComp[j].index);" +
            "      var t = comp.time;" +
            "      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;" +
            "      for (var i = 0; i < layersToComp.length; i++) {" +
            "        var l = layersToComp[i];" +
            "        var rect = l.sourceRectAtTime(t, false);" +
            "        if (rect.width === 0 && rect.height === 0 && layersToComp.length > 1) continue;" +
            "        var absP = [0,0];" +
            "        if(l.property('Position')) { var pv = l.property('Position').value; absP[0] = pv[0]; absP[1] = pv[1]; }" +
            "        var absA = [0,0];" +
            "        if(l.property('Anchor Point')) { var av = l.property('Anchor Point').value; absA[0] = av[0]; absA[1] = av[1]; }" +
            "        var s = [100,100];" +
            "        if(l.property('Scale')) { var sv = l.property('Scale').value; s[0] = sv[0]; s[1] = sv[1]; }" +
            "        var curr = l;" +
            "        while(curr.parent) {" +
            "          curr = curr.parent;" +
            "          var pPos = [0,0];" +
            "          if(curr.property('Position')) { var cpv = curr.property('Position').value; pPos[0] = cpv[0]; pPos[1] = cpv[1]; }" +
            "          var pAnc = [0,0];" +
            "          if(curr.property('Anchor Point')) { var cav = curr.property('Anchor Point').value; pAnc[0] = cav[0]; pAnc[1] = cav[1]; }" +
            "          absP[0] = absP[0] - pAnc[0] + pPos[0];" +
            "          absP[1] = absP[1] - pAnc[1] + pPos[1];" +
            "        }" +
            "        var wL = absP[0] - absA[0] + (rect.left * s[0]/100);" +
            "        var wT = absP[1] - absA[1] + (rect.top * s[1]/100);" +
            "        var wR = wL + (rect.width * s[0]/100);" +
            "        var wB = wT + (rect.height * s[1]/100);" +
            "        if (wL < minX) minX = wL;" +
            "        if (wR > maxX) maxX = wR;" +
            "        if (wT < minY) minY = wT;" +
            "        if (wB > maxY) maxY = wB;" +
            "      }" +
            "      var bW = Math.ceil(maxX - minX);" +
            "      var bH = Math.ceil(maxY - minY);" +
            "      if (bW < 2) bW = 2; if (bH < 2) bH = 2;" +
            "      var pArt = [minX + bW/2, minY + bH/2];" +
            "      var commonParent = null;" +
            "      var allSameParent = true;" +
            "      for (var jp = 0; jp < layersToComp.length; jp++) {" +
            "        if (jp === 0) { commonParent = layersToComp[jp].parent; }" +
            "        else if (layersToComp[jp].parent !== commonParent) { allSameParent = false; break; }" +
            "      }" +
            "      if (!allSameParent) commonParent = null;" +
            "      var newComp = comp.layers.precompose(idxArr, 'Precomp', true);" +
            "      if (newComp && newComp instanceof CompItem) {" +
            "        var dx = (bW / 2) - pArt[0];" +
            "        var dy = (bH / 2) - pArt[1];" +
            "        var tempNull = newComp.layers.addNull();" +
            "        for (var i = 1; i <= newComp.layers.length; i++) {" +
            "          var nl = newComp.layers[i];" +
            "          if (nl !== tempNull && !nl.parent) nl.parent = tempNull;" +
            "        }" +
            "        var nullPos = tempNull.property('Position').value;" +
            "        tempNull.property('Position').setValue([nullPos[0] + dx, nullPos[1] + dy]);" +
            "        for (var i = 1; i <= newComp.layers.length; i++) {" +
            "          var nl = newComp.layers[i];" +
            "          if (nl !== tempNull && nl.parent === tempNull) nl.parent = null;" +
            "        }" +
            "        tempNull.remove();" +
            "        newComp.width = bW;" +
            "        newComp.height = bH;" +
            "        var precompLayer = null;" +
            "        for(var c=1; c<=comp.layers.length; c++) {" +
            "          if (comp.layers[c].source === newComp) {" +
            "            precompLayer = comp.layers[c];" +
            "            break;" +
            "          }" +
            "        }" +
            "        if (precompLayer) {" +
            "          precompLayer.property('Anchor Point').setValue([bW / 2, bH / 2]);" +
            "          precompLayer.property('Position').setValue([pArt[0], pArt[1]]);" +
            "          if (commonParent) precompLayer.parent = commonParent;" +
            "        }" +
            "      }" +
            "    }" + 
            "  }" + 
            "} catch(eae) { " +
            "  alert('FlashFill Precomp: ' + eae.toString() + ' L' + eae.line); " +
            "} finally {" +
            "  app.endUndoGroup();" +
            "  app.activate();" +
            "}";
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
            "  for (var u = 0; u < 5; u++) { try { app.endUndoGroup(); } catch(e) { break; } }" +
            "  var comp = app.project.activeItem;" +
            "  if (!comp || !(comp instanceof CompItem)) { alert('Abra uma Composicao no AE.'); } else {" +
            "    var sel = comp.selectedLayers;" +
            "    if (sel.length === 0) { alert('Selecione uma Precomp.'); } else {" +
            "      var target = sel[0];" +
            "      if (!(target.source instanceof CompItem)) { alert('Selecione uma layer do tipo Precomp.'); } else {" +
            "        var nestedSource = target.source;" +
            "        var parentComp = comp;" +
            "        nestedSource.openInViewer();" +
            "        var nc = app.project.activeItem;" +
            "        var guideName = null;" +
            "        var parentMap = [];" +
            "        if (nc && nc instanceof CompItem) {" +
            "          for (var si = 1; si <= nc.layers.length; si++) nc.layers[si].selected = true;" +
            "          for (var i = 1; i <= nc.layers.length; i++) {" +
            "            var l = nc.layers[i];" +
            "            var hasChildren = false;" +
            "            for (var j = 1; j <= nc.layers.length; j++) {" +
            "              if (nc.layers[j].parent === l) { hasChildren = true; break; }" +
            "            }" +
            "            if (hasChildren) { guideName = l.name; break; }" +
            "          }" +
            "          for (var i = 1; i <= nc.layers.length; i++) {" +
            "            var l = nc.layers[i];" +
            "            if (l.parent !== null) {" +
            "              var pIndex = -1;" +
            "              for (var j = 1; j <= nc.layers.length; j++) {" +
            "                if (nc.layers[j] === l.parent) { pIndex = j; break; }" +
            "              }" +
            "              parentMap.push({ childIndex: i, parentIndex: pIndex });" +
            "              l.parent = null;" +
            "            }" +
            "          }" +
            "        }" +
            "        app.executeCommand(19);" +
            "        if (nc && nc instanceof CompItem) {" +
            "          for (var m = 0; m < parentMap.length; m++) {" +
            "            var item = parentMap[m];" +
            "            nc.layers[item.childIndex].parent = nc.layers[item.parentIndex];" +
            "          }" +
            "        }" +
            "        parentComp.openInViewer();" +
            "        app.executeCommand(20);" +
            "        var pastedLayers = parentComp.selectedLayers;" +
            "        app.beginUndoGroup('FlashFill: Decomp');" +
            "        try {" +
            "          var copyProperty = function(srcProp, destProp) {" +
            "            if (!srcProp || !destProp) return;" +
            "            try { while (destProp.numKeys > 0) destProp.removeKey(1); } catch(e) {}" +
            "            if (srcProp.numKeys > 0) {" +
            "              for (var k = 1; k <= srcProp.numKeys; k++) {" +
            "                try {" +
            "                  var t = srcProp.keyTime(k);" +
            "                  var val = srcProp.keyValue(k);" +
            "                  var newIdx = destProp.addKey(t);" +
            "                  destProp.setValueAtKey(newIdx, val);" +
            "                  try {" +
            "                    destProp.setInterpolationTypeAtKey(newIdx, srcProp.keyInInterpolationType(k), srcProp.keyOutInterpolationType(k));" +
            "                  } catch(e) {}" +
            "                  try {" +
            "                    if (srcProp.keyInInterpolationType(k) !== KeyframeInterpolationType.HOLD ||" +
            "                        srcProp.keyOutInterpolationType(k) !== KeyframeInterpolationType.HOLD) {" +
            "                      destProp.setTemporalEaseAtKey(newIdx, srcProp.keyInTemporalEase(k), srcProp.keyOutTemporalEase(k));" +
            "                      destProp.setTemporalContinuousAtKey(newIdx, srcProp.keyTemporalContinuous(k));" +
            "                      destProp.setTemporalAutoBezierAtKey(newIdx, srcProp.keyTemporalAutoBezier(k));" +
            "                    }" +
            "                  } catch(e) {}" +
            "                  if (srcProp.isSpatial) {" +
            "                    try {" +
            "                      destProp.setSpatialContinuousAtKey(newIdx, srcProp.keySpatialContinuous(k));" +
            "                      destProp.setSpatialAutoBezierAtKey(newIdx, srcProp.keySpatialAutoBezier(k));" +
            "                      destProp.setSpatialTangentsAtKey(newIdx, srcProp.keySpatialInTangent(k), srcProp.keySpatialOutTangent(k));" +
            "                    } catch(e) {}" +
            "                  }" +
            "                } catch(keyErr) {}" +
            "              }" +
            "            } else {" +
            "              try { destProp.setValue(srcProp.value); } catch(valErr) {}" +
            "            }" +
            "          };" +
            "          var copyPositionProperty = function(srcProp, destProp, origGuidePos) {" +
            "            if (!srcProp || !destProp) return;" +
            "            try { while (destProp.numKeys > 0) destProp.removeKey(1); } catch(e) {}" +
            "            var ancProp = target.property('Anchor Point');" +
            "            if (srcProp.numKeys > 0) {" +
            "              for (var k = 1; k <= srcProp.numKeys; k++) {" +
            "                try {" +
            "                  var t = srcProp.keyTime(k);" +
            "                  var srcVal = srcProp.keyValue(k);" +
            "                  var ancVal = ancProp.valueAtTime(t, false);" +
            "                  var finalVal = [" +
            "                    srcVal[0] - ancVal[0] + origGuidePos[0]," +
            "                    srcVal[1] - ancVal[1] + origGuidePos[1]" +
            "                  ];" +
            "                  if (srcVal.length > 2) {" +
            "                    finalVal.push(srcVal[2] - ancVal[2] + origGuidePos[2]);" +
            "                  }" +
            "                  var newIdx = destProp.addKey(t);" +
            "                  destProp.setValueAtKey(newIdx, finalVal);" +
            "                  try {" +
            "                    destProp.setInterpolationTypeAtKey(newIdx, srcProp.keyInInterpolationType(k), srcProp.keyOutInterpolationType(k));" +
            "                  } catch(e) {}" +
            "                  try {" +
            "                    if (srcProp.keyInInterpolationType(k) !== KeyframeInterpolationType.HOLD ||" +
            "                        srcProp.keyOutInterpolationType(k) !== KeyframeInterpolationType.HOLD) {" +
            "                      destProp.setTemporalEaseAtKey(newIdx, srcProp.keyInTemporalEase(k), srcProp.keyOutTemporalEase(k));" +
            "                      destProp.setTemporalContinuousAtKey(newIdx, srcProp.keyTemporalContinuous(k));" +
            "                      destProp.setTemporalAutoBezierAtKey(newIdx, srcProp.keyTemporalAutoBezier(k));" +
            "                    }" +
            "                  } catch(e) {}" +
            "                  if (srcProp.isSpatial) {" +
            "                    try {" +
            "                      destProp.setSpatialContinuousAtKey(newIdx, srcProp.keySpatialContinuous(k));" +
            "                      destProp.setSpatialAutoBezierAtKey(newIdx, srcProp.keySpatialAutoBezier(k));" +
            "                      destProp.setSpatialTangentsAtKey(newIdx, srcProp.keySpatialInTangent(k), srcProp.keySpatialOutTangent(k));" +
            "                    } catch(e) {}" +
            "                  }" +
            "                } catch(keyErr) {}" +
            "              }" +
            "            } else {" +
            "              try {" +
            "                var srcVal = srcProp.value;" +
            "                var ancVal = ancProp.value;" +
            "                var finalVal = [" +
            "                  srcVal[0] - ancVal[0] + origGuidePos[0]," +
            "                  srcVal[1] - ancVal[1] + origGuidePos[1]" +
            "                ];" +
            "                if (srcVal.length > 2) {" +
            "                  finalVal.push(srcVal[2] - ancVal[2] + origGuidePos[2]);" +
            "                }" +
            "                destProp.setValue(finalVal);" +
            "              } catch(valErr) {}" +
            "            }" +
            "          };" +
            "          var pastedGuide = null; var contentLayers = [];" +
            "          for (var pl = 0; pl < pastedLayers.length; pl++) {" +
            "            if (guideName && pastedLayers[pl].name === guideName) {" +
            "              pastedGuide = pastedLayers[pl];" +
            "            } else {" +
            "              contentLayers.push(pastedLayers[pl]);" +
            "            }" +
            "          }" +
            "          if (!pastedGuide) {" +
            "            var controlName = target.name;" +
            "            if (controlName.indexOf('[') === 0 && controlName.lastIndexOf(']') === controlName.length - 1) {" +
            "              controlName = controlName.substring(1, controlName.length - 1);" +
            "            }" +
            "            pastedGuide = parentComp.layers.addNull();" +
            "            pastedGuide.name = '# ' + controlName;" +
            "            pastedGuide.guideLayer = true;" +
            "            pastedGuide.property('Anchor Point').setValue([target.source.width / 2, target.source.height / 2]);" +
            "            pastedGuide.property('Position').setValue([target.source.width / 2, target.source.height / 2]);" +
            "            pastedGuide.moveBefore(target);" +
            "          }" +
            "          var origGuidePos = pastedGuide.property('Position').value;" +
            "          if (target.threeDLayer) {" +
            "            pastedGuide.threeDLayer = true;" +
            "          }" +
            "          for (var cl = 0; cl < contentLayers.length; cl++) {" +
            "            contentLayers[cl].parent = pastedGuide;" +
            "          }" +
            "          pastedGuide.parent = target.parent;" +
            "          copyPositionProperty(target.property('Position'), pastedGuide.property('Position'), origGuidePos);" +
            "          copyProperty(target.property('Scale'), pastedGuide.property('Scale'));" +
            "          copyProperty(target.property('Opacity'), pastedGuide.property('Opacity'));" +
            "          if (target.property('Rotation')) copyProperty(target.property('Rotation'), pastedGuide.property('Z Rotation') || pastedGuide.property('Rotation'));" +
            "          if (target.property('Z Rotation')) copyProperty(target.property('Z Rotation'), pastedGuide.property('Z Rotation'));" +
            "          if (target.property('Y Rotation')) copyProperty(target.property('Y Rotation'), pastedGuide.property('Y Rotation'));" +
            "          if (target.property('X Rotation')) copyProperty(target.property('X Rotation'), pastedGuide.property('X Rotation'));" +
            "          if (target.property('Orientation')) copyProperty(target.property('Orientation'), pastedGuide.property('Orientation'));" +
            "          var freshTarget = null;" +
            "          for (var fi = 1; fi <= parentComp.layers.length; fi++) {" +
            "            if (parentComp.layers[fi].source === nestedSource) { freshTarget = parentComp.layers[fi]; break; }" +
            "          }" +
            "          if (freshTarget) {" +
            "            if (pastedGuide) pastedGuide.moveBefore(freshTarget);" +
            "            for (var cl = 0; cl < contentLayers.length; cl++) { contentLayers[cl].moveBefore(freshTarget); }" +
            "            freshTarget.remove();" +
            "          }" +
            "          if (nestedSource.usedIn.length === 0) nestedSource.remove();" +
            "        } catch(innerErr) { alert('Erro transform decomp: ' + innerErr.toString()); }" +
            "        finally { app.endUndoGroup(); }" +
            "      }" +
            "    }" +
            "  }" +
            "  app.activate();" +
            "} catch(eae) { alert('FlashFill Decomp: ' + eae.toString() + ' L' + eae.line); }";
        bt.body = aeScript;
        bt.send();
        return "true";
    } catch(e) { return "Erro: " + e.toString(); }
}

function runToggle() {
    try {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScript =
            "try {" + "  try { app.endUndoGroup(); } catch(e) {}" +
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

function runDeleteToggles() {
    try {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScript =
            "try {" + "  try { app.endUndoGroup(); } catch(e) {}" +
            "var comp = app.project.activeItem;" +
            "if (!comp || !(comp instanceof CompItem)) { alert('Abra uma Composicao no AE.'); } else {" +
            "  var guides = [];" +
            "  for(var i=1; i<=comp.layers.length; i++) {" +
            "    if(comp.layers[i].guideLayer) {" +
            "      guides.push(comp.layers[i]);" +
            "    }" +
            "  }" +
            "  if(guides.length > 0) {" +
            "    app.beginUndoGroup('FlashFill: Delete Toggles');" +
            "    for(var i=1; i<=comp.layers.length; i++) {" +
            "      var l = comp.layers[i];" +
            "      if (l.parent !== null && l.parent.guideLayer) {" +
            "        l.parent = null;" +
            "      }" +
            "    }" +
            "    for(var j=0; j<guides.length; j++) {" +
            "      try { guides[j].remove(); } catch(err) {}" +
            "    }" +
            "    app.endUndoGroup();" +
            "  }" +
            "}" +
            "} catch(eae) { alert('FlashFill Delete Toggles: Error: ' + eae.toString() + ' L' + eae.line); }";
        bt.body = aeScript;
        bt.send();
        return "true";
    } catch(e) {
        return "Erro Delete Toggles: " + e.toString();
    }
}

function localToCompMath(pt, propertyOrLayer) {
    var currPt = [pt[0], pt[1]];
    
    // 1. If it's a property, traverse its property parent hierarchy up to the Layer to extract group transforms
    var prop = propertyOrLayer;
    var groupChain = [];
    
    while (prop && typeof prop.parentProperty !== "undefined" && prop.parentProperty !== null) {
        if (prop.matchName === "ADBE Vector Group") {
            groupChain.push(prop);
        }
        prop = prop.parentProperty;
    }
    
    var layer = prop; // This is the root Layer object
    
    // Apply nested Group Transforms from inner-most to outer-most
    for (var g = 0; g < groupChain.length; g++) {
        var group = groupChain[g];
        var transform = group.property("ADBE Vector Transform Group") || group.property("Transform");
        if (transform) {
            var pos = [0, 0];
            var anchor = [0, 0];
            var scale = [100, 100];
            var rot = 0;
            
            var pProp = transform.property("ADBE Vector Position") || transform.property("Position");
            var aProp = transform.property("ADBE Vector Anchor Point") || transform.property("Anchor Point");
            var sProp = transform.property("ADBE Vector Scale") || transform.property("Scale");
            var rProp = transform.property("ADBE Vector Rotation") || transform.property("Rotation");
            
            if (pProp) pos = pProp.value;
            if (aProp) anchor = aProp.value;
            if (sProp) scale = sProp.value;
            if (rProp) rot = rProp.value;
            
            var x1 = currPt[0] - anchor[0];
            var y1 = currPt[1] - anchor[1];
            
            var x2 = x1 * (scale[0] / 100.0);
            var y2 = y1 * (scale[1] / 100.0);
            
            var rad = rot * Math.PI / 180.0;
            var cosR = Math.cos(rad);
            var sinR = Math.sin(rad);
            var x3 = x2 * cosR - y2 * sinR;
            var y3 = x2 * sinR + y2 * cosR;
            
            currPt[0] = x3 + pos[0];
            currPt[1] = y3 + pos[1];
        }
    }
    
    // 2. Now apply layer-level parent hierarchy transforms
    var currLayer = layer;
    while (currLayer) {
        var transform = currLayer.transform;
        if (!transform) break;
        
        var pos = transform.position ? transform.position.value : [0,0];
        var anchor = transform.anchorPoint ? transform.anchorPoint.value : [0,0];
        var scale = transform.scale ? transform.scale.value : [100,100];
        
        var rot = 0;
        if (transform.rotation) {
            rot = transform.rotation.value;
        } else if (transform.zRotation) {
            rot = transform.zRotation.value;
        }
        
        var x1 = currPt[0] - anchor[0];
        var y1 = currPt[1] - anchor[1];
        
        var x2 = x1 * (scale[0] / 100.0);
        var y2 = y1 * (scale[1] / 100.0);
        
        var rad = rot * Math.PI / 180.0;
        var cosR = Math.cos(rad);
        var sinR = Math.sin(rad);
        var x3 = x2 * cosR - y2 * sinR;
        var y3 = x2 * sinR + y2 * cosR;
        
        currPt[0] = x3 + pos[0];
        currPt[1] = y3 + pos[1];
        
        currLayer = currLayer.parent;
    }
    
    return currPt;
}

function getLayerTransformMatrix(propertyOrLayer) {
    var o = localToCompMath([0, 0], propertyOrLayer);
    var px = localToCompMath([100, 0], propertyOrLayer);
    var py = localToCompMath([0, 100], propertyOrLayer);
    
    return {
        o: o,
        dx: [px[0] - o[0], px[1] - o[1]],
        dy: [py[0] - o[0], py[1] - o[1]]
    };
}

function localToComp(pt, matrix) {
    var cx = matrix.o[0] + (pt[0] * matrix.dx[0]) / 100.0 + (pt[1] * matrix.dy[0]) / 100.0;
    var cy = matrix.o[1] + (pt[0] * matrix.dx[1]) / 100.0 + (pt[1] * matrix.dy[1]) / 100.0;
    return [cx, cy];
}

function compToLocal(compPt, matrix) {
    var tx = compPt[0] - matrix.o[0];
    var ty = compPt[1] - matrix.o[1];
    
    var m00 = matrix.dx[0] / 100.0;
    var m10 = matrix.dy[0] / 100.0;
    var m01 = matrix.dx[1] / 100.0;
    var m11 = matrix.dy[1] / 100.0;
    
    var det = m00 * m11 - m10 * m01;
    if (Math.abs(det) < 0.0001) {
        return [tx, ty];
    }
    
    var lx = (tx * m11 - ty * m10) / det;
    var ly = (ty * m00 - tx * m01) / det;
    return [lx, ly];
}

function getShapeColors(pathProp) {
    var result = {
        hasFill: false,
        fillColor: [1, 0, 0], // Fallback default to red
        hasStroke: false,
        strokeColor: [0, 0, 0],
        strokeWidth: 2
    };
    
    try {
        var fill = null;
        var stroke = null;
        
        // 1. Search parent hierarchy groups
        var parent = pathProp.parentProperty;
        while (parent) {
            for (var i = 1; i <= parent.numProperties; i++) {
                var prop = null;
                try { prop = parent.property(i); } catch(e) {}
                if (prop) {
                    if (prop.matchName === "ADBE Vector Graphic - Fill") {
                        fill = prop;
                    } else if (prop.matchName === "ADBE Vector Graphic - Stroke") {
                        stroke = prop;
                    }
                }
            }
            if (fill || stroke) break;
            parent = parent.parentProperty;
        }
        
        // 2. Search entire layer recursively as a fallback
        if (!fill || !stroke) {
            var layer = pathProp;
            while (layer && typeof layer.parentProperty !== "undefined" && layer.parentProperty !== null) {
                layer = layer.parentProperty;
            }
            if (layer) {
                var allFills = [];
                var allStrokes = [];
                function findFillsStrokes(p) {
                    if (!p) return;
                    if (p.matchName === "ADBE Vector Graphic - Fill") {
                        allFills.push(p);
                    } else if (p.matchName === "ADBE Vector Graphic - Stroke") {
                        allStrokes.push(p);
                    }
                    var num = 0;
                    try { num = p.numProperties; } catch(e) {}
                    if (num && num > 0) {
                        for (var k = 1; k <= num; k++) {
                            try { findFillsStrokes(p.property(k)); } catch(e) {}
                        }
                    }
                }
                findFillsStrokes(layer);
                if (!fill && allFills.length > 0) fill = allFills[0];
                if (!stroke && allStrokes.length > 0) stroke = allStrokes[0];
            }
        }
        
        if (fill) {
            var fillEnabled = true;
            try { fillEnabled = fill.enabled; } catch(e) {}
            if (fillEnabled) {
                var colorProp = fill.property("ADBE Vector Fill Color") || 
                                fill.property("Color") || 
                                fill.property("Cor") || 
                                (fill.numProperties >= 4 ? fill.property(4) : null);
                if (colorProp) {
                    result.hasFill = true;
                    var col = colorProp.value; // [R, G, B, A]
                    result.fillColor = [col[0], col[1], col[2]];
                }
            }
        }
        
        if (stroke) {
            var strokeEnabled = true;
            try { strokeEnabled = stroke.enabled; } catch(e) {}
            if (strokeEnabled) {
                var colorProp = stroke.property("ADBE Vector Stroke Color") || 
                                stroke.property("Color") || 
                                stroke.property("Cor") || 
                                (stroke.numProperties >= 3 ? stroke.property(3) : null);
                if (colorProp) {
                    result.hasStroke = true;
                    var col = colorProp.value; // [R, G, B, A]
                    result.strokeColor = [col[0], col[1], col[2]];
                    
                    var widthProp = stroke.property("ADBE Vector Stroke Width") || 
                                    stroke.property("Stroke Width") || 
                                    stroke.property("Largura do traçado") || 
                                    (stroke.numProperties >= 5 ? stroke.property(5) : null);
                    if (widthProp) {
                        result.strokeWidth = widthProp.value;
                    }
                }
            }
        }
    } catch(err) {
        // use defaults
    }
    
    return result;
}

function runSendToIllustrator() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "Erro: Abra uma composicao no After Effects e selecione a camada.";
        }
        var rawSel = comp.selectedLayers;
        if (rawSel.length === 0) {
            return "Erro: Selecione pelo menos uma camada com formas (Shape Layer) ou mascaras.";
        }
        
        var paths = [];
        
        function findPathsRecursively(prop, list) {
            if (!prop) return;
            try {
                if (prop.matchName === "ADBE Vector Shape" || prop.matchName === "ADBE Mask Shape") {
                    list.push({ type: "bezier", prop: prop });
                } else if (prop.matchName === "ADBE Vector Shape - Rect") {
                    list.push({ type: "rect", prop: prop });
                } else if (prop.matchName === "ADBE Vector Shape - Ellipse") {
                    list.push({ type: "ellipse", prop: prop });
                }
                
                // Continue recursion if it has sub-properties
                if (prop.propertyType !== PropertyType.PROPERTY) {
                    var num = 0;
                    try { num = prop.numProperties; } catch(e) {}
                    if (num && num > 0) {
                        for (var i = 1; i <= num; i++) {
                            var subProp = null;
                            try { subProp = prop.property(i); } catch(e) {}
                            if (subProp) {
                                findPathsRecursively(subProp, list);
                            }
                        }
                    }
                }
            } catch(err) {
                // Ignore
            }
        }
        
        for (var i = 0; i < rawSel.length; i++) {
            var layer = rawSel[i];
            var wasLocked = layer.locked;
            if (wasLocked) layer.locked = false;
            
            var list = [];
            findPathsRecursively(layer, list);
            
            for (var j = 0; j < list.length; j++) {
                var entry = list[j];
                var shp = null;
                var cl = true;
                
                // Extract matrix including shape level nested transforms
                var matrix = getLayerTransformMatrix(entry.prop);
                
                if (entry.type === "bezier") {
                    var val = entry.prop.value;
                    if (val && val.vertices && val.vertices.length > 0) {
                        shp = val;
                        cl = val.closed;
                    }
                } else if (entry.type === "rect") {
                    var prop = entry.prop;
                    var sizeProp = prop.property("ADBE Vector Rect Size") || prop.property("Size");
                    var posProp = prop.property("ADBE Vector Rect Position") || prop.property("Position");
                    
                    var size = sizeProp ? sizeProp.value : [100, 100];
                    var pos = posProp ? posProp.value : [0, 0];
                    var w = size[0];
                    var h = size[1];
                    var px = pos[0];
                    var py = pos[1];
                    
                    shp = {
                        vertices: [
                            [px - w/2, py - h/2],
                            [px + w/2, py - h/2],
                            [px + w/2, py + h/2],
                            [px - w/2, py + h/2]
                        ],
                        inTangents: [[0,0], [0,0], [0,0], [0,0]],
                        outTangents: [[0,0], [0,0], [0,0], [0,0]],
                        closed: true
                    };
                    cl = true;
                } else if (entry.type === "ellipse") {
                    var prop = entry.prop;
                    var sizeProp = prop.property("ADBE Vector Ellipse Size") || prop.property("Size");
                    var posProp = prop.property("ADBE Vector Ellipse Position") || prop.property("Position");
                    
                    var size = sizeProp ? sizeProp.value : [100, 100];
                    var pos = posProp ? posProp.value : [0, 0];
                    var w = size[0];
                    var h = size[1];
                    var px = pos[0];
                    var py = pos[1];
                    
                    var kappa = 0.552284749831;
                    var rx = w / 2;
                    var ry = h / 2;
                    
                    shp = {
                        vertices: [
                            [px, py - ry], // Top
                            [px + rx, py], // Right
                            [px, py + ry], // Bottom
                            [px - rx, py]  // Left
                        ],
                        inTangents: [
                            [-rx * kappa, 0],
                            [0, -ry * kappa],
                            [rx * kappa, 0],
                            [0, ry * kappa]
                        ],
                        outTangents: [
                            [rx * kappa, 0],
                            [0, ry * kappa],
                            [-rx * kappa, 0],
                            [0, -ry * kappa]
                        ],
                        closed: true
                    };
                    cl = true;
                }
                
                if (shp && shp.vertices && shp.vertices.length > 0) {
                    var verts = shp.vertices;
                    var inT = shp.inTangents;
                    var outT = shp.outTangents;
                    
                    var compVerts = [];
                    var compInHandles = [];
                    var compOutHandles = [];
                    
                    for (var k = 0; k < verts.length; k++) {
                        var v = verts[k];
                        var inOff = inT[k];
                        var outOff = outT[k];
                        
                        var absInLocal = [v[0] + inOff[0], v[1] + inOff[1]];
                        var absOutLocal = [v[0] + outOff[0], v[1] + outOff[1]];
                        
                        var cv = localToComp(v, matrix);
                        var cin = localToComp(absInLocal, matrix);
                        var cout = localToComp(absOutLocal, matrix);
                        
                        compVerts.push([cv[0], cv[1]]);
                        compInHandles.push([cin[0], cin[1]]);
                        compOutHandles.push([cout[0], cout[1]]);
                    }
                    
                    var colors = getShapeColors(entry.prop);
                    
                    paths.push({
                        closed: cl,
                        vertices: compVerts,
                        inHandles: compInHandles,
                        outHandles: compOutHandles,
                        colors: colors
                    });
                }
            }
            
            if (wasLocked) layer.locked = true;
        }
        
        if (paths.length === 0) {
            return "Erro: Nenhum vetor ou mascara encontrado nas camadas selecionadas.";
        }
        
        var dataString = "[";
        for (var p = 0; p < paths.length; p++) {
            var pData = paths[p];
            dataString += "{closed:" + pData.closed + ",colors:{";
            dataString += "hasFill:" + pData.colors.hasFill + ",fillColor:[" + pData.colors.fillColor.join(",") + "],";
            dataString += "hasStroke:" + pData.colors.hasStroke + ",strokeColor:[" + pData.colors.strokeColor.join(",") + "],";
            dataString += "strokeWidth:" + pData.colors.strokeWidth;
            dataString += "},vertices:[";
            for (var v = 0; v < pData.vertices.length; v++) {
                dataString += "[" + pData.vertices[v][0] + "," + pData.vertices[v][1] + "]" + (v < pData.vertices.length - 1 ? "," : "");
            }
            dataString += "],inHandles:[";
            for (var v = 0; v < pData.inHandles.length; v++) {
                dataString += "[" + pData.inHandles[v][0] + "," + pData.inHandles[v][1] + "]" + (v < pData.inHandles.length - 1 ? "," : "");
            }
            dataString += "],outHandles:[";
            for (var v = 0; v < pData.outHandles.length; v++) {
                dataString += "[" + pData.outHandles[v][0] + "," + pData.outHandles[v][1] + "]" + (v < pData.outHandles.length - 1 ? "," : "");
            }
            dataString += "]}" + (p < paths.length - 1 ? "," : "");
        }
        dataString += "]";
        
        var ilScript = "try {\n" +
            "  if (app.documents.length === 0) app.documents.add();\n" +
            "  var doc = app.activeDocument;\n" +
            "  var activeAb = doc.artboards[doc.artboards.getActiveArtboardIndex()];\n" +
            "  var abRect = activeAb.artboardRect;\n" +
            "  var abLeft = abRect[0];\n" +
            "  var abTop = abRect[1];\n" +
            "  var pathsData = " + dataString + ";\n" +
            "  for (var p = 0; p < pathsData.length; p++) {\n" +
            "    var pData = pathsData[p];\n" +
            "    var pathItem = doc.pathItems.add();\n" +
            "    pathItem.closed = pData.closed;\n" +
            "    if (pData.colors.hasFill) {\n" +
            "      var fillCol = new RGBColor();\n" +
            "      fillCol.red = pData.colors.fillColor[0] * 255;\n" +
            "      fillCol.green = pData.colors.fillColor[1] * 255;\n" +
            "      fillCol.blue = pData.colors.fillColor[2] * 255;\n" +
            "      pathItem.fillColor = fillCol;\n" +
            "      pathItem.filled = true;\n" +
            "    } else {\n" +
            "      pathItem.filled = false;\n" +
            "    }\n" +
            "    if (pData.colors.hasStroke) {\n" +
            "      var strokeCol = new RGBColor();\n" +
            "      strokeCol.red = pData.colors.strokeColor[0] * 255;\n" +
            "      strokeCol.green = pData.colors.strokeColor[1] * 255;\n" +
            "      strokeCol.blue = pData.colors.strokeColor[2] * 255;\n" +
            "      pathItem.strokeColor = strokeCol;\n" +
            "      pathItem.stroked = true;\n" +
            "      pathItem.strokeWidth = pData.colors.strokeWidth;\n" +
            "    } else {\n" +
            "      if (!pData.colors.hasFill) {\n" +
            "        var strokeCol = new RGBColor();\n" +
            "        strokeCol.red = 0; strokeCol.green = 0; strokeCol.blue = 0;\n" +
            "        pathItem.strokeColor = strokeCol;\n" +
            "        pathItem.stroked = true;\n" +
            "        pathItem.strokeWidth = 2;\n" +
            "      } else {\n" +
            "        pathItem.stroked = false;\n" +
            "      }\n" +
            "    }\n" +
            "    for (var v = 0; v < pData.vertices.length; v++) {\n" +
            "      var pt = pathItem.pathPoints.add();\n" +
            "      pt.anchor = [abLeft + pData.vertices[v][0], abTop - pData.vertices[v][1]];\n" +
            "      pt.leftDirection = [abLeft + pData.inHandles[v][0], abTop - pData.inHandles[v][1]];\n" +
            "      pt.rightDirection = [abLeft + pData.outHandles[v][0], abTop - pData.outHandles[v][1]];\n" +
            "      pt.pointType = PointType.CORNER;\n" +
            "    }\n" +
            "  }\n" +
            "  app.redraw();\n" +
            "} catch(err) { alert('Erro no Illustrator (Send): ' + err.toString()); }";
        
        return aeTriggerIlst(ilScript);
    } catch(e) {
        return "Erro ao enviar vetores: " + e.toString() + " (linha " + e.line + ")";
    }
}

function runPullFromIllustrator() {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "Erro: Abra uma composicao no After Effects.";
        }
        
        // Layer check removed; we will create a new Shape Layer dynamically if none is selected
        
        var ilGetPathsFunc = "function getPaths() {\n" +
            "  if (app.documents.length === 0) return '{height:0, paths:[]}';\n" +
            "  var doc = app.activeDocument;\n" +
            "  var sel = doc.selection;\n" +
            "  if (!sel || sel.length === 0) return '{height:' + doc.height + ', paths:[]}';\n" +
            "  var paths = [];\n" +
            "  for (var i = 0; i < sel.length; i++) {\n" +
            "    var item = sel[i];\n" +
            "    if (item.typename === 'PathItem') {\n" +
            "      var pts = item.pathPoints;\n" +
            "      var verts = [];\n" +
            "      var inTangents = [];\n" +
            "      var outTangents = [];\n" +
            "      for (var j = 0; j < pts.length; j++) {\n" +
            "        var pt = pts[j];\n" +
            "        var anc = pt.anchor;\n" +
            "        var left = pt.leftDirection;\n" +
            "        var right = pt.rightDirection;\n" +
            "        verts.push([anc[0], anc[1]]);\n" +
            "        inTangents.push([left[0] - anc[0], left[1] - anc[1]]);\n" +
            "        outTangents.push([right[0] - anc[0], right[1] - anc[1]]);\n" +
            "      }\n" +
            "      paths.push({\n" +
            "        closed: item.closed,\n" +
            "        vertices: verts,\n" +
            "        inTangents: inTangents,\n" +
            "        outTangents: outTangents\n" +
            "      });\n" +
            "    }\n" +
            "  }\n" +
            "  var dataString = '{height:' + doc.height + ', paths:[';\n" +
            "  for (var p = 0; p < paths.length; p++) {\n" +
            "    var pData = paths[p];\n" +
            "    dataString += \"{closed:\" + pData.closed + \",vertices:[\";\n" +
            "    for (var v = 0; v < pData.vertices.length; v++) {\n" +
            "      dataString += \"[\" + pData.vertices[v][0] + \",\" + pData.vertices[v][1] + \"]\" + (v < pData.vertices.length - 1 ? \",\" : \"\");\n" +
            "    }\n" +
            "    dataString += \"],inTangents:[\";\n" +
            "    for (var v = 0; v < pData.inTangents.length; v++) {\n" +
            "      dataString += \"[\" + pData.inTangents[v][0] + \",\" + pData.inTangents[v][1] + \"]\" + (v < pData.inTangents.length - 1 ? \",\" : \"\");\n" +
            "    }\n" +
            "    dataString += \"],outTangents:[\";\n" +
            "    for (var v = 0; v < pData.outTangents.length; v++) {\n" +
            "      dataString += \"[\" + pData.outTangents[v][0] + \",\" + pData.outTangents[v][1] + \"]\" + (v < pData.outTangents.length - 1 ? \",\" : \"\");\n" +
            "    }\n" +
            "    dataString += \"]}\" + (p < paths.length - 1 ? \",\" : \"\");\n" +
            "  }\n" +
            "  dataString += ']}';\n" +
            "  return dataString;\n" +
            "} getPaths();";
        
        var bt = new BridgeTalk();
        bt.target = "illustrator";
        bt.body = ilGetPathsFunc;
        
        var resultReceived = null;
        bt.onResult = function(resObj) {
            resultReceived = resObj.body;
        };
        bt.onError = function(errObj) {
            resultReceived = "Erro BridgeTalk: " + errObj.body;
        };
        
        bt.send(10);
        
        var start = new Date().getTime();
        while (resultReceived === null && (new Date().getTime() - start < 4000)) {
            // Sync wait
        }
        
        if (resultReceived === null) {
            return "Erro: Illustrator nao respondeu a tempo ou nao esta aberto.";
        }
        
        if (resultReceived.indexOf("Erro") === 0) {
            return resultReceived;
        }
        
        var parsedData;
        try {
            parsedData = eval("(" + resultReceived + ")");
        } catch(pe) {
            return "Erro ao ler resposta do Illustrator: " + pe.toString();
        }
        
        if (!parsedData || !parsedData.paths || parsedData.paths.length === 0) {
            return "Erro: Nenhum vetor selecionado no Illustrator.";
        }
        
        app.beginUndoGroup("FlashFill: Pull from Illustrator");
        
        var layer = comp.selectedLayers[0];
        if (!layer) {
            layer = comp.layers.addShape();
            layer.name = "Pulled Shape Layer";
        }
        
        var wasLocked = layer.locked;
        if (wasLocked) layer.locked = false;
        
        var matrix = getLayerTransformMatrix(layer);
        
        var targetProp = null;
        var selProps = comp.selectedProperties;
        for (var i = 0; i < selProps.length; i++) {
            var p = selProps[i];
            if (p.propertyType === PropertyType.PROPERTY && 
               (p.matchName === "ADBE Vector Shape" || p.matchName === "ADBE Mask Shape")) {
                targetProp = p;
                break;
            }
        }
        
        if (!targetProp) {
            function findFirstPathProp(parent) {
                if (!parent) return null;
                if (parent.propertyType === PropertyType.PROPERTY) {
                    if (parent.matchName === "ADBE Vector Shape" || parent.matchName === "ADBE Mask Shape") {
                        return parent;
                    }
                } else if (parent.numProperties) {
                    for (var i = 1; i <= parent.numProperties; i++) {
                        var res = findFirstPathProp(parent.property(i));
                        if (res) return res;
                    }
                }
                return null;
            }
            targetProp = findFirstPathProp(layer);
        }
        
        if (!targetProp && layer instanceof ShapeLayer) {
            var contents = layer.property("ADBE Vector Group");
            var newGroup = contents.addProperty("ADBE Vector Group");
            newGroup.name = "Pulled Shape";
            
            var vectorItems = newGroup.property("ADBE Vector Items Group");
            var newPathGroup = vectorItems.addProperty("ADBE Vector Shape - Group");
            targetProp = newPathGroup.property("ADBE Vector Shape");
            
            try {
                var fill = vectorItems.addProperty("ADBE Vector Graphic - Fill");
                fill.property("Color").setValue([0.6, 0.45, 0.8, 1]);
            } catch(e) {}
            try {
                var stroke = vectorItems.addProperty("ADBE Vector Graphic - Stroke");
                stroke.property("Color").setValue([0, 0, 0, 1]);
                stroke.property("Stroke Width").setValue(2);
            } catch(e) {}
        }
        
        if (!targetProp) {
            if (wasLocked) layer.locked = true;
            app.endUndoGroup();
            return "Erro: Selecione uma propriedade de Caminho (Path) ou Mascara para atualizar, ou use uma Camada de Forma.";
        }
        
        var pData = parsedData.paths[0];
        var docHeight = parsedData.height;
        
        var shp = new Shape();
        var localVerts = [];
        var localIn = [];
        var localOut = [];
        
        for (var v = 0; v < pData.vertices.length; v++) {
            var anc = pData.vertices[v];
            var inT = pData.inTangents[v];
            var outT = pData.outTangents[v];
            
            var compVert = [anc[0], docHeight - anc[1]];
            var compIn = [inT[0], -inT[1]];
            var compOut = [outT[0], -outT[1]];
            
            var localVert = compToLocal(compVert, matrix);
            var compInPos = [compVert[0] + compIn[0], compVert[1] + compIn[1]];
            var compOutPos = [compVert[0] + compOut[0], compVert[1] + compOut[1]];
            
            var localInPos = compToLocal(compInPos, matrix);
            var localOutPos = compToLocal(compOutPos, matrix);
            
            var localInTangent = [localInPos[0] - localVert[0], localInPos[1] - localVert[1]];
            var localOutTangent = [localOutPos[0] - localVert[0], localOutPos[1] - localVert[1]];
            
            localVerts.push(localVert);
            localIn.push(localInTangent);
            localOut.push(localOutTangent);
        }
        
        shp.vertices = localVerts;
        shp.inTangents = localIn;
        shp.outTangents = localOut;
        shp.closed = pData.closed;
        
        targetProp.setValue(shp);
        
        if (wasLocked) layer.locked = true;
        app.endUndoGroup();
        return "true";
    } catch(err) {
        try { app.endUndoGroup(); } catch(e) {}
        return "Erro no Pull: " + err.toString() + " (linha " + err.line + ")";
    }
}

function runPullTriggerFromIllustrator() {
    try {
        if (!BridgeTalk.isRunning("aftereffects")) {
            return "Erro: After Effects nao esta aberto.";
        }
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        bt.body = "runPullFromIllustrator();";
        
        var resultReceived = null;
        bt.onResult = function(resObj) {
            resultReceived = resObj.body;
        };
        bt.onError = function(errObj) {
            resultReceived = "Erro BridgeTalk: " + errObj.body;
        };
        
        bt.send(10);
        
        var start = new Date().getTime();
        while (resultReceived === null && (new Date().getTime() - start < 4000)) {
            // Sync wait
        }
        
        if (resultReceived === null) {
            return "Comando de atualizacao enviado ao After Effects.";
        }
        return resultReceived;
    } catch(e) {
        return "Erro no Pull (Illustrator): " + e.toString();
    }
}

function runSyncIllustratorSwatches() {
    try {
        if (!BridgeTalk.isRunning('illustrator')) {
            return "Erro: O Illustrator nao esta aberto.";
        }
        
        var swatchExtractor = "function getSwatches() {\n" +
            "  if (app.documents.length === 0) return '[]';\n" +
            "  var doc = app.activeDocument;\n" +
            "  var sel = doc.swatches.getSelected();\n" +
            "  if (!sel || sel.length === 0) return '[]';\n" +
            "  var colors = [];\n" +
            "  for (var i = 0; i < sel.length; i++) {\n" +
            "    var sw = sel[i];\n" +
            "    var color = sw.color;\n" +
            "    var rgb = [0.5, 0.5, 0.5];\n" +
            "    if (color.typename === 'RGBColor') {\n" +
            "        rgb = [color.red / 255, color.green / 255, color.blue / 255];\n" +
            "    } else if (color.typename === 'CMYKColor') {\n" +
            "        var c = color.cyan/100, m = color.magenta/100, y = color.yellow/100, k = color.black/100;\n" +
            "        rgb = [1 - Math.min(1, c * (1 - k) + k), 1 - Math.min(1, m * (1 - k) + k), 1 - Math.min(1, y * (1 - k) + k)];\n" +
            "    } else if (color.typename === 'GrayColor') {\n" +
            "        var val = (100 - color.gray) / 100;\n" +
            "        rgb = [val, val, val];\n" +
            "    } else if (color.typename === 'SpotColor') {\n" +
            "        var ic = color.color;\n" +
            "        if (ic.typename === 'RGBColor') {\n" +
            "            rgb = [ic.red / 255, ic.green / 255, ic.blue / 255];\n" +
            "        } else if (ic.typename === 'CMYKColor') {\n" +
            "            var c = ic.cyan/100, m = ic.magenta/100, y = ic.yellow/100, k = ic.black/100;\n" +
            "            rgb = [1 - Math.min(1, c * (1 - k) + k), 1 - Math.min(1, m * (1 - k) + k), 1 - Math.min(1, y * (1 - k) + k)];\n" +
            "        } else if (ic.typename === 'GrayColor') {\n" +
            "            var val = (100 - ic.gray) / 100;\n" +
            "            rgb = [val, val, val];\n" +
            "        }\n" +
            "    }\n" +
            "    colors.push('{\"name\":\"' + sw.name.replace(/\"/g, '\\\\\"') + '\",\"r\":' + rgb[0] + ',\"g\":' + rgb[1] + ',\"b\":' + rgb[2] + '}');\n" +
            "  }\n" +
            "  return '[' + colors.join(',') + ']';\n" +
            "}";
            
        var bt = new BridgeTalk();
        bt.target = "illustrator";
        bt.body = "try { (" + swatchExtractor + ")(); } catch(e) { 'Erro: ' + e.toString(); }";
        
        var resultReceived = null;
        bt.onResult = function(resObj) {
            resultReceived = resObj.body;
        };
        bt.send(10);
        
        var start = new Date().getTime();
        while (resultReceived === null && (new Date().getTime() - start < 4000)) {
            // Sync wait
        }
        
        if (resultReceived === null) {
            return "Erro: Illustrator nao respondeu.";
        }
        
        return resultReceived;
    } catch(e) {
        return "Erro: " + e.toString();
    }
}

function runApplyColorToSelectedProperties(r, g, b) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "Erro: Abra uma composicao no After Effects.";
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            return "Erro: Selecione uma camada no After Effects.";
        }
        
        app.beginUndoGroup("FlashFill: Apply Dynamic Color");
        
        var colorVal = [r, g, b, 1]; // RGBA
        var appliedCount = 0;
        
        // Helper to recursively find fill and stroke properties to update
        function applyColorToProp(prop) {
            if (!prop) return;
            if (prop.propertyType === PropertyType.PROPERTY) {
                // If it's a vector fill/stroke color property or a mask color
                if (prop.matchName === "ADBE Vector Fill Color" || 
                    prop.matchName === "ADBE Vector Stroke Color" ||
                    prop.name === "Color" || 
                    prop.name === "Cores") {
                    try {
                        prop.setValue(colorVal);
                        appliedCount++;
                    } catch(e) {}
                }
            } else if (prop.numProperties) {
                for (var i = 1; i <= prop.numProperties; i++) {
                    applyColorToProp(prop.property(i));
                }
            }
        }
        
        // If properties are selected directly (e.g. user selected Fill Color)
        var selProps = comp.selectedProperties;
        if (selProps && selProps.length > 0) {
            for (var i = 0; i < selProps.length; i++) {
                var p = selProps[i];
                if (p.propertyType === PropertyType.PROPERTY && p.value !== undefined) {
                    try {
                        // Check if it expects a color (4-element array)
                        if (p.value.length === 4) {
                            p.setValue(colorVal);
                            appliedCount++;
                        } else if (p.value.length === 3) {
                            p.setValue([r, g, b]);
                            appliedCount++;
                        }
                    } catch(e) {}
                }
            }
        }
        
        // If no properties were matched directly, apply recursively to the selected layers!
        if (appliedCount === 0) {
            for (var j = 0; j < selectedLayers.length; j++) {
                applyColorToProp(selectedLayers[j]);
            }
        }
        
        app.endUndoGroup();
        return appliedCount > 0 ? "true" : "Nenhuma propriedade de cor encontrada.";
    } catch(e) {
        try { app.endUndoGroup(); } catch(err){}
        return "Erro: " + e.toString();
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
