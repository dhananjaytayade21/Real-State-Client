using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WSMS.Rentals.Api.Controllers;

[Authorize]
[ApiController]
public abstract class AuthenticatedControllerBase : ControllerBase
{
    protected Guid CurrentUserId
    {
        get
        {
            string? userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (Guid.TryParse(userId, out Guid parsedUserId))
            {
                return parsedUserId;
            }

            throw new UnauthorizedAccessException("The authenticated user id is missing or invalid.");
        }
    }
}
