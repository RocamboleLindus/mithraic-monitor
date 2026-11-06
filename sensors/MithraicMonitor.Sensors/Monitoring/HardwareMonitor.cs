using System.Runtime.CompilerServices;
using System.Security.Principal;
using System.Threading.Channels;
using LibreHardwareMonitor.Hardware;
using LibreHardwareMonitor.PawnIo;

namespace MithraicMonitor.Sensors.Monitoring;

public sealed class HardwareMonitor : IDisposable
{
    private readonly object _gate = new();
    private readonly object _subscribersGate = new();
    private readonly Computer _computer;
    private readonly UpdateVisitor _visitor = new();
    private readonly Dictionary<string, ISensor> _sensors = new(StringComparer.Ordinal);
    private readonly List<ChannelWriter<SensorSnapshot>> _subscribers = [];
    private SensorSnapshot _latest = SensorSnapshot.Empty;
    private CancellationTokenSource? _cts;
    private Task? _loop;
    private int _intervalMs = 1000;
    private string? _error;
    private bool _open;

    public HardwareMonitor()
    {
        _computer = new Computer
        {
            IsBatteryEnabled = true,
            IsControllerEnabled = true,
            IsCpuEnabled = true,
            IsGpuEnabled = true,
            IsMemoryEnabled = true,
            IsMotherboardEnabled = true,
            IsNetworkEnabled = true,
            IsPowerMonitorEnabled = true,
            IsPsuEnabled = true,
            IsStorageEnabled = true,
        };
    }

    public int IntervalMs => Volatile.Read(ref _intervalMs);

    public void Start()
    {
        try
        {
            _computer.Open();
            _open = true;
        }
        catch (Exception ex)
        {
            _error = ex.Message;
        }

        _cts = new CancellationTokenSource();
        _loop = Task.Run(() => LoopAsync(_cts.Token));
    }

    public HealthReport Health()
    {
        return new HealthReport(
            Elevated: IsElevated(),
            PawnIoInstalled: PawnIo.IsInstalled,
            PawnIoVersion: PawnIo.Version?.ToString(),
            MonitorOpen: _open,
            IntervalMs: IntervalMs,
            Error: _error);
    }

    public SensorSnapshot Latest
    {
        get
        {
            lock (_subscribersGate)
                return _latest;
        }
    }

    public void SetInterval(int intervalMs)
    {
        if (intervalMs is not (500 or 1000 or 2000))
            throw new ArgumentOutOfRangeException(nameof(intervalMs), "Interval must be 500, 1000, or 2000 ms.");

        Volatile.Write(ref _intervalMs, intervalMs);
    }

    public void ResetMinMax(string? id)
    {
        lock (_gate)
        {
            foreach (ISensor sensor in _sensors.Values)
            {
                if (id is not null && !string.Equals(sensor.Identifier.ToString(), id, StringComparison.Ordinal))
                    continue;

                sensor.ResetMin();
                sensor.ResetMax();
            }
        }
    }

    public async IAsyncEnumerable<SensorSnapshot> Subscribe([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var channel = Channel.CreateBounded<SensorSnapshot>(new BoundedChannelOptions(1)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        });

        SensorSnapshot latest;
        lock (_subscribersGate)
        {
            latest = _latest;
            _subscribers.Add(channel.Writer);
        }

        try
        {
            if (latest.Sensors.Count > 0)
                yield return latest;

            while (await channel.Reader.WaitToReadAsync(cancellationToken).ConfigureAwait(false))
            {
                while (channel.Reader.TryRead(out SensorSnapshot? snapshot))
                    yield return snapshot;
            }
        }
        finally
        {
            lock (_subscribersGate)
                _subscribers.Remove(channel.Writer);
            channel.Writer.TryComplete();
        }
    }

    public void Dispose()
    {
        _cts?.Cancel();
        try
        {
            _loop?.Wait(TimeSpan.FromSeconds(2));
        }
        catch (AggregateException)
        {
        }

        lock (_gate)
        {
            if (_open)
            {
                _computer.Close();
                _open = false;
            }
        }

        _cts?.Dispose();
    }

    private async Task LoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                Sample();
            }
            catch (Exception ex)
            {
                _error = ex.Message;
            }

            try
            {
                await Task.Delay(IntervalMs, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void Sample()
    {
        SensorSnapshot snapshot;
        lock (_gate)
        {
            if (!_open)
                return;

            _computer.Accept(_visitor);
            _sensors.Clear();
            var readings = new List<SensorReading>();
            foreach (IHardware hardware in _computer.Hardware)
                Collect(hardware, hardware, readings);

            snapshot = new SensorSnapshot(DateTimeOffset.UtcNow, readings);
        }

        lock (_subscribersGate)
            _latest = snapshot;

        ChannelWriter<SensorSnapshot>[] writers;
        lock (_subscribersGate)
            writers = _subscribers.ToArray();

        foreach (ChannelWriter<SensorSnapshot> writer in writers)
            writer.TryWrite(snapshot);
    }

    private void Collect(IHardware root, IHardware node, List<SensorReading> readings)
    {
        foreach (ISensor sensor in node.Sensors)
        {
            string id = sensor.Identifier.ToString();
            _sensors[id] = sensor;
            readings.Add(new SensorReading(
                Id: id,
                HardwareId: root.Identifier.ToString(),
                HardwareName: root.Name,
                HardwareType: root.HardwareType.ToString(),
                SensorName: node == root ? sensor.Name : $"{node.Name} / {sensor.Name}",
                SensorType: sensor.SensorType.ToString(),
                Value: Clean(sensor.Value),
                Min: Clean(sensor.Min),
                Max: Clean(sensor.Max),
                Unit: UnitFor(sensor.SensorType),
                Hidden: sensor.IsDefaultHidden));
        }

        foreach (IHardware sub in node.SubHardware)
            Collect(root, sub, readings);
    }

    private static double? Clean(float? value)
    {
        if (value is not float number)
            return null;
        if (float.IsNaN(number) || float.IsInfinity(number))
            return null;
        return number;
    }

    private static string UnitFor(SensorType type) => type switch
    {
        SensorType.Voltage => "V",
        SensorType.Current => "A",
        SensorType.Power => "W",
        SensorType.Clock => "MHz",
        SensorType.Temperature => "°C",
        SensorType.Load => "%",
        SensorType.Frequency => "Hz",
        SensorType.Fan => "RPM",
        SensorType.Flow => "L/h",
        SensorType.Control => "%",
        SensorType.Level => "%",
        SensorType.Factor => "",
        SensorType.Data => "GB",
        SensorType.SmallData => "MB",
        SensorType.Throughput => "B/s",
        SensorType.TimeSpan => "s",
        SensorType.Timing => "ns",
        SensorType.Energy => "mWh",
        SensorType.Noise => "dBA",
        SensorType.Conductivity => "µS/cm",
        SensorType.Humidity => "%",
        _ => "",
    };

    private static bool IsElevated()
    {
        using WindowsIdentity identity = WindowsIdentity.GetCurrent();
        var principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }
}
