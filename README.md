# Ginnys Hub Admin

React + Vite admin portal.

## Run
```bash
npm install
cp .env.example .env   # set VITE_API_URL to your backend, e.g. http://localhost:5000/api
npm run dev
```

## What's in it
- **Dashboard**: revenue, orders (with pending count), products (with low-stock count), customers, recent orders. The hints are links.
- **Products**: search, All / Low stock / Hidden filters, add/edit with validation (main image + gallery links, "was" price, badge), delete with confirmation.
- **Orders**: status filters with counts, search (name, phone, order number), detail panel (items, address, notes, payment, totals), status changes (cancelling asks for confirmation and returns items to stock).
- **Activity**: the audit trail. Filter by type, person/item/request id and date; expand an entry to see each field's old -> new value, IP and request id.
- **System**: server errors, warnings and events. Filter by level, search (incl. request id), expand for context and stack trace, optional 30s auto-refresh.
- Every screen has loading, error (with Try again) and empty states; failures show as toasts or inline messages instead of alerts. An expired session returns to sign-in.

## Deploy
Put anything referenced by an absolute path (`/ginnys-logo.webp`, `/placeholder.webp`) in `public/`, set `VITE_API_URL` on your host, and deploy a fresh `npm run build` (not an old `dist/`).
