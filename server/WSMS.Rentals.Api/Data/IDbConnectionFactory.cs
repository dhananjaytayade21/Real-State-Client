using Npgsql;

namespace WSMS.Rentals.Api.Data;

public interface IDbConnectionFactory
{
    ValueTask<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken);
}
