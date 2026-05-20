use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

// ─── Data structures ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AeVersion {
    pub name: String,
    pub version: String,
    pub plugins_path: String,
    pub plugin_installed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstallStatus {
    pub aegp_folder: bool,
    pub templates_installed: bool,
    pub extension_installed: bool,
    pub ae_versions: Vec<AeVersion>,
    pub is_admin: bool,
}

// ─── Admin detection ─────────────────────────────────────────────────────────

#[cfg(windows)]
fn check_is_admin() -> bool {
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    unsafe {
        let mut token: HANDLE = HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION::default();
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
        if GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            size,
            &mut size,
        )
        .is_err()
        {
            return false;
        }
        elevation.TokenIsElevated != 0
    }
}

#[cfg(not(windows))]
fn check_is_admin() -> bool {
    false
}

// ─── AE version detection ────────────────────────────────────────────────────

fn detect_ae_versions() -> Vec<AeVersion> {
    let adobe_path = PathBuf::from(r"C:\Program Files\Adobe");
    let mut versions = Vec::new();

    if let Ok(entries) = fs::read_dir(&adobe_path) {
        let mut dirs: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        dirs.sort_by_key(|d| d.file_name());
        for entry in dirs {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("Adobe After Effects") {
                let plugins_path = entry
                    .path()
                    .join("Support Files")
                    .join("Plug-ins");
                let aex_path = plugins_path.join("GradientManipulator.aex");
                let ver_label = name.replace("Adobe After Effects ", "");
                versions.push(AeVersion {
                    name: name.clone(),
                    version: ver_label,
                    plugins_path: plugins_path.to_string_lossy().to_string(),
                    plugin_installed: aex_path.exists(),
                });
            }
        }
    }
    versions
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ft = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if ft.is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            fs::copy(entry.path(), &dst_path)?;
        }
    }
    Ok(())
}

