# OneVoice x Upllyft — SSO Integration Guide

This document provides all technical information required for SSO integration between OneVoice and Upllyft platform.

---

## 1. Integration Overview

**Integration Method:** JWT (JSON Web Token) based Single Sign-On  
**Signature Algorithm:** RS256 (RSA Asymmetric Encryption)  
**Token Validity:** 120 seconds  
**Navigation Direction:** One-way (OneVoice → Upllyft)

---

## 2. SSO Flow

```
1. User clicks "Open Upllyft" button in OneVoice
2. OneVoice backend generates short-lived JWT token (120s validity)
3. Browser redirects to: https://<upllyft-domain>/api/auth/sso/onevoice?token=<JWT>
4. Upllyft verifies JWT signature and expiry
5. Upllyft creates/finds user and establishes session
6. User enters Upllyft Dashboard
```

---

## 3. RSA Public Key (for JWT Signature Verification)

**Algorithm:** RS256  
**Key Format:** PEM

Provided in upllyft_sso_public_20260407_213946.pem

---

## 4. JWT Token Specification

### 4.1 JWT Header

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

### 4.2 JWT Payload

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `iss` | string | ✅ | Issuer (fixed value) | `"onevoice"` |
| `aud` | string | ✅ | Audience (fixed value) | `"upllyft"` |
| `sub` | string | ✅ | User unique identifier (User ID) | `"user@example.com"` |
| `email` | string | ✅ | User email address | `"sarah@example.com"` |
| `name` | string | ✅ | User full name | `"Sarah Ahmed"` |
| `role` | string | ✅ | User role | `"agent"` / `"parent"` / `"student"` |
| `jti` | string | ✅ | Token unique ID (UUID v4) | `"550e8400-e29b-41d4-a716-446655440000"` |
| `iat` | number | ✅ | Issued at timestamp (Unix epoch) | `1720000000` |
| `exp` | number | ✅ | Expiration timestamp (Unix epoch) | `1720000120` |
| `school_name` | string | ⚪ | School name (reserved) | `"Riyadh International School"` |

### 4.3 JWT Payload Examples

```json
{
  "iss": "onevoice",
  "aud": "upllyft",
  "sub": "agent@onevoice.com",
  "email": "agent@onevoice.com",
  "name": "Ahmad Ali",
  "role": "agent",
  "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "iat": 1720000000,
  "exp": 1720000120
}
```

---

## 5. Upllyft SSO Endpoint Configuration [To be provided]

OneVoice needs to configure the following SSO endpoint URLs: 

### 5.1 Staging Environment

```
https://staging-api.safehaven-upllyft.com/api/auth/sso/onevoice?token={JWT_TOKEN}
```

### 5.2 Production Environment

```
https://api.safehaven-upllyft.com/api/auth/sso/onevoice?token={JWT_TOKEN}
```

---

## 6. Error Handling

### 6.1 Error Redirect

If SSO verification fails, please redirect users to the following URL with error reason:

```
https://onevoice.sandbook.ai/helpdesk/sso-error?reason={error_code}
```

### 6.2 Error Codes

| Error Code | Description | Upllyft Return Scenario |
|------------|-------------|-------------------------|
| `token_expired` | Token has expired | `exp` time has passed |
| `token_invalid` | Token signature invalid | RS256 verification failed |
| `token_replayed` | Token already used | `jti` duplicate usage |
| `claims_invalid` | Token claims invalid | Missing required fields or incorrect values |
| `user_suspended` | User account suspended | Upllyft-side user status abnormal |

---

## 7. Security Mechanisms

### 7.1 Token Lifecycle

- **Validity:** 120 seconds (from `iat` timestamp)
- **Purpose:** Transport authentication only, not a session token
- **One-time use:** Each `jti` can only be used once

### 7.2 Replay Attack Prevention

OneVoice tracks all used `jti` values to ensure each token can only be used once. We recommend Upllyft implement the same mechanism:

1. After verifying token, store `jti` in cache (Redis/Memcached)
2. Set TTL to 150 seconds (slightly longer than token validity)
3. Reject subsequent requests with the same `jti`

### 7.3 Clock Skew Tolerance

We recommend allowing 30 seconds of clock skew tolerance when verifying `exp`.

### 7.4 Signature Verification

Use the provided RSA public key to verify JWT signature:

**Python Example:**

```python
import jwt

public_key = """-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"""

try:
    payload = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience="upllyft",
        issuer="onevoice",
        options={
            "verify_signature": True,
            "verify_exp": True,
            "verify_aud": True,
            "verify_iss": True
        }
    )
    # Token is valid, use payload data
except jwt.ExpiredSignatureError:
    # Token has expired
    return error_response("token_expired")
except jwt.InvalidSignatureError:
    # Invalid signature
    return error_response("token_invalid")
except jwt.InvalidAudienceError:
    # Audience mismatch
    return error_response("claims_invalid")
except jwt.InvalidIssuerError:
    # Issuer mismatch
    return error_response("claims_invalid")
```

**Node.js Example:**

