import type { SensorReading } from "./types";

const GPU_TYPES = new Set(["GpuNvidia", "GpuAmd", "GpuIntel"]);

export function cpuTemperature(sensors: SensorReading[]): SensorReading | undefined {
  return prefer(cpuSensors(sensors, "Temperature"), /package|tctl|tdie/i);
}

export function gpuTemperature(sensors: SensorReading[]): SensorReading | undefined {
  return prefer(gpuSensors(sensors, "Temperature"), /gpu core|^core$|hot spot|edge/i);
}

export function cpuLoad(sensors: SensorReading[]): SensorReading | undefined {
  return prefer(cpuSensors(sensors, "Load"), /cpu total|^total$/i);
}

export function gpuLoad(sensors: SensorReading[]): SensorReading | undefined {
  return prefer(gpuSensors(sensors, "Load"), /gpu core|d3d|3d|^core$/i);
}

export function memoryLoad(sensors: SensorReading[]): SensorReading | undefined {
  const memory = physicalMemory(sensors);
  return (
    memory.find((sensor) => sensor.sensorType === "Load" && /^memory$/i.test(sensor.sensorName)) ??
    memory.find((sensor) => sensor.sensorType === "Load") ??
    memory.find((sensor) => sensor.sensorType === "Level")
  );
}

export function memoryUse(sensors: SensorReading[]): SensorReading | undefined {
  const memory = physicalMemory(sensors);
  return (
    memory.find((sensor) => sensor.sensorType === "Data" && /used/i.test(sensor.sensorName)) ??
    memoryLoad(sensors)
  );
}

export function memoryTotalGb(sensors: SensorReading[]): number | undefined {
  const memory = physicalMemory(sensors);
  const used = memory.find((sensor) => sensor.sensorType === "Data" && /used/i.test(sensor.sensorName))?.value;
  const available = memory.find((sensor) => sensor.sensorType === "Data" && /available/i.test(sensor.sensorName))?.value;
  if (used == null || available == null) return undefined;
  return used + available;
}

function physicalMemory(sensors: SensorReading[]): SensorReading[] {
  return sensors.filter(
    (sensor) => sensor.hardwareType === "Memory" && !sensor.hidden && !/virtual/i.test(sensor.sensorName),
  );
}

export function packagePower(sensors: SensorReading[]): SensorReading | undefined {
  return prefer(cpuSensors(sensors, "Power"), /package/i);
}

export function cpuColumn(sensors: SensorReading[]): SensorReading[] {
  return sensors.filter(
    (sensor) =>
      sensor.hardwareType === "Cpu" &&
      !sensor.hidden &&
      (sensor.sensorType === "Clock" || sensor.sensorType === "Power" || sensor.sensorType === "Fan") &&
      sensor.value != null,
  );
}

export function gpuGroups(sensors: SensorReading[]): { name: string; sensors: SensorReading[] }[] {
  const groups = new Map<string, SensorReading[]>();
  for (const sensor of sensors) {
    if (!GPU_TYPES.has(sensor.hardwareType) || sensor.hidden || sensor.value == null) continue;
    if (sensor.sensorType !== "Clock" && sensor.sensorType !== "Power" && sensor.sensorType !== "Fan") continue;
    const list = groups.get(sensor.hardwareName) ?? [];
    list.push(sensor);
    groups.set(sensor.hardwareName, list);
  }
  return [...groups.entries()].map(([name, items]) => ({ name, sensors: items }));
}

export function boardName(sensors: SensorReading[]): string {
  return sensors.find((sensor) => sensor.hardwareType === "Motherboard")?.hardwareName ?? "Motherboard";
}

export function hottestTemperature(sensors: SensorReading[], hardwareTypes: string[]): SensorReading | undefined {
  return sensors
    .filter(
      (sensor) =>
        hardwareTypes.includes(sensor.hardwareType) &&
        sensor.sensorType === "Temperature" &&
        !sensor.hidden &&
        sensor.value != null,
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
}

const NOISE_ADAPTER = /qos packet scheduler|wfp |filter driver|virtual switch extension|kernel debugger|^vswitch /i;

export function isPrimaryHardware(name: string): boolean {
  return !NOISE_ADAPTER.test(name);
}

export function networkRates(sensors: SensorReading[]): { down: number; up: number } {
  const rates = sensors.filter(
    (sensor) =>
      sensor.hardwareType === "Network" &&
      sensor.sensorType === "Throughput" &&
      sensor.value != null &&
      isPrimaryHardware(sensor.hardwareName),
  );
  const down = rates.filter((sensor) => /download|receive/i.test(sensor.sensorName));
  const up = rates.filter((sensor) => /upload|sent|send/i.test(sensor.sensorName));
  const chosenDown = down.length > 0 ? down : rates;
  const chosenUp = up.length > 0 ? up : [];
  return {
    down: chosenDown.reduce((sum, sensor) => sum + (sensor.value ?? 0), 0),
    up: chosenUp.reduce((sum, sensor) => sum + (sensor.value ?? 0), 0),
  };
}

function cpuSensors(sensors: SensorReading[], sensorType: string): SensorReading[] {
  return sensors.filter(
    (sensor) => sensor.hardwareType === "Cpu" && sensor.sensorType === sensorType && !sensor.hidden,
  );
}

function gpuSensors(sensors: SensorReading[], sensorType: string): SensorReading[] {
  return sensors.filter(
    (sensor) => GPU_TYPES.has(sensor.hardwareType) && sensor.sensorType === sensorType && !sensor.hidden,
  );
}

function prefer(sensors: SensorReading[], pattern: RegExp): SensorReading | undefined {
  return sensors.find((sensor) => pattern.test(sensor.sensorName)) ?? sensors[0];
}
