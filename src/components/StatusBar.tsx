import type { HealthReport } from "../types";

type StatusBarProps = {
  health: HealthReport | null;
  connected: boolean;
  updatedAt: string | null;
  sensorCount: number;
};

export function StatusBar({ health, connected, updatedAt, sensorCount }: StatusBarProps) {
  const updated = updatedAt ? new Date(updatedAt).toLocaleTimeString() : "—";
  return (
    <footer className="statusbar">
      <span className={connected ? "status-dot live" : "status-dot"}>{connected ? "Live" : "Offline"}</span>
      <span>{sensorCount} sensors</span>
      <span>Updated {updated}</span>
      <span>{health?.elevated ? "Administrator" : "Not elevated"}</span>
      <span>{health?.pawnIoInstalled ? `PawnIO ${health.pawnIoVersion ?? ""}`.trim() : "PawnIO missing"}</span>
    </footer>
  );
}
