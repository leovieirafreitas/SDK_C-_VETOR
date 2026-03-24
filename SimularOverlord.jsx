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

    var fps = 25, dur = 10;
    var ac = app.project.activeItem;
    if (ac && ac instanceof CompItem) { fps = ac.frameRate; dur = ac.duration; }
    var comp = app.project.items.addComp("Vetores Grad", artW, artH, 1, dur, fps);
    comp.bgColor = [0, 0, 0];

    var nGrad=0, nSolid=0, nStroke=0;

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

    // Ordem inversa: topo JSON = topo AE
    for (var si = jd.shapes.length - 1; si >= 0; si--) {
        var sd = jd.shapes[si];

        var shLyr = comp.layers.addShape();
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
            shLyr.property("ADBE Transform Group").property("ADBE Position").setValue([0,0]);
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
        }
    }

    comp.openInViewer();
    alert("PRONTO! (v7 — format overlord)\n" +
          "Layers: "+(nGrad+nSolid+nStroke)+" | Grad: "+nGrad+" | Fill: "+nSolid+" | Stroke: "+nStroke+"\n\n"+
          (nGrad>0 ? "Agora: Camada → GRAD FIXER: Aplicar Gradientes" :
                     "Nenhum gradiente"));
} catch(e) { alert("ERRO: "+e.message+" (L"+e.line+")"); }
})();
