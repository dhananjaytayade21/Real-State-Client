using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace WSMS.Rentals.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate next;
    private readonly ILogger<ExceptionHandlingMiddleware> logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        this.next = next;
        this.logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (UnauthorizedAccessException exception)
        {
            logger.LogWarning(exception, "An authenticated request was rejected for {Path}.", context.Request.Path);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Authentication is required or the session is invalid.",
                    Type = "https://www.rfc-editor.org/rfc/rfc9110#section-15.5.2"
                },
                cancellationToken: context.RequestAborted);
        }
        catch (PostgresException exception)
        {
            logger.LogWarning(
                exception,
                "A database constraint rejected the request for {Path}.",
                context.Request.Path);

            if (context.Response.HasStarted)
            {
                throw;
            }

            int status = exception.SqlState switch
            {
                PostgresErrorCodes.UniqueViolation => StatusCodes.Status409Conflict,
                PostgresErrorCodes.ForeignKeyViolation
                    or PostgresErrorCodes.CheckViolation
                    or PostgresErrorCodes.ExclusionViolation => StatusCodes.Status409Conflict,
                _ => StatusCodes.Status500InternalServerError
            };
            string title = status == StatusCodes.Status409Conflict
                ? "The request conflicts with existing data or a database rule."
                : "An unexpected database error occurred.";

            context.Response.Clear();
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = status,
                    Title = title,
                    Type = "https://www.rfc-editor.org/rfc/rfc9110#section-15.5"
                },
                cancellationToken: context.RequestAborted);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "An unhandled API error occurred for {Path}.", context.Request.Path);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "An unexpected server error occurred.",
                    Type = "https://www.rfc-editor.org/rfc/rfc9110#section-15.6.1"
                },
                cancellationToken: context.RequestAborted);
        }
    }
}
