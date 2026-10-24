# WMS Rentals — React UI

Responsive React + Vite implementation inspired by the supplied WMS Rentals reference screens. Includes:
- Public landing page
- Dashboard with working warehouse, inventory, stock-movement, order, barcode, report, rental, booking, favorite, message, profile and settings screens
- Operational forms and lists with create, edit, delete, search, stock adjustment, image uploads for inventory and rental listings, and CSV export actions
- Title-cased navigation menus and a notification panel for recent stock activity and messages
- Login page
- Registration page with client-side required-field and password-match validation
- Responsive layouts for desktop, tablet and mobile

## Requirements
- Node.js 18+ (recommended)
- npm
- .NET SDK 10.0
- PostgreSQL 13 or newer

## Run the API and React UI

Create a PostgreSQL database named `wms_rentals`. For a new database, apply the schema from the repository root:

```powershell
psql -U YOUR_POSTGRES_USER -d wms_rentals -f database\wms_rentals.sql
```

If you already applied the earlier schema, apply the one-time API migration instead:

```powershell
psql -U YOUR_POSTGRES_USER -d wms_rentals -f database\migrations\001_application_api.sql
```

Do not rerun the full schema against an existing database. Set the database connection string and private JWT signing key with .NET user-secrets as shown in the [API setup guide](./server/WSMS.Rentals.Api/README.md).

In VS Code, open two terminals from the repository root:

**Terminal 1 — API**

```powershell
dotnet run --project server\WSMS.Rentals.Api\WSMS.Rentals.Api.csproj
```

**Terminal 2 — React**

```powershell
npm install
npm run dev
```

Open the Vite URL it prints (commonly `http://localhost:5173`, though Vite may choose another port). The API is available at `http://localhost:5094` and Swagger at `http://localhost:5094/swagger`.

Register or sign in through the UI. Warehouse, inventory, stock movement, order, rental listing, booking, favorite, message, profile, and settings changes are sent to the API and saved to PostgreSQL when submitted. This is immediate database persistence; it does not push live updates to other open browsers. The API accepts local Vite development origins on `localhost` and `127.0.0.1`.

Data previously saved by the browser-only demo is not automatically copied into PostgreSQL. Recreate those records after signing in to the API-backed app.

## Pages
- `/` — Landing page
- `/dashboard` — Authenticated operations dashboard
- `/login` — Login form
- `/signup` — Registration form

You can navigate directly to these URLs or use the links/buttons.

## Styling and icons
- Tailwind CSS is configured and available.
- The UI styling is primarily in `src/index.css` for easy customization.
- Icons use `lucide-react`.
- Property and warehouse photos currently load from Unsplash URLs, so an internet connection is needed for those images.

## Data and authentication

Account and operational data are persisted by the ASP.NET Core API in PostgreSQL. The browser stores the JWT session token and UI-only preferences. Uploaded inventory and listing images are stored as data URLs in PostgreSQL; for production, use object storage. Development seed accounts in a newly initialized database use the password `Demo123!`: `admin`, `manager`, and `customer`.

See the [API setup guide](./server/WSMS.Rentals.Api/README.md) for database setup, API health checks, and Swagger details.
