using LibreHardwareMonitor.Hardware;

namespace MithraicMonitor.Sensors.Monitoring;

public sealed class UpdateVisitor : IVisitor
{
    private int _tick;

    public void BeginTick() => _tick++;

    public void VisitComputer(IComputer computer) => computer.Traverse(this);

    public void VisitHardware(IHardware hardware)
    {
        if (ShouldUpdate(hardware.HardwareType))
            hardware.Update();

        foreach (IHardware subHardware in hardware.SubHardware)
            subHardware.Accept(this);
    }

    public void VisitSensor(ISensor sensor)
    {
    }

    public void VisitParameter(IParameter parameter)
    {
    }

    private bool ShouldUpdate(HardwareType type)
    {
        return type switch
        {
            HardwareType.Cpu or HardwareType.GpuNvidia or HardwareType.GpuAmd or HardwareType.GpuIntel
                or HardwareType.Memory or HardwareType.Motherboard => true,
            _ => _tick % 3 == 1,
        };
    }
}
