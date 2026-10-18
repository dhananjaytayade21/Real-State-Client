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

## Data and authentication
Operational records and uploaded inventory/listing images are stored in the current browser's `localStorage`. Images are resized in the browser before saving. New installations start with empty inventories, warehouses, orders, rental listings, bookings and messages. Data is not synchronized between browsers or devices and is removed if browser storage is cleared.

The login and registration pages are UI demonstrations, not server-side authentication. They do not verify passwords or create server accounts. Connect the operation screens and account flows to an API and database before production use. Do not store passwords in browser storage; configure server-side authentication, authorization and validation.
