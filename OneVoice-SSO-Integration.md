# OneVoice x Upllyft — SSO Integration Guide

## Overview

This document outlines the SSO (Single Sign-On) integration between OneVoice and Upllyft. The approach uses a short-lived signed JWT for seamless user handoff from OneVoice into the Upllyft platform.

### How It Works

```
OneVoice                                 Upllyft
────────                                 ───────
1. User logs into OneVoice
2. User clicks "Open Upllyft"
3. OneVoice generates a short-lived
   JWT (signed, 120s expiry)
4. Redirect browser to:
   https://<upllyft-domain>/api/auth/sso/onevoice?token=<JWT>
                                         5. Verify JWT signature & expiry
                                         6. Validate claims (iss, aud, jti)
                                         7. Find or create user in Upllyft
                                         8. Issue Upllyft session tokens
                                         9. Redirect user to Upllyft dashboard
```

---

## Prerequisites — What We Need From OneVoice

### 1. Signing Method

We recommend **RS256 (asymmetric signing)**. OneVoice signs the JWT with a private key, Upllyft verifies with the corresponding public key. This avoids shared secret management and allows independent key rotation.

If HS256 (shared secret) is preferred, we can support that — but RS256 is the recommended approach.

### 2. Public Key or JWKS Endpoint

Provide one of the following:

- **Option A (preferred):** A JWKS (JSON Web Key Set) endpoint URL that Upllyft can fetch public keys from. This allows key rotation without coordination between teams.
- **Option B:** A static RSA public key in PEM format.

### 3. JWT Payload Specification

The JWT issued by OneVoice must include the following claims:

| Claim         | Required | Type   | Description                                                      |
| ------------- | -------- | ------ | ---------------------------------------------------------------- |
| `iss`         | Yes      | string | Issuer identifier (e.g. `"onevoice"`)                           |
| `sub`         | Yes      | string | User's unique ID in OneVoice                                    |
| `aud`         | Yes      | string | Must be `"upllyft"`                                             |
| `email`       | Yes      | string | User's email address                                            |
| `name`        | Yes      | string | User's display name                                             |
| `jti`         | Yes      | string | Unique token ID (UUID v4) — used to prevent replay attacks      |
| `iat`         | Yes      | number | Issued-at timestamp (Unix epoch seconds)                        |
| `exp`         | Yes      | number | Expiry timestamp — must be no more than **120 seconds** from `iat` |
| `role`        | Optional | string | User's role in OneVoice (e.g. `"parent"`, `"teacher"`)          |
| `school_name` | Optional | string | School name for context                                         |
| `child_name`  | Optional | string | Child's name, if applicable                                     |

#### Example JWT Payload

```json
{
  "iss": "onevoice",
  "sub": "usr_abc123",
  "aud": "upllyft",
  "email": "sarah@example.com",
  "name": "Sarah Ahmed",
  "role": "parent",
  "school_name": "Riyadh International School",
  "child_name": "Omar",
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1720000000,
  "exp": 1720000120
}
```

### 4. Redirect URLs

OneVoice will redirect users to our SSO endpoint. We will provide environment-specific URLs:

| Environment | SSO Endpoint                                                    |
| ----------- | --------------------------------------------------------------- |
| Staging     | `https://staging-api.safehaven-upllyft.com/api/auth/sso/onevoice?token=<JWT>` |
| Production  | `https://api.safehaven-upllyft.com/api/auth/sso/onevoice?token=<JWT>`         |

> Final URLs will be confirmed once staging is ready.

### 5. Error Redirect URL

If SSO fails (expired token, invalid signature, etc.), Upllyft needs a URL to redirect the user back to on the OneVoice side. Please provide:

| Environment | Error Redirect URL         |
| ----------- | -------------------------- |
| Staging     | `https://staging.onevoice.com/sso-error?reason={error_code}` |
| Production  | `https://onevoice.com/sso-error?reason={error_code}`         |

Possible `error_code` values:

| Code              | Meaning                                |
| ----------------- | -------------------------------------- |
| `token_expired`   | JWT has passed its expiry time         |
| `token_invalid`   | Signature verification failed          |
| `token_replayed`  | This token has already been used       |
| `claims_invalid`  | Missing or incorrect required claims   |
| `user_suspended`  | User's Upllyft account is suspended    |

---

## Questions for OneVoice Team

### User Lifecycle

1. **New vs existing users** — Will users coming from OneVoice always be new to Upllyft, or might some already have Upllyft accounts?
2. **Account linking** — If a user with the same email already exists on Upllyft, should we automatically link the accounts or require confirmation?
3. **Deactivation** — When a user leaves OneVoice, do you need a way to deactivate their Upllyft access? (e.g. a webhook or API call)
4. **Direction** — Is this one-way (OneVoice → Upllyft) only, or do you also need Upllyft → OneVoice navigation?

### Roles & Access

5. **Role mapping** — What roles exist in OneVoice? We will map them to Upllyft roles (`USER` for parents, `EDUCATOR` for teachers, etc.).
6. **Feature scope** — Should OneVoice users have access to all Upllyft features, or a restricted subset?

### Technical

7. **Key rotation** — How often do you plan to rotate signing keys? A JWKS endpoint makes this seamless.
8. **Testing** — Can you provide a test JWT generator or sample signed tokens for us to validate during development?
9. **Rate / volume** — How many SSO logins per day do you expect at launch? (for capacity planning)

### Branding & UX

10. **Back navigation** — Should there be a "Back to OneVoice" link visible within Upllyft for SSO users?

---

## Security Summary

| Measure               | Detail                                                             |
| --------------------- | ------------------------------------------------------------------ |
| Token lifetime        | Max 120 seconds — transit token only, not a session token          |
| One-time use          | Each `jti` is tracked; tokens cannot be replayed                   |
| Signature verification| RS256 asymmetric verification (recommended) or HS256 shared secret |
| Audience validation   | Token must have `aud: "upllyft"`                                   |
| Issuer validation     | Token must have `iss: "onevoice"`                                  |
| Transport security    | HTTPS required for all redirect URLs in production                 |
| Clock skew tolerance  | 30 seconds leeway on expiry checks                                |

---

## Timeline & Next Steps

| Step | Owner     | Description                                      |
| ---- | --------- | ------------------------------------------------ |
| 1    | OneVoice  | Provide answers to the questions above            |
| 2    | OneVoice  | Provide public key or JWKS endpoint URL           |
| 3    | OneVoice  | Provide error redirect URLs                       |
| 4    | Upllyft   | Build SSO endpoint + user provisioning            |
| 5    | Upllyft   | Share staging SSO endpoint URL                    |
| 6    | OneVoice  | Integrate redirect into your app (staging)        |
| 7    | Both      | End-to-end testing on staging                     |
| 8    | Both      | Go-live on production                             |