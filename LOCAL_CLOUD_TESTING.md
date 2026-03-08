# LOCAL CLOUD TESTING

## Start the API
```
cd "C:\Users\jphir\Desktop\AutoMax Systems\AutoMax_Cloud_Dev\cloud_api"
npm start
```

## Test /health
```
curl.exe http://localhost:3001/health
```

Expected response:
```
{"ok":true,"service":"AutoMaxPOS Cloud","status":"OK","time":"...","db_ok":true,"db_name":"automax_cloud"}
```

## Rotate backend API key (dev)
```
npm run rotate-key
```
This writes the full key and IDs to `.env.local` (gitignored) and only prints the last 6 characters.

## Test protected heartbeat
```
curl.exe -X POST http://localhost:3001/api/cloud/backend/heartbeat \
  -H "Authorization: Bearer <API_KEY_FROM_.env.local>" \
  -H "X-Backend-Id: <BACKEND_ID>" \
  -H "X-Business-Id: <BUSINESS_ID>" \
  -H "X-Branch-Id: <BRANCH_ID>" \
  -H "Content-Type: application/json" \
  -d "{\"backend_version\":\"1.0.0\",\"machine_id\":\"demo\",\"local_ip\":\"192.168.1.10\",\"port\":3000,\"pending_sync_count\":2}"
```

## Test license verify
```
npm run test-license
```

## Configure local backend to call Cloud API
Base URL:
```
http://localhost:3001
```

Required headers for all /api/cloud routes:
- Authorization: Bearer <API_KEY>
- X-Backend-Id: <BACKEND_ID>
- X-Business-Id: <BUSINESS_ID>
- X-Branch-Id: <BRANCH_ID>

Heartbeat payload (example):
```
{
  "backend_version": "1.0.0",
  "machine_id": "machine-id",
  "local_ip": "192.168.1.155",
  "port": 3000,
  "pending_sync_count": 4
}
```

Sales sync payload shape (if /api/cloud/sales/sync is used):
```
{
  "sales": [
    {
      "sale_id": "local-id",
      "client_sale_id": "uuid",
      "receipt_no": "INV-001",
      "cashier_name": "John",
      "customer_name": "Walk-in",
      "subtotal": 100,
      "discount_amount": 0,
      "tax_amount": 0,
      "total_amount": 100,
      "paid_amount": 100,
      "change_amount": 0,
      "payment_method": "CASH",
      "created_at": "2026-03-06T10:10:00Z",
      "items": [
        {
          "sale_item_id": "uuid",
          "product_id": "uuid",
          "product_name": "Sugar",
          "qty": 1,
          "unit_price": 100,
          "line_total": 100
        }
      ]
    }
  ]
}
```

Expected success response (heartbeat):
```
{"ok":true,"message":"Heartbeat received"}
```
