-- AutoMaxPOS Cloud migrations

Recommended (idempotent):
  npm run migrate

Manual:
1) Create the database and enable pgcrypto.
2) Run the SQL files in order (001_*.sql, 002_*.sql, ...).

Example:
  psql -d automax_cloud -f migrations/001_init.sql
