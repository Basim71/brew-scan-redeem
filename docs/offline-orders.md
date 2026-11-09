# KOB offline integration

## Customer device registration
While signed in and online, call `customer_register_device_key` with `_key_id` (UUID), `_public_key` (base64 SPKI DER P-256), and `_platform` (`ios` or `android`). Response: `{ "success": true }`. A key ID is immutable and cannot replace another customer's key or reactivate a revoked key. Use a new UUID for a new key. Keep private keys in Secure Enclave / Android Keystore, never send them to KOB.

## QR and BLE token verification
Cashiers call `cashier_get_active_device_keys()` while online. It returns `{ customer_id, key_id, public_key }[]`, scoped to active subscriptions in companies the signed-in cashier can serve. The web cashier caches successful downloads per branch and refreshes every minute while connected. Unknown or revoked keys are removed on the next successful refresh; fully disconnected devices cannot learn about revocations until reconnecting.

Token fields: `v=1`, `sid`, `cid`, `kid`, `name`, `plan`, `max`, `used_today`, `day`, `nonce`, `exp`, `sig`.

Sign UTF-8 bytes of exactly:
```text
KOB1|sid|cid|kid|max|used_today|day|nonce|exp
```
UUIDs must be lowercase. Use ECDSA P-256 / SHA-256, raw 64-byte `r || s`, ordinary base64 signature. `exp` is integer Unix seconds; `day` uses Asia/Riyadh. `name` and `plan` are display labels, not authenticated entitlements. The browser rejects malformed, unsigned, unknown-key, invalid-signature, expired, reused and daily-limit tokens, and checks again immediately before serving.

## Synchronization
Call `cashier_sync_offline_orders({ _orders: [...] })` after reconnecting. Each row contains `offline_sync_id`, `subscription_id`, `branch_id`, `drink_type_id`, `served_at`, `method`, `selected_options`, `customer_note`. Up to 500 rows; timestamp within 7 days and no more than 10 minutes ahead. The server checks cashier authorization, subscription, covered branch and drink, locks the subscription, and counts pending plus approved orders for the served Riyadh day. Reaching `max_drinks_per_day` yields `daily_limit_reached`; identical retries yield `duplicate`. It does not trust client token cup counts.

Offline service cannot guarantee prevention of simultaneous spending at two disconnected cashiers. Local nonce/usage tracking limits repeats on one cashier; the server resolves conflicts on sync. A customer-held signature proves control of a registered key, not server-issued entitlement. Server validation remains authoritative.

## Native BLE contract (not implemented in browser)
- Advertisement name: `KOB`; customer explicitly starts it; stop after 45 seconds.
- Service: `C91DF692-0D70-44D7-BD62-B5D451115B13`
- Token: `CE78CBAF-408B-48E0-9AC2-ECF00A208522` — read, supports long reads.
- Receipt: `F14F16EC-388F-4AB3-BB13-F5499A6A583F` — write with response.

Receipt shape:
```json
{ "offline_sync_id": "uuid", "sid": "uuid", "branch_id": "uuid", "served_at": "ISO8601", "sig": "cashier signature" }
```
Customer verifies the receipt using a trusted cashier public key before recording it in secure storage and updating usage shared by QR/BLE. Cashier key registration, receipt signing/trust distribution, and return-QR receipt scanning require native/client work and are not implemented by this web change. Opening Apple Wallet alone does not start BLE advertising from the customer app.

## Realtime
`orders` is in the Realtime publication. Signed-in customers can SELECT their own orders through `customer_app_is_own_customer`. Client apps still need to subscribe and remove channels on unmount.