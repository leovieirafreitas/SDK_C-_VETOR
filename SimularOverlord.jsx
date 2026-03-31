// SimularOverlord.jsx v7 — Formato overlord-lite (paths com pData.closed)
// sd.paths = [{pts:[{a,i,o}...], closed:bool}] — igual host/aftereffects.jsx
// sd.fill = {type:"solid", color:[r,g,b]}  |  sd.stroke = {color:[r,g,b], strokeWidth:n}
// Gradientes: sd.path = {pts:[...], closed:bool} com x:0, y:0
(function(){
try {
    var jf = new File("C:/AEGP/grad_data.json");
    if (!jf.exists) { alert("Rode ExtrairGradiente.jsx no Illustrator primeiro!"); return; }
    jf.open("r"); var jd = eval("(" + jf.read() + ")"); jf.close();

    var artW = Math.round(jd.artboard.w);
    var artH = Math.round(jd.artboard.h);

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Nenhuma composicao aberta. Clique no botao COMP no Illustrator primeiro para criar a composicao baseada no artboard!");
        return;
    }

    app.beginUndoGroup("Transfer Vectors");

    // CRIA COMP TEMPORARIA PARA CONSTRUCAO INVISIVEL (Rápido)
    var tempComp = app.project.items.addComp("TempBuild_GF", comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);

    var nGrad=0, nSolid=0, nStroke=0;

    var nullDict = {};
    var layerDict = {};

    // Funcao para criar fill/stroke — identica ao overlord-lite
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
        }
        if (isStroke && data.strokeWidth) {
            try { prop.property("Stroke Width").setValue(data.strokeWidth); } catch(e) {}
            if (data.strokeCap) try { prop.property("Line Cap").setValue(data.strokeCap); } catch(e){}
            if (data.strokeJoin) try { prop.property("Line Join").setValue(data.strokeJoin); } catch(e){}
        }
    }

    // CRIAR TODAS AS LAYERS EM ORDEM INVERSA PARA MANTER A PILHA (STACK) VISUAL IGUAL AO ILLUSTRATOR
    // Ao processar o array de tras pra frente, o grupo pai (que e extraido antes) fica no topo.
    for (var si = jd.shapes.length - 1; si >= 0; si--) {
        var sd = jd.shapes[si];
        
        if (sd.fillType === "group") {
            var nLayer = tempComp.layers.addShape();
            nLayer.name = sd.origName || sd.name;
            nLayer.comment = sd.name;
            try { 
                var root = nLayer.property("ADBE Root Vectors Group");
                var bx = root.addProperty("ADBE Vector Group");
                bx.name = "Bounds";
                var cont = bx.property("ADBE Vectors Group");
                var rect = cont.addProperty("ADBE Vector Shape - Rect");
                rect.property("ADBE Vector Rect Size").setValue([sd.w || 100, sd.h || 100]);
                
                var gX = (sd.x !== undefined && sd.x !== 0) ? sd.x : (artW/2);
                var gY = (sd.y !== undefined && sd.y !== 0) ? sd.y : (artH/2);
                var tr = nLayer.property("ADBE Transform Group");
                tr.property("ADBE Anchor Point").setValue([0, 0]); 
                tr.property("ADBE Position").setValue([gX, gY]); 
                nLayer.label = 0;       // Sem cor de rotulo
                // Overlord layers usually do not have the guide layer flag since the user's screenshot lacks the cyan guide icon for group shape layers.
            } catch(e){}
            nullDict[sd.name] = nLayer;
            layerDict[sd.name] = nLayer;
            continue;
        }

        if (sd.fillType === "text") {
            var txtLyr = tempComp.layers.addText(sd.text);
            txtLyr.name = sd.origName || sd.name;
            txtLyr.comment = sd.name;
            var textProp = txtLyr.property("Source Text");
            var textDoc = textProp.value;
            textDoc.fontSize = sd.fontSize || 50;
            textDoc.font = sd.fontName || "Arial";
            textDoc.fillColor = sd.color || [1,1,1];
            if (sd.justification === 1) textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            else if (sd.justification === 2) textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;
            else textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
            try { textProp.setValue(textDoc); } catch(et){}
            try {
                var tr = txtLyr.property("ADBE Transform Group");
                if (sd.kind === 1) {
                    tr.property("ADBE Anchor Point").setValue([0, 0]);
                } else {
                    var tb = txtLyr.sourceRectAtTime(0, false);
                    var tcx = tb.left + (tb.width/2);
                    var tcy = tb.top + (tb.height/2);
                    tr.property("ADBE Anchor Point").setValue([tcx, tcy]);
                }
                tr.property("ADBE Position").setValue([sd.x, sd.y]);
                if (sd.rotation) { tr.property("ADBE Rotation").setValue(sd.rotation); }
                if (sd.opacity !== undefined) { tr.property("ADBE Opacity").setValue(sd.opacity); }
            } catch(et){}
            layerDict[sd.name] = txtLyr;
            nullDict[sd.name] = txtLyr;
            continue;
        }

        var shLyr = tempComp.layers.addShape();
        shLyr.comment = sd.name || ("shape_" + si);
        shLyr.name = sd.name || ("shape_" + si);
        var root = shLyr.property("ADBE Root Vectors Group");
        var grp  = root.addProperty("ADBE Vector Group");
        grp.name = sd.name || ("g_"+si);
        var cont = grp.property("ADBE Vectors Group");

        if (sd.fillType === "gradient") {
            // ── GRADIENTE: path absoluto, posicao [0,0] ──
            // Suporta formato antigo (array) e novo (objeto {pts, closed})
            var gPtsArr = (sd.path && sd.path.pts) ? sd.path.pts : (sd.path || null);
            var gClosed = (sd.path && sd.path.closed !== undefined) ? sd.path.closed : true;
            if (!gPtsArr || gPtsArr.length < 2) { shLyr.remove(); continue; }
            var pGrp = cont.addProperty("ADBE Vector Shape - Group");
            var v=[], it=[], ot=[];
            for (var m=0; m<gPtsArr.length; m++) { v.push(gPtsArr[m].a); it.push(gPtsArr[m].i); ot.push(gPtsArr[m].o); }
            var sh=new Shape(); sh.vertices=v; sh.inTangents=it; sh.outTangents=ot; sh.closed=gClosed;
            pGrp.property("ADBE Vector Shape").setValue(sh);
            // Placeholder fill (GRAD FIXER vai substituir)
            var gFill=cont.addProperty("ADBE Vector Graphic - Fill");
            if (sd.gradient && sd.gradient.stops && sd.gradient.stops.length>0) {
                var s0=sd.gradient.stops[0];
                gFill.property("ADBE Vector Fill Color").setValue([s0.r, s0.g, s0.b, 1]);
            }
            shLyr.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0,0]);
            shLyr.property("ADBE Transform Group").property("ADBE Position").setValue([sd.x || 0, sd.y || 0]);
            if (sd.opacity !== undefined) { try { shLyr.property("ADBE Transform Group").property("ADBE Opacity").setValue(sd.opacity); } catch(eo){} }
            nGrad++;

        } else {
            // ── SOLID / STROKE: formato overlord-lite ──
            if (!sd.paths || sd.paths.length === 0) { shLyr.remove(); continue; }

            // Detecta compound path (multiplos sub-paths fechados = letras com buracos)
            var hasMultiClosed = false;
            var addedPaths = 0;
            for (var pi=0; pi<sd.paths.length; pi++) {
                var pData = sd.paths[pi];  // {pts:[{a,i,o},...], closed:bool}
                if (!pData.pts || pData.pts.length < 2) continue;

                var pathGroup = cont.addProperty("ADBE Vector Shape - Group");
                var verts=[],inT=[],outT=[];
                for (var p=0; p<pData.pts.length; p++) {
                    verts.push(pData.pts[p].a);
                    inT.push(pData.pts[p].i);
                    outT.push(pData.pts[p].o);
                }
                var shapeShape = new Shape();
                shapeShape.vertices = verts;
                shapeShape.inTangents = inT;
                shapeShape.outTangents = outT;
                // USA O CLOSED REAL DO ITEM (arcos nao fechados!)
                shapeShape.closed = (pData.closed !== undefined) ? pData.closed : true;
                pathGroup.property("Path").setValue(shapeShape);
                if (pData.closed) hasMultiClosed = true;
                addedPaths++;
            }
            if (addedPaths === 0) { shLyr.remove(); continue; }

            // Compound path (letras com buracos): Merge Paths Exclude (even-odd)
            if (addedPaths > 1 && hasMultiClosed) {
                try {
                    var mp = cont.addProperty("ADBE Vector Filter - Merge");
                    mp.property("ADBE Vector Merge Type").setValue(5); // Exclude Intersections
                } catch(em) {}
            }

            // Fill e/ou Stroke — identico ao overlord-lite
            applyFillOrStroke(cont, sd.fill, false);
            applyFillOrStroke(cont, sd.stroke, true);

            if (sd.fill) nSolid++; else nStroke++;

            // Posicao = centro do item em coords do artboard (como overlord)
            var tr = shLyr.property("ADBE Transform Group");
            tr.property("ADBE Anchor Point").setValue([0, 0]);
            tr.property("ADBE Position").setValue([sd.x || 0, sd.y || 0]);
            if (sd.opacity !== undefined) { try { tr.property("ADBE Opacity").setValue(sd.opacity); } catch(eo){} }
        }
    }

    layerDict = {}; nullDict = {};
    for (var i = tempComp.numLayers; i >= 1; i--) {
        var oLyr = tempComp.layer(i);
        var sdName = oLyr.comment;
        oLyr.copyToComp(comp);
        var nLyr = comp.layer(1);
        if (sdName) {
            layerDict[sdName] = nLyr;
            nullDict[sdName] = nLyr;
        }
    }
    tempComp.remove();

    // APLICAR PARENTESCO APOS TODAS AS LAYERS ESTAREM CRIADAS E POSICIONADAS
    // Isso garante que o After Effects faca a matematica de compensacao de parentesco (preservando posicao visual)
    for (var si = 0; si < jd.shapes.length; si++) {
        var sd = jd.shapes[si];
        if (sd.parent && nullDict[sd.parent] && layerDict[sd.name]) {
            try { layerDict[sd.name].parent = nullDict[sd.parent]; } catch(e){}
        }
    }

    comp.openInViewer();
    app.endUndoGroup();
    // alert removido para rodar 100% silencioso via BridgeTalk

} catch(e) { 
    try{ app.endUndoGroup(); } catch(err){}
    alert("ERRO: "+e.message+" (L"+e.line+")"); 
}
})();
