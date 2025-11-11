# User Authentication

## Overview

Secure authentication system with JWT tokens and OAuth2 support.

## Problem

Users need to authenticate securely to access protected resources.

## Solution

JWT-based auth with refresh tokens, social login via OAuth2 (Google, GitHub), and MFA support.

## Key Features

- Email/password registration and login
- OAuth2 social login (Google, GitHub)
- JWT access tokens (15 min) + refresh tokens (7 days)
- Multi-factor authentication (TOTP)
- Password reset via email
- Session management

## API

```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/mfa/enable
POST /auth/mfa/verify
```

## Security

- bcrypt password hashing (cost 12)
- RS256 JWT signing
- Rate limiting (5 attempts/min)
- Account lockout after 5 failed attempts
- Secure HTTP-only cookies for refresh tokens

## Status

Implementation in progress. Phase 1 (basic auth) complete, OAuth2 integration next.
