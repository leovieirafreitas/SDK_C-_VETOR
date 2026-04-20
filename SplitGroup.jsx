// SplitGroup.jsx v12 — NATIVE BUILD ARCHITECTURE
// Resolve Hierarchy, Masks, and Gradient positioning definitively.
// Constrói tudo num só shape para usar "Merge Paths" com clipping.

(function(){
try {
    var jf = new File("C:/AEGP/grad_data.json");
    if (!jf.exists) { alert("Rode ExtrairGradiente.jsx no Illustrator primeiro!"); return; }
    jf.open("r"); var jd = eval("(" + jf.read() + ")"); jf.close();

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Nenhuma composicao ativa!"); return;
    }

    app.beginUndoGroup("Transfer Vectors Native Build");

    var vetLayer = comp.layers.addShape();
    vetLayer.name = "Vetores";
    vetLayer.moveToBeginning();
    var tr = vetLayer.property("ADBE Transform Group");
    try{tr.property("ADBE Anchor Point").setValue([0, 0]);}catch(e){}
    try{tr.property("ADBE Position").setValue([0, 0]);}catch(e){}
    var rootVet = vetLayer.property("ADBE Root Vectors Group");

    var groupContMap = {};

    function applyFillOrStrokeNative(cont, data, isStroke) {
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

    // Variáveis para Standalone Gradients
    var standaloneLyrs = [];

    // LER NA ORDEM DO JSON (0 até length-1) PARA MANTER A HIERARQUIA 
    for(var si = 0; si < jd.shapes.length; si++) {
        var sd = jd.shapes[si];
        if (sd.fillType === "text" || !sd.name) continue;

        var parentCont = (sd.parent && groupContMap[sd.parent])
            ? groupContMap[sd.parent]
            : rootVet;

        if (sd.fillType === "group") {
            var nGrp = parentCont.addProperty("ADBE Vector Group");
            nGrp.name = sd.name;
            try { 
                var ngt = nGrp.property("ADBE Vector Transform Group");
                if (ngt) {
                    ngt.property("ADBE Vector Anchor").setValue([0,0]);
                    ngt.property("ADBE Vector Position").setValue([0,0]); 
                } 
            } catch(e){}
            
            try { nGrp.moveTo(1); } catch (em) {}
            // Refresh property hook due to DOM index shift!
            nGrp = parentCont.property(sd.name);
            groupContMap[sd.name] = nGrp.property("ADBE Vectors Group");
            continue;
        }

        // --- MODO GRADIENTE --- (Native Hybrid)
        if (sd.fillType === "gradient") {
            if (!sd.paths || sd.paths.length === 0) {
                if (sd.path) sd.paths = [sd.path];
                else continue;
            }

            // A. Cria o sub-grupo diretamente na Vetores!
            var gradVG = parentCont.addProperty("ADBE Vector Group");
            gradVG.name = sd.name;
            try { 
                var vgt = gradVG.property("ADBE Vector Transform Group");
                vgt.property(1).setValue([0,0]); // Anchor
                vgt.property(2).setValue([0,0]); // Position
            } catch(e){}
            var gCont = gradVG.property("ADBE Vectors Group");

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

            if (addedGPaths > 0) {
                var fp = gCont.addProperty("ADBE Vector Graphic - Fill");
                if (sd.gradient && sd.gradient.stops && sd.gradient.stops.length > 0) {
                    var s0 = sd.gradient.stops[0];
                    try { fp.property("ADBE Vector Fill Color").setValue([s0.r, s0.g, s0.b, 1]); } catch(e){}
                }

                // C++ will target this directly, but we STILL need a dummy standalone layer
                // to trigger the native C++ 'ae_batch_temp' injection matching gd.name. 
                // We'll create an empty shape layer for C++ to read and delete.
                var dummyLyr = comp.layers.addShape();
                dummyLyr.name = sd.name;
            } else {
                gradVG.remove();
            }
            try { parentCont.property(sd.name).moveTo(1); } catch(em){}
            continue;
        }

        // --- MODO COR SOLIDA / STROKE / CLIPPING ---
        var sPathsArr = (sd.paths) ? sd.paths : ((sd.path) ? [sd.path] : null);
        if (!sPathsArr || sPathsArr.length === 0) continue;

        var shiftX = sd.x || 0;
        var shiftY = sd.y || 0;

        var grp2 = parentCont.addProperty("ADBE Vector Group");
        grp2.name = sd.name;
        var cont = grp2.property("ADBE Vectors Group");

        var addedSPaths = 0;
        for (var pi = 0; pi < sPathsArr.length; pi++) {
            var pData = sPathsArr[pi];
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
            addedSPaths++;
        }
        
        if (addedSPaths === 0) continue;
        
        // Ativar Merge Paths caso haja clipping ou shapes comutados
        if (addedSPaths > 1 || sd.isClipping) {
            try { var mp = cont.addProperty("ADBE Vector Filter - Merge"); mp.property("ADBE Vector Merge Type").setValue(5); /* Intersect for clipping effects */ } catch(e){}
        }

        applyFillOrStrokeNative(cont, sd.fill, false);
        applyFillOrStrokeNative(cont, sd.stroke, true);

        // Se fosse maskara pura
        if (sd.isClipping && !sd.fill && !sd.stroke) {
            // Invisible boundary masking
        }
        
        try { parentCont.property(sd.name).moveTo(1); } catch(em){}
    }

    // ── 2. EXECUTA PLUGIN C++ ──
    // O plugin C++ está ativo com o recursive `_findGrp` e irá:
    // a. Ler o template aepx
    // b. Encontrar o gradLyr respectivo
    // c. Extrair a path dele
    // d. Descobrir a pasta pai verdadeira na "Vetores" via a recursão nova!
    // e. Criar o Vector Group lá. Adicionar a Path e o G-Fill sem offset extra!
    // f. Deletar gradLyr.
    app.endUndoGroup();

    var gCmd = app.findMenuCommandId("GRAD FIXER: Aplicar Gradientes");
    if (gCmd > 0) { 
        app.beginUndoGroup("C++ Gradient Inject");
        app.executeCommand(gCmd); 
        app.endUndoGroup();
    }

    // ── 3. CLEANUP DE NOMES _idx ──
    app.beginUndoGroup("Cleanup Native Vetores");
    var _cleanProps = function(cont) {
        for(var k=1; k<=cont.numProperties; k++) {
            var p = cont.property(k);
            if(p.matchName==='ADBE Vector Group') {
                var nm = p.name;
                var ox = nm.indexOf('_idx');
                if(ox !== -1) p.name = nm.substring(0, ox);
                try { _cleanProps(p.property('ADBE Vectors Group')); } catch(e){}
            }
        }
    };
    _cleanProps(rootVet);
    app.endUndoGroup();

    comp.openInViewer();
    "true";

} catch (e) {
    alert("ERRO NATIVE BLD: " + e.message + " L:" + e.line);
}
})();
