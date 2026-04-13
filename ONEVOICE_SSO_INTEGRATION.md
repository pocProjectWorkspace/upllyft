# OneVoice → Upllyft SSO Integration Guide

**Status:** ✅ Live in production
**Last verified:** 2026-04-13
**Audience:** OneVoice engineering team

This document describes the production SSO endpoint Upllyft has implemented against the `UPLLYFT_INTEGRATION.md` specification provided by OneVoice. It covers how to construct SSO URLs, the JWT format Upllyft accepts, success and error flows, and how to test.

---

## 1. Summary

OneVoice users can be redirected into Upllyft in a single click. Upllyft accepts a short-lived, RS256-signed JWT issued by OneVoice, verifies it against OneVoice's public key, finds or provisions the user in Upllyft's database, issues Upllyft session tokens, and lands the user on their personalized dashboard.

No return channel is required — the flow is one-way (OneVoice → Upllyft).

---

## 2. High-level flow

```
┌─────────────┐   1. User clicks "Open Upllyft"
│  OneVoice   │ ─────────────────────────────────────►  generates RS256 JWT (120s TTL)
└─────────────┘
       │
       │   2. Browser redirect
       ▼
┌─────────────────────────────────────────────────────┐
│  GET https://upllyftapi-production.up.railway.app   │
│       /api/auth/sso/onevoice?token=<JWT>            │
└─────────────────────────────────────────────────────┘
       │
       │   3. Upllyft API:
       │      • Verifies RS256 signature (public key)
       │      • Validates iss=onevoice, aud=upllyft
       │      • Checks exp (with 30s clock skew tolerance)
       │      • Checks jti has not been replayed
       │      • Finds or creates the Upllyft user
       │      • Issues Upllyft access + refresh JWTs
       │
       ├──── success ──►  302 Location: https://app.safehaven-upllyft.com/callback
       │                                   ?accessToken=<...>&refreshToken=<...>
       │                                   ▼
       │                                user lands on dashboard
       │
       └──── failure ──►  302 Location: https://onevoice.sandbook.ai/helpdesk/sso-error
                                          ?reason=<error_code>
```

---

## 3. Production endpoint

| Environment | Endpoint |
|-------------|----------|
| **Production** | `https://upllyftapi-production.up.railway.app/api/auth/sso/onevoice?token={JWT}` |

**Method:** `GET`
**Authentication:** None on the endpoint itself — all trust comes from the JWT signature
**Response:** `302 Found` with a `Location` header
**CORS:** Not required — this is a browser-driven top-level navigation, not an AJAX request

If OneVoice deploys a separate staging environment in future, the same path `/api/auth/sso/onevoice` should be used against the corresponding staging API host; the endpoint is environment-agnostic at the code level.

---

## 4. JWT specification

### 4.1 Header

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

Only `RS256` is accepted. Any other algorithm is rejected with `token_invalid`.

### 4.2 Payload claims