fn get_extension_dir() -> Option<PathBuf> {
    std::env::var("APPDATA").ok().map(|p| PathBuf::from(p).join("Adobe").join("CEP").join("extensions"))
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
fn check_status() -> InstallStatus {
    let aegp_path = PathBuf::from(r"C:\AEGP");
    let template = aegp_path.join("grad_batch_template.aepx");
    let nested = aegp_path.join("nested_group_template.aepx");

    let ext_installed = get_extension_dir()
        .map(|p| p.join("GradFixer").join("CSXS").join("manifest.xml").exists())
        .unwrap_or(false);

    InstallStatus {
        aegp_folder: aegp_path.exists(),
        templates_installed: template.exists() && nested.exists(),
        extension_installed: ext_installed,
        ae_versions: detect_ae_versions(),
        is_admin: check_is_admin(),
    }
}

#[tauri::command]
fn install_templates(app: tauri::AppHandle) -> Result<String, String> {
    let aegp_dir = PathBuf::from(r"C:\AEGP");
    fs::create_dir_all(&aegp_dir).map_err(|e| format!("Falha ao criar C:\\AEGP: {e}"))?;
    fs::create_dir_all(aegp_dir.join("img_export"))
        .map_err(|e| format!("Falha ao criar img_export: {e}"))?;

    let res_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Resource dir error: {e}"))?
        .join("resources")
        .join("AEGP");

    let files = [
        "GradientManipulator.aex",
        "grad_batch_template.aepx",
        "grad_batch_template_1000.aepx",
        "nested_group_template.aepx",
        "nested_group_template_1000.aepx",
    ];

    for f in &files {
        let src = res_dir.join(f);
        let dst = aegp_dir.join(f);
        if src.exists() {
            fs::copy(&src, &dst).map_err(|e| format!("Erro ao copiar {f}: {e}"))?;
        } else {
            return Err(format!("Arquivo não encontrado no bundle: {f}"));
        }
    }

    Ok("Templates instalados com sucesso em C:\\AEGP!".into())
}

#[tauri::command]
fn install_plugin(app: tauri::AppHandle, ae_version: String) -> Result<String, String> {
    if !check_is_admin() {
        return Err("Precisa de permissão de administrador para instalar o plugin.".into());
    }

    let plugins_path = PathBuf::from(format!(
        r"C:\Program Files\Adobe\Adobe After Effects {ae_version}\Support Files\Plug-ins"
    ));

    if !plugins_path.exists() {
        return Err(format!(
            "Pasta de plugins não encontrada: {}",
            plugins_path.display()
        ));
    }

    let res_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Resource dir error: {e}"))?
        .join("resources")
        .join("AEGP");

    let src = res_dir.join("GradientManipulator.aex");
    let dst = plugins_path.join("GradientManipulator.aex");
    fs::copy(&src, &dst).map_err(|e| format!("Erro ao instalar plugin AE {ae_version}: {e}"))?;

    Ok(format!("Plugin instalado em After Effects {ae_version}!"))
}

#[tauri::command]
fn install_extension(app: tauri::AppHandle) -> Result<String, String> {
    let ext_root = get_extension_dir()
        .ok_or("Não foi possível encontrar AppData/Roaming".to_string())?;

    let dst = ext_root.join("GradFixer");
    let res_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Resource dir error: {e}"))?
        .join("resources")
        .join("GradFixer");

    if !res_dir.exists() {
        return Err("Pasta GradFixer não encontrada no bundle.".into());
    }

    copy_dir_all(&res_dir, &dst).map_err(|e| format!("Erro ao instalar extensão: {e}"))?;

    // Enable PlayerDebugMode so unsigned extensions can load in AE/AI
    #[cfg(windows)]
    {
        for csxs_version in 8..=18 {
            let key = format!("HKCU\\Software\\Adobe\\CSXS.{}", csxs_version);
            let _ = std::process::Command::new("reg.exe")
                .args(["add", &key, "/v", "PlayerDebugMode", "/t", "REG_SZ", "/d", "1", "/f"])
                .output();
        }
    }

    Ok("Extensão FlashFill instalada com sucesso!".into())
}

#[tauri::command]
fn install_all(app: tauri::AppHandle, ae_versions: Vec<String>) -> Result<Vec<String>, String> {
    let mut log = Vec::new();

    match install_templates(app.clone()) {
        Ok(msg) => log.push(format!("✓ {msg}")),
        Err(e) => log.push(format!("✗ Templates: {e}")),
    }

    match install_extension(app.clone()) {
        Ok(msg) => log.push(format!("✓ {msg}")),
        Err(e) => log.push(format!("✗ Extensão: {e}")),
    }

    for ver in ae_versions {
        match install_plugin(app.clone(), ver.clone()) {
            Ok(msg) => log.push(format!("✓ {msg}")),
            Err(e) => log.push(format!("✗ Plugin AE {ver}: {e}")),
        }
    }

    Ok(log)
}

#[tauri::command]
fn relaunch_as_admin() -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::ffi::CString;
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe.to_string_lossy().to_string();
        let verb = CString::new("runas").unwrap();
        let path = CString::new(exe_str).unwrap();
        unsafe {
            windows::Win32::UI::Shell::ShellExecuteA(
                windows::Win32::Foundation::HWND::default(),
                windows::core::PCSTR(verb.as_ptr() as *const u8),
                windows::core::PCSTR(path.as_ptr() as *const u8),
                windows::core::PCSTR::null(),
                windows::core::PCSTR::null(),
                windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
            );
        }
        std::process::exit(0);
    }
    #[cfg(not(windows))]
    Err("Só disponível no Windows".into())
}

