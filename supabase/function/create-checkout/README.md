# Create checkout Edge Function — implementation contract

This folder documents the server-side payment boundary; it intentionally does not fake a payment success or choose a provider without merchant credentials.

Implement a Supabase Edge Function that:
1. Requires a valid authenticated user JWT.
2. Accepts asset IDs only; fetches published prices from the database (never trusts client totals).
3. Creates a pending order and order items using a server-side privileged client.
4. Creates a checkout session with your selected payment gateway (for Bangladesh, evaluate providers such as SSLCOMMERZ or a merchant-approved alternative).
5. Stores the provider reference and returns only the checkout URL.
6. Verifies payment notifications using the provider's server-to-server verification/signature mechanism.
7. Marks an order paid only after verified provider confirmation, then creates download entitlements.
8. Makes webhook processing idempotent to prevent duplicate fulfillment.

Secrets belong in Supabase Edge Function secrets, never in browser JavaScript. Follow the payment provider's current integration docs and merchant onboarding requirements.
