import { formatBound, formatReading } from "../format";
import type { SensorReading, TempUnit } from "../types";

type SensorTableProps = {
  sensors: SensorReading[];
  unit: TempUnit;
  onReset?: (id: string) => void;
};

export function SensorTable({ sensors, unit, onReset }: SensorTableProps) {
  if (sensors.length === 0) {
    return <p className="empty">No readings in this group yet.</p>;
  }

  return (
    <div className="sensor-table">
      {sensors.map((sensor) => {
        const formatted = formatReading(sensor, unit);
        return (
          <div className="sensor-row" key={sensor.id}>
            <div className="sensor-name">
              <strong>{sensor.sensorName}</strong>
              <span>{sensor.sensorType}</span>
            </div>
            <div className="sensor-value">
              {formatted.value}
              {formatted.unit ? <small>{formatted.unit}</small> : null}
            </div>
            <div className="sensor-bound">Min {formatBound(sensor.min, sensor.sensorType, sensor.unit, unit)}</div>
            <div className="sensor-bound">Max {formatBound(sensor.max, sensor.sensorType, sensor.unit, unit)}</div>
            {onReset ? (
              <button type="button" className="row-reset" onClick={() => onReset(sensor.id)}>
                Reset
              </button>
            ) : (
              <span />
            )}
          </div>
        );
      })}
    </div>
  );
}
