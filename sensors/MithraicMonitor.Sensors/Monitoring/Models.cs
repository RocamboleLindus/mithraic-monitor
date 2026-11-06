namespace MithraicMonitor.Sensors.Monitoring;

public sealed record SensorReading(
    string Id,
    string HardwareId,
    string HardwareName,
    string HardwareType,
    string SensorName,
    string SensorType,
    double? Value,
    double? Min,
    double? Max,
    string Unit,
    bool Hidden);

public sealed record SensorSnapshot(DateTimeOffset Timestamp, IReadOnlyList<SensorReading> Sensors)
{
    public static SensorSnapshot Empty { get; } = new(DateTimeOffset.UnixEpoch, []);
}

public sealed record HealthReport(
    bool Elevated,
    bool PawnIoInstalled,
    string? PawnIoVersion,
    bool MonitorOpen,
    int IntervalMs,
    string? Error);

public sealed record SettingsRequest(int IntervalMs);

public sealed record ResetRequest(string? Id);
