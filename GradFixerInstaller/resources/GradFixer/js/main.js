var csInterface = new CSInterface();
var appName = csInterface.hostEnvironment.appName;
var statusNode = document.getElementById('status-console');

// Groups section only makes sense in After Effects
var groupsHeader = document.getElementById('groups-header');
var groupsBody   = document.getElementById('groups-body');
if (appName !== "AEFT") {
    if (groupsHeader) groupsHeader.style.display = 'none';
    if (groupsBody)   groupsBody.style.display   = 'none';
}


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
        statusNode.innerText = 'ExportaÃƒÂ§ÃƒÂ£o cancelada.';
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
        statusNode.innerText = 'ExportaÃƒÂ§ÃƒÂ£o cancelada.';
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
                statusNode.innerText = 'CÃƒÂ³pia cancelada.';
            } else {
                statusNode.innerText = result;
            }
            setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
        });
    } else if (appName === "AEFT") {
        csInterface.evalScript('aeTriggerIlstCommand("runRasterize(' + scaleVal + ')")', function(result) {
            if (result === "true") {
                statusNode.innerText = 'Comando de RasterizaÃƒÂ§ÃƒÂ£o enviado.';
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
                statusNode.innerText = 'CÃƒÂ³pia cancelada.';
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

// --- EXTENSION LICENSE CHECK (hybrid: offline local + periodic online) ---

var SUPABASE_URL  = "https://rudhtwriohqmrwnkfkdq.supabase.co/rest/v1/rpc/validate_license_online";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGh0d3Jpb2hxbXJ3bmtma2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTUxODMsImV4cCI6MjA5NDI3MTE4M30.iPaY--LfmkR5KOWkTPWFFR1D2T2ZoZH49jRCQguGz_g";

function showLockedUI(reason) {
    document.body.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:15px;background:#2b2b2b;">' +
        '<img src="./img/extensao.png" style="width:48px;margin-bottom:15px;" />' +
        '<h3 style="color:#fff;font-size:14px;font-weight:normal;margin-bottom:10px;">FlashFill Locked</h3>' +
        '<p style="color:#aaa;font-size:11px;">Ative a sua licen\u00e7a no aplicativo FlashFill Setup.</p>' +
        (reason ? '<p style="color:#ff5555;font-size:9px;margin-top:10px;">' + reason + '</p>' : '') +
        '</div>';
    var poll = setInterval(function() {
        var check = window.cep.fs.readFile("C:\\AEGP\\license.json");
        if (check.err === 0) { clearInterval(poll); window.location.reload(); }
    }, 3000);
}

function parseMacFromGetmac(raw) {
    if (!raw) return null;
    var match = raw.match(/([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}/);
    if (!match) return null;
    return match[0].replace(/-/g, ':').toUpperCase();
}

function needsOnlineRecheck() {
    var r = window.cep.fs.readFile("C:\\AEGP\\license_check.json");
    if (r.err !== 0 || !r.data) return true;
    try {
        var d = JSON.parse(r.data);
        var days = (Date.now() - (d.last_check || 0)) / 86400000;
        return days >= 7;
    } catch(e) { return true; }
}

function saveOnlineCheck() {
    window.cep.fs.writeFile(
        "C:\\AEGP\\license_check.json",
        JSON.stringify({ last_check: Date.now() }),
        false
    );
}

function validateLicense() {
    // 1. Read local JSON â€” only to get p_key and stored hardware_id
    var fileResult = window.cep.fs.readFile("C:\\AEGP\\license.json");
    if (fileResult.err !== 0 || !fileResult.data) {
        showLockedUI(null);
        return;
    }
    var data;
    try { data = JSON.parse(fileResult.data); } catch(e) {
        showLockedUI("Arquivo de licen\u00e7a inv\u00e1lido.");
        return;
    }
    var cachedKey = data && data.p_key;
    var storedMac = data && data.p_hardware_id;
    if (!cachedKey || !storedMac) {
        showLockedUI("Arquivo de licen\u00e7a incompleto. Reative no FlashFill Setup.");
        return;
    }

    // 2. Get REAL MAC from OS via ExtendScript â€” cannot be faked by editing files
    csInterface.evalScript('$.system("getmac /fo csv /nh")', function(raw) {
        var realMac = parseMacFromGetmac(raw);

        if (!realMac) {
            // Very rare â€” ExtendScript unavailable. Allow but log.
            console.warn("FlashFill: getmac unavailable, skipping hardware check.");
            return;
        }

        // 3. LOCAL check (works fully OFFLINE)
        //    Real MAC of THIS machine must match what server stored at activation
        //    Copying the JSON to another machine: realMac !== storedMac â†’ BLOCKED
        if (realMac !== storedMac) {
            showLockedUI("Esta licen\u00e7a n\u00e3o pertence a este computador.");
            return;
        }

        // LOCAL CHECK PASSED â€” extension is unlocked and works fully offline

        // 4. Periodic ONLINE recheck (every 7 days, background â€” non-blocking)
        //    Only locks if server EXPLICITLY says revoked
        //    If offline/timeout/error â†’ silently allow (local check already passed)
        if (needsOnlineRecheck()) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", SUPABASE_URL, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("apikey", SUPABASE_ANON);
            xhr.setRequestHeader("Authorization", "Bearer " + SUPABASE_ANON);
            xhr.timeout = 8000;
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) return;
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var resp = JSON.parse(xhr.responseText);
                        if (resp.valid === true) {
                            saveOnlineCheck(); // Reset 7-day timer
                        } else if (resp.valid === false) {
                            // Server explicitly revoked (e.g. admin cancelled) â†’ lock
                            showLockedUI("Licen\u00e7a revogada: " + (resp.reason || "Contate o suporte."));
                        }
                    } catch(e) { /* parse error â†’ ignore, local check passed */ }
                }
                // Any other status (offline, 5xx) â†’ silently allow
            };
            xhr.onerror = xhr.ontimeout = function() { /* offline â†’ allow */ };
            xhr.send(JSON.stringify({ p_key: cachedKey, p_hardware_id: realMac }));
        }
    });
}

// Run validation on panel load
validateLicense();

// â”€â”€ GROUPS: Precomp & Decomp â”€â”€
// Both operations target After Effects regardless of host
window._flashfill_precomp = function() {
    var statusNode = document.getElementById('status-console');
    statusNode.innerText = 'Precomping...';
    csInterface.evalScript('runPrecomp()', function(result) {
        statusNode.innerText = result === 'true' ? 'Precomp executado no AE.' : result;
        setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
    });
};

window._flashfill_decomp = function() {
    var statusNode = document.getElementById('status-console');
    statusNode.innerText = 'Decompondo...';
    csInterface.evalScript('runDecomp()', function(result) {
        statusNode.innerText = result === 'true' ? 'Decomp executado no AE.' : result;
        setTimeout(function() { statusNode.innerText = 'Pronto.'; }, 4000);
    });
};


window._flashfill_toggle = function() {
    console.log("[FlashFill] Triggering Toggle Groups via CSInterface...");
    if (csInterface) {
        csInterface.evalScript("runToggle()", function(res) {
            console.log("Toggle returned:", res);
        });
    } else {
        console.warn("CSInterface not found (Toggle)");
    }
};