```javascript
const jwt = require('jsonwebtoken');

const publicKey = `-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----`;

try {
  const payload = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    audience: 'upllyft',
    issuer: 'onevoice'
  });
  // Token is valid, use payload data
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    return errorResponse('token_expired');
  } else if (err.name === 'JsonWebTokenError') {
    return errorResponse('token_invalid');
  }
}
```

---

## 8. User Management Q&A

### 8.1 New Users vs Existing Users

**Scenario:** Users may be accessing Upllyft for the first time, or may already have Upllyft accounts.

**Recommended Handling:**
- Search for Upllyft user by `email` field
- If user doesn't exist, auto-create new account
- If user exists, log them in directly

### 8.2 Account Linking

**Question:** What if email already exists from another source?

**Recommendation:**
- Auto-link accounts (recommended approach)
- Mark user record with source as "OneVoice"
- Allow user to login via both SSO and original method

---

## 9. Test Token

GENERATED JWT TOKEN
================================================================================
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJvbmV2b2ljZSIsImF1ZCI6InVwbGx5ZnQiLCJqdGkiOiJlMjcxYTkxNy1jOTNmLTRmOGEtYjZmYS1hYzUxYzkyN2M0Y2QiLCJpYXQiOjE3NzU1NzA3OTMsImV4cCI6MTc3NjE3NTU5Mywic3ViIjoicGFyZW50QGV4YW1wbGUuY29tIiwiZW1haWwiOiJwYXJlbnRAZXhhbXBsZS5jb20iLCJuYW1lIjoiU2FyYWggQWhtZWQiLCJyb2xlIjoicGFyZW50Iiwic2Nob29sX25hbWUiOiJSaXlhZGggSW50ZXJuYXRpb25hbCBTY2hvb2wifQ.b0P-UFe0mEQgyVBGl1q2BBLYl0ZI6YokgEKgMiAnhFyCQgxYU4he2gHS-rRyI_c25HnvYEgPUQ1N-umHYSGdA5Krvsk59YQQPArTFAXEor4ndzaRB9Fe9VDpyc35ZjmB4op5KUnOwaHew2yKenWE-6b6DqrrlF-zvkXtEz4uoPfT_LcQOtUThduFXgdFIdAOVSN3d_8_BeI9AHx8wq4jvpV5cVHNc4Sm1_jO7YTVLQ_pX9VLNN_3bKYS-grtPE7U-QL3kw21_h9r-ZNMrUJlZT8Seu5IxBuyvdTa-YQgCOQVPyTFOCTA9JNTD2XzLlQbhXeSJcgViN1DrhamXymUFg

================================================================================

TOKEN PAYLOAD (Decoded)
================================================================================
{
  "iss": "onevoice",
  "aud": "upllyft",
  "jti": "e271a917-c93f-4f8a-b6fa-ac51c927c4cd",
  "iat": 1775570793,
  "exp": 1776175593,
  "sub": "parent@example.com",
  "email": "parent@example.com",
  "name": "Sarah Ahmed",
  "role": "parent",
  "school_name": "Riyadh International School"
}

================================================================================
TOKEN TIMING
================================================================================
Issued At:  2026-04-07 22:06:33 UTC
Expires At: 2026-04-14 22:06:33 UTC
Valid For:  604800 seconds

================================================================================
SSO REDIRECT URL (Staging)
================================================================================
https://staging-api.safehaven-upllyft.com/api/auth/sso/onevoice?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJvbmV2b2ljZSIsImF1ZCI6InVwbGx5ZnQiLCJqdGkiOiJlMjcxYTkxNy1jOTNmLTRmOGEtYjZmYS1hYzUxYzkyN2M0Y2QiLCJpYXQiOjE3NzU1NzA3OTMsImV4cCI6MTc3NjE3NTU5Mywic3ViIjoicGFyZW50QGV4YW1wbGUuY29tIiwiZW1haWwiOiJwYXJlbnRAZXhhbXBsZS5jb20iLCJuYW1lIjoiU2FyYWggQWhtZWQiLCJyb2xlIjoicGFyZW50Iiwic2Nob29sX25hbWUiOiJSaXlhZGggSW50ZXJuYXRpb25hbCBTY2hvb2wifQ.b0P-UFe0mEQgyVBGl1q2BBLYl0ZI6YokgEKgMiAnhFyCQgxYU4he2gHS-rRyI_c25HnvYEgPUQ1N-umHYSGdA5Krvsk59YQQPArTFAXEor4ndzaRB9Fe9VDpyc35ZjmB4op5KUnOwaHew2yKenWE-6b6DqrrlF-zvkXtEz4uoPfT_LcQOtUThduFXgdFIdAOVSN3d_8_BeI9AHx8wq4jvpV5cVHNc4Sm1_jO7YTVLQ_pX9VLNN_3bKYS-grtPE7U-QL3kw21_h9r-ZNMrUJlZT8Seu5IxBuyvdTa-YQgCOQVPyTFOCTA9JNTD2XzLlQbhXeSJcgViN1DrhamXymUFg

================================================================================
VERIFICATION STATUS
================================================================================
✓ Token signature is VALID
✓ Token has not expired
✓ Issuer and audience are correct
