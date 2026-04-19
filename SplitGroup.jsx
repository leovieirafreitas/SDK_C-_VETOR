// SplitGroup.jsx v6 — Fix sd.paths + grupos com _idx para C++ lookup correto
// Solidos/Grupos → dentro de "Vetores" (1 camada organizada, grupos nomeados com currentID)
// Gradientes     → layers standalone p/ C++ achar como origLyr → C++ injeta G-Fill dentro de Vetores
// Cleanup final  → strip "_idx..." de todos os nomes de grupos dentro de Vetores
(function(){
try {
    var jf = new File("C:/AEGP/grad_data.json");
    if (!jf.exists) { alert("Rode ExtrairGradiente.jsx no Illustrator primeiro!"); return; }
    jf.open("r"); var jd = eval("(" + jf.read() + ")"); jf.close();

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Nenhuma composicao aberta. Clique no botao COMP no Illustrator primeiro para criar a composicao baseada no artboard!");
        return;
    }

    app.beginUndoGroup("SplitGroup Build");

    var tempComp = app.project.items.addComp("TempBuild_GF", comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);

    // ── Camada unica para solidos/strokes/grupos ──────────────────────────────
    var shLyr = tempComp.layers.addShape();
    shLyr.name = "Vetores";
    var tr = shLyr.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    tr.property("ADBE Position").setValue([0, 0]);
    var root = shLyr.property("ADBE Root Vectors Group");

    // groupContMap: sd.name (currentID) → ADBE Vectors Group
    var groupContMap = {};

    for (var si = 0; si < jd.shapes.length; si++) {
        var sd = jd.shapes[si];
        var parentCont = (sd.parent && groupContMap[sd.parent]) ? groupContMap[sd.parent] : root;

        // ── GRUPO organizador ─────────────────────────────────────────────────
        if (sd.fillType === "group") {
            var grp = parentCont.addProperty("ADBE Vector Group");
            // IMPORTANTE: usa sd.name (currentID com _idx) para o C++ achar via gd.parent
            grp.name = sd.name;
            groupContMap[sd.name] = grp.property("ADBE Vectors Group");
            continue;
        }

        if (sd.fillType === "text") continue;

        // ── GRADIENTE → layer standalone para o C++ processar ─────────────────
        // O GRAD FIXER (C++) localiza por sd.name, extrai shapeVal e injecta
        // o G-Fill dentro de Vetores como vector group no parent correto.
        if (sd.fillType === "gradient") {
            if (!sd.paths || sd.paths.length === 0) continue;

            var gradLyr = tempComp.layers.addShape();
            gradLyr.name = sd.name; // ex: "Bush_grad_idx3x81865"
            var gTr = gradLyr.property("ADBE Transform Group");
            gTr.property("ADBE Anchor Point").setValue([0, 0]);
            gTr.property("ADBE Position").setValue([0, 0]);
            var gRoot = gradLyr.property("ADBE Root Vectors Group");

            // Grupo wrapper (C++ navega 1 nivel abaixo do root para achar o shape)
            var gGrp = gRoot.addProperty("ADBE Vector Group");
            gGrp.name = sd.name;
            var gCont = gGrp.property("ADBE Vectors Group");

            var shiftX = sd.x || 0;
            var shiftY = sd.y || 0;
            var addedGPaths = 0;

            for (var gpi = 0; gpi < sd.paths.length; gpi++) {
                var gPathData = sd.paths[gpi];
                if (!gPathData.pts || gPathData.pts.length < 2) continue;
                var pGrp = gCont.addProperty("ADBE Vector Shape - Group");
                var v=[], it=[], ot=[];
                for (var m = 0; m < gPathData.pts.length; m++) {
                    v.push([gPathData.pts[m].a[0] + shiftX, gPathData.pts[m].a[1] + shiftY]);
                    it.push(gPathData.pts[m].i);
                    ot.push(gPathData.pts[m].o);
                }
                var sh = new Shape();
                sh.vertices = v; sh.inTangents = it; sh.outTangents = ot;
                sh.closed = (gPathData.closed !== undefined) ? gPathData.closed : true;
                pGrp.property("ADBE Vector Shape").setValue(sh);
                addedGPaths++;
            }

            if (addedGPaths === 0) {
                try { gradLyr.remove(); } catch(e) {}
                continue;
            }

            // Placeholder fill (C++ vai substituir com G-Fill via AEPX)
            var fp = gCont.addProperty("ADBE Vector Graphic - Fill");
            if (sd.gradient && sd.gradient.stops && sd.gradient.stops.length > 0) {
                var s0 = sd.gradient.stops[0];
                try { fp.property("ADBE Vector Fill Color").setValue([s0.r, s0.g, s0.b, 1]); } catch(e){}
            }
            continue;
        }

        // ── SOLID / STROKE → dentro de Vetores ───────────────────────────────
        if (!sd.paths || sd.paths.length === 0) continue;
        var shiftX = sd.x || 0;
        var shiftY = sd.y || 0;

        var grp2 = parentCont.addProperty("ADBE Vector Group");
        grp2.name = sd.name; // currentID com _idx (cleanup remove depois)
        var cont = grp2.property("ADBE Vectors Group");

        var addedPaths = 0;
        for (var pi = 0; pi < sd.paths.length; pi++) {
            var pData = sd.paths[pi];
            if (!pData.pts || pData.pts.length < 2) continue;
            var pg3 = cont.addProperty("ADBE Vector Shape - Group");
            var vt=[], it3=[], ot3=[];
            for (var p = 0; p < pData.pts.length; p++) {
                vt.push([pData.pts[p].a[0] + shiftX, pData.pts[p].a[1] + shiftY]);
                it3.push(pData.pts[p].i); ot3.push(pData.pts[p].o);
            }
            var sh3 = new Shape();
            sh3.vertices = vt; sh3.inTangents = it3; sh3.outTangents = ot3;
            sh3.closed = (pData.closed !== undefined) ? pData.closed : true;
            pg3.property("ADBE Vector Shape").setValue(sh3);
            addedPaths++;
        }
        if (addedPaths === 0) continue;
        if (addedPaths > 1) {
            try { var mp = cont.addProperty("ADBE Vector Filter - Merge"); mp.property("ADBE Vector Merge Type").setValue(5); } catch(e){}
        }
        if (sd.fill && sd.fill.color) {
            var fillP = cont.addProperty("ADBE Vector Graphic - Fill");
            try { fillP.property("ADBE Vector Fill Color").setValue([sd.fill.color[0], sd.fill.color[1], sd.fill.color[2], 1]); } catch(e){}
        }
        if (sd.stroke && sd.stroke.color) {
            var strkP = cont.addProperty("ADBE Vector Graphic - Stroke");
            try { strkP.property("ADBE Vector Stroke Color").setValue([sd.stroke.color[0], sd.stroke.color[1], sd.stroke.color[2], 1]); } catch(e){}
            if (sd.stroke.strokeWidth) { try { strkP.property("Stroke Width").setValue(sd.stroke.strokeWidth); } catch(e){} }
        }
    }

    // Copiar layers temporarios para a comp verdadeira (invertido = ordem correta)
    for (var i = tempComp.numLayers; i >= 1; i--) {
        tempComp.layer(i).copyToComp(comp);
    }
    tempComp.remove();

    app.endUndoGroup();
    comp.openInViewer();
    "true";

} catch(e) {
    try{ app.endUndoGroup(); } catch(err){}
    alert("ERRO SplitGroup: " + e.message + " (L" + e.line + ")");
}
})();
