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
Forms are front-end demonstrations only. To make authentication, account creation, inventory, orders, rental bookings, notifications and saved listings persist, connect these UI actions to your ASP.NET Core Web API and database. Do not store plain-text passwords in the browser or local storage. Configure server-side authentication, authorization and validation before production use.
