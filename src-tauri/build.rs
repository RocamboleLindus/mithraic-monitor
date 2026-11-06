fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&[
                "reload_app",
                "check_for_update",
                "install_update",
            ])),
    )
    .expect("failed to run tauri-build");
}
