# Cloud Dashboard Plan (v1)

Goal: Provide a minimal cloud dashboard for monitoring synced activity.

Widgets (initial):
1) Latest synced sales (list)
   - receipt_no, total_amount, cashier_name, created_at
2) Synced sales total (summary)
   - total sales amount, count
3) Branch list
   - branch name, business name
4) Last heartbeat time
   - per backend device
5) Pending queue count
   - per backend device (from heartbeat pending_sync_count)

Notes:
- Read‑only dashboard for now.
- No phone‑to‑cloud access.
- Only local backend pushes data to cloud.

