# AutoMax Cloud Dashboard (V1)

## Run
From `cloud_api`:
```
npm start
```

## Route to open
```
http://localhost:3001/dashboard
```

## APIs powering widgets
- `GET /api/dashboard/summary`
  - Sales today, sales this month, active branches, active backends
- `GET /api/dashboard/sales/recent`
  - Recent synced sales (top 20)
- `GET /api/dashboard/backends`
  - Backend heartbeat table
- `GET /api/dashboard/sync-health`
  - Pending sync count, failed sync count, last synced sale time

## Seed / test steps
1) Ensure cloud API is running.
2) Ensure local backend is syncing sales to cloud.
3) Make a test sale from POS.
4) Refresh the dashboard to see recent sales and health updates.

## Superadmin password hash helper
Generate a bcrypt hash for `SUPERADMIN_PASSWORD_HASH`:
```
node scripts/hash-superadmin-password.js <password>
```
