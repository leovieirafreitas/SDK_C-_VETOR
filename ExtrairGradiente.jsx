// ExtrairGradiente.jsx v11 â€” Gradientes confiÃ¡veis + closed flag + strokes
// Baseado no v6/v7 que funcionava para gradientes + formato overlord (closed real)
(function () {
    function toFixed(n) { if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '0.000000'; return n.toFixed(6); }

    function colorToRGB(c) {
        if (!c) return null;
        try {
            if (c.typename === "SpotColor") c = c.spot.color;
            if (c.typename === "RGBColor") return [c.red / 255, c.green / 255, c.blue / 255];
            if (c.typename === "CMYKColor") { var cy = c.cyan / 100, m = c.magenta / 100, y = c.yellow / 100, k = c.black / 100; return [(1 - cy) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)]; }
            if (c.typename === "GrayColor") { var gv = 1 - c.gray / 100; return [gv, gv, gv]; }
        } catch (e) { }
        return null;
    }

    // Extrai path relativo ao centro (cx, cy) COM closed flag real
    function getPathData(pathItem, cx, cy) {
        if (!pathItem || !pathItem.pathPoints || pathItem.pathPoints.length < 2) return null;
        var pts = [];
        for (var p = 0; p < pathItem.pathPoints.length; p++) {
            var pt = pathItem.pathPoints[p];
            pts.push({
                a: [pt.anchor[0] - cx, cy - pt.anchor[1]],
                i: [pt.leftDirection[0] - pt.anchor[0], pt.anchor[1] - pt.leftDirection[1]],
                o: [pt.rightDirection[0] - pt.anchor[0], pt.anchor[1] - pt.rightDirection[1]]
            });
        }
        return { pts: pts, closed: pathItem.closed };
    }

    // Extrai path ABSOLUTO para o GRAD FIXER (usa artboard como origem)
    function getPathAbs(pathItem, abLeft, abTop) {
        if (!pathItem || !pathItem.pathPoints || pathItem.pathPoints.length < 2) return null;
        var pts = [];
        for (var p = 0; p < pathItem.pathPoints.length; p++) {
            var pt = pathItem.pathPoints[p];
            pts.push({
                a: [pt.anchor[0] - abLeft, abTop - pt.anchor[1]],
                i: [pt.leftDirection[0] - pt.anchor[0], -(pt.leftDirection[1] - pt.anchor[1])],
                o: [pt.rightDirection[0] - pt.anchor[0], -(pt.rightDirection[1] - pt.anchor[1])]
            });
        }
        return { pts: pts, closed: pathItem.closed };
    }

    function isNum(v) { return typeof v === 'number' && !isNaN(v) && isFinite(v); }

    // Extrai numero de uma fonte ExtendScript como "({a:0, b:-1920, tx:540})"
    function parseNumFromSrc(src, key) {
        var idx = src.indexOf('"' + key + '":');
        if (idx < 0) idx = src.indexOf(key + ':');
        if (idx < 0) return NaN;
        var start = idx + key.length + 1;
        while (start < src.length && (src[start] === ' ' || src[start] === '"' || src[start] === ':')) start++;
        var end = start;
        while (end < src.length && (src[end] === '-' || src[end] === '.' || (src[end] >= '0' && src[end] <= '9'))) end++;
        return parseFloat(src.substring(start, end));
    }

    function processGradientFill(fc, item, pathsToProcess, results, abLeft, abTop, parentID, itemOpacity, cx, cy, aeX, aeY, clipParentMaskID) {
        var grad = fc.gradient;

        // METODO 1: fc.matrix via .toSource() (parsing confiavel no ExtendScript)
        // Propriedades diretas m.a, m.tx retornam undefined nessa versao do AI.
        // .toSource() serializa o objeto como string JS: "({a:0, b:-1920, tx:540, ty:1920})"
        // Interpretacao: matriz 2D afim que mapeia [0,0] â†’ inicio do gradiente, [1,0] â†’ fim
        //   inicio (em AI): [matrix.tx, matrix.ty]
        //   fim    (em AI): [matrix.a + matrix.tx, matrix.b + matrix.ty]
        var ox, oy, ex, ey;
        var usedMatrix = false;
        var matSrc = "";
        try {
            var m = fc.matrix;
            // Tenta acesso direto primeiro (algumas versoes funcionam)
            var ma = m.a, mb = m.b, mtx = m.tx, mty = m.ty;
            if (!isNum(ma) || !isNum(mb) || !isNum(mtx) || !isNum(mty)) {
                // Fallback: serializa via toSource() e parseia a string
                try { matSrc = m.toSource(); } catch (e2) { }
                if (matSrc.length > 5) {
                    ma = parseNumFromSrc(matSrc, "a");
                    mb = parseNumFromSrc(matSrc, "b");
                    mtx = parseNumFromSrc(matSrc, "tx");
                    mty = parseNumFromSrc(matSrc, "ty");
                }
            }
            if (isNum(ma) && isNum(mb) && isNum(mtx) && isNum(mty)) {
                ox = mtx - abLeft;
                oy = abTop - mty;
                ex = (ma + mtx) - abLeft;
                ey = abTop - (mb + mty);
                usedMatrix = true;
            }
        } catch (e) { }

        // METODO 2: fc.origin + fc.angle + fc.length (funciona perfeitamente para gradientes do painel)
        var ox1 = 0, oy1 = 0, ex1 = 100, ey1 = 0;
        var panelAngle = 0;
        var shapeRotation = 0;
        try { shapeRotation = item.rotation || 0; } catch(eRot) {}
        try {
            panelAngle = fc.angle || 0;
            // ANGULO EFETIVO no AE (world space) = angulo_painel - rotacao_shape
            // Exemplo: shape rotated 90Â°, local gradient 0Â° (horizontal)
            //   effective = 0Â° - 90Â° = -90Â° â†’ VERTICAL topâ†’bottom âœ“
            // Exemplo: shape rotated 0Â°, panel gradient -90Â°
            //   effective = -90Â° - 0Â° = -90Â° â†’ VERTICAL topâ†’bottom âœ“
            var effectiveAngle = panelAngle - shapeRotation;
            ox1 = fc.origin[0] - abLeft;
            oy1 = abTop - fc.origin[1];
            var rad1 = effectiveAngle * Math.PI / 180.0;
            ex1 = ox1 + fc.length * Math.cos(rad1);
            ey1 = oy1 - fc.length * Math.sin(rad1);
        } catch (e) { }
        if (!usedMatrix) { ox = ox1; oy = oy1; ex = ex1; ey = ey1; }

        // GARANTIA FINAL: nunca NaN no JSON
        if (!isNum(ox)) ox = ox1; if (!isNum(oy)) oy = oy1;
        if (!isNum(ex)) ex = ex1; if (!isNum(ey)) ey = ey1;
        if (!isNum(ox)) ox = 0; if (!isNum(oy)) oy = 0;
        if (!isNum(ex)) ex = 100; if (!isNum(ey)) ey = 0;

        // effectiveAngle para o C++ usar no center+angle (imune ao offset de artboard)
        var effectiveForExport = panelAngle - shapeRotation;

        var stops = [];
        for (var g = 0; g < grad.gradientStops.length; g++) {
            var gs = grad.gradientStops[g];
            var rgb = colorToRGB(gs.color);
            var opac = 100; try { opac = gs.opacity; } catch(e){}
            if (rgb) stops.push({ pos: gs.rampPoint / 100, mid: gs.midPoint / 100, r: rgb[0], g: rgb[1], b: rgb[2], opacity: opac / 100 });
        }
        var allPaths = [];
        for (var pi = 0; pi < pathsToProcess.length; pi++) {
            var relPath = getPathData(pathsToProcess[pi], cx, cy);
            if (relPath) allPaths.push(relPath);
        }
        if (allPaths.length === 0) {
            // FALLBACK: Se nenhum sub-path tinha pontos suficientes,
            // usa o bounding-box do item como rectangle path de emergência.
            // Isso garante que o shape aparece no JSON e no AE.
            try {
                var fb = item.geometricBounds; // [left, top, right, bottom]
                var fbW = Math.abs(fb[2] - fb[0]);
                var fbH = Math.abs(fb[1] - fb[3]);
                var hW = fbW / 2, hH = fbH / 2;
                allPaths.push({
                    pts: [
                        { a: [-hW, -hH], i: [0, 0], o: [0, 0] },
                        { a: [ hW, -hH], i: [0, 0], o: [0, 0] },
                        { a: [ hW,  hH], i: [0, 0], o: [0, 0] },
                        { a: [-hW,  hH], i: [0, 0], o: [0, 0] }
                    ],
                    closed: true
                });
            } catch (eFb) { return; } // truly unrecoverable
        }
        
        // Convert to relative coordinate space (centered on the shape)
        var relOx = ox - aeX;
        var relOy = oy - aeY;
        var relEx = ex - aeX;
        var relEy = ey - aeY;
        
        // --- SAFEGUARD FALLBACK FOR FLAWED MATRICES ---
        // Se a origem do gradiente estiver incrivelmente fora da Ã¡rea (Matrix de grupos no Illustrator pode causar isso)
        // forÃ§amos o ponto inicial e final baseado no centro da bounding box + a extensÃ£o dela
        var b = item.geometricBounds;
        var bWidth = Math.abs(b[2] - b[0]);
        var bHeight = Math.abs(b[3] - b[1]);
        var limit = Math.max(bWidth, bHeight) * 1.5;
        if (Math.abs(relOx) > limit || Math.abs(relOy) > limit || isNaN(relOx)) {
            var gAngleRad = effectiveForExport * Math.PI / 180.0;
            var gRadius = Math.max(bWidth, bHeight) / 2;
            relOx = -Math.cos(gAngleRad) * gRadius;
            relOy = Math.sin(gAngleRad) * gRadius;
            relEx = Math.cos(gAngleRad) * gRadius;
            relEy = -Math.sin(gAngleRad) * gRadius;
        }

        var isClipping = false;
        try { if (item.clipping) isClipping = true; } catch(e){}
        try { if (!isClipping && item.typename === "CompoundPathItem" && item.pathItems && item.pathItems.length > 0 && item.pathItems[0].clipping) isClipping = true; } catch(e){}

        // ALWAYS generate a unique _idx name regardless of item.name, to prevent
        // collisions when the gradient path shares a name with its parent group (ex: "Bush").
        // item.name (origName) is stored separately for display after C++ injection.
        var gradBase = item.name || (parentID ? parentID.split("_idx")[0] : "grad");
        var finalName = gradBase + "_grad_idx" + idCounter + "x" + globalSessionID;
        var gradOrigName = item.name || (parentID ? parentID.split("_idx")[0] + "_grad" : "grad");
        idCounter++;

        results.push({
            name: finalName,
            origName: gradOrigName,
            fillType: "gradient",
            opacity: itemOpacity,
            x: aeX, y: aeY,
            parent: parentID, _dbgAngle: panelAngle, _dbgRotation: shapeRotation, _dbgEffective: effectiveForExport,
            gradient: { angle: effectiveForExport, startX: relOx, startY: relOy, endX: relEx, endY: relEy, stops: stops },
            paths: allPaths,
            isClipping: isClipping,
            clipMaskRef: (clipParentMaskID && !isClipping) ? clipParentMaskID : null
        });
    }




    // Coleta items individualmente (aprofundando grupos)
    var jsonStr = "";
    var idCounter = 1;
    var globalSessionID = new Date().getTime().toString().substr(-5);
    // collectAll is shortcut with no clipParentMaskID
    function collectAll(item, results, abLeft, abTop, parentID, parentOpacity) {
        collectAllWithClip(item, results, abLeft, abTop, parentID, parentOpacity, null);
    }
    function collectAllWithClip(item, results, abLeft, abTop, parentID, itemOpacity, clipParentMaskID) {
        if (!item) return;
        try { if (item.hidden) return; } catch(e){} // IGNORE HIDDEN ITEMS
        try { if (item.layer && !item.layer.visible) return; } catch(e){} // IGNORE HIDDEN LAYERS

        var t = item.typename;
        try { if (item.hidden) return; } catch (e) { }

        // MODO TODOS: Filtra intensamente itens fora da prancheta ativa!
        if (!modoSelecao) {
            try {
                var ib = item.geometricBounds; // [left, top, right, bottom]
                // Se o item estiver COMPLETA MENTE fora dos limites do artboard ativo, ignore-o!
                // abRect: [left(0), top(1), right(2), bottom(3)]
                if (ib[2] < abRect[0] || ib[0] > abRect[2] || ib[3] > abRect[1] || ib[1] < abRect[3]) {
                    return; // fora da prancheta
                }
            } catch(e){}
        }

        var itemOpacity = 100;
        try { itemOpacity = Math.round(item.opacity * 100) / 100; } catch (e) { } // Capture local exact opacity

        var bm = 1; // 1 = Normal
        try { 
            var bstr = item.blendingMode.toString();
            if (bstr.indexOf("MULTIPLY") > -1) bm = 2;
            else if (bstr.indexOf("SCREEN") > -1) bm = 3;
            else if (bstr.indexOf("OVERLAY") > -1) bm = 4;
            else if (bstr.indexOf("DARKEN") > -1) bm = 5;
            else if (bstr.indexOf("LIGHTEN") > -1) bm = 6;
            else if (bstr.indexOf("COLORDODGE") > -1) bm = 7;
            else if (bstr.indexOf("COLORBURN") > -1) bm = 8;
            else if (bstr.indexOf("HARDLIGHT") > -1) bm = 9;
            else if (bstr.indexOf("SOFTLIGHT") > -1) bm = 10;
            else if (bstr.indexOf("DIFFERENCE") > -1) bm = 11;
            else if (bstr.indexOf("EXCLUSION") > -1) bm = 12;
            else if (bstr.indexOf("HUE") > -1) bm = 13;
            else if (bstr.indexOf("SATURATION") > -1) bm = 14;
            else if (bstr.indexOf("COLOR") > -1 && bstr.indexOf("COLORDODGE") === -1 && bstr.indexOf("COLORBURN") === -1) bm = 15;
            else if (bstr.indexOf("LUMINOSITY") > -1) bm = 16;
        } catch(eBM) {}

        var currentID = (item.name || t) + "_idx" + idCounter + "x" + globalSessionID;
        var origItemName = item.name || "";
        idCounter++;

        if (t === "GroupItem") {
            var gX = 0, gY = 0, gW = 0, gH = 0;
            try {
                var b = item.geometricBounds;
                gX = ((b[0] + b[2]) / 2) - abLeft;
                gY = abTop - ((b[1] + b[3]) / 2);
                gW = b[2] - b[0];
                gH = b[1] - b[3];
            } catch(e) {}

            // Detect ClipGroup: scan ALL children for one with clipping===true.
            // Illustrator ClipGroups have exactly one item with clipping===true (the ellipse/path).
            var clipMaskID = null;
            try {
                if (item.pageItems.length > 1) {
                    for (var ci = 0; ci < item.pageItems.length; ci++) {
                        var childItem = item.pageItems[ci];
                        var childIsClip = false;
                        try { if (childItem.clipping) childIsClip = true; } catch(ec){}
                        // Also check CompoundPathItem with clipping first sub-path
                        try { if (!childIsClip && childItem.typename === "CompoundPathItem" && childItem.pathItems[0].clipping) childIsClip = true; } catch(ec){}
                        if (childIsClip) {
                            clipMaskID = currentID + "_clipmask";
                            break;
                        }
                    }
                }
            } catch(ecg){}

            // Use currentID (unique with _idx) as JSON name to prevent collisions.
            // origItemName is only for display (origName). childParentID = currentID so
            // children can find their parent unambiguously via finalLayerDict.
            results.push({
                fillType: "group",
                name: currentID,
                origName: item.name || "Grupo",
                parent: parentID,
                x: gX, y: gY,
                w: gW, h: gH,
                opacity: itemOpacity,
                blendMode: bm,
                clipMaskID: clipMaskID,
                clipMaskRef: (clipParentMaskID && !clipMaskID) ? clipParentMaskID : null
            });
            var effectiveClipID = clipMaskID || clipParentMaskID;
            // Pass currentID so children have a unique, unambiguous parent reference
            var childParentID = currentID;
            for (var i = 0; i < item.pageItems.length; i++)
                collectAllWithClip(item.pageItems[i], results, abLeft, abTop, childParentID, 100, effectiveClipID);
            return;
        }

        if (t === "TextFrame") {
            var txt = "";
            try { txt = item.contents; } catch(e){}
            if (!txt) return;
            
            var size = 50, font = "Arial", color = [1,1,1], just = 0, rot = 0;
            var aeX = 0, aeY = 0, isPoint = 0;
            try {
                if (item.kind && item.kind.toString().indexOf("POINT") > -1) isPoint = 1;
                var b = item.geometricBounds;
                aeX = ((b[0] + b[2]) / 2) - abLeft;
                aeY = abTop - ((b[1] + b[3]) / 2);
            } catch(e) {
                var b2 = item.geometricBounds;
                aeX = ((b2[0] + b2[2]) / 2) - abLeft;
                aeY = abTop - ((b2[1] + b2[3]) / 2);
            }

            try {
                if (item.matrix) {
                    rot = -Math.atan2(item.matrix.mValueB, item.matrix.mValueA) * 180.0 / Math.PI;
                }
                // Se for PointText, a matriz .matrix costuma falhar/omitir a rotaÃ§Ã£o no ExtendScript. 
                // Usamos a tÃ©cnica de conversÃ£o temporÃ¡ria para AreaText numa cÃ³pia para ler a matriz real.
                if (Math.abs(rot) < 0.1 && isPoint === 1) {
                    try {
                        var dup = item.duplicate();
                        dup.convertPointObjectToAreaObject();
                        if (dup.matrix) {
                            rot = -Math.atan2(dup.matrix.mValueB, dup.matrix.mValueA) * 180.0 / Math.PI;
                        }
                        dup.remove();
                    } catch(edup) {}
                }
            } catch(e) {}

            try {
                var attrs = item.textRange.characterAttributes;
                if (attrs.size) size = attrs.size;
                if (attrs.textFont) font = attrs.textFont.name;
                var rgb = colorToRGB(attrs.fillColor);
                if (rgb) color = rgb;
                var pAttrs = item.textRange.paragraphAttributes;
                if (pAttrs.justification) {
                    var jstr = pAttrs.justification.toString();
                    if (jstr.indexOf("CENTER") > -1) just = 1;
                    else if (jstr.indexOf("RIGHT") > -1) just = 2;
                }
            } catch(e){}
            
            results.push({
                fillType: "text",
                name: currentID,
                origName: item.name || txt.substring(0, 15),
                parent: parentID,
                text: txt,
                fontSize: size,
                fontName: font,
                color: color,
                justification: just,
                rotation: rot,
                kind: isPoint,
                x: aeX, y: aeY,
                opacity: itemOpacity,
                blendMode: bm
            });
            return;
        }

        var isClipping = false;
        try { if (item.clipping) isClipping = true; } catch (e) { }
        try { if (!isClipping && t === "CompoundPathItem" && item.pathItems && item.pathItems.length > 0 && item.pathItems[0].clipping) isClipping = true; } catch (e) { }

        var b = item.geometricBounds;
        var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
        var aeX = cx - abLeft, aeY = abTop - cy;

        // Lista de sub-paths a processar
        var pathsToProcess = (t === "CompoundPathItem") ? item.pathItems : [item];

        // â”€â”€ 1. Detecta e exporta GRADIENTE (sem try/catch que engole erro) â”€â”€
        var fillColor = null;
        if (t === "CompoundPathItem") {
            // Para CompoundPathItem, tenta no item e no primeiro pathItem
            try { fillColor = item.fillColor; } catch (e) { }
            if (!fillColor || fillColor.typename === "NoColor") {
                try { fillColor = item.pathItems[0].fillColor; } catch (e) { }
            }
        } else {
            try { fillColor = item.fillColor; } catch (e) { }
        }

        if (fillColor && fillColor.typename === "GradientColor") {
            processGradientFill(fillColor, item, pathsToProcess, results, abLeft, abTop, parentID, itemOpacity, cx, cy, aeX, aeY, clipParentMaskID);
            // Injetar blendMode nos gradientes processados (o Ãºltimo colocado no array)
            if (results.length > 0) results[results.length-1].blendMode = bm;
            return;
        }

        // â”€â”€ 2. Path relativo ao centro para solid/stroke â”€â”€
        var paths = [];
        for (var j = 0; j < pathsToProcess.length; j++) {
            var pd = getPathData(pathsToProcess[j], cx, cy);
            if (pd) paths.push(pd);
        }
        if (paths.length === 0) return;

        // If we are inside a ClipGroup:
        //   - the clipper itself  => give it the shared clipMaskID as its name
        //   - any sibling        => record which mask to apply
        var clipMaskRef = null;
        if (clipParentMaskID) {
            if (isClipping) {
                currentID = clipParentMaskID; // mask layer gets the unique shared ID
            } else {
                clipMaskRef = clipParentMaskID;
            }
        }

        var data = {
            name: currentID,
            x: aeX, y: aeY,
            paths: paths, fillType: "solid", parent: parentID, opacity: itemOpacity,
            blendMode: bm,
            isClipping: isClipping,
            clipMaskRef: clipMaskRef
        };

        // Fill
        var hasFill = false;
        if (fillColor && fillColor.typename !== "NoColor") {
            var rgb = colorToRGB(fillColor);
            if (rgb) { data.fill = { type: "solid", color: rgb }; data.fillType = "solid"; hasFill = true; }
        }
        // Stroke
        var hasStroke = false;
        try {
            if (item.stroked && item.strokeColor && item.strokeColor.typename !== "NoColor") {
                var srgb = colorToRGB(item.strokeColor);
                if (srgb) {
                    data.stroke = { type: "solid", color: srgb, strokeWidth: item.strokeWidth || 1 };
                    try { data.stroke.strokeCap = (item.strokeCap === StrokeCap.ROUND ? 2 : (item.strokeCap === StrokeCap.PROJECTING ? 3 : 1)); } catch (e) { }
                    try { data.stroke.strokeJoin = (item.strokeJoin === StrokeJoin.ROUND ? 2 : (item.strokeJoin === StrokeJoin.BEVEL ? 3 : 1)); } catch (e) { }
                    hasStroke = true;
                    if (!hasFill) data.fillType = "stroke";
                }
            }
        } catch (e) { }
        
        if (isClipping) {
            // Em caso de Clipping Mask puros sem cor, forÃ§amos um preenchimento 
            // no After Effects para que o usuÃ¡rio veja a Ã¡rea para Alpha Matte
            if (!hasFill && !hasStroke) {
                data.fill = { type: "solid", color: [0.4, 0.4, 0.4] }; 
                data.fillType = "solid"; 
                hasFill = true;
            }
        }
        
        if (!hasFill && !hasStroke && !isClipping) return; // Skip if invisible AND not a clipping mask
        results.push(data);
    }

    // â”€â”€ MAIN â”€â”€
    var doc; try { doc = app.activeDocument; } catch (e) { alert("Abra um documento!"); return; }
    var aiPathStr = ""; try { aiPathStr = doc.fullName.fsName.replace(/\\/g, "/"); } catch (e) { }
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()], abRect = ab.artboardRect;
    var abLeft = abRect[0], abTop = abRect[1], abW = abRect[2] - abRect[0], abH = abTop - abRect[3];

    var shapesData = [];

    // â”€â”€ MODO SELEÃ‡ÃƒO ou TODOS â”€â”€
    var modoSelecao = false;
    try {
        var sel = doc.selection;
        if (sel && sel.length > 0) modoSelecao = true;
    } catch (e) { }

    if (modoSelecao) {
        // Remover duplicatas de selecoes profundas (Illustrator retorna Grupo e Filhos juntos)
        var topLevelSel = [];
        for (var s = 0; s < doc.selection.length; s++) {
            var item = doc.selection[s];
            var parentInSelection = false;
            var par = item.parent;
            while (par && par.typename !== "Document" && par.typename !== "Layer") {
                for (var js = 0; js < doc.selection.length; js++) {
                    // Cuidado: comparacao direta as vezes falha no DOM, usar UUID ou try bounds se possivel,
                    // mas em JSX padrao (==) funciona bem para objetos do mesmo doc.
                    if (doc.selection[js] == par) { parentInSelection = true; break; }
                }
                if (parentInSelection) break;
                par = par.parent;
            }
            if (!parentInSelection) topLevelSel.push(item);
        }

        for (var s2 = 0; s2 < topLevelSel.length; s2++) {
            collectAllWithClip(topLevelSel[s2], shapesData, abLeft, abTop, null, 100, null);
        }
    } else {
        // Mapear mÃ¡scaras de recorte no nÃ­vel de Layer
        var layerClipMap = {};
        for (var L = 0; L < doc.layers.length; L++) {
            var lyr = doc.layers[L];
            try {
                if (lyr.pageItems && lyr.pageItems.length > 1) {
                    for (var ci = 0; ci < lyr.pageItems.length; ci++) {
                        var childItem = lyr.pageItems[ci];
                        var childIsClip = false;
                        try { if (childItem.clipping) childIsClip = true; } catch(ec){}
                        try { if (!childIsClip && childItem.typename === "CompoundPathItem" && childItem.pathItems[0].clipping) childIsClip = true; } catch(ec){}
                        if (childIsClip) {
                            layerClipMap[lyr.name] = lyr.name + "_layer_clipmask";
                            break;
                        }
                    }
                }
            } catch(e) {}
        }

        // CRITICO: doc.pageItems retorna TODOS os items incluindo aninhados!
        // Filtrar apenas os filhos diretos de cada Layer:
        for (var s = 0; s < doc.pageItems.length; s++) {
            var topItem = doc.pageItems[s];
            try {
                if (topItem.parent && topItem.parent.typename === "Layer") {
                    var cMask = layerClipMap[topItem.parent.name] || null;
                    collectAllWithClip(topItem, shapesData, abLeft, abTop, null, 100, cMask);
                }
            } catch (e) { }
        }
    }

    var uniqueData = [];
    var seenSig = {};
    for (var i = 0; i < shapesData.length; i++) {
        var sd = shapesData[i];
        var sig = "";
        if (sd.fillType === "text") {
            sig = "txt:" + sd.text + ":" + sd.x.toFixed(2) + ":" + sd.y.toFixed(2) + ":" + sd.fontSize;
        } else if (sd.fillType === "group") {
            uniqueData.push(sd);
            continue;
        } else {
            var pCount = sd.paths ? sd.paths.length : (sd.path ? 1 : 0);
            var totalPts = 0;
            if (sd.paths) { for (var _p=0; _p<sd.paths.length; _p++) totalPts += (sd.paths[_p] && sd.paths[_p].pts) ? sd.paths[_p].pts.length : 0; }
            else if (sd.path && sd.path.pts) totalPts = sd.path.pts.length;
            
            var colSig = "none";
            if (sd.fillType === "solid" && sd.color) colSig = "s:" + sd.color[0].toFixed(2) + "," + sd.color[1].toFixed(2);
            else if (sd.fillType === "gradient" && sd.gradient) colSig = "g:" + sd.gradient.startX.toFixed(2) + "," + sd.gradient.startY.toFixed(2);
            else if (sd.fillType === "stroke" && sd.stroke && sd.stroke.color) colSig = "str:" + sd.stroke.color[0].toFixed(2);
            
            // Bypass deduplication entirely for diagnostic
            sig = "vec:" + sd.x.toFixed(2) + ":" + sd.y.toFixed(2) + ":p" + pCount + ":pts" + totalPts + ":" + colSig + "_idx" + i;
        }
        
        // Aplica desduplicação somentes para textos (já que vetores possuem o bypass `_idx`)
        if (sd.fillType === "text" && seenSig[sig]) {
            continue;
        }
        
        seenSig[sig] = true;
        uniqueData.push(sd);
    }
    shapesData = uniqueData;

    var nGrad = 0, nSolid = 0, nStroke = 0;
    for (var k = 0; k < shapesData.length; k++) {
        if (shapesData[k].fillType === "gradient") nGrad++;
        else if (shapesData[k].fillType === "stroke") nStroke++;
        else nSolid++;
    }

    // â”€â”€ Escreve JSON â”€â”€
    function wr(f, s) { f.writeln(s); }
    function wPt(f, pt, isLast) {
        wr(f, '          {"a":[' + toFixed(pt.a[0]) + ',' + toFixed(pt.a[1]) + '],"i":[' + toFixed(pt.i[0]) + ',' + toFixed(pt.i[1]) + '],"o":[' + toFixed(pt.o[0]) + ',' + toFixed(pt.o[1]) + ']}' + (isLast ? '' : ','));
    }
    function wColor(arr) { return '[' + toFixed(arr[0]) + ',' + toFixed(arr[1]) + ',' + toFixed(arr[2]) + ']'; }

    var jf = new File("C:/AEGP/grad_data.json"); jf.open("w");
    wr(jf, "{");
    wr(jf, '  "artboard": { "w":' + toFixed(abW) + ', "h":' + toFixed(abH) + ' },');
    wr(jf, '  "aiPath": "' + aiPathStr + '",');
    wr(jf, '  "shapes": [');
    for (var k2 = 0; k2 < shapesData.length; k2++) {
        var sd = shapesData[k2];
        wr(jf, '    {');
        wr(jf, '      "name": "' + sd.name.replace(/"/g, "'").replace(/[\r\n]/g, " ") + '" ,');
        wr(jf, '      "fillType": "' + sd.fillType + '",');
        if (sd.parent) wr(jf, '      "parent": "' + sd.parent.replace(/"/g, "'").replace(/[\r\n]/g, " ") + '",');
        var opact = (sd.opacity !== undefined) ? sd.opacity : 100;
        wr(jf, '      "opacity":' + toFixed(opact) + ',');
        var blMode = (sd.blendMode !== undefined) ? sd.blendMode : 1;
        wr(jf, '      "blendMode":' + blMode + ',');
        wr(jf, '      "x":' + toFixed(sd.x) + ', "y":' + toFixed(sd.y) + ',');

        if (sd.fillType === "group") {
            wr(jf, '      "origName": "' + (sd.origName||"").replace(/"/g, "'").replace(/[\r\n]/g, " ") + '",');
            wr(jf, '      "w": ' + toFixed(sd.w) + ',');
            wr(jf, '      "h": ' + toFixed(sd.h));
            if (sd.clipMaskRef) wr(jf, '      ,"clipMaskRef": "' + sd.clipMaskRef.replace(/"/g, "'").replace(/[\r\n]/g, " ") + '"');
        } else if (sd.fillType === "text") {
            var estr = (sd.text||"").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            wr(jf, '      "text": "' + estr + '",');
            wr(jf, '      "origName": "' + (sd.origName||"").replace(/"/g, "'").replace(/[\r\n]/g, " ") + '",');
            wr(jf, '      "fontSize": ' + sd.fontSize + ',');
            wr(jf, '      "fontName": "' + sd.fontName + '",');
            wr(jf, '      "color": [' + toFixed(sd.color[0]) + ',' + toFixed(sd.color[1]) + ',' + toFixed(sd.color[2]) + '],');
            wr(jf, '      "rotation": ' + toFixed(sd.rotation || 0) + ',');
            wr(jf, '      "kind": ' + (sd.kind || 0) + ',');
            wr(jf, '      "justification": ' + sd.justification + '');
        } else if (sd.fillType === "gradient") {
            // Formato legado (GRAD FIXER usa este â€” nao alterar!)
            wr(jf, '      "gradient": { "startX":' + toFixed(sd.gradient.startX) + ', "startY":' + toFixed(sd.gradient.startY) + ',');
            wr(jf, '        "endX":' + toFixed(sd.gradient.endX) + ', "endY":' + toFixed(sd.gradient.endY) + ',');
            wr(jf, '        "stops": [');
            var ss = sd.gradient.stops;
            for (var g = 0; g < ss.length; g++) { var st = ss[g]; wr(jf, '          {"pos":' + st.pos + ',"mid":' + st.mid + ',"r":' + st.r + ',"g":' + st.g + ',"b":' + st.b + ',"opacity":' + (st.opacity !== undefined ? st.opacity : 1) + '}' + (g < ss.length - 1 ? ',' : '')); }
            wr(jf, '        ] },');
            // Multiple paths (supports compound gradients)
            wr(jf, '      "paths": [');
            var pArr = sd.paths || [ sd.path ]; // fallback
            var validPaths = [];
            for(var vp = 0; vp < pArr.length; vp++) { if(pArr[vp]) validPaths.push(pArr[vp]); }
            for (var pi3 = 0; pi3 < validPaths.length; pi3++) {
                var pth = validPaths[pi3];
                wr(jf, '        {"closed":' + (pth.closed ? 'true' : 'false') + ',"pts":[');
                for (var pp3 = 0; pp3 < pth.pts.length; pp3++) wPt(jf, pth.pts[pp3], pp3 === pth.pts.length - 1);
                wr(jf, '        ]}' + (pi3 < validPaths.length - 1 ? ',' : ''));
            }
            wr(jf, '      ]');
            if (sd.clipMaskRef) wr(jf, '      ,\"clipMaskRef\": \"' + sd.clipMaskRef.replace(/\"/g, "'").replace(/[\r\n]/g, " ") + '\"');
        } else {
            // Solid/Stroke/Clipping: fill e stroke separados
            if (sd.isClipping) wr(jf, '      "isClipping": true,');
            if (sd.clipMaskRef) wr(jf, '      "clipMaskRef": "' + sd.clipMaskRef.replace(/"/g, "'").replace(/[\r\n]/g, " ") + '",');
            if (sd.fill) wr(jf, '      "fill": {"type":"solid","color":' + wColor(sd.fill.color) + '},');
            if (sd.stroke) wr(jf, '      "stroke": {"type":"solid","color":' + wColor(sd.stroke.color) + ',"strokeWidth":' + toFixed(sd.stroke.strokeWidth || 1) + '},');
            // paths: formato overlord [{pts:[...], closed:bool}]
            wr(jf, '      "paths": [');
            var pArr = sd.paths || [];
            var validPaths = [];
            for(var vp = 0; vp < pArr.length; vp++) { if(pArr[vp]) validPaths.push(pArr[vp]); }
            for (var pi3 = 0; pi3 < validPaths.length; pi3++) {
                var pth = validPaths[pi3];
                wr(jf, '        {"closed":' + (pth.closed ? 'true' : 'false') + ',"pts":[');
                for (var pp3 = 0; pp3 < pth.pts.length; pp3++) wPt(jf, pth.pts[pp3], pp3 === pth.pts.length - 1);
                wr(jf, '        ]}' + (pi3 < validPaths.length - 1 ? ',' : ''));
            }
            wr(jf, '      ]');
        }
        wr(jf, '    }' + (k2 < shapesData.length - 1 ? ',' : ''));
    }
    wr(jf, '  ]'); wr(jf, "}"); jf.close();

    // Info de debug sobre gradientes
    var gradInfo = "";
    for (var k3 = 0; k3 < shapesData.length; k3++) {
        var sd3 = shapesData[k3];
        if (sd3.fillType === "gradient") {
            var gr = sd3.gradient;
            var eff = sd3._dbgEffective !== undefined ? sd3._dbgEffective : gr.angle;
            gradInfo += "\n  [" + sd3.name + "]:";
            gradInfo += " panel=" + Math.round(sd3._dbgAngle) + "Â°";
            gradInfo += " rot=" + Math.round(sd3._dbgRotation || 0) + "Â°";
            gradInfo += " eff=" + Math.round(eff) + "Â° (world AE)";
            gradInfo += "\n    start=(" + Math.round(gr.startX) + "," + Math.round(gr.startY) + ")";
            gradInfo += " end=(" + Math.round(gr.endX) + "," + Math.round(gr.endY) + ")";
        }

    }

    var summary = "EXTRAIDO! (v12 - Auto-Bridge)\n" +
        (modoSelecao ? "MODO: Somente selecionados (" + doc.selection.length + " item(s))" :
            "MODO: Documento completo") + "\n" +
        "Artboard: " + Math.round(abW) + "x" + Math.round(abH) + "\n" +
        "GRADIENTES: " + nGrad + " | SOLIDOS: " + nSolid + " | STROKES: " + nStroke + "\n" +
        "Total: " + shapesData.length + " shapes" +
        (gradInfo ? "\n\nDiagnÃ³stico Gradientes:" + gradInfo : "");

    // â”€â”€ ENVIAR PARA O AFTER EFFECTS VIA BRIDGETALK â”€â”€
    if (BridgeTalk.isRunning("aftereffects")) {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var req = "";

        if ($.flashFillMode === "group") {
            req += "var fgPaths = [\n";
            req += "  Folder.userData.fsName + '/Adobe/CEP/extensions/GradFixer/SplitGroup.jsx',\n";
            req += "  Folder.myDocuments.fsName + '/SDKAFTERGRADIENTE/SplitGroup.jsx'\n";
            req += "];\n";
            req += "var fgFound = false;\n";
            req += "for(var j=0; j<fgPaths.length; j++) {\n";
            req += "  var fg=new File(fgPaths[j]);\n";
            req += "  if(fg.exists){ fg.open('r'); eval(fg.read()); fg.close(); fgFound=true; break; }\n";
            req += "}\n";
            req += "if(!fgFound){ alert('SplitGroup.jsx nao encontrado nos caminhos padroes!'); }\n";
            
            if (nGrad > 0) {
                // Use char codes to bypass ALL parsing and quote issues in Illustrator -> AE BridgeTalk transit!
                req += "var str = String.fromCharCode(";
                var s = "var gc=app.findMenuCommandId('GRAD FIXER: Aplicar Gradientes');if(gc>0){app.executeCommand(gc);}try{var cp=app.project.activeItem;if(cp){for(var k=1;k<=cp.numLayers;k++){var lr=cp.layer(k);if(lr.name==='Vetores'){var rt=lr.property('ADBE Root Vectors Group');var _strp=function(c){for(var i=1;i<=c.numProperties;i++){var _p=c.property(i);if(_p.matchName==='ADBE Vector Group'){var nm=_p.name;var ox=nm.indexOf('_idx');if(ox!==-1){_p.name=nm.substring(0,ox);}try{_strp(_p.property('ADBE Vectors Group'));}catch(e){}}}};_strp(rt);break;}}}}catch(e){}";
                var hex = []; for(var i=0; i<s.length; i++) hex.push(s.charCodeAt(i));
                req += hex.join(",") + ");\n";
                req += "app.scheduleTask(str, 150, false);\n";
            }
        } else {
            // Modo Split Layer (padrao): envia SplitLayer
            req += "var paths = [\n";
            req += "  Folder.userData.fsName + '/Adobe/CEP/extensions/GradFixer/SplitLayer.jsx',\n";
            req += "  Folder.myDocuments.fsName + '/SDKAFTERGRADIENTE/SplitLayer.jsx',\n";
            req += "  'C:/AEGP/SplitLayer.jsx'\n";
            req += "];\n";
            req += "var fileFound = false;\n";
            req += "for(var i=0; i<paths.length; i++) {\n";
            req += "  var f=new File(paths[i]);\n";
            req += "  if(f.exists){ f.open('r'); eval(f.read()); f.close(); fileFound=true; break; }\n";
            req += "}\n";
            req += "if(!fileFound){ alert('SplitLayer.jsx nao encontrado nos caminhos padroes!'); }\n";

            if (nGrad > 0) {
                req += "var gCmd = app.findMenuCommandId('GRAD FIXER: Aplicar Gradientes');\n";
                req += "if (gCmd > 0) { app.executeCommand(gCmd); } else { alert('Plugin GRAD FIXER nao encontrado no menu do AE!'); }\n";
                // DIAGNOSTIC: write debug log to C:\AEGP\grad_debug.txt
                req += "try{\n";
                req += "  var _dbgAc = app.project.activeItem;\n";
                req += "  var _dbgLog = '=== GRAD DEBUG ===\\n';\n";
                req += "  _dbgLog += 'AEPX_0: ' + (new File('C:/AEGP/ae_batch_temp_0.aepx').exists ? 'SIM' : 'NAO') + '\\n';\n";
                req += "  _dbgLog += 'AEPX_1: ' + (new File('C:/AEGP/ae_batch_temp_1.aepx').exists ? 'SIM' : 'NAO') + '\\n';\n";
                req += "  if(_dbgAc instanceof CompItem){\n";
                req += "    _dbgLog += 'Layers (' + _dbgAc.numLayers + '):\\n';\n";
                req += "    for(var _di=1;_di<=_dbgAc.numLayers;_di++){\n";
                req += "      var _dl = _dbgAc.layer(_di);\n";
                req += "      var _hasGFill = false;\n";
                req += "      try{ var _dr = _dl.property('ADBE Root Vectors Group');\n";
                req += "        for(var _dj=1;_dj<=_dr.numProperties;_dj++){\n";
                req += "          if(_dr.property(_dj).matchName==='ADBE Vector Group'){\n";
                req += "            var _dc=_dr.property(_dj).property('ADBE Vectors Group');\n";
                req += "            for(var _dk=1;_dk<=_dc.numProperties;_dk++){\n";
                req += "              if(_dc.property(_dk).matchName==='ADBE Vector Graphic - G-Fill'){_hasGFill=true;break;}\n";
                req += "            } if(_hasGFill)break;\n";
                req += "          }\n";
                req += "        }\n";
                req += "      }catch(e){}\n";
                req += "      _dbgLog += '[' + _di + '] ' + _dl.name + ' | comment=' + (_dl.comment||'') + ' | G-Fill=' + _hasGFill + '\\n';\n";
                req += "    }\n";
                req += "  }\n";
                req += "  var _dbgF = new File('C:/AEGP/grad_debug.txt');\n";
                req += "  _dbgF.open('w'); _dbgF.write(_dbgLog); _dbgF.close();\n";
                req += "}catch(eDbg){}\n";
                // Recuperacao forcada de Track Mattes para layers de gradiente (Bypass do plugin C++ antigo)
                req += "var _ac = app.project.activeItem;\n";
                req += "if(_ac instanceof CompItem){\n";
                for (var rj=0; rj<shapesData.length; rj++) {
                    if (shapesData[rj].fillType === "gradient" && shapesData[rj].clipMaskRef) {
                        req += "  try{ _ac.layer('" + shapesData[rj].name + "').setTrackMatte(_ac.layer('" + shapesData[rj].clipMaskRef + "'), 14354 /*TrackMatteType.ALPHA*/); }catch(e){}\n";
                    }
                }
                req += "}\n";
                // Cleanup 1: rename layer names with _idx (SplitLayer mode)
                req += "if(_ac instanceof CompItem){\n";
                req += "  for(var _ci=1;_ci<=_ac.numLayers;_ci++){\n";
                req += "    var _cn=_ac.layer(_ci).name;\n";
                req += "    var _idxPos=_cn.indexOf('_idx');\n";
                req += "    if(_idxPos>0){ try{_ac.layer(_ci).name=_cn.slice(0,_idxPos);}catch(e){} }\n";
                req += "  }\n";
                req += "}\n";
                // Cleanup code moved to scheduled task.
            }
        }

        bt.body = req;
        bt.send();
        $.flashFillMode = ""; // Reseta a flag apos enviar
    } else {
        alert("O After Effects precisa estar aberto para importar automaticamente!\nAbra o AE e rode o SplitLayer manualmente.");
    }
})();
