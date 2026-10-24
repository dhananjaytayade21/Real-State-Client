using Npgsql;

namespace WSMS.Rentals.Api.Data;

public sealed class NpgsqlConnectionFactory : IDbConnectionFactory
{
    private readonly NpgsqlDataSource dataSource;

    public NpgsqlConnectionFactory(NpgsqlDataSource dataSource)
    {
        this.dataSource = dataSource;
    }

    public ValueTask<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        return dataSource.OpenConnectionAsync(cancellationToken);
    }
}
