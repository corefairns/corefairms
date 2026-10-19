# Secure download Edge Function — implementation contract

Create a Supabase Edge Function named `secure-download` that:
1. Requires an authenticated user JWT.
2. Receives one asset ID.
3. Confirms the requesting user owns a download entitlement connected to a verified paid order.
4. Confirms the asset is published and the original file exists in the PRIVATE `purchased-assets` bucket.
5. Creates a short-lived signed URL (for example, 60–300 seconds) and returns it.
6. Rate-limits download requests, logs failures and applies any license/download limits.
7. Never returns storage paths or permanent public links for original files.

Do not deploy a function that skips the entitlement and payment checks.
