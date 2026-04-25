// SplitGroup.jsx v14 — TURBO SHADOW-BUILD + NATIVE BUILD ARCHITECTURE + MASKS
// TURBO: Constrói a layer "Vetores" numa TempComp INVISÍVEL (sem atualizar UI a cada shape)
// Depois copyToComp(1 layer) → cai na comp ativa em ~1 batch. Mesma velocidade do SplitLayer.
// Preserva: Hierarquia, Merge Paths (Clip), Blend Modes, Gradientes (Dummy Layers para C++).

(function(){
try {
    var jf = new File("C:/AEGP/grad_data.json");
    if (!jf.exists) { alert("Rode ExtrairGradiente.jsx no Illustrator primeiro!"); return; }
    jf.open("r"); var jd = eval("(" + jf.read() + ")"); jf.close();

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Nenhuma composicao ativa!"); return;
    }

    app.beginUndoGroup("Transfer Vectors Native Build (Turbo)");

    // ─────────────────────────────────────────────────────────────────────
    // TURBO SHADOW-BUILD: Cria comp temporária invisible para construção
    // O AE não atualiza a UI da timeline principal durante o build
    // ─────────────────────────────────────────────────────────────────────
    var tempComp = app.project.items.addComp(
        "TempBuild_Group",
        comp.width, comp.height, comp.pixelAspect,
        comp.duration, comp.frameRate
    );

    // Cria a layer Vetores DENTRO da tempComp (invisível ao usuário)
    var vetLayer = tempComp.layers.addShape();

    // Robust naming com retry
    var nameSuccess = false;
    for (var n = 0; n < 3; n++) {
        try { vetLayer.name = "Vetores"; nameSuccess = true; break; } catch(e) { $.sleep(50); }
    }
    if (!nameSuccess) {
        try { vetLayer.name = "Vetores"; } catch(e) {}
    }

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

    // Guarda sd por nome para lookup de mascaras depois
    var sdByName = {};
    for (var k = 0; k < jd.shapes.length; k++) {
        sdByName[jd.shapes[k].name] = jd.shapes[k];
    }

    // Blend mode no Vector Group Transform
    function setBlendNative(vGroupTransform, bm) {
        if (!bm || bm === 1) return;
        try { vGroupTransform.property("ADBE Vector Blend Mode").setValue(bm); } catch(e){}
    }

    // ─────────────────────────────────────────────────────────────────────
    // PASSO 1: Construir toda a árvore de shapes/grupos em tempComp.Vetores
    // (UI não atualiza — sem lag visual)
    // ─────────────────────────────────────────────────────────────────────
    for (var si = 0; si < jd.shapes.length; si++) {
        var sd = jd.shapes[si];
        if (sd.fillType === "text" || !sd.name) continue;

        var parentCont = (sd.parent && groupContMap[sd.parent])
            ? groupContMap[sd.parent]
            : rootVet;

        // ── GRUPO ──
        if (sd.fillType === "group") {
            var nGrp = parentCont.addProperty("ADBE Vector Group");
            nGrp.name = sd.name;
            try {
                var ngt = nGrp.property("ADBE Vector Transform Group");
                if (ngt) {
                    ngt.property("ADBE Vector Anchor").setValue([0,0]);
                    ngt.property("ADBE Vector Position").setValue([0,0]);
                    setBlendNative(ngt, sd.blendMode);
                    if (sd.opacity !== undefined && sd.opacity !== null) {
                        var grpOp = (sd.opacity > 1.0) ? sd.opacity : sd.opacity * 100;
                        try { ngt.property("ADBE Vector Opacity").setValue(grpOp); } catch(ego){}
                    }
                }
            } catch(e){}
            nGrp = parentCont.property(sd.name);
            groupContMap[sd.name] = nGrp.property("ADBE Vectors Group");
            continue;
        }

        // ── GRADIENTE (Native Hybrid) ──
        if (sd.fillType === "gradient") {
            if (!sd.paths || sd.paths.length === 0) {
                if (sd.path) sd.paths = [sd.path];
                else continue;
            }

            var gradVG = parentCont.addProperty("ADBE Vector Group");
            gradVG.name = sd.name;
            var vgt = gradVG.property("ADBE Vector Transform Group");
            try { vgt.property("ADBE Vector Anchor").setValue([0,0]); } catch(ea){}
            try { vgt.property("ADBE Vector Position").setValue([0,0]); } catch(ep){}
            setBlendNative(vgt, sd.blendMode);
            if (sd.opacity !== undefined && sd.opacity !== null) {
                var gradOp = (sd.opacity > 1.0) ? sd.opacity : sd.opacity * 100;
                var opSet = false;
                try { vgt.property("ADBE Vector Opacity").setValue(gradOp); opSet=true; } catch(eo){}
                if (!opSet) { try { vgt.property(7).setValue(gradOp); } catch(eo2){} }
            }
            var gCont = gradVG.property("ADBE Vectors Group");

            var shiftX = sd.x || 0;
            var shiftY = sd.y || 0;

            var addedGPaths = 0;
            for (var gpi = 0; gpi < sd.paths.length; gpi++) {
                var gPathData = sd.paths[gpi];
                if (!gPathData.pts || gPathData.pts.length < 2) continue;
                var pGrp = gCont.addProperty("ADBE Vector Shape - Group");
                var gv=[], git=[], got=[];
                for (var m = 0; m < gPathData.pts.length; m++) {
                    gv.push([gPathData.pts[m].a[0] + shiftX, gPathData.pts[m].a[1] + shiftY]);
                    git.push(gPathData.pts[m].i);
                    got.push(gPathData.pts[m].o);
                }
                var gsh = new Shape();
                gsh.vertices = gv; gsh.inTangents = git; gsh.outTangents = got;
                gsh.closed = (gPathData.closed !== undefined) ? gPathData.closed : true;
                pGrp.property("ADBE Vector Shape").setValue(gsh);
                addedGPaths++;
            }

            if (addedGPaths > 0) {
                // Dummy layer no tempComp para C++ encontrar pelo sd.name
                var dummyLyr = tempComp.layers.addShape();
                dummyLyr.name = sd.name;

                // Solid fill provisorio — C++ vai substituir pelo G-Fill
                var fp = gCont.addProperty("ADBE Vector Graphic - Fill");
                if (sd.gradient && sd.gradient.stops && sd.gradient.stops.length > 0) {
                    var s0 = sd.gradient.stops[0];
                    try { fp.property("ADBE Vector Fill Color").setValue([s0.r, s0.g, s0.b, 1]); } catch(e){}
                }
            } else {
                try { gradVG.remove(); } catch(eg){}
            }
            continue;
        }

        // ── SOLIDO / STROKE / CLIPPING ──
        var sPathsArr = (sd.paths) ? sd.paths : ((sd.path) ? [sd.path] : null);
        if (!sPathsArr || sPathsArr.length === 0) continue;

        var shiftX2 = sd.x || 0;
        var shiftY2 = sd.y || 0;

        var grp2 = parentCont.addProperty("ADBE Vector Group");
        grp2.name = sd.name;
        var cont2 = grp2.property("ADBE Vectors Group");
        var vgt2 = grp2.property("ADBE Vector Transform Group");
        setBlendNative(vgt2, sd.blendMode);
        if (sd.opacity !== undefined && sd.opacity !== null) {
            var solidOp = (sd.opacity > 1.0) ? sd.opacity : sd.opacity * 100;
            var opSet2 = false;
            try { vgt2.property("ADBE Vector Opacity").setValue(solidOp); opSet2=true; } catch(eopS){}
            if (!opSet2) { try { vgt2.property(7).setValue(solidOp); } catch(eopS2){} }
        }

        var addedSPaths = 0;
        for (var pi = 0; pi < sPathsArr.length; pi++) {
            var pData = sPathsArr[pi];
            if (!pData.pts || pData.pts.length < 2) continue;
            var pg3 = cont2.addProperty("ADBE Vector Shape - Group");
            var vt=[], it3=[], ot3=[];
            for (var p = 0; p < pData.pts.length; p++) {
                vt.push([pData.pts[p].a[0] + shiftX2, pData.pts[p].a[1] + shiftY2]);
                it3.push(pData.pts[p].i);
                ot3.push(pData.pts[p].o);
            }
            var sh3 = new Shape();
            sh3.vertices = vt; sh3.inTangents = it3; sh3.outTangents = ot3;
            sh3.closed = (pData.closed !== undefined) ? pData.closed : true;
            pg3.property("ADBE Vector Shape").setValue(sh3);
            addedSPaths++;
        }

        if (addedSPaths === 0) continue;

        // Merge Paths para shapes compostos ou clipping
        if (addedSPaths > 1 || sd.isClipping) {
            try {
                var mp = cont2.addProperty("ADBE Vector Filter - Merge");
                mp.property("ADBE Vector Merge Type").setValue(5); // Intersect
            } catch(e){}
        }

        applyFillOrStrokeNative(cont2, sd.fill, false);
        applyFillOrStrokeNative(cont2, sd.stroke, true);
    }

    // ─────────────────────────────────────────────────────────────────────
    // TURBO TRANSFER: Copia a ÚNICA layer "Vetores" da tempComp → comp ativa
    // 1 copyToComp em vez de N addProperty calls na UI
    // ─────────────────────────────────────────────────────────────────────
    // Copia também as Dummy layers (gradientes) que o C++ vai usar
    // Loop reverso: mantém Z-order correto
    for (var ti = tempComp.numLayers; ti >= 1; ti--) {
        try { tempComp.layer(ti).copyToComp(comp); } catch(ec){}
    }

    // Atualiza referência vetLayer para a layer copiada no comp real
    var vetLayer = null;
    for (var li = 1; li <= comp.numLayers; li++) {
        if (comp.layer(li).name === "Vetores") {
            vetLayer = comp.layer(li);
            break;
        }
    }
    if (vetLayer) { try { vetLayer.moveToEnd(); } catch(e){} } // Vetores vai para o fundo

    // Remove a tempComp — já cumpriu o papel
    try { tempComp.remove(); } catch(e){}

    // Selecionar vetLayer para que C++ saiba qual layer é o Vetores
    try {
        for (var li = 1; li <= comp.numLayers; li++) { comp.layer(li).selected = false; }
        if (vetLayer) vetLayer.selected = true;
    } catch(e){}

    // ── 2. EXECUTA PLUGIN C++ ──
    app.endUndoGroup();

    var gCmd = app.findMenuCommandId("GRAD FIXER: Aplicar Gradientes");
    if (gCmd > 0) {
        app.beginUndoGroup("C++ Gradient Inject");
        app.executeCommand(gCmd);
        app.endUndoGroup();
    }

    // ── EXTRA CLEANUP: Remove dummy layers ou falhas do C++ ──
    try {
        var lixoArr = [];
        for (var lixo = 1; lixo <= comp.numLayers; lixo++) {
            var lName = comp.layer(lixo).name;
            if (lName !== "Vetores" && (lName.match(/^Camada de forma \d+$/) || lName.indexOf("_idx") !== -1 || lName.indexOf(" (grad)") !== -1)) {
                lixoArr.push(comp.layer(lixo));
            }
        }
        for (var lx = 0; lx < lixoArr.length; lx++) {
            lixoArr[lx].remove();
        }
    } catch(e) {}

    // ── 3. MASCARAS — clip DENTRO do VG via Merge Paths (Intersect) ──
    app.beginUndoGroup("Apply ClipMasks Native");
    var _dbgMask = [];

    // Busca recursiva de VG por nome
    var _findVGByName = function(cont, nm) {
        for (var fi=1; fi<=cont.numProperties; fi++) {
            var fp; try { fp = cont.property(fi); } catch(e){ continue; }
            if (!fp || fp.matchName !== "ADBE Vector Group") continue;
            if (fp.name === nm) return fp;
            try { var sub = _findVGByName(fp.property("ADBE Vectors Group"), nm); if(sub) return sub; } catch(e2){}
        }
        return null;
    };

    if (vetLayer) {
        var rootVet3 = vetLayer.property("ADBE Root Vectors Group");

        for (var si3=0; si3<jd.shapes.length; si3++) {
            var sd3 = jd.shapes[si3];
            if (!sd3.clipMaskRef) continue;
            if (sd3.fillType !== "solid" && sd3.fillType !== "gradient") continue;

            var maskSD3 = sdByName[sd3.clipMaskRef];
            if (!maskSD3) { _dbgMask.push("NO_MASKSD:"+sd3.name); continue; }

            var maskPaths3 = maskSD3.paths ? maskSD3.paths : (maskSD3.path ? [maskSD3.path] : null);
            if (!maskPaths3 || maskPaths3.length === 0) { _dbgMask.push("NO_MASKPATHS:"+sd3.name); continue; }

            var vgRef3 = _findVGByName(rootVet3, sd3.name);
            if (!vgRef3) { _dbgMask.push("NO_VG:"+sd3.name); continue; }
            var vgCont3 = vgRef3.property("ADBE Vectors Group");

            var mxOff3 = maskSD3.x || 0, myOff3 = maskSD3.y || 0;

            var addedClip = 0;
            for (var mpi3=0; mpi3<maskPaths3.length; mpi3++) {
                var mpD3 = maskPaths3[mpi3];
                if (!mpD3.pts || mpD3.pts.length < 2) continue;
                var clipPg = vgCont3.addProperty("ADBE Vector Shape - Group");
                var clipSv = new Shape(); var clipV=[],clipIT=[],clipOT=[];
                for (var mpv3=0; mpv3<mpD3.pts.length; mpv3++) {
                    var mpt3 = mpD3.pts[mpv3];
                    clipV.push([mpt3.a[0] + mxOff3, mpt3.a[1] + myOff3]);
                    clipIT.push(mpt3.i ? [mpt3.i[0],mpt3.i[1]] : [0,0]);
                    clipOT.push(mpt3.o ? [mpt3.o[0],mpt3.o[1]] : [0,0]);
                }
                clipSv.vertices=clipV; clipSv.inTangents=clipIT; clipSv.outTangents=clipOT;
                clipSv.closed = (mpD3.closed !== undefined) ? mpD3.closed : true;
                try { clipPg.property("ADBE Vector Shape").setValue(clipSv); addedClip++; } catch(e){}
            }

            if (addedClip > 0) {
                try {
                    var mp3 = vgCont3.addProperty("ADBE Vector Filter - Merge");
                    mp3.property("ADBE Vector Merge Type").setValue(4); // 4 = Intersect

                    // CRITICAL: Fill/Stroke deve vir APÓS o Merge Paths
                    var fillRefs3 = [];
                    for (var fpi3=1; fpi3<=vgCont3.numProperties; fpi3++) {
                        try {
                            var fp3 = vgCont3.property(fpi3);
                            var fmn3 = fp3.matchName;
                            if (fmn3 === "ADBE Vector Graphic - Fill"   ||
                                fmn3 === "ADBE Vector Graphic - Stroke" ||
                                fmn3 === "ADBE Vector Graphic - G-Fill") {
                                fillRefs3.push(fp3);
                            }
                        } catch(e){}
                    }
                    for (var fri3=0; fri3<fillRefs3.length; fri3++) {
                        try { fillRefs3[fri3].moveTo(vgCont3.numProperties); } catch(e){}
                    }

                    _dbgMask.push("OK:"+sd3.name);
                } catch(emp3){ _dbgMask.push("MERGE_ERR:"+sd3.name+":"+emp3.message); }
            }
        }
    } else {
        _dbgMask.push("NO_VETLYR");
    }

    if (_dbgMask.join("").indexOf("NO_") !== -1 || _dbgMask.join("").indexOf("ERR") !== -1) {
        alert("MASK DEBUG:\n" + _dbgMask.slice(0,15).join("\n"));
    }

    app.endUndoGroup();

    // ── 4. CLEANUP DE NOMES _idx ──
    app.beginUndoGroup("Cleanup Native Vetores");
    var _cleanProps = function(cont) {
        for (var k=1; k<=cont.numProperties; k++) {
            var p = cont.property(k);
            if (p.matchName === "ADBE Vector Group") {
                var nm = p.name;
                var ox = nm.indexOf("_idx");
                if (ox !== -1) p.name = nm.substring(0, ox);
                try { _cleanProps(p.property("ADBE Vectors Group")); } catch(e){}
            }
        }
    };
    if (vetLayer) {
        _cleanProps(vetLayer.property("ADBE Root Vectors Group"));
    }
    app.endUndoGroup();

    comp.openInViewer();
    "true";

} catch (e) {
    try { if (typeof tempComp !== "undefined") tempComp.remove(); } catch(ec){}
    alert("ERRO NATIVE BLD: " + e.message + " L:" + e.line);
}
})();
