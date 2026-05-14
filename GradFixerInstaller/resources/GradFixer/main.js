var csInterface = new CSInterface();
var appName = csInterface.hostEnvironment.appName;
var statusNode = document.getElementById('status-console');

// Change the extension logo based on the host application
var extLogo = document.getElementById('ext-logo');
if (extLogo) {
    if (appName === "AEFT") {
        extLogo.src = "./img/ai_logo.png";
        extLogo.title = "Import from Illustrator";
    } else {
        extLogo.src = "./img/extensao.png";
        extLogo.title = "Export to After Effects";
    }
}

document.getElementById('btn-comp').addEventListener('click', function() {
    statusNode.innerText = 'Creating Comp...';
    if (appName === "ILST") {
        csInterface.evalScript('runCriarComp()', function(result) {
            statusNode.innerText = result === "true" ? "Comp enviada para AE." : result;
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runCriarComp()")', function(result) {
            statusNode.innerText = result === "true" ? "Comando enviado ao Illustrator." : result;
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    }
});

function getResolvedExportPath() {
    var path = window.getExportPath ? window.getExportPath() : 'C:\\AEGP\\img_export';
    if (path === 'PROMPT') {
        var result = window.cep.fs.showOpenDialog(false, true, "Escolha a pasta para exportar as imagens", "C:\\", "");
        if (result.err === 0 && result.data.length > 0) {
            return result.data[0];
        }
        return null;
    }
    return path;
}

document.getElementById('btn-split').addEventListener('click', function() {
    var rawPath = getResolvedExportPath();
    if (!rawPath) {
        statusNode.innerText = 'Exportação cancelada.';
        setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        return;
    }
    var exportPath = rawPath.replace(/\\/g, '\\\\');
    
    statusNode.innerText = 'Processing Split Layer...';
    if (appName === "ILST") {
        csInterface.evalScript('runExtrairGradiente("' + exportPath + '")', function(result) {
            statusNode.innerText = result === "true" ? "Split executado." : result;
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runExtrairGradiente(\\\"' + exportPath + '\\\")'  + '")', function(result) {
            statusNode.innerText = result === "true" ? "Comando enviado ao Illustrator." : result;
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    }
});

document.getElementById('btn-group').addEventListener('click', function() {
    var rawPath = getResolvedExportPath();
    if (!rawPath) {
        statusNode.innerText = 'Exportação cancelada.';
        setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        return;
    }
    var exportPath = rawPath.replace(/\\/g, '\\\\');

    statusNode.innerText = 'Processing Split Group...';
    if (appName === "ILST") {
        csInterface.evalScript('runExtrairForSplitGroup("' + exportPath + '")', function(result) {
            statusNode.innerText = result === "true" ? "Split Group executado." : result;
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runExtrairForSplitGroup(\\\"' + exportPath + '\\\")'  + '")', function(result) {
            statusNode.innerText = result === "true" ? "Comando enviado ao Illustrator." : result;
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    }
});

document.getElementById('btn-rasterize').addEventListener('click', function() {
    var scaleNode = document.getElementById('export-scale');
    var scaleVal = scaleNode ? parseFloat(scaleNode.value) : 4.0;
    statusNode.innerText = 'Rasterizando imagem...';

    if (appName === "ILST") {
        csInterface.evalScript('runRasterize(' + scaleVal + ')', function(result) {
            if (result === "true") {
                statusNode.innerText = 'PNG enviado ao AE.';
            } else if (result === "Cancelado") {
                statusNode.innerText = 'Cópia cancelada.';
            } else {
                statusNode.innerText = result;
            }
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runRasterize(' + scaleVal + ')")', function(result) {
            if (result === "true") {
                statusNode.innerText = 'Comando de Rasterização enviado.';
            } else {
                statusNode.innerText = result;
            }
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    }
});

document.getElementById('btn-ai').addEventListener('click', function() {
    statusNode.innerText = 'Exportando .ai...';

    if (appName === "ILST") {
        csInterface.evalScript('runExportAI()', function(result) {
            if (result === "true") {
                statusNode.innerText = 'Arquivo(s) .ai enviado(s) ao AE.';
            } else if (result === "Cancelado") {
                statusNode.innerText = 'Cópia cancelada.';
            } else {
                statusNode.innerText = result;
            }
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runExportAI()")', function(result) {
            if (result === "true") {
                statusNode.innerText = 'Comando Import AI enviado.';
            } else {
                statusNode.innerText = result;
            }
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    }
});
