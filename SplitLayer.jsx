// SimularOverlord.jsx v10 — TURBO SHADOW-BUILD + ClipGroup Track Matte
// Documento: TempBuild_GF escondida no background para velocidade máxima (<10s).
// ClipGroups detectados via clipMaskRef: máscara posicionada ACIMA da alvo na timeline.

(function(){
try {
    var jf = new File("C:/AEGP/grad_data.json");
    if (!jf.exists) { alert("Rode ExtrairGradiente.jsx no Illustrator primeiro!"); return; }
    jf.open("r"); var jd = eval("(" + jf.read() + ")"); jf.close();

    var artW = Math.round(jd.artboard.w);
    var artH = Math.round(jd.artboard.h);

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Nenhuma composicao aberta. Clique no botao COMP no Illustrator primeiro!");
        return;
    }

    app.beginUndoGroup("Transfer Vectors");

    // while (comp.numLayers > 0) {
    //     try { comp.layer(1).remove(); } catch(er) { break; }
    // }

    var tempComp = app.project.items.addComp("TempBuild_GF", comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);

    var layerDict = {};  // sd.name -> layer na tempComp

    function setBlend(layer, vGrp, bm) {
        if (!bm || bm === 1) return;
        try { if (vGrp) vGrp.property("ADBE Vector Blend Mode").setValue(bm); } catch(e){}
        try {
            if (bm===2) layer.blendingMode=BlendingMode.MULTIPLY;
            else if(bm===3) layer.blendingMode=BlendingMode.SCREEN;
            else if(bm===4) layer.blendingMode=BlendingMode.OVERLAY;
            else if(bm===5) layer.blendingMode=BlendingMode.DARKEN;
            else if(bm===6) layer.blendingMode=BlendingMode.LIGHTEN;
            else if(bm===7) layer.blendingMode=BlendingMode.COLOR_DODGE;
            else if(bm===8) layer.blendingMode=BlendingMode.COLOR_BURN;
            else if(bm===9) layer.blendingMode=BlendingMode.HARD_LIGHT;
            else if(bm===10) layer.blendingMode=BlendingMode.SOFT_LIGHT;
            else if(bm===11) layer.blendingMode=BlendingMode.DIFFERENCE;
            else if(bm===12) layer.blendingMode=BlendingMode.EXCLUSION;
            else if(bm===13) layer.blendingMode=BlendingMode.HUE;
            else if(bm===14) layer.blendingMode=BlendingMode.SATURATION;
            else if(bm===15) layer.blendingMode=BlendingMode.COLOR;
            else if(bm===16) layer.blendingMode=BlendingMode.LUMINOSITY;
        } catch(e){}
    }


    function applyFillOrStroke(cont, data, isStroke) {
        if (!data) return;
        var type = isStroke ? "ADBE Vector Graphic - Stroke" : "ADBE Vector Graphic - Fill";
        var prop = cont.addProperty(type);
        if (data.type === "solid" || !data.type) {
            var col = data.color || [0.5,0.5,0.5];
            try { prop.property("Color").setValue(col); } catch(e) {
                try { prop.property("ADBE Vector Fill Color").setValue(col); } catch(e2) {
                    try { prop.property("ADBE Vector Stroke Color").setValue(col); } catch(e3) {}
                }
            }
            if (!isStroke) {
                try {
                    try { prop.property("Fill Rule").setValue(2); } 
                    catch(ef1) { prop.property("ADBE Vector Fill Rule").setValue(2); }
                } catch(ef2) {}
            }
        }
        if (isStroke && data.strokeWidth) {
            try { prop.property("Stroke Width").setValue(data.strokeWidth); } catch(e) {}
            if (data.strokeCap)  try { prop.property("Line Cap").setValue(data.strokeCap); }  catch(e){}
            if (data.strokeJoin) try { prop.property("Line Join").setValue(data.strokeJoin); } catch(e){}
        }
    }

    // ── CONTADORES DE DIAGNÓSTICO ──
    var diagGrad = 0, diagFallback = 0, diagGroup = 0, diagSolid = 0, diagSkip = 0;

    for (var si = 0; si < jd.shapes.length; si++) {
        var sd = jd.shapes[si];

        if (sd.fillType === "group") {
            var nLayer = tempComp.layers.addShape();
            nLayer.name = sd.name;
            try { nLayer.guideLayer = true; } catch(eg) {} // Torna o grupo uma Camada de Guia
            try {
                var root = nLayer.property("ADBE Root Vectors Group");
                var bx = root.addProperty("ADBE Vector Group");
                bx.name = "Bounds";
                var cont = bx.property("ADBE Vectors Group");
                var rect = cont.addProperty("ADBE Vector Shape - Rect");
                rect.property("ADBE Vector Rect Size").setValue([sd.w || 100, sd.h || 100]);
                var gX = (sd.x !== undefined) ? sd.x : 0;
                var gY = (sd.y !== undefined) ? sd.y : 0;
                var tr = nLayer.property("ADBE Transform Group");
                tr.property("ADBE Anchor Point").setValue([0, 0]);
                tr.property("ADBE Position").setValue([gX, gY]);
                if (sd.opacity !== undefined) { try { tr.property("ADBE Opacity").setValue(sd.opacity); } catch(eo){} }
                nLayer.label = 0;
            } catch(e){}
            setBlend(nLayer, null, sd.blendMode);
            diagGroup++;
            layerDict[sd.name] = nLayer;
            continue;
        }

        if (sd.fillType === "text") {
            var finalTxt = (sd.text || "").replace(/\r?\n|\r/g, "\r");
            var txtLyr = tempComp.layers.addText(finalTxt);
            txtLyr.name = sd.name;
            var textProp = txtLyr.property("Source Text");
            var textDoc = textProp.value;
            textDoc.fontSize = sd.fontSize || 50;
            textDoc.font = sd.fontName || "Arial";
            try {
                var tc = sd.color || [0,0,0];
                textDoc.fillColor = [tc[0], tc[1], tc[2]];
            } catch(e){}
            try {
                var aeJust = ParagraphJustification.LEFT_JUSTIFY;
                if (sd.justification === 1) aeJust = ParagraphJustification.CENTER_JUSTIFY;
                if (sd.justification === 2) aeJust = ParagraphJustification.RIGHT_JUSTIFY;
                textDoc.justification = aeJust;
            } catch(e){}
            try { textProp.setValue(textDoc); } catch(et){}
            try {
                var txtTr = txtLyr.property("ADBE Transform Group");
                var tb = txtLyr.sourceRectAtTime(0, false);
                var tcx = tb.left + (tb.width/2);
                var tcy = tb.top  + (tb.height/2);
                txtTr.property("ADBE Anchor Point").setValue([tcx, tcy]);
                txtTr.property("ADBE Position").setValue([sd.x || 0, sd.y || 0]);
                if (sd.rotation) { txtTr.property("ADBE Rotate Z").setValue(sd.rotation); }
                if (sd.opacity !== undefined) { txtTr.property("ADBE Opacity").setValue(sd.opacity); }
            } catch(et){}
            setBlend(txtLyr, null, sd.blendMode);
            layerDict[sd.name] = txtLyr;
            diagSolid++;
            continue;
        }

        var shLyr = tempComp.layers.addShape();
        shLyr.name    = sd.name || ("shape_" + si);
        layerDict[sd.name] = shLyr;

        var root = shLyr.property("ADBE Root Vectors Group");
        var grp  = root.addProperty("ADBE Vector Group");
        grp.name = sd.name || ("g_"+si);
        var cont = grp.property("ADBE Vectors Group");

        if (sd.fillType === "gradient") {
            var gPathsArr = (sd.paths) ? sd.paths : ((sd.path) ? [sd.path] : null);
            // NÃO remove se vazio — usamos rect de fallback mais abaixo

            var addedGPaths = 0;
            if (gPathsArr && gPathsArr.length > 0) {
                for (var pi=0; pi<gPathsArr.length; pi++) {
                    var pData = gPathsArr[pi];
                    if (!pData || !pData.pts || pData.pts.length < 2) continue;
                    var pGrp = cont.addProperty("ADBE Vector Shape - Group");
                    var v=[], it=[], ot=[];
                    for (var m=0; m<pData.pts.length; m++) { v.push(pData.pts[m].a); it.push(pData.pts[m].i); ot.push(pData.pts[m].o); }
                    var sh=new Shape(); sh.vertices=v; sh.inTangents=it; sh.outTangents=ot;
                    sh.closed = (pData.closed !== undefined) ? pData.closed : true;
                    pGrp.property("ADBE Vector Shape").setValue(sh);
                    addedGPaths++;
                }
            }
            if (addedGPaths === 0) {
                try {
                    var fbW = sd.w || 100, fbH = sd.h || 100;
                    var fbRect = cont.addProperty("ADBE Vector Shape - Rect");
                    fbRect.property("ADBE Vector Rect Size").setValue([fbW, fbH]);
                    diagFallback++;
                } catch(efb) {}
            }
            diagGrad++;

            var gFill = cont.addProperty("ADBE Vector Graphic - Fill");
            if (sd.gradient && sd.gradient.stops && sd.gradient.stops.length>0) {
                var s0=sd.gradient.stops[0];
                gFill.property("ADBE Vector Fill Color").setValue([s0.r, s0.g, s0.b, 1]);
            }
            shLyr.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0,0]);
            shLyr.property("ADBE Transform Group").property("ADBE Position").setValue([sd.x || 0, sd.y || 0]);
            setBlend(shLyr, grp, sd.blendMode);
            if (sd.opacity !== undefined) { try { shLyr.property("ADBE Transform Group").property("ADBE Opacity").setValue(sd.opacity); } catch(eo){} }
            
            if (sd.isClipping) { try { shLyr.enabled = false; } catch(eC){} }

        } else {
            var sPathsArr = (sd.paths) ? sd.paths : ((sd.path) ? [sd.path] : null);

            var addedSPaths = 0;
            if (sPathsArr && sPathsArr.length > 0) {
                for (var pi=0; pi<sPathsArr.length; pi++) {
                    var pData = sPathsArr[pi];
                    if (!pData || !pData.pts || pData.pts.length < 2) continue;
                    var pathGroup = cont.addProperty("ADBE Vector Shape - Group");
                    var verts=[],inT=[],outT=[];
                    for (var p=0; p<pData.pts.length; p++) {
                        verts.push(pData.pts[p].a);
                        inT.push(pData.pts[p].i);
                        outT.push(pData.pts[p].o);
                    }
                    var shapeShape = new Shape();
                    shapeShape.vertices   = verts;
                    shapeShape.inTangents = inT;
                    shapeShape.outTangents= outT;
                    shapeShape.closed = (pData.closed !== undefined) ? pData.closed : true;
                    pathGroup.property("Path").setValue(shapeShape);
                    addedSPaths++;
                }
            }
            // FALLBACK: Sem caminhos válidos — usa rect da bounding box
            if (addedSPaths === 0) {
                try {
                    var sfbW = sd.w || 100, sfbH = sd.h || 100;
                    var sfbRect = cont.addProperty("ADBE Vector Shape - Rect");
                    sfbRect.property("ADBE Vector Rect Size").setValue([sfbW, sfbH]);
                } catch(esfb) {}
            }

            applyFillOrStroke(cont, sd.fill, false);
            applyFillOrStroke(cont, sd.stroke, true);

            if (sd.isClipping && !sd.fill && !sd.stroke) {
                applyFillOrStroke(cont, {type:"solid", color:[1,1,1]}, false);
            }
            
            var tr = shLyr.property("ADBE Transform Group");
            tr.property("ADBE Anchor Point").setValue([0, 0]);
            tr.property("ADBE Position").setValue([sd.x || 0, sd.y || 0]);
            if (sd.opacity !== undefined) { try { tr.property("ADBE Opacity").setValue(sd.opacity); } catch(eo){} }
            
            if (sd.isClipping) { try { shLyr.enabled = false; } catch(eC){} }
            setBlend(shLyr, grp, sd.blendMode);
            diagSolid++;
        }
    }
    
    for (var i = tempComp.numLayers; i >= 1; i--) { 
        try {
            tempComp.layer(i).copyToComp(comp);
        } catch(ec){}
    }
    
    // BUILD STATIC DICTIONARY POST-PASTE
    var finalLayerDict = {};
    for (var L = 1; L <= comp.numLayers; L++) {
        var cl = comp.layer(L);
        try { cl.selected = false; } catch(esel){}
        finalLayerDict[cl.name] = cl;
    }
    
    try { tempComp.remove(); } catch(e){}

    var sdByName = {};
    for (var k = 0; k < jd.shapes.length; k++) sdByName[jd.shapes[k].name] = jd.shapes[k];

    app.endUndoGroup();
    app.beginUndoGroup("Relink Hierachy");

    var relinkErrs = [];

    for (var si = 0; si < jd.shapes.length; si++) {
        var sd  = jd.shapes[si];
        var lyr = finalLayerDict[sd.name];
        if (!lyr) continue;

        if (sd.parent && finalLayerDict[sd.parent]) {
            var parentSD = sdByName[sd.parent];
            try { 
                lyr.parent = finalLayerDict[sd.parent]; 
                try {
                    var opProp = lyr.property("ADBE Transform Group").property("ADBE Opacity");
                    if (opProp && opProp.canSetExpression) {
                        opProp.expression = "value * (hasParent ? parent.transform.opacity / 100 : 1)";
                    }
                } catch(eOp){}
            } catch(e){
                relinkErrs.push(sd.name + " -> " + sd.parent + ": " + e.toString());
            }
            if (parentSD) {
                var lx = (sd.x || 0) - (parentSD.x || 0);
                var ly = (sd.y || 0) - (parentSD.y || 0);
                try {
                    var posProp = lyr.property("ADBE Transform Group").property("ADBE Position");
                    var posVal = lx !== undefined ? (posProp.value.length >= 3 ? [lx, ly, 0] : [lx, ly]) : null;
                    if (posVal) posProp.setValue(posVal);
                } catch(ep) { try { lyr.transform.position.setValue([lx, ly]); } catch(ep2){} }
            }
        }

        if (sd.clipMaskRef) {
            var maskSD   = sdByName[sd.clipMaskRef];
            var maskLyr2 = finalLayerDict[sd.clipMaskRef];
            if (maskLyr2) { 
                try { maskLyr2.enabled = false; } catch(em2){} 
                var maskPathsArr = maskSD ? (maskSD.paths ? maskSD.paths : (maskSD.path ? [maskSD.path] : null)) : null;
                
                // USAMOS SEMPRE MASCARA INTERNA (ADBE Mask Parade) SE EXISTIREM PATHS!
                // Isso e muito mais robusto que o Track Matte do AE.
                if (maskPathsArr && maskPathsArr.length > 0) {
                    try {
                        var maskProp = lyr.property("ADBE Mask Parade");
                        var offX = (maskSD.x || 0) - (sd.x || 0);
                        var offY = (maskSD.y || 0) - (sd.y || 0);
                        for (var mpi = 0; mpi < maskPathsArr.length; mpi++) {
                            var mpData = maskPathsArr[mpi];
                            if (!mpData.pts || mpData.pts.length < 2) continue;
                            var aeM = maskProp.addProperty("ADBE Mask Atom");
                            var ms  = new Shape();
                            var mv=[], mit=[], mot=[];
                            for (var mpv=0; mpv<mpData.pts.length; mpv++) {
                                var pt = mpData.pts[mpv];
                                mv.push( [pt.a[0]+offX, pt.a[1]+offY] );
                                mit.push(pt.i ? [pt.i[0], pt.i[1]] : [0,0]);
                                mot.push(pt.o ? [pt.o[0], pt.o[1]] : [0,0]);
                            }
                            ms.vertices = mv; ms.inTangents = mit; ms.outTangents = mot;
                            ms.closed = (mpData.closed !== undefined) ? mpData.closed : true;
                            try { aeM.property("ADBE Mask Shape").setValue(ms); } catch(ems){}
                            try { aeM.property("ADBE Mask Mode").setValue(MaskMode.ADD); } catch(emm){} // Usamos ADD para o clip funcionar visualmente antes do C++
                        }
                    } catch(eme){
                        relinkErrs.push("MaskAtom falhou p/ " + sd.name + ": " + eme.toString());
                    }
                } else {
                    // Fallback para Track Matte SOMENTE se for um clip estranho sem path
                    try { 
                        if (typeof lyr.setTrackMatte === 'function') {
                            lyr.setTrackMatte(maskLyr2, TrackMatteType.ALPHA);
                        } else {
                            lyr.trackMatteType = TrackMatteType.ALPHA;
                        }
                    } catch(eTM) {
                        relinkErrs.push("Matte (no-path) " + sd.name + ": " + eTM.toString());
                    }
                }
            }
        }

        
        // Aplica o nome bonito só no fim, depois que todos os links foram feitos!
        // GRADIENTES: NAO renomear - o plugin C++ precisa encontrar pelo sd.name exato!
        // O plugin ira substituir a camada e limpar o nome _idx depois.
        try {
            if (sd.fillType !== "gradient") {
                if (sd.origName) { lyr.name = sd.origName; }
                else { lyr.name = sd.name.split("_idx")[0]; }
            }
            try { lyr.comment = "uid_" + sd.name; } catch(ec){}
        } catch(en) {}
    }

    app.endUndoGroup();

    // ── DIAGNÓSTICO FINAL ──
    try {
        // Diagnóstico removido a pedido do usuário
    } catch(eDiag) {
    }

    comp.openInViewer();

} catch(e) {
    try { app.endUndoGroup(); } catch(err){}
    alert("ERRO GLOBAL: "+e.message+" (L"+e.line+")");
}
})();