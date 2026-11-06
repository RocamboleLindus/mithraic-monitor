export type SensorReading = {
  id: string;
  hardwareId: string;
  hardwareName: string;
  hardwareType: string;
  sensorName: string;
  sensorType: string;
  value: number | null;
  min: number | null;
  max: number | null;
  unit: string;
  hidden: boolean;
};

export type SensorSnapshot = {
  timestamp: string;
  sensors: SensorReading[];
};

export type HealthReport = {
  elevated: boolean;
  pawnIoInstalled: boolean;
  pawnIoVersion: string | null;
  monitorOpen: boolean;
  intervalMs: number;
  error: string | null;
};

export type PageId =
  | "home"
  | "performance"
  | "cooling"
  | "electrical"
  | "storage"
  | "sensors"
  | "settings";

export type TempUnit = "C" | "F";

export type Sample = {
  t: number;
  v: number;
};
