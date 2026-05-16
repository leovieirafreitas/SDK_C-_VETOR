const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;

// ─── i18n Dictionary ────────────────────────────────────────────────────────
const i18n = {
  pt: {
    nav_setup: "Setup",
    nav_status: "Status",
    nav_about: "Sobre",
    nav_license: "Chave",
    setup_title: "Instalação do FlashFill",
    setup_desc: "Configure e instale todos os componentes necessários para o FlashFill funcionar.",
    admin_warn: "O app não está rodando como Administrador. O plugin não poderá ser instalado.",
    admin_btn: "Reiniciar como Admin →",
    comp_core_title: "FlashFill Core Framework",
    comp_core_desc: "Componentes base do sistema e templates essenciais",
    status_verifying: "Verificando...",
    comp_ext_title: "Adobe Illustrator Extension",
    comp_ext_desc: "Painel nativo para extração de vetores e gradientes",
    comp_plugin_title: "Adobe After Effects Plugin",
    comp_plugin_desc: "Integração nativa para reconstrução de gradientes",
    status_detecting: "Detectando versões...",
    btn_install: "Instalar Tudo",
    status_installing: "Instalando...",
    status_title: "Status da Instalação",
    status_desc: "Verifique o estado de cada componente do FlashFill no seu sistema.",
    status_placeholder: "Clique em 'Verificar novamente' para escanear o sistema.",
    btn_verify: "Verificar novamente",
    btn_deactivate: "Desativar Licença",
    license_title: "Licença FlashFill",
    license_desc: "Insira a sua chave de licença para desbloquear o sistema.",
    license_active: "Licença Ativa",
    license_key_label: "Chave de Licença",
    email_label: "Email",
    not_available: "(não disponível)",
    about_title: "Sobre o FlashFill",
    about_desc: "Pipeline de exportação vetorial do Illustrator para o After Effects com suporte a gradientes lineares, radiais, opacidade e compound paths.",
    feat_1: "Exportação de gradientes lineares e radiais com suporte a mais de 11 cores",
    feat_2: "Envio super rápido: centenas de vetores transferidos para o After Effects em menos de 10 segundos",
    feat_3: "Split Group e Split Layer com herança de opacidade",
    feat_4: "Compound paths com winding rule correta",
    feat_5: "Pipeline BridgeTalk assíncrono (não trava o Illustrator)",
    developed_by: "Desenvolvido por",
    right_desc: "Instale todos os componentes para começar a exportar vetores do Illustrator para o After Effects.",
    check_admin: "Permissão admin",
    check_core: "Core Framework",
    check_ai: "Illustrator Extension",
    check_ae: "After Effects Plugin",
    btn_check_update: "Verificar Atualizações",
    update_uptodate: "Você já possui a versão mais recente.",
    update_error: "Erro ao verificar atualizações.",
    
    // Dynamic texts
    t_core_ok: "Framework base verificado.",
    t_not_inst: 'Não instalado — clique em "Instalar Tudo".',
    t_ext_ok: "Extensão instalada no Illustrator.",
    t_no_ae: "Nenhuma versão do After Effects encontrada.",
    t_badge: "instalado",
    t_start: "▶ Iniciando instalação...",
    t_inst_core: "Instalando framework...",
    t_done: "Instalação concluída!",
    t_fin: "✓ Processo finalizado.",
    t_err: "Erro na instalação.",
    t_check: "Verificando...",
    t_yes: "Sim",
    t_no: "Não",
    t_ok: "OK",
    t_not_f: "Não encontrada",
    t_inst: "Instalado(a)",
    t_not_inst2: "Não instalado(a)",
    t_det: "After Effects detectado(s):"
  },
  en: {
    nav_setup: "Setup",
    nav_status: "Status",
    nav_about: "About",
    nav_license: "License",
    setup_title: "FlashFill Installation",
    setup_desc: "Configure and install all required components for FlashFill to work.",
    admin_warn: "App is not running as Administrator. The plugin cannot be installed.",
    admin_btn: "Relaunch as Admin →",
    comp_core_title: "FlashFill Core Framework",
    comp_core_desc: "Core system components and essential templates",
    status_verifying: "Verifying...",
    comp_ext_title: "Adobe Illustrator Extension",
    comp_ext_desc: "Native panel for vector and gradient extraction",
    comp_plugin_title: "Adobe After Effects Plugin",
    comp_plugin_desc: "Native integration for gradient reconstruction",
    status_detecting: "Detecting versions...",
    btn_install: "Install All",
    status_installing: "Installing...",
    status_title: "Installation Status",
    status_desc: "Check the state of each FlashFill component on your system.",
    status_placeholder: "Click 'Verify again' to scan the system.",
    btn_verify: "Verify again",
    btn_deactivate: "Deactivate License",
    license_title: "FlashFill License",
    license_desc: "Enter your license key to unlock the system.",
    license_active: "License Active",
    license_key_label: "License Key",
    email_label: "Email",
    not_available: "(not available)",
    about_title: "About FlashFill",
    about_desc: "Vector export pipeline from Illustrator to After Effects supporting linear, radial gradients, opacity, and compound paths.",
    feat_1: "Export linear and radial gradients with support for more than 11 colors",
    feat_2: "Super fast transfer: hundreds of vectors sent to After Effects in under 10 seconds",
    feat_3: "Split Group and Split Layer with opacity inheritance",
    feat_4: "Compound paths with correct winding rule",
    feat_5: "Asynchronous BridgeTalk pipeline (does not freeze Illustrator)",
    developed_by: "Developed by",
    right_desc: "Install all components to start exporting vectors from Illustrator to After Effects.",
    check_admin: "Admin permission",
    check_core: "Core Framework",
    check_ai: "Illustrator Extension",
    check_ae: "After Effects Plugin",
    btn_check_update: "Check for Updates",
    update_uptodate: "You already have the latest version.",
    update_error: "Error checking for updates.",

    t_core_ok: "Core framework verified.",
    t_not_inst: 'Not installed — click "Install All".',
    t_ext_ok: "Extension installed in Illustrator.",
    t_no_ae: "No After Effects version found.",
    t_badge: "installed",
    t_start: "▶ Starting installation...",
    t_inst_core: "Installing framework...",
    t_done: "Installation complete!",
    t_fin: "✓ Process finished.",
    t_err: "Installation error.",
    t_check: "Verifying...",
    t_yes: "Yes",
    t_no: "No",
    t_ok: "OK",
    t_not_f: "Not found",
    t_inst: "Installed",
    t_not_inst2: "Not installed",
    t_det: "After Effects detected:"
  }
};

