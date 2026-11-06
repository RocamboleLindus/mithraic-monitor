import type { SensorReading, TempUnit } from "./types";

export const SENSOR_BASE = import.meta.env.VITE_SENSOR_URL ?? "http://127.0.0.1:47831";

export function toDisplay(value: number, sensorType: string, unit: TempUnit): number {
  if (sensorType === "Temperature" && unit === "F") return value * 1.8 + 32;
  return value;
}

export function formatReading(
  reading: Pick<SensorReading, "value" | "sensorType" | "unit"> | undefined,
  unit: TempUnit,
): { value: string; unit: string } {
  if (!reading || reading.value == null || Number.isNaN(reading.value)) {
    return { value: "—", unit: "" };
  }

  if (reading.sensorType === "Throughput") {
    return { value: formatThroughput(reading.value), unit: "" };
  }

  const converted = toDisplay(reading.value, reading.sensorType, unit);
  const suffix = reading.sensorType === "Temperature" ? (unit === "F" ? "°F" : "°C") : reading.unit;
  return { value: formatNumber(converted, reading.sensorType), unit: suffix };
}

export function formatBound(
  value: number | null,
  sensorType: string,
  unit: string,
  tempUnit: TempUnit,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (sensorType === "Throughput") return formatThroughput(value);
  const converted = toDisplay(value, sensorType, tempUnit);
  const suffix = sensorType === "Temperature" ? (tempUnit === "F" ? "°F" : "°C") : unit;
  const text = formatNumber(converted, sensorType);
  return suffix ? `${text} ${suffix}` : text;
}

function formatNumber(value: number, sensorType: string): string {
  const digits = decimals(sensorType, value);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function decimals(sensorType: string, value: number): number {
  switch (sensorType) {
    case "Voltage":
      return 3;
    case "Current":
    case "Energy":
    case "Factor":
      return 2;
    case "Power":
      return Math.abs(value) >= 100 ? 0 : 1;
    case "Clock":
    case "Fan":
    case "Timing":
      return 0;
    case "Data":
    case "SmallData":
      return 2;
    case "Frequency":
      return value >= 1000 ? 0 : 1;
    case "TimeSpan":
      return 1;
    default:
      return 1;
  }
}

export function formatThroughput(bytesPerSecond: number): string {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = Math.abs(bytesPerSecond);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = index === 0 || value >= 100 ? 0 : 1;
  const text = value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${bytesPerSecond < 0 ? "-" : ""}${text} ${units[index]}`;
}
