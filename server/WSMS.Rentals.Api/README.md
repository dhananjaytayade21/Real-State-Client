# WSMS Rentals API

ASP.NET Core Web API for .NET 10, using Dapper, Npgsql, PostgreSQL, JWT bearer authentication, and Swagger. The React UI uses this API for account and application data.

## Prerequisites

- .NET SDK 10.0
- PostgreSQL 13 or newer
- `psql` (or pgAdmin's Query Tool)

## Set up PostgreSQL

Create a database named `wms_rentals`. From the repository root, apply the full schema to a new database:

```powershell
psql -U YOUR_POSTGRES_USER -d wms_rentals -f database\wms_rentals.sql
```

For a database that already has the earlier schema, apply the incremental migration once instead:

```powershell
psql -U YOUR_POSTGRES_USER -d wms_rentals -f database\migrations\001_application_api.sql
```

Do not rerun the full schema against an existing database. The schema inserts development examples, including the demo accounts `admin`, `manager`, and `customer`, each with password `Demo123!`. Register a new account in the app for normal development.

## Configure development secrets

Run these commands from the repository root. Replace the sample database username and password with your PostgreSQL credentials:

```powershell
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Port=5432;Database=wms_rentals;Username=YOUR_POSTGRES_USER;Password=YOUR_POSTGRES_PASSWORD" --project server\WSMS.Rentals.Api\WSMS.Rentals.Api.csproj
```

Generate a private JWT signing key and set it in user-secrets:

```powershell
$jwtKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
dotnet user-secrets set "Jwt:SigningKey" $jwtKey --project server\WSMS.Rentals.Api\WSMS.Rentals.Api.csproj
```

User-secrets are stored outside source control. Do not commit database passwords or JWT signing keys. For deployments, provide these settings using the hosting platform's secret manager or environment variables.

## Run both services

Open two terminals from the repository root.

**Terminal 1 — API**

```powershell
dotnet restore server\WSMS.Rentals.Api\WSMS.Rentals.Api.csproj
dotnet run --project server\WSMS.Rentals.Api\WSMS.Rentals.Api.csproj
```

The API listens at `http://localhost:5094`; Swagger is at `http://localhost:5094/swagger`.

**Terminal 2 — React UI**

```powershell
npm install
npm run dev
```

Open the Vite development URL printed in the terminal. The default API URL is `http://localhost:5094/api`. To override it, set `VITE_API_BASE_URL` to the API base URL before starting Vite.

## Verify the API and database

```powershell
Invoke-RestMethod http://localhost:5094/api/health/live
Invoke-RestMethod http://localhost:5094/api/health/ready
```

The readiness endpoint should report `status: ready` and `database: connected`. Use Swagger or the UI to register/sign in and test authenticated operations. Warehouse records are listed in PostgreSQL with:

```sql
SELECT id, name, address, city, state, capacity_area_sqft, created_at
FROM warehouses
ORDER BY created_at DESC;
```

Application data is persisted when a form is submitted. Changes are not broadcast live to other open clients. Existing browser-only demo data is not migrated automatically; recreate records after signing in to the API-backed app.