| Claim | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `iss` | string | ✅ | Issuer — **must be the literal string `"onevoice"`** | `"onevoice"` |
| `aud` | string | ✅ | Audience — **must be the literal string `"upllyft"`** | `"upllyft"` |
| `sub` | string | ✅ | Stable user identifier from OneVoice | `"parent@example.com"` |
| `email` | string | ✅ | User email (used to look up or create the Upllyft account) | `"parent@example.com"` |
| `name` | string | ✅ | User full name | `"Sarah Ahmed"` |
| `role` | string | ✅ | User role in OneVoice (see [role mapping](#6-role-mapping)) | `"parent"` / `"agent"` / `"student"` |
| `jti` | string | ✅ | Unique token ID (UUID v4 recommended) — **each token may be used only once** | `"f47ac10b-58cc-4372-a567-0e02b2c3d479"` |
| `iat` | number | ✅ | Issued-at timestamp (Unix epoch seconds) | `1775570793` |
| `exp` | number | ✅ | Expiry timestamp (Unix epoch seconds) — **recommended: 120 seconds after `iat`** | `1775570913` |
| `school_name` | string | ⚪ | Optional school name context (reserved for future use) | `"Riyadh International School"` |

### 4.3 Example payload

```json
{
  "iss": "onevoice",
  "aud": "upllyft",
  "sub": "sarah.ahmed@riyadhschool.edu",
  "email": "sarah.ahmed@riyadhschool.edu",
  "name": "Sarah Ahmed",
  "role": "parent",
  "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "iat": 1775570793,
  "exp": 1775570913,
  "school_name": "Riyadh International School"
}
```

### 4.4 Signing

- Algorithm: **RS256** (RSA + SHA-256)
- Key size: 2048-bit minimum (3072+ recommended)
- OneVoice holds the private key; Upllyft holds the public key (`ONEVOICE_SSO_PUBLIC_KEY` env var in Railway)
- The RSA public key currently configured in Upllyft production is the one OneVoice delivered in the file `upllyft_sso_public_20260407_213946.pem`. If OneVoice rotates the key, please send the new PEM to the Upllyft team ahead of the cutover.

---

## 5. URL construction (OneVoice-side pseudocode)

### Node.js

```javascript
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const fs = require('fs');

const privateKey = fs.readFileSync('./onevoice_sso_private.pem');

function buildSsoUrl(user) {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      iss: 'onevoice',
      aud: 'upllyft',
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,                // 'parent' | 'agent' | 'student'
      jti: uuid(),
      iat: now,
      exp: now + 120,                 // 120-second validity
      school_name: user.schoolName,   // optional
    },
    privateKey,
    { algorithm: 'RS256' }
  );

  return `https://upllyftapi-production.up.railway.app/api/auth/sso/onevoice?token=${token}`;
}
```

### Python

```python
import jwt
import uuid
import time

with open('onevoice_sso_private.pem', 'rb') as f:
    private_key = f.read()

def build_sso_url(user):
    now = int(time.time())
    token = jwt.encode(
        {
            'iss': 'onevoice',
            'aud': 'upllyft',
            'sub': user.id,
            'email': user.email,
            'name': user.full_name,
            'role': user.role,            # 'parent' | 'agent' | 'student'
            'jti': str(uuid.uuid4()),
            'iat': now,
            'exp': now + 120,
            'school_name': user.school_name,
        },
        private_key,
        algorithm='RS256',
    )
    return f'https://upllyftapi-production.up.railway.app/api/auth/sso/onevoice?token={token}'
```

### ⚠️ Important

- **Generate tokens server-side only.** Never sign JWTs in browser code — the private key must never leave the OneVoice backend.
- **Generate a fresh token per click.** Tokens have a 120-second TTL and `jti` is one-time use; caching tokens will cause replay errors for the user.
- **Generate a unique `jti` per token.** Upllyft tracks used `jti`s in an in-memory cache for 150 seconds; re-using the same `jti` will be rejected with `token_replayed`.

---

## 6. Role mapping

OneVoice roles are mapped to Upllyft roles as follows:

| OneVoice `role` claim | Upllyft role | Notes |
|----------------------|--------------|-------|
| `parent` | `USER` | Standard parent account — full access to Mira, screenings, community, booking |
| `agent` | `EDUCATOR` | Professional educator account |
| `student` | `USER` | Maps to the default user role |
| *(any other value)* | `USER` | Safe fallback — unknown roles default to standard `USER` |

Upon first login, Upllyft:
1. Looks up the user by `email` (case-insensitive)
2. If found → logs them in (no role change — existing role is preserved)
3. If not found → creates a new user with the mapped Upllyft role and `ssoSource = "onevoice"`
4. `verificationStatus` is set to `VERIFIED` for `USER` role, `PENDING` for professional roles

---

## 7. Success flow

On successful verification, Upllyft responds with an HTTP 302 redirect:

```
HTTP/1.1 302 Found
Location: https://app.safehaven-upllyft.com/callback
           ?accessToken=<Upllyft access JWT, 15m TTL>
           &refreshToken=<Upllyft refresh JWT, 7d TTL>
```

The Upllyft frontend's `/callback` page stores both tokens (localStorage + cookies scoped to `.safehaven-upllyft.com`) and navigates the user to the main dashboard. These are **Upllyft session tokens**, not the OneVoice token — they are signed with Upllyft's own HMAC secret and used for all subsequent API calls.

Users provisioned via OneVoice SSO are additionally tagged with `ssoSource = "onevoice"` in the Upllyft database, which triggers a custom OneVoice-branded theme (blue primary, slate background) on the Feed and Screening pages. Standard Upllyft users continue to see the default theme.

---

## 8. Error handling

If verification fails at any stage, Upllyft responds with an HTTP 302 to the OneVoice error page, including a `reason` query parameter:

```
HTTP/1.1 302 Found
Location: https://onevoice.sandbook.ai/helpdesk/sso-error?reason=<error_code>
```

### Error codes

| Error code | When it fires | OneVoice should... |
|------------|---------------|---------------------|
| `token_expired` | The token's `exp` claim is in the past (with 30s clock skew tolerance) | Generate a fresh token and retry. Most common cause: token cached longer than 120s. |
| `token_invalid` | (a) Signature verification failed with the configured public key; (b) the algorithm is not RS256; (c) the token is malformed | Key rotation or signing mismatch — verify OneVoice is using the private key paired with the PEM file shared with Upllyft. |
| `token_replayed` | A token with the same `jti` has already been used successfully | Generate a fresh token with a new `jti`. Do not cache or reuse tokens. |
| `claims_invalid` | Required claim missing (`sub`, `email`, `name`, `role`, `jti`), or `iss != "onevoice"`, or `aud != "upllyft"` | Check the token payload matches section 4.2 exactly. |
| `user_suspended` | The Upllyft user exists but all their organization memberships are `SUSPENDED` or `DEACTIVATED` | User has been administratively blocked in Upllyft — contact Upllyft support. |

### No-token request

If the endpoint is called without a `token` query parameter, Upllyft returns `400 Bad Request` with:

```json
{
  "statusCode": 400,
  "message": "Token query parameter is required"
}
```

This is a client error on the OneVoice side (missing parameter in the URL) and will not redirect to the error page.

### Error redirect override

The error redirect base URL is configurable on the Upllyft side via the `ONEVOICE_ERROR_REDIRECT_URL` environment variable. Currently set to `https://onevoice.sandbook.ai/helpdesk/sso-error`. If OneVoice would like a different landing page for errors, please let the Upllyft team know and we will update the variable.

---

## 9. Security features

| Control | Implementation |
|---------|----------------|
| **Asymmetric signatures** | RS256 — only OneVoice can sign, Upllyft only verifies |
| **Short-lived tokens** | 120-second validity (recommended) — minimizes replay window |
| **Replay protection** | `jti` values stored in in-memory cache with 150-second TTL. Duplicate `jti` within the window is rejected |
| **Clock skew tolerance** | 30 seconds on `exp` check to handle minor clock drift between OneVoice and Upllyft servers |
| **Strict claim validation** | `iss` and `aud` must match literal strings `onevoice` / `upllyft`; missing required claims → `claims_invalid` |
| **Whitespace-tolerant PEM parser** | The configured public key is normalized (per-line trim + whole-value trim) before signature verification — resilient to accidental indent when the key is pasted from documentation |
| **Error redirects use 302 only** | No error details in response body, no database state exposed — only the reason code |
| **Transport security** | Endpoint is HTTPS-only (Railway-managed TLS) |

### Recommendations for OneVoice

- Keep the RSA private key in a secrets manager (AWS Secrets Manager, Vault, etc.), not in source control
- Rotate the key periodically (every 6–12 months) — send the new public PEM to the Upllyft team a few days before cutover and we'll coordinate a simultaneous update
- Log `jti` values on the OneVoice side too, so that if a user reports an SSO failure you can correlate with Upllyft's logs via the `jti`

---

## 10. Testing

### 10.1 Test token

A long-lived test token was generated by OneVoice on 2026-04-07 with the following payload:

```json
{
  "iss": "onevoice",
  "aud": "upllyft",
  "sub": "parent@example.com",
  "email": "parent@example.com",
  "name": "Sarah Ahmed",
  "role": "parent",
  "jti": "e271a917-c93f-4f8a-b6fa-ac51c927c4cd",
  "iat": 1775570793,
  "exp": 1776175593,
  "school_name": "Riyadh International School"
}
```

The full JWT is the same one shipped in section 9 of the original `UPLLYFT_INTEGRATION.md` spec. It is valid until **2026-04-14 22:06 UTC** and has been verified working against production.

### 10.2 Quick smoke test (curl)

```bash
curl -s -o /dev/null -w "status=%{http_code}\nredirect=%{redirect_url}\n" \
  "https://upllyftapi-production.up.railway.app/api/auth/sso/onevoice?token=<JWT>"
```

**Expected success output:**
```
status=302
redirect=https://app.safehaven-upllyft.com/callback?accessToken=eyJ...&refreshToken=eyJ...
```

**Expected failure output (e.g. replayed jti):**
```
status=302
redirect=https://onevoice.sandbook.ai/helpdesk/sso-error?reason=token_replayed
```

### 10.3 Browser test

Open the SSO URL with the test token directly in a browser. Expected behavior:

1. Brief flash of the Upllyft callback page ("Finalizing your login…")
2. User lands on `https://app.safehaven-upllyft.com/` as `Sarah Ahmed`
3. Because this test user is fresh, they are auto-routed into the onboarding flow
4. Navigating to `https://community.safehaven-upllyft.com` or `https://screening.safehaven-upllyft.com` shows the OneVoice-branded blue theme (instead of Upllyft's default pink/teal)

### 10.4 Replay behavior

Because `jti` is one-time-use, the second identical request will be rejected:

```
status=302
redirect=https://onevoice.sandbook.ai/helpdesk/sso-error?reason=token_replayed
```

This is correct behavior. Each browser click in OneVoice must generate a fresh token with a new `jti`.

### 10.5 Cross-subdomain auth

All Upllyft web apps share authentication via cookies scoped to `.safehaven-upllyft.com`:

| App | URL |
|-----|-----|
| Main (dashboard, profile, onboarding, Mira) | `https://app.safehaven-upllyft.com` |
| Community / Feed | `https://community.safehaven-upllyft.com` |
| Screening / Milestone Map | `https://screening.safehaven-upllyft.com` |
| Booking (therapist marketplace) | `https://booking.safehaven-upllyft.com` |
| Resources / Learning | `https://resources.safehaven-upllyft.com` |
| Cases | `https://cases.safehaven-upllyft.com` |

One SSO click logs the user into all of them simultaneously.

---

## 11. Implementation status & end-to-end verification

**Status:** ✅ Live in production on commit `67a011d`.

The following was verified on **2026-04-13** using the OneVoice test token:

| Check | Result |
|-------|--------|
| RS256 signature verification against OneVoice public key | ✅ |
| `iss`/`aud`/claims validation | ✅ |
| 120-second token TTL with 30s clock skew tolerance | ✅ |
| `jti` replay protection (in-memory, 150s TTL) | ✅ |
| User find-or-create in production database | ✅ — `parent@example.com` created with role `USER`, `ssoSource = "onevoice"` |
| Upllyft access + refresh token issuance | ✅ |
| 302 redirect to frontend callback with tokens in query params | ✅ |
| Frontend callback stores tokens and lands on dashboard | ✅ |
| Cross-subdomain session persistence (community, screening) | ✅ |
| OneVoice theme override applied on Feed and Screening pages | ✅ |
| Error redirect to OneVoice helpdesk on verification failure | ✅ |

Screenshots of the verified flow are stored in `.playwright-mcp/onevoice-02-community-feed.png` and `.playwright-mcp/onevoice-03-screening.png` in the Upllyft repo.

---

## 12. Operational notes

### RSA public key configuration

The current public key is stored in the Railway environment variable `ONEVOICE_SSO_PUBLIC_KEY` on the `@upllyft/api` service. It contains the full PEM (including `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` headers). The key currently deployed is:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2Dx8a9CdBbSQzzLbQp0T
5xzKRxIonnyOqouTMI8fXf0ZSiEsIaSzsghjoMtdBXYAzxdGhAuElTfPx57btrHO
XT0zbtMHZ9UgVsh2Ue6+4x1d/zCDYEXp7IYU6waP130GAc2Z5VZUegNWR+Bf+3R9
qeTn1sF3UNdTEcTEMKQRpvCEw1oZQwuR5ReDfnX+fA7HKse5clIBDhy5e/K7l31U
H5F5Uo7QUj1+H+LLctALsgU4KyvHKCOg39y5y0nMwDerD1/divqtQKh0YTG4FJOe
3IKOnrYP8kIVNi1BMLvS8rc8gosumul5HmIcj1S2R25JOQkvinV100GpkV2/SR1A
ZwIDAQAB
-----END PUBLIC KEY-----
```

This matches the PEM OneVoice delivered in `upllyft_sso_public_20260407_213946.pem`. To rotate, send the new public PEM to the Upllyft team and we will update the Railway environment variable without any code change.

### Source code references

For transparency, the Upllyft implementation lives at:

| File | Purpose |
|------|---------|
| `apps/api/src/auth/sso/onevoice-sso.controller.ts` | `GET /auth/sso/onevoice` endpoint, 302 redirect logic |
| `apps/api/src/auth/sso/onevoice-sso.service.ts` | JWT verification, jti replay cache, role mapping, user find-or-create |
| `apps/api/prisma/schema.prisma` — `User.ssoSource` field | DB tracking of SSO origin |
| `apps/web-community/src/app/globals.css` — `html[data-theme="onevoice"]` block | Community feed theme override |
| `apps/web-screening/src/app/globals.css` — `html[data-theme="onevoice"]` block | Screening page theme override |
| `packages/api-client/src/hooks/useAuth.tsx` | Sets `document.documentElement.dataset.theme = ssoSource` |

### Supported environment variables on the Upllyft side

| Variable | Purpose | Default |
|----------|---------|---------|
| `ONEVOICE_SSO_PUBLIC_KEY` | Full PEM public key used for RS256 signature verification | *(required — no default)* |
| `ONEVOICE_ERROR_REDIRECT_URL` | Base URL for error redirects | `https://onevoice.sandbook.ai/helpdesk/sso-error` |
| `FRONTEND_URL` | Base URL for success redirects (the `/callback` path is appended automatically) | `http://localhost:3000` |

---

## 13. Open questions / next steps

None from the Upllyft side — the implementation is complete, tested, and live. Items where we need input from OneVoice:

1. **Key rotation cadence** — please let us know your key rotation schedule so we can plan coordinated updates
2. **Production `jti` audit log on OneVoice side** — for cross-correlation when debugging user-reported failures
3. **Real OneVoice user onboarding flow** — when OneVoice is ready to point a real user at production, please ping the Upllyft team so we can monitor the first few sessions in our logs

---

## 14. Contact

For any integration questions, key rotations, or issues:

- **Upllyft engineering team:** *(please fill in your team's contact channel — Slack, email, ticketing link)*
- **Repository:** `https://github.com/pocProjectWorkspace/upllyft`
- **API base URL (production):** `https://upllyftapi-production.up.railway.app`
- **Frontend base URL (production):** `https://app.safehaven-upllyft.com`

---

*Document version: 1.0 — 2026-04-13 — prepared against commits `ded8f38` (SSO initial), `67a011d` (whitespace hardening), `55236be` (OneVoice theme).*
