// ExtrairGradiente.jsx v11 — Gradientes confiáveis + closed flag + strokes
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

    function processGradientFill(fc, item, pathsToProcess, results, abLeft, abTop, parentID, itemOpacity) {
        var grad = fc.gradient;

        // METODO 1: fc.matrix via .toSource() (parsing confiavel no ExtendScript)
        // Propriedades diretas m.a, m.tx retornam undefined nessa versao do AI.
        // .toSource() serializa o objeto como string JS: "({a:0, b:-1920, tx:540, ty:1920})"
        // Interpretacao: matriz 2D afim que mapeia [0,0] → inicio do gradiente, [1,0] → fim
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
            // Exemplo: shape rotated 90°, local gradient 0° (horizontal)
            //   effective = 0° - 90° = -90° → VERTICAL top→bottom ✓
            // Exemplo: shape rotated 0°, panel gradient -90°
            //   effective = -90° - 0° = -90° → VERTICAL top→bottom ✓
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
            if (rgb) stops.push({ pos: gs.rampPoint / 100, mid: gs.midPoint / 100, r: rgb[0], g: rgb[1], b: rgb[2] });
        }
        var absPath = getPathAbs(pathsToProcess[0], abLeft, abTop);
        if (!absPath) return;
        results.push({
            name: item.name || ("grad_" + results.length),
            fillType: "gradient",
            opacity: itemOpacity,
            parent: parentID, _dbgAngle: panelAngle, _dbgRotation: shapeRotation, _dbgEffective: effectiveForExport,
            // angle = effectiveAngle (world space) para C++ usar no gradByAngle()
            gradient: { angle: effectiveForExport, startX: ox, startY: oy, endX: ex, endY: ey, stops: stops },
            path: absPath
        });
    }




    // Coleta items individualmente (aprofundando grupos)
    var idCounter = 1;
    function collectAll(item, results, abLeft, abTop, parentID, parentOpacity) {
        if (parentOpacity === undefined) parentOpacity = 100;
        var t = item.typename;
        try { if (item.hidden) return; } catch (e) { }

        var itemOpacity = 100;
        try { itemOpacity = item.opacity; } catch (e) { }
        var finalOpacity = (parentOpacity / 100.0) * itemOpacity;

        var currentID = (item.name || t) + "_idx" + idCounter;
        idCounter++;

        if (t === "GroupItem") {
            results.push({
                fillType: "group",
                name: currentID,
                origName: item.name || "Grupo",
                parent: parentID
            });
            for (var i = 0; i < item.pageItems.length; i++)
                collectAll(item.pageItems[i], results, abLeft, abTop, currentID, finalOpacity);
            return;
        }

        if (t !== "PathItem" && t !== "CompoundPathItem") return;

        try { if (t === "PathItem" && item.clipping) return; } catch (e) { }

        var b = item.geometricBounds;
        var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
        var aeX = cx - abLeft, aeY = abTop - cy;

        // Lista de sub-paths a processar
        var pathsToProcess = (t === "CompoundPathItem") ? item.pathItems : [item];

        // ── 1. Detecta e exporta GRADIENTE (sem try/catch que engole erro) ──
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
            processGradientFill(fillColor, item, pathsToProcess, results, abLeft, abTop, parentID, finalOpacity);
            return;  // Gradiente processado, nao duplica como solid
        }

        // ── 2. Path relativo ao centro para solid/stroke ──
        var paths = [];
        for (var j = 0; j < pathsToProcess.length; j++) {
            var pd = getPathData(pathsToProcess[j], cx, cy);
            if (pd) paths.push(pd);
        }
        if (paths.length === 0) return;

        var data = {
            name: item.name || ((t === "CompoundPathItem") ? "comp_" : "path_") + results.length,
            x: aeX, y: aeY, paths: paths, fillType: "solid", parent: parentID, opacity: finalOpacity
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

        if (!hasFill && !hasStroke) return;
        results.push(data);
    }

    // ── MAIN ──
    var doc; try { doc = app.activeDocument; } catch (e) { alert("Abra um documento!"); return; }
    var aiPathStr = ""; try { aiPathStr = doc.fullName.fsName.replace(/\\/g, "/"); } catch (e) { }
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()], abRect = ab.artboardRect;
    var abLeft = abRect[0], abTop = abRect[1], abW = abRect[2] - abRect[0], abH = abTop - abRect[3];

    var shapesData = [];

    // ── MODO SELEÇÃO ou TODOS ──
    // Se tiver algo selecionado no Illustrator → processa só a seleção
    // Se nada selecionado → processa TODOS os items top-level do documento
    var modoSelecao = false;
    try {
        var sel = doc.selection;
        if (sel && sel.length > 0) modoSelecao = true;
    } catch (e) { }

    if (modoSelecao) {
        // Processa só os items selecionados (como overlord-lite faz)
        for (var s = 0; s < doc.selection.length; s++) {
            collectAll(doc.selection[s], shapesData, abLeft, abTop, null, 100);
        }
    } else {
        // CRITICO: doc.pageItems retorna TODOS os items incluindo aninhados!
        // Filtrar apenas os filhos diretos de cada Layer:
        for (var s = 0; s < doc.pageItems.length; s++) {
            var topItem = doc.pageItems[s];
            try {
                if (topItem.parent && topItem.parent.typename === "Layer") {
                    collectAll(topItem, shapesData, abLeft, abTop, null, 100);
                }
            } catch (e) { }
        }
    }

    var nGrad = 0, nSolid = 0, nStroke = 0;
    for (var k = 0; k < shapesData.length; k++) {
        if (shapesData[k].fillType === "gradient") nGrad++;
        else if (shapesData[k].fillType === "stroke") nStroke++;
        else nSolid++;
    }

    // ── Escreve JSON ──
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
        wr(jf, '      "name": "' + sd.name.replace(/"/g, "'") + '" ,');
        wr(jf, '      "fillType": "' + sd.fillType + '",');
        if (sd.parent) wr(jf, '      "parent": "' + sd.parent + '",');
        var opact = (sd.opacity !== undefined) ? sd.opacity : 100;
        wr(jf, '      "opacity":' + toFixed(opact) + ',');
        wr(jf, '      "x":' + toFixed(sd.x) + ', "y":' + toFixed(sd.y) + ',');

                if (sd.fillType === "group") {
            if (sd.parent) wr(jf, '      "parent": "' + sd.parent + '",');
            wr(jf, '      "origName": "' + (sd.origName||"").replace(/"/g, "'") + '"');
        } else if (sd.fillType === "gradient") {
            // Formato legado (GRAD FIXER usa este — nao alterar!)
            wr(jf, '      "gradient": { "startX":' + toFixed(sd.gradient.startX) + ', "startY":' + toFixed(sd.gradient.startY) + ',');
            wr(jf, '        "endX":' + toFixed(sd.gradient.endX) + ', "endY":' + toFixed(sd.gradient.endY) + ',');
            wr(jf, '        "stops": [');
            var ss = sd.gradient.stops;
            for (var g = 0; g < ss.length; g++) { var st = ss[g]; wr(jf, '          {"pos":' + st.pos + ',"mid":' + st.mid + ',"r":' + st.r + ',"g":' + st.g + ',"b":' + st.b + '}' + (g < ss.length - 1 ? ',' : '')); }
            wr(jf, '        ] },');
            // Path unico (formato {pts:[...], closed:bool})
            wr(jf, '      "path": {');
            wr(jf, '        "closed":' + (sd.path.closed ? 'true' : 'false') + ',"pts":[');
            var gPts = sd.path.pts;
            for (var pp = 0; pp < gPts.length; pp++) wPt(jf, gPts[pp], pp === gPts.length - 1);
            wr(jf, '        ]');
            wr(jf, '      }');
        } else {
            // Solid/Stroke: fill e stroke separados
            if (sd.fill) wr(jf, '      "fill": {"type":"solid","color":' + wColor(sd.fill.color) + '},');
            if (sd.stroke) wr(jf, '      "stroke": {"type":"solid","color":' + wColor(sd.stroke.color) + ',"strokeWidth":' + toFixed(sd.stroke.strokeWidth || 1) + '},');
            // paths: formato overlord [{pts:[...], closed:bool}]
            wr(jf, '      "paths": [');
            var pArr = sd.paths || [];
            for (var pi3 = 0; pi3 < pArr.length; pi3++) {
                var pth = pArr[pi3];
                wr(jf, '        {"closed":' + (pth.closed ? 'true' : 'false') + ',"pts":[');
                for (var pp3 = 0; pp3 < pth.pts.length; pp3++) wPt(jf, pth.pts[pp3], pp3 === pth.pts.length - 1);
                wr(jf, '        ]}' + (pi3 < pArr.length - 1 ? ',' : ''));
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
            gradInfo += " panel=" + Math.round(sd3._dbgAngle) + "°";
            gradInfo += " rot=" + Math.round(sd3._dbgRotation || 0) + "°";
            gradInfo += " eff=" + Math.round(eff) + "° (world AE)";
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
        (gradInfo ? "\n\nDiagnóstico Gradientes:" + gradInfo : "");

    // ── ENVIAR PARA O AFTER EFFECTS VIA BRIDGETALK ──
    if (BridgeTalk.isRunning("aftereffects")) {
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        
        var req = "app.beginUndoGroup('Importar e Aplicar Gradientes');\n";
        req += "var f = new File('C:/AEGP/SimularOverlord.jsx');\n";
        req += "if(f.exists){ f.open('r'); eval(f.read()); f.close(); } else { alert('SimularOverlord.jsx nao encontrado em C:/AEGP/'); }\n";
        
        // Em seguida, chama o C++ para processar gradientes se existirem
        if (nGrad > 0) {
            req += "var gCmd = app.findMenuCommandId('GRAD FIXER: Aplicar Gradientes');\n";
            req += "if (gCmd > 0) { app.executeCommand(gCmd); } else { alert('Plugin GRAD FIXER nao encontrado no menu do AE!'); }\n";
        }
        req += "app.endUndoGroup();\n";
        
        bt.body = req;
        bt.send();
    } else {
        alert(summary + "\n\nO After Effects precisa estar aberto para importar automaticamente!\nAbra o AE e rode o SimularOverlord manualmente.");
    }
})();
