using Dapper;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using WSMS.Rentals.Api.Data;

namespace WSMS.Rentals.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    private readonly IDbConnectionFactory connectionFactory;
    private readonly ILogger<HealthController> logger;

    public HealthController(
        IDbConnectionFactory connectionFactory,
        ILogger<HealthController> logger)
    {
        this.connectionFactory = connectionFactory;
        this.logger = logger;
    }

    [HttpGet("live")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetLiveness()
    {
        return Ok(new { status = "live" });
    }

    [HttpGet("ready")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetReadiness(CancellationToken cancellationToken)
    {
        try
        {
            await using NpgsqlConnection connection =
                await connectionFactory.OpenConnectionAsync(cancellationToken);
            int databaseResult = await connection.QuerySingleAsync<int>(
                new CommandDefinition("SELECT 1;", cancellationToken: cancellationToken));

            return Ok(new { status = "ready", database = databaseResult == 1 ? "connected" : "unavailable" });
        }
        catch (NpgsqlException exception)
        {
            logger.LogError(exception, "PostgreSQL readiness check failed.");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { status = "not_ready", database = "unavailable" });
        }
    }
}
