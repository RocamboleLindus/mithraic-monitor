import type { ReactNode } from "react";
import { formatBound, formatReading, toDisplay } from "../format";
import type { Sample, SensorReading, TempUnit } from "../types";
import { Sparkline } from "./Sparkline";

type MetricCardProps = {
  label: string;
  reading: SensorReading | undefined;
  samples: Sample[] | undefined;
  unit: TempUnit;
  hint?: ReactNode;
};

export function MetricCard({ label, reading, samples, unit, hint }: MetricCardProps) {
  const formatted = formatReading(reading, unit);
  const convert = reading?.sensorType === "Temperature" && unit === "F" ? (value: number) => toDisplay(value, "Temperature", "F") : undefined;

  return (
    <article className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {formatted.value}
        {formatted.unit ? <span className="metric-unit">{formatted.unit}</span> : null}
      </div>
      <Sparkline samples={samples} convert={convert} />
      <div className="metric-bounds">
        <span>Min {reading ? formatBound(reading.min, reading.sensorType, reading.unit, unit) : "—"}</span>
        <span>Max {reading ? formatBound(reading.max, reading.sensorType, reading.unit, unit) : "—"}</span>
        {hint}
      </div>
    </article>
  );
}