#[tauri::command]
async fn activate_license(key: String) -> Result<String, String> {
    let mac = mac_address::get_mac_address()
        .map_err(|e| format!("Erro HWID: {}", e))?
        .map(|m| m.to_string())
        .unwrap_or_else(|| "00:00:00:00:00:00".to_string());
    
    let url = "https://rudhtwriohqmrwnkfkdq.supabase.co/rest/v1/rpc/activate_license";
    let anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGh0d3Jpb2hxbXJ3bmtma2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTUxODMsImV4cCI6MjA5NDI3MTE4M30.iPaY--LfmkR5KOWkTPWFFR1D2T2ZoZH49jRCQguGz_g";
    
    let client = reqwest::Client::new();
    let req_body = serde_json::json!({
        "p_key": key,
        "p_hardware_id": mac
    });
    
    let resp = client.post(url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de conexao: {}", e))?;
        
    if !resp.status().is_success() {
        return Err("Falha na validacao com servidor.".into());
    }
    
    let rpc_result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let success = rpc_result.get("success").and_then(|s| s.as_bool()).unwrap_or(false);
    let message = rpc_result.get("message").and_then(|m| m.as_str()).unwrap_or("Desconhecido").to_string();
    let email = rpc_result.get("email").and_then(|e| e.as_str()).unwrap_or("").to_string();
    
    if success {
        let _ = std::fs::create_dir_all(r"C:\AEGP");
        let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
        let license_data = serde_json::json!({
            "p_key": key,
            "p_hardware_id": mac,
            "email": email
        });
        let _ = std::fs::write(&license_path, serde_json::to_string(&license_data).unwrap());
        Ok(message)
    } else {
        Err(message)
    }
}

#[tauri::command]
async fn deactivate_license() -> Result<String, String> {
    let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
    let content = std::fs::read_to_string(&license_path).map_err(|_| "Licença não encontrada localmente.".to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|_| "Formato de licença inválido.".to_string())?;
    let key = json.get("p_key").and_then(|k| k.as_str()).unwrap_or("").to_string();

    let mac = mac_address::get_mac_address()
        .map_err(|e| format!("Erro HWID: {}", e))?
        .map(|m| m.to_string())
        .unwrap_or_else(|| "00:00:00:00:00:00".to_string());
    
    let url = "https://rudhtwriohqmrwnkfkdq.supabase.co/rest/v1/rpc/deactivate_license";
    let anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGh0d3Jpb2hxbXJ3bmtma2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTUxODMsImV4cCI6MjA5NDI3MTE4M30.iPaY--LfmkR5KOWkTPWFFR1D2T2ZoZH49jRCQguGz_g";
    
    let client = reqwest::Client::new();
    let req_body = serde_json::json!({
        "p_key": key,
        "p_hardware_id": mac
    });
    
    let resp = client.post(url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de conexao: {}", e))?;
        
    if !resp.status().is_success() {
        return Err("Falha ao comunicar com o servidor.".into());
    }
    
    let rpc_result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let success = rpc_result.get("success").and_then(|s| s.as_bool()).unwrap_or(false);
    let message = rpc_result.get("message").and_then(|m| m.as_str()).unwrap_or("Desconhecido").to_string();
    
    if success {
        let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
        let _ = std::fs::remove_file(license_path);
        Ok(message)
    } else {
        Err(message)
    }
}

#[tauri::command]
fn get_license_info() -> Option<serde_json::Value> {
    let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
    if let Ok(content) = std::fs::read_to_string(&license_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            let mac = mac_address::get_mac_address()
                .ok().flatten()
                .map(|m| m.to_string())
                .unwrap_or_else(|| "00:00:00:00:00:00".to_string());
            let saved_hwid = json.get("p_hardware_id").and_then(|h| h.as_str()).unwrap_or("");
            if saved_hwid == mac {
                return Some(json);
            }
        }
    }
    None
}

#[tauri::command]
async fn check_license_online() -> serde_json::Value {
    // Read the locally cached key (just the key, not trusted for validation)
    let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
    let content = match std::fs::read_to_string(&license_path) {
        Ok(c) => c,
        Err(_) => return serde_json::json!({ "valid": false, "reason": "Sem chave registrada localmente." }),
    };
    let json: serde_json::Value = match serde_json::from_str(&content) {
        Ok(j) => j,
        Err(_) => return serde_json::json!({ "valid": false, "reason": "Formato de licença local inválido." }),
    };
    let key = match json.get("p_key").and_then(|k| k.as_str()) {
        Some(k) => k.to_string(),
        None => return serde_json::json!({ "valid": false, "reason": "Chave não encontrada no arquivo local." }),
    };

    // Get real hardware ID from the machine (cannot be faked)
    let mac = mac_address::get_mac_address()
        .ok().flatten()
        .map(|m| m.to_string())
        .unwrap_or_else(|| "00:00:00:00:00:00".to_string());

    // Always validate against the server - no local trust
    let url = "https://rudhtwriohqmrwnkfkdq.supabase.co/rest/v1/rpc/validate_license_online";
    let anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGh0d3Jpb2hxbXJ3bmtma2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTUxODMsImV4cCI6MjA5NDI3MTE4M30.iPaY--LfmkR5KOWkTPWFFR1D2T2ZoZH49jRCQguGz_g";

    let client = reqwest::Client::new();
    let req_body = serde_json::json!({
        "p_key": key,
        "p_hardware_id": mac,
        "p_version": "1.0.8"
    });

    let resp = match client.post(url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .json(&req_body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return serde_json::json!({ "valid": false, "reason": format!("Erro de conexão: {}", e) }),
    };

    let result: serde_json::Value = match resp.json().await {
        Ok(r) => r,
        Err(_) => return serde_json::json!({ "valid": false, "reason": "Resposta inválida do servidor." }),
    };

    result
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseUpdateStatus {
    pub key: String,
    pub valid: bool,
    pub plan_type: String,
    pub updates_used: i32,
    pub updates_allowed: i32,
    pub has_update_right: bool,
}

#[tauri::command]
async fn check_license_update_status() -> Result<LicenseUpdateStatus, String> {
    let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
    let content = std::fs::read_to_string(&license_path).map_err(|_| "Licença não encontrada localmente.".to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|_| "Formato de licença inválido.".to_string())?;
    let key = json.get("p_key").and_then(|k| k.as_str()).unwrap_or("").to_string();

    let mac = mac_address::get_mac_address()
        .ok().flatten()
        .map(|m| m.to_string())
        .unwrap_or_else(|| "00:00:00:00:00:00".to_string());

    let url = "https://rudhtwriohqmrwnkfkdq.supabase.co/rest/v1/rpc/validate_license_online";
    let anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGh0d3Jpb2hxbXJ3bmtma2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTUxODMsImV4cCI6MjA5NDI3MTE4M30.iPaY--LfmkR5KOWkTPWFFR1D2T2ZoZH49jRCQguGz_g";

    let client = reqwest::Client::new();
    let req_body = serde_json::json!({
        "p_key": key,
        "p_hardware_id": mac
    });

    let resp = client.post(url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de conexao: {}", e))?;

    let result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let valid = result.get("valid").and_then(|v| v.as_bool()).unwrap_or(false);
    if !valid {
        return Ok(LicenseUpdateStatus {
            key,
            valid: false,
            plan_type: "".to_string(),
            updates_used: 0,
            updates_allowed: 0,
            has_update_right: false,
        });
    }

    let plan_type = result.get("plan_type").and_then(|p| p.as_str()).unwrap_or("").to_string();
    let updates_used = result.get("updates_used").and_then(|u| u.as_i64()).unwrap_or(0) as i32;
    let updates_allowed = result.get("updates_allowed").and_then(|u| u.as_i64()).unwrap_or(1) as i32;

    let has_update_right = if plan_type == "annual" {
        true
    } else {
        updates_used < updates_allowed
    };

    Ok(LicenseUpdateStatus {
        key,
        valid: true,
        plan_type,
        updates_used,
        updates_allowed,
        has_update_right,
    })
}

// Kept for backward compat (just reads the cached key for display)
#[tauri::command]
fn check_license_local() -> bool {
    // WARNING: This only checks if a key file exists locally.
    // The real security check is check_license_online().
    // This is ONLY used to decide whether to show the activation form or not.
    std::path::Path::new(r"C:\AEGP\license.json").exists()
}

#[tauri::command]
async fn download_and_install_update(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("FlashFill-Updater")
        .build()
        .map_err(|e| format!("Erro cliente: {}", e))?;

    // Read key to attach if downloading from dashboard server
    let license_path = std::path::PathBuf::from(r"C:\AEGP\license.json");
    let download_url = if let Ok(content) = std::fs::read_to_string(&license_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(key) = json.get("p_key").and_then(|k| k.as_str()) {
                // If it is the installer, rewrite the URL to hit our tracking download endpoint
                if url.contains("FlashFill_Installer.exe") {
                    let base = url.split("/FlashFill_Installer.exe").next().unwrap_or("");
                    format!("{}/api/download-update?key={}", base, key)
                } else {
                    url.clone()
                }
            } else {
                url.clone()
            }
        } else {
            url.clone()
        }
    } else {
        url.clone()
    };
        
    let resp = client.get(&download_url).send().await.map_err(|e| format!("Erro de download: {}", e))?;
    
    if !resp.status().is_success() {
        return Err(format!("Falha ao baixar (Status {}).", resp.status()));
    }
    
    let bytes = resp.bytes().await.map_err(|e| format!("Erro ao ler bytes: {}", e))?;
    
    let temp_dir = std::env::temp_dir();
    let exe_path = temp_dir.join("FlashFill_Update.exe");
    
    std::fs::write(&exe_path, bytes).map_err(|e| format!("Erro ao salvar arquivo: {}", e))?;
    
    // Spawn the installer
    std::process::Command::new(&exe_path)
        .spawn()
        .map_err(|e| format!("Erro ao abrir instalador: {}", e))?;
        
    // Exit current app so the installer can overwrite files
    app.exit(0);
    Ok(())
}

// ─── App entry ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    {
        // Força o diretório de dados do WebView2 para uma pasta global no ProgramData,
        // evitando erros de permissão "O Microsoft Edge não pode ler e gravar"
        // em perfis temporários corrompidos (como TEMP.CETAM) ao executar como Administrador.
        let data_dir = std::path::PathBuf::from(r"C:\ProgramData\FlashFill_WebView2_Data");
        let _ = std::fs::create_dir_all(&data_dir);
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data_dir.to_string_lossy().to_string());
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
                use tauri::Manager;

                let quit_i = MenuItem::with_id(app, "quit", "Sair (Quit)", true, None::<&str>)?;
                let show_i = MenuItem::with_id(app, "show", "Abrir FlashFill", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            check_status,
            install_templates,
            install_plugin,
            install_extension,
            install_all,
            relaunch_as_admin,
            activate_license,
            deactivate_license,
            check_license_local,
            get_license_info,
            check_license_online,
            download_and_install_update,
            check_license_update_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
