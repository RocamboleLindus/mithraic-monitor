# Mithraic HW Monitor

A Windows hardware monitor for temperatures, clocks, load, fans, power, and storage. The window is a Tauri app. Sensor readings come from a small local service built on [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor).

## Download

Mithraic HW Monitor runs on 64-bit Windows 10 or 11. Download the installer from the [Releases](https://github.com/RocamboleLindus/mithraic-monitor/releases) page. It installs for the current user and does not need administrator rights. The sensor service is included, so you do not need Node.js, Rust, or the .NET SDK.

## Readings that stay empty

CPU, motherboard, and drive readings need two things:

1. [PawnIO](https://github.com/namazso/PawnIO/releases) installed.
2. The sensor service running as administrator. Open **Settings**, tick **Launch sensor service as administrator**, and choose **Reload app**. Windows asks once. **Restart with elevated privileges** does the same for the whole app.

With neither box ticked, Reload restarts the app without an administrator prompt. GPU and many other readings still work.

## Build from source

You need Node.js, Rust, the .NET 10 SDK, and Visual Studio Build Tools with the C++ workload.

```bat
npm install
Launch.cmd
```

`Launch.cmd` starts the development window. `npm run package` publishes the sensor service and builds the installer at `src-tauri/target/release/bundle/nsis/`.

## Third-party software

Sensor access uses LibreHardwareMonitorLib 0.9.6, which is licensed under the Mozilla Public License 2.0. Its source is at <https://github.com/LibreHardwareMonitor/LibreHardwareMonitor>. This project's own code is MIT; see [LICENSE](LICENSE).