let currentLang = 'pt';
function applyLanguage() {
  const dict = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  if(currentStatus) applyStatus(currentStatus);
}

// ─── Window controls ────────────────────────────────────────────────────────
const appWindow = getCurrentWindow();
document.getElementById('btn-minimize').addEventListener('click', () => appWindow.minimize());
document.getElementById('btn-close').addEventListener('click', () => appWindow.close());

document.getElementById('lang-toggle').addEventListener('click', () => {
  currentLang = currentLang === 'pt' ? 'en' : 'pt';
  applyLanguage();
});

// ─── Navigation ─────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const pageId = 'page-' + btn.dataset.page;
    document.getElementById(pageId).classList.add('active');
  });
});

// ─── State ──────────────────────────────────────────────────────────────────
let currentStatus = null;

// ─── Helpers ────────────────────────────────────────────────────────────────
function setSpinner(id, show) {
  const s = document.getElementById('spinner-' + id);
  if (s) s.className = show ? 'spinner' : 'spinner hidden';
}

function setCompState(id, state) {
  const el = document.getElementById('comp-' + id + '-state');
  setSpinner(id, false);
  if (!el) return;
  const icons = { ok: '<span class="icon-done">✓</span>', fail: '<span class="icon-fail">✗</span>', loading: '<div class="spinner"></div>', idle: '' };
  el.innerHTML = icons[state] || '';
}

function setChecklistItem(id, state) {
  const el = document.getElementById('check-' + id);
  if (!el) return;
  const icon = el.querySelector('.check-icon');
  const icons = { ok: '✓', fail: '✗', warn: '!', pending: '○' };
  icon.textContent = icons[state] || '○';
  icon.className = 'check-icon ' + state;
}

