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
        statusNode.innerText = 'ExportaÃ§Ã£o cancelada.';
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
        statusNode.innerText = 'ExportaÃ§Ã£o cancelada.';
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
                statusNode.innerText = 'CÃ³pia cancelada.';
            } else {
                statusNode.innerText = result;
            }
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runRasterize(' + scaleVal + ')")', function(result) {
            if (result === "true") {
                statusNode.innerText = 'Comando de RasterizaÃ§Ã£o enviado.';
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
                statusNode.innerText = 'CÃ³pia cancelada.';
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



// --- EXTENSION LICENSE CHECK (online, server-side) ---
function getRealMacAddress() {
    try {
        var os = require('os');
        var interfaces = os.networkInterfaces();
        for (var name in interfaces) {
            var ifaces = interfaces[name];
            for (var i = 0; i < ifaces.length; i++) {
                var iface = ifaces[i];
                // Skip loopback and virtual adapters
                if (iface.mac && iface.mac !== '00:00:00:00:00:00' && !iface.internal) {
                    return iface.mac.toUpperCase();
                }
            }
        }
    } catch(e) {
        console.error("Failed to get MAC address:", e);
    }
    return null;
}

function showLockedUI(reason) {
    document.body.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 15px; background: #2b2b2b;">' +
        '<img src="./img/extensao.png" style="width: 48px; margin-bottom: 15px;" />' +
        '<h3 style="color: #fff; font-size: 14px; font-weight: normal; margin-bottom: 10px;">FlashFill Locked</h3>' +
        '<p style="color: #aaa; font-size: 11px;">Ative a sua licença no aplicativo FlashFill Setup.</p>' +
        (reason ? '<p style="color: #ff5555; font-size: 9px; margin-top: 10px;">' + reason + '</p>' : '') +
    '</div>';
    // Poll and reload if file appears (user just activated)
    var poll = setInterval(function() {
        var check = window.cep.fs.readFile("C:\\AEGP\\license.json");
        if (check.err === 0) {
            clearInterval(poll);
            window.location.reload();
        }
    }, 3000);
}

function validateLicenseOnline() {
    // Step 1: Read local license file (just to get the key - NOT trusted)
    var fileResult = window.cep.fs.readFile("C:\\AEGP\\license.json");
    if (fileResult.err !== 0 || !fileResult.data) {
        showLockedUI(null);
        return;
    }

    var data;
    try {
        data = JSON.parse(fileResult.data);
    } catch(e) {
        showLockedUI("Arquivo de licença inválido.");
        return;
    }

    var cachedKey = data && data.p_key;
    if (!cachedKey) {
        showLockedUI("Chave não encontrada no arquivo local.");
        return;
    }

    // Step 2: Get REAL MAC address from the OS (cannot be faked via JSON)
    var realMac = getRealMacAddress();
    if (!realMac) {
        // If we can't get MAC, allow offline usage (fail open)
        console.warn("FlashFill: Could not get MAC address, allowing offline usage.");
        return;
    }

    // Step 3: Validate against the server
    var url = "https://rudhtwriohqmrwnkfkdq.supabase.co/rest/v1/rpc/validate_license_online";
    var anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGh0d3Jpb2hxbXJ3bmtma2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTUxODMsImV4cCI6MjA5NDI3MTE4M30.iPaY--LfmkR5KOWkTPWFFR1D2T2ZoZH49jRCQguGz_g";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Authorization", "Bearer " + anonKey);

    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var resp = JSON.parse(xhr.responseText);
                if (!resp.valid) {
                    showLockedUI("Licença inválida: " + (resp.reason || "Hardware não autorizado."));
                }
                // If valid, do nothing — panel remains fully functional
            } catch(e) {
                console.warn("FlashFill: License parse error, allowing usage:", e);
            }
        } else {
            // Server error or no internet — allow usage (fail open)
            console.warn("FlashFill: License server unreachable (status " + xhr.status + "), allowing offline usage.");
        }
    };

    xhr.onerror = function() {
        // No internet — allow usage silently
        console.warn("FlashFill: No internet, allowing offline usage.");
    };

    xhr.send(JSON.stringify({
        p_key: cachedKey,
        p_hardware_id: realMac  // Real MAC from OS, not from the editable JSON file
    }));
}

// Run on panel load
validateLicenseOnline();

