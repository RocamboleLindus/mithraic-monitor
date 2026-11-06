using System.Runtime.InteropServices;
using System.Text.Json;
using MithraicMonitor.Sensors.Monitoring;

Native.SetCurrentProcessExplicitAppUserModelID("com.mithraic.monitor");

var port = 47831;
for (var i = 0; i < args.Length; i++)
{
    if (args[i] is "--port" or "-p" && i + 1 < args.Length && int.TryParse(args[i + 1], out var parsed) && parsed is > 0 and < 65536)
        port = parsed;
}

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options => options.SingleLine = true);
builder.Logging.SetMinimumLevel(LogLevel.Warning);
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});
builder.Services.AddSingleton<HardwareMonitor>();

var json = new JsonSerializerOptions(JsonSerializerDefaults.Web);

var app = builder.Build();
app.UseCors();

var monitor = app.Services.GetRequiredService<HardwareMonitor>();
monitor.Start();
app.Lifetime.ApplicationStopping.Register(monitor.Dispose);

app.MapGet("/api/health", () => Results.Json(monitor.Health(), json));

app.MapGet("/api/snapshot", () => Results.Json(monitor.Latest, json));

app.MapGet("/api/stream", async (HttpContext context, CancellationToken cancellationToken) =>
{
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers.ContentType = "text/event-stream";
    context.Response.Headers.Append("X-Accel-Buffering", "no");

    await foreach (var snapshot in monitor.Subscribe(cancellationToken))
    {
        await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(snapshot, json)}\n\n", cancellationToken);
        await context.Response.Body.FlushAsync(cancellationToken);
    }
});

app.MapPost("/api/settings", (SettingsRequest request) =>
{
    try
    {
        monitor.SetInterval(request.IntervalMs);
        return Results.Json(new { intervalMs = monitor.IntervalMs }, json);
    }
    catch (ArgumentOutOfRangeException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/sensors/reset", (ResetRequest request) =>
{
    monitor.ResetMinMax(string.IsNullOrWhiteSpace(request.Id) ? null : request.Id);
    return Results.NoContent();
});

Console.Out.WriteLine($"SENSOR_URL=http://127.0.0.1:{port}");
Console.Out.Flush();

app.Run();

internal static class Native
{
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    internal static extern int SetCurrentProcessExplicitAppUserModelID(string appID);
}