function appendInstallLog(text, type = 'info') {
  const log = document.getElementById('install-log');
  const line = document.createElement('div');
  line.className = 'log-line-' + type;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ─── Load status ─────────────────────────────────────────────────────────────
async function loadStatus() {
  try {
    const status = await invoke('check_status');
    currentStatus = status;
    applyStatus(status);
  } catch (e) {
    console.error('check_status error:', e);
  }
}

function applyStatus(status) {
  const dict = i18n[currentLang];
  
  // Admin
  const adminWarn = document.getElementById('admin-warning');
  if (status.is_admin) {
    adminWarn.style.display = 'none';
    setChecklistItem('admin', 'ok');
  } else {
    adminWarn.style.display = 'flex';
    setChecklistItem('admin', 'warn');
  }

  // Templates (Core Framework)
  const tOk = status.aegp_folder && status.templates_installed;
  setCompState('templates', tOk ? 'ok' : 'fail');
  setChecklistItem('templates', tOk ? 'ok' : 'fail');
  document.getElementById('templates-status-text').textContent = tOk ? dict.t_core_ok : dict.t_not_inst;

  // Extension
  const eOk = status.extension_installed;
  setCompState('ext', eOk ? 'ok' : 'fail');
  setChecklistItem('ext', eOk ? 'ok' : 'fail');
  document.getElementById('ext-status-text').textContent = eOk ? dict.t_ext_ok : dict.t_not_inst;

  // AE Versions
  const vList = document.getElementById('plugin-versions-list');
  vList.innerHTML = '';
  let anyPluginInstalled = false;
  if (status.ae_versions.length === 0) {
    vList.innerHTML = `<div class="status-text">${dict.t_no_ae}</div>`;
    setCompState('plugin', 'fail');
    setChecklistItem('plugin', 'fail');
  } else {
    status.ae_versions.forEach(ver => {
      if (ver.plugin_installed) anyPluginInstalled = true;
      const row = document.createElement('div');
      row.className = 'ae-version-row';
      row.innerHTML = `
        <input type="checkbox" id="chk-${ver.version}" value="${ver.version}" ${ver.plugin_installed ? '' : 'checked'}>
        <label for="chk-${ver.version}">After Effects ${ver.version}</label>
        ${ver.plugin_installed ? `<span class="installed-badge">${dict.t_badge}</span>` : ''}
      `;
      vList.appendChild(row);
    });
    setCompState('plugin', anyPluginInstalled ? 'ok' : 'fail');
    setChecklistItem('plugin', anyPluginInstalled ? 'ok' : 'fail');
  }
}

// ─── Relaunch as admin ───────────────────────────────────────────────────────
document.getElementById('btn-relaunch').addEventListener('click', async () => {
  await invoke('relaunch_as_admin').catch(console.error);
});

// ─── Install all ─────────────────────────────────────────────────────────────
document.getElementById('btn-install-all').addEventListener('click', async () => {
  const dict = i18n[currentLang];
  const btn = document.getElementById('btn-install-all');
  const progressDiv = document.getElementById('install-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const logEl = document.getElementById('install-log');

  btn.disabled = true;
  progressDiv.style.display = 'block';
  logEl.innerHTML = '';

  const checked = [...document.querySelectorAll('.ae-version-row input[type=checkbox]:checked')]
    .map(cb => cb.value);

  const steps = ['templates', 'ext', ...(checked.map(v => `plugin-${v}`))];
  let done = 0;

  const updateProgress = () => {
    done++;
    const pct = Math.round((done / (steps.length + 1)) * 100);
    progressFill.style.width = pct + '%';
    progressLabel.textContent = `${dict.t_inst_core} ${pct}%`;
  };

  setCompState('templates', 'loading');
  setCompState('ext', 'loading');
  setCompState('plugin', 'loading');

  appendInstallLog(dict.t_start, 'info');

  try {
    progressLabel.textContent = dict.t_inst_core;
    const results = await invoke('install_all', { aeVersions: checked });

    results.forEach(line => {
      updateProgress();
      const type = line.startsWith('✓') ? 'ok' : 'fail';
      // In a real app we'd localize the rust strings too, but we hide them or accept them.
      appendInstallLog(line, type);
    });

    progressFill.style.width = '100%';
    progressLabel.textContent = dict.t_done;
    appendInstallLog(dict.t_fin, 'ok');

    await loadStatus();
  } catch (e) {
    appendInstallLog(dict.t_err + ' ' + e, 'fail');
    progressLabel.textContent = dict.t_err;
  } finally {
    btn.disabled = false;
  }
});

// ─── Status page refresh ─────────────────────────────────────────────────────
document.getElementById('btn-refresh').addEventListener('click', async () => {
  const dict = i18n[currentLang];
  const logEl = document.getElementById('status-log');
  logEl.innerHTML = `<span class="log-info">${dict.t_check}</span>`;

  try {
    const status = await invoke('check_status');
    currentStatus = status;

    let html = '';
    html += `<div class="${status.is_admin ? 'log-ok' : 'log-fail'}">Admin: ${status.is_admin ? dict.t_yes : dict.t_no}</div>`;
    html += `<div class="${status.aegp_folder ? 'log-ok' : 'log-fail'}">Core: ${status.aegp_folder ? dict.t_ok : dict.t_not_f}</div>`;
    html += `<div class="${status.templates_installed ? 'log-ok' : 'log-fail'}">Templates: ${status.templates_installed ? dict.t_inst : dict.t_not_inst2}</div>`;
    html += `<div class="${status.extension_installed ? 'log-ok' : 'log-fail'}">Ext: ${status.extension_installed ? dict.t_inst : dict.t_not_inst2}</div>`;
    html += `<div class="log-info">${dict.t_det} ${status.ae_versions.length}</div>`;

    status.ae_versions.forEach(ver => {
      html += `<div class="${ver.plugin_installed ? 'log-ok' : 'log-fail'}">  → ${ver.name}: Plugin ${ver.plugin_installed ? dict.t_inst : dict.t_not_inst2}</div>`;
    });

    logEl.innerHTML = html;
    applyStatus(status);
  } catch (e) {
    logEl.innerHTML = `<span class="log-fail">${dict.t_err} ${e}</span>`;
  }
});

// ─── Init ────────────────────────────────────────────────────────────────────
applyLanguage();
loadStatus();

// ─── License Verification & Activation ────────────────────────────────────────

async function verifyLocalLicense() {
    try {
        // First: fast local check — does a license file even exist?
        const hasLocalFile = await invoke('check_license_local');
        const block = document.getElementById('activation-block');
        if (!hasLocalFile) {
            block.style.display = 'flex';
            return;
        }
        // Second: real online validation against the server
        // Editing the local JSON is useless because the server checks the real MAC
        const isValid = await invoke('check_license_online');
        if (!isValid) {
            block.style.display = 'flex';
        } else {
            block.style.display = 'none';
        }
    } catch (e) {
        console.error(e);
        // If there's no internet, we allow usage for now (offline grace)
        document.getElementById('activation-block').style.display = 'none';
    }
}
verifyLocalLicense();

document.getElementById('btn-overlay-activate').addEventListener('click', async () => {
    const input = document.getElementById('overlay-license-input');
    const msg = document.getElementById('overlay-activation-msg');
    const btn = document.getElementById('btn-overlay-activate');
    const key = input.value.trim();
    
    if (!key) return;
    
    btn.disabled = true;
    btn.innerText = "Verificando...";
    msg.style.color = '#94a3b8';
    msg.innerText = "Conectando ao servidor...";
    
    try {
        const message = await invoke('activate_license', { key: key });
        msg.style.color = '#22c55e';
        msg.innerText = "Ativado com sucesso!";
        setTimeout(() => {
            document.getElementById('activation-block').style.display = 'none';
            // Sincroniza também a aba interna de licença caso queiram ver
            document.getElementById('license-input').value = key;
        }, 1500);
    } catch (e) {
        msg.style.color = '#ef4444';
        msg.innerText = e;
    } finally {
        btn.disabled = false;
        btn.innerText = "Activate License";
    }
});

document.getElementById('btn-activate').addEventListener('click', async () => {
    const input = document.getElementById('license-input');
    const msg = document.getElementById('activation-msg');
    const btn = document.getElementById('btn-activate');
    const key = input.value.trim();
    
    if (!key) return;
    
    btn.disabled = true;
    btn.innerText = "Verificando...";
    msg.style.color = '#fff';
    msg.innerText = "Conectando ao servidor...";
    
    try {
        await invoke('activate_license', { key: key });
        input.value = "";
        // Switch to info view
        await showLicenseView();
    } catch (e) {
        msg.style.color = '#ef4444';
        msg.innerText = e;
        btn.disabled = false;
        btn.innerText = "Activate";
    }
});

document.getElementById('btn-deactivate').addEventListener('click', async () => {
    const msg = document.getElementById('activation-msg');
    try {
        await invoke('deactivate_license');
        // Switch back to activate view
        document.getElementById('license-info-view').style.display = 'none';
        document.getElementById('license-activate-view').style.display = 'flex';
        // Show overlay block again
        document.getElementById('activation-block').style.display = 'flex';
        document.getElementById('overlay-license-input').value = '';
        document.getElementById('overlay-activation-msg').innerText = '';
    } catch (e) {
        msg.style.color = '#ef4444';
        msg.innerText = e;
    }
});

async function showLicenseView() {
    try {
        const info = await invoke('get_license_info');
        const dict = i18n[currentLang];
        if (info) {
            // Show info card
            document.getElementById('license-activate-view').style.display = 'none';
            document.getElementById('license-info-view').style.display = 'flex';
            document.getElementById('info-license-key').textContent = info.p_key || '—';
            document.getElementById('info-email').textContent = info.email || dict.not_available;
        } else {
            // Show activation form
            document.getElementById('license-info-view').style.display = 'none';
            document.getElementById('license-activate-view').style.display = 'flex';
        }
        // Re-apply language so all data-i18n labels in the newly shown view update
        applyLanguage();
    } catch (e) {
        console.error('showLicenseView error:', e);
    }
}

// Run on load
showLicenseView();

// ─── Auto-Update Check ───────────────────────────────────────────────────────
const CURRENT_VERSION = "1.0.0"; // Versão atual do instalador

async function checkForUpdates(manual = false) {
    const msgEl = document.getElementById('update-status-msg');
    const btn = document.getElementById('btn-check-updates');
    
    if (manual) {
        if (btn) btn.disabled = true;
        if (msgEl) {
            msgEl.style.color = '#94a3b8';
            msgEl.innerText = currentLang === 'en' ? 'Checking server...' : 'Verificando servidor...';
        }
    }
    
    try {
        const response = await fetch("https://raw.githubusercontent.com/leovieirafreitas/FlashFill_Dashboard/main/public/version.json", {
            cache: 'no-store' // Para não pegar versão antiga do cache
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        // Compara versão simples (ex: 1.0.0 vs 1.0.1)
        if (data.version && data.version !== CURRENT_VERSION) {
            const banner = document.getElementById('update-banner');
            const bannerText = document.getElementById('update-banner-text');
            
            if (manual && msgEl) {
                msgEl.style.color = '#22c55e';
                msgEl.innerText = currentLang === 'en' ? 'Update found!' : 'Atualização encontrada!';
            }
            
            if (banner && bannerText) {
                bannerText.innerText = currentLang === 'en' 
                    ? `A new version (${data.version}) is available! Click to download.` 
                    : `Nova versão (${data.version}) disponível! Clique para baixar.`;
                    
                banner.style.display = 'flex';
                
                banner.addEventListener('click', async () => {
                    const url = data.download_url || "https://github.com/leovieirafreitas/FlashFill_Dashboard/tree/main/public";
                    try {
                        await invoke('plugin:opener|open', { path: url });
                    } catch(e) {
                        window.open(url, '_blank');
                    }
                });
            }
        } else {
            if (manual && msgEl) {
                msgEl.style.color = '#eab308';
                msgEl.innerText = i18n[currentLang].update_uptodate;
            }
        }
    } catch (e) {
        console.warn("Update check failed:", e);
        if (manual && msgEl) {
            msgEl.style.color = '#ef4444';
            msgEl.innerText = i18n[currentLang].update_error;
        }
    } finally {
        if (manual && btn) {
            setTimeout(() => { btn.disabled = false; }, 500);
        }
    }
}

// Ligar o botão manual
const btnCheckUpdate = document.getElementById('btn-check-updates');
if (btnCheckUpdate) {
    btnCheckUpdate.addEventListener('click', () => checkForUpdates(true));
}

// Verifica atualizações silenciosamente assim que o app carrega
setTimeout(() => checkForUpdates(false), 1500);
