# WMS Rentals — React UI

Responsive React + Vite implementation inspired by the supplied WMS Rentals reference screens. Includes:
- Public landing page
- Dashboard layout with warehouse inventory, rentals, activity and quick actions
- Login page
- Registration page with client-side required-field and password-match validation
- Responsive layouts for desktop, tablet and mobile

## Requirements
- Node.js 18+ (recommended)
- npm

## Run in VS Code
1. Extract this ZIP.
2. Open the `wms-rentals-react` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Pages
- `/` — Landing page
- `/dashboard` — Demo dashboard
- `/login` — Login form
- `/signup` — Registration form

You can navigate directly to these URLs or use the links/buttons.

## Styling and icons
- Tailwind CSS is configured and available.
- The UI styling is primarily in `src/index.css` for easy customization.
- Icons use `lucide-react`.
- Property and warehouse photos currently load from Unsplash URLs, so an internet connection is needed for those images.

## Important: backend is not connected
Login and registration are front-end demos: they save only the username in browser storage and open a personalized dashboard without calling an API. They do not authenticate credentials or create a server-side account. Inventory, orders, rental bookings, notifications and saved listings are also demo UI and do not persist. Connect these actions to your ASP.NET Core Web API and database before production use. Do not store passwords in browser storage; configure server-side authentication, authorization and validation.
