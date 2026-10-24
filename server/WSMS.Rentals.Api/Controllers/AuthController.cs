using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using WSMS.Rentals.Api.Data;

namespace WSMS.Rentals.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private const int PasswordIterations = 210_000;
    private readonly IDbConnectionFactory connectionFactory;
    private readonly IConfiguration configuration;

    public AuthController(IDbConnectionFactory connectionFactory, IConfiguration configuration)
    {
        this.connectionFactory = connectionFactory;
        this.configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Name)
            || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Name, username, email, and password are required." });
        }

        if (request.Username.Trim().Length > 80 || request.Name.Trim().Length > 160
            || request.Email.Trim().Length > 254 || request.Password.Length < 6)
        {
            return BadRequest(new { message = "Check the field lengths and use a password with at least 6 characters." });
        }

        await using NpgsqlConnection connection =
            await connectionFactory.OpenConnectionAsync(cancellationToken);
        var user = await connection.QuerySingleOrDefaultAsync<UserRecord>(
            new CommandDefinition(
                """
                INSERT INTO app_users (username, email, full_name, password_hash, phone)
                VALUES (@Username, LOWER(@Email), @Name, @PasswordHash, @Phone)
                RETURNING id, username, email, full_name AS "Name", phone, created_at AS "CreatedAt";
                """,
                new
                {
                    Username = request.Username.Trim(),
                    Email = request.Email.Trim(),
                    Name = request.Name.Trim(),
                    PasswordHash = HashPassword(request.Password),
                    Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim()
                },
                cancellationToken: cancellationToken));

        return Ok(new { user = ToResponse(user!), token = CreateToken(user!) });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrEmpty(request.Password))
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        await using NpgsqlConnection connection =
            await connectionFactory.OpenConnectionAsync(cancellationToken);
        var user = await connection.QuerySingleOrDefaultAsync<UserRecord>(
            new CommandDefinition(
                """
                SELECT id, username, email, full_name AS "Name", phone, created_at AS "CreatedAt", password_hash AS "PasswordHash"
                FROM app_users
                WHERE is_active = TRUE
                  AND (LOWER(username) = LOWER(@Login) OR LOWER(email) = LOWER(@Login));
                """,
                new { Login = request.Username.Trim() },
                cancellationToken: cancellationToken));

        if (user is null || !await VerifyPasswordAsync(connection, request.Password, user.PasswordHash!, cancellationToken))
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        return Ok(new { user = ToResponse(user), token = CreateToken(user) });
    }

    private static object ToResponse(UserRecord user)
    {
        return new
        {
            id = user.Id,
            username = user.Username,
            name = user.Name,
            email = user.Email,
            phone = user.Phone,
            address = user.Address,
            createdAt = user.CreatedAt
        };
    }

    private static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            PasswordIterations,
            HashAlgorithmName.SHA256,
            32);
        return $"pbkdf2${PasswordIterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    private static async Task<bool> VerifyPasswordAsync(
        NpgsqlConnection connection,
        string password,
        string storedHash,
        CancellationToken cancellationToken)
    {
        string[] parts = storedHash.Split('$');
        if (parts.Length == 4 && parts[0] == "pbkdf2"
            && int.TryParse(parts[1], out int iterations)
            && iterations >= 100_000)
        {
            try
            {
                byte[] salt = Convert.FromBase64String(parts[2]);
                byte[] expected = Convert.FromBase64String(parts[3]);
                byte[] actual = Rfc2898DeriveBytes.Pbkdf2(
                    password,
                    salt,
                    iterations,
                    HashAlgorithmName.SHA256,
                    expected.Length);
                return CryptographicOperations.FixedTimeEquals(actual, expected);
            }
            catch (FormatException)
            {
                return false;
            }
        }

        return await connection.ExecuteScalarAsync<bool>(
            new CommandDefinition(
                "SELECT crypt(@Password, @StoredHash) = @StoredHash;",
                new { Password = password, StoredHash = storedHash },
                cancellationToken: cancellationToken));
    }

    private string CreateToken(UserRecord user)
    {
        byte[] key = Encoding.UTF8.GetBytes(configuration["Jwt:SigningKey"]!);
        var credentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("sub", user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username)
            ],
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public sealed record RegisterRequest(string Username, string Name, string Email, string Password, string? Phone);
    public sealed record LoginRequest(string Username, string Password);

    private sealed class UserRecord
    {
        public Guid Id { get; init; }
        public string Username { get; init; } = "";
        public string Email { get; init; } = "";
        public string Name { get; init; } = "";
        public string? Phone { get; init; }
        public string? Address { get; init; }
        public DateTime CreatedAt { get; init; }
        public string? PasswordHash { get; init; }
    }
}
