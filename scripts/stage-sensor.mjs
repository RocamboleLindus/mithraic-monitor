import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("src-tauri/binaries", { recursive: true });
copyFileSync(
  "src-tauri/sensor-publish/MithraicMonitor.Sensors.exe",
  "src-tauri/binaries/MithraicMonitor.Sensors-x86_64-pc-windows-msvc.exe",
);
