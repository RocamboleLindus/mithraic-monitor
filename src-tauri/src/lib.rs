use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

struct SensorProcess(Mutex<Option<Child>>);

static HAND_OFF: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
struct LaunchPrefs {
    elevate_sensor: bool,
    elevate_app: bool,
}

impl Default for LaunchPrefs {
    fn default() -> Self {
        Self {
            elevate_sensor: false,
            elevate_app: false,
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SensorProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![reload_app])
        .setup(|app| {
            let prefs = load_prefs();
            if prefs.elevate_app && !is_elevated() {
                stop_listener();
                if start_elevated_self().is_ok() {
                    HAND_OFF.store(true, Ordering::SeqCst);
                    app.handle().exit(0);
                    return Ok(());
                }
            }
            if !sensor_is_listening() {
                remember_sensor(app.handle(), launch_sensor(prefs.elevate_sensor || prefs.elevate_app));
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Mithraic HW Monitor")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if HAND_OFF.load(Ordering::SeqCst) {
                    return;
                }
                stop_owned_sensor(app);
                stop_listener();
            }
        });
}

#[tauri::command]
fn reload_app(app: tauri::AppHandle, elevate_sensor: bool, elevate_app: bool) -> Result<String, String> {
    let prefs = LaunchPrefs {
        elevate_sensor,
        elevate_app,
    };
    save_prefs(prefs).map_err(|error| error.to_string())?;

    if elevate_app && !is_elevated() {
        stop_owned_sensor(&app);
        stop_listener();
        if let Err(error) = start_elevated_self() {
            remember_sensor(&app, spawn_sensor_user());
            return Err(error);
        }
        HAND_OFF.store(true, Ordering::SeqCst);
        app.exit(0);
        return Ok("elevating".to_string());
    }

    if elevate_sensor && !elevate_app && !is_elevated() {
        stop_owned_sensor(&app);
        stop_listener();
        if let Err(error) = launch_sensor_admin() {
            remember_sensor(&app, spawn_sensor_user());
            return Err(error);
        }
        return Ok("reload-window".to_string());
    }

    stop_owned_sensor(&app);
    stop_listener();
    app.restart();
}

fn remember_sensor(app: &tauri::AppHandle, child: Option<Child>) {
    let Some(child) = child else { return };
    if let Some(state) = app.try_state::<SensorProcess>() {
        if let Ok(mut slot) = state.0.lock() {
            *slot = Some(child);
        }
    }
}

fn stop_owned_sensor(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<SensorProcess>() {
        if let Ok(mut slot) = state.0.lock() {
            if let Some(child) = slot.as_mut() {
                stop_sensor(child);
            }
            *slot = None;
        }
    }
}

fn launch_sensor(admin: bool) -> Option<Child> {
    if admin && is_elevated() {
        return spawn_sensor_exe().or_else(spawn_sensor_user);
    }
    if admin && launch_sensor_admin().is_ok() {
        return None;
    }
    spawn_sensor_user()
}

fn spawn_sensor_exe() -> Option<Child> {
    let exe = sensor_exe()?;
    match Command::new(&exe).args(["--port", "47831"]).spawn() {
        Ok(child) => Some(child),
        Err(error) if error.raw_os_error() == Some(740) => None,
        Err(_) => spawn_sensor_user(),
    }
}

fn spawn_sensor_user() -> Option<Child> {
    if let Some(exe) = sensor_exe() {
        if let Ok(child) = Command::new(&exe).args(["--port", "47831"]).spawn() {
            return Some(child);
        }
    }

    let dll = sensor_dll();
    if dll.exists() {
        if let Ok(child) = Command::new("dotnet")
            .args(["exec", &dll.to_string_lossy(), "--", "--port", "47831"])
            .spawn()
        {
            return Some(child);
        }
    }

    let project = sensor_project();
    Command::new("dotnet")
        .args([
            "run",
            "--project",
            &project.to_string_lossy(),
            "--",
            "--port",
            "47831",
        ])
        .spawn()
        .ok()
}

fn launch_sensor_admin() -> Result<(), String> {
    let Some(exe) = sensor_exe() else {
        return Err("The sensor program has not been built yet.".to_string());
    };
    let script = format!(
        "Start-Process -FilePath '{}' -ArgumentList '--port','47831' -Verb RunAs",
        ps_quote(&exe)
    );
    let status = Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .status()
        .map_err(|error| error.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("Windows did not start the sensor service. Accept the administrator prompt and try again.".to_string())
    }
}

fn start_elevated_self() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let script = format!("Start-Process -FilePath '{}' -Verb RunAs", ps_quote(&exe));
    let status = Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .status()
        .map_err(|error| error.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("Windows did not restart the app. Accept the administrator prompt and try again.".to_string())
    }
}

fn stop_sensor(child: &mut Child) {
    let _ = Command::new("taskkill")
        .args(["/F", "/T", "/PID", &child.id().to_string()])
        .output();
}

fn stop_listener() {
    let script = "Get-NetTCPConnection -LocalPort 47831 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }";
    let _ = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .status();
}

fn sensor_is_listening() -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], 47831));
    TcpStream::connect_timeout(&address, Duration::from_millis(300)).is_ok()
}

fn sensor_project() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("sensors")
        .join("MithraicMonitor.Sensors")
}

fn sensor_exe() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(current) = std::env::current_exe() {
        if let Some(dir) = current.parent() {
            candidates.push(dir.join("MithraicMonitor.Sensors.exe"));
        }
    }
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    candidates.push(
        manifest
            .join("binaries")
            .join("MithraicMonitor.Sensors-x86_64-pc-windows-msvc.exe"),
    );
    candidates.push(manifest.join("sensor-publish").join("MithraicMonitor.Sensors.exe"));
    candidates.push(
        sensor_project()
            .join("bin")
            .join("Debug")
            .join("net10.0-windows")
            .join("MithraicMonitor.Sensors.exe"),
    );
    candidates.into_iter().find(|path| path.exists())
}

fn sensor_dll() -> PathBuf {
    sensor_project()
        .join("bin")
        .join("Debug")
        .join("net10.0-windows")
        .join("MithraicMonitor.Sensors.dll")
}

fn prefs_path() -> PathBuf {
    let root = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    root.join("MithraicMonitor").join("launch-prefs.json")
}

fn load_prefs() -> LaunchPrefs {
    let Ok(bytes) = fs::read(prefs_path()) else {
        return LaunchPrefs::default();
    };
    serde_json::from_slice(&bytes).unwrap_or_default()
}

fn save_prefs(prefs: LaunchPrefs) -> std::io::Result<()> {
    let path = prefs_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut file = fs::File::create(path)?;
    file.write_all(&serde_json::to_vec_pretty(&prefs).unwrap_or_default())?;
    Ok(())
}

fn ps_quote(path: &Path) -> String {
    path.display().to_string().replace('\'', "''")
}

#[link(name = "shell32")]
unsafe extern "system" {
    fn IsUserAnAdmin() -> i32;
}

fn is_elevated() -> bool {
    unsafe { IsUserAnAdmin() != 0 }
}
