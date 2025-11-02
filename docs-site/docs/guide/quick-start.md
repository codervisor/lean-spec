---
id: 'quick-start'
title: 'Quick Start'
sidebar_position: 3
---
# Quick Start

This tutorial will walk you through creating and managing your first spec with LeanSpec.

## Prerequisites

Make sure you have LeanSpec installed:

```bash
npm install -g lean-spec
```

## Step 1: Initialize LeanSpec

Create a new directory or navigate to an existing project:

```bash
mkdir my-project
cd my-project
lspec init
```

Choose "Quick start" when prompted, and LeanSpec will set up everything for you.

## Step 2: Create Your First Spec

Let's create a spec for a user authentication feature:

```bash
lspec create user-authentication
```

You should see output like:

```
✓ Created: specs/20251102/001-user-authentication/
  Edit: specs/20251102/001-user-authentication/README.md
```

## Step 3: Edit the Spec

Open the created `README.md` file in your editor:

```bash
# Use your preferred editor
code specs/20251102/001-user-authentication/README.md
# or
vim specs/20251102/001-user-authentication/README.md
```

You'll see a template like this:

```markdown
---
status: planned
created: 2025-11-02
---

# user-authentication

> **Status**: 📅 Planned · **Created**: 2025-11-02

## Overview

[Describe what this feature is and why it's needed]

## Goal

[What problem does this solve? Why now?]

## Key Scenarios

[The critical user journeys that must succeed]

## Acceptance Criteria

- [ ] [Specific, testable condition]
- [ ] [Another condition]

## Technical Approach

[High-level technical direction]

## Non-Goals

[What we're explicitly NOT doing]
```

Fill it in with your actual requirements:

```markdown
---
status: planned
created: 2025-11-02
tags: [security, api]
priority: high
---

# User Authentication

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-02

## Overview

Implement secure user authentication system for the mobile app using JWT tokens.

## Goal

Enable users to securely log in and maintain authenticated sessions. This is blocking 
the mobile app release scheduled for next month.

## Key Scenarios

1. **Successful Login**: User enters valid email/password → receives JWT token
2. **Protected Access**: User accesses API with valid token → gets data
3. **Token Expiry**: User's token expires → receives 401, must re-authenticate
4. **Invalid Credentials**: User enters wrong password → receives clear error message

## Acceptance Criteria

- [ ] POST /api/auth/login endpoint accepts email/password
- [ ] Login returns JWT token with 24-hour expiration
- [ ] All protected endpoints verify JWT signature
- [ ] Expired/invalid tokens return 401 with clear error
- [ ] Passwords are hashed with bcrypt (min 10 rounds)
- [ ] Rate limiting: max 5 login attempts per minute per IP

## Technical Approach

- Use jsonwebtoken library for JWT generation/verification
- Store user credentials in PostgreSQL with bcrypt hashing
- Implement rate limiting middleware with redis
- Add JWT verification middleware for protected routes

## Non-Goals

- Social login (Google, GitHub) - planned for v2
- Password reset functionality - separate spec
- Two-factor authentication - not needed for MVP
- Session persistence across devices - future feature
```

## Step 4: List Your Specs

View all specs in your project:

```bash
lspec list
```

Output:

```
=== Specs ===

📅 specs/20251102/001-user-authentication
   Created: 2025-11-02 · Priority: high · Tags: security, api
```

### Filter by Status

```bash
lspec list --status=planned
lspec list --status=in-progress
```

### Filter by Tags

```bash
lspec list --tag=api
lspec list --tag=security
```

### Filter by Priority

```bash
lspec list --priority=high
lspec list --priority=critical
```

### Combine Filters

```bash
lspec list --status=planned --priority=high --tag=api
```

## Step 5: Update Spec Status

As you start working on the feature, update its status:

```bash
lspec update specs/20251102/001-user-authentication --status=in-progress
```

You can also update other fields:

```bash
# Update priority
lspec update specs/20251102/001-user-authentication --priority=critical

# Add or update tags
lspec update specs/20251102/001-user-authentication --tags=security,api,mvp

# Update multiple fields at once
lspec update specs/20251102/001-user-authentication --status=in-progress --priority=critical
```

## Step 6: Create More Specs

Let's create a few more specs to see the organization:

```bash
lspec create password-reset
lspec create user-profile-api
lspec create rate-limiting
```

Now list them:

```bash
lspec list
```

You'll see all specs organized by date:

```
=== Specs ===

📅 specs/20251102/001-user-authentication
   Created: 2025-11-02 · Priority: high · Tags: security, api

📅 specs/20251102/002-password-reset
   Created: 2025-11-02

📅 specs/20251102/003-user-profile-api
   Created: 2025-11-02

📅 specs/20251102/004-rate-limiting
   Created: 2025-11-02
```

## Step 7: Search Specs

Use full-text search to find specs:

```bash
lspec search "authentication"
lspec search "JWT token"
lspec search "password"
```

## Step 8: Archive Completed Work

Once you've completed a spec, archive it:

```bash
lspec update specs/20251102/001-user-authentication --status=complete
lspec archive specs/20251102/001-user-authentication
```

This moves the spec to `archive/YYYYMMDD/` to keep your active workspace clean.

## Advanced: Custom Fields

You can add custom fields to track project-specific metadata:

Edit `.lspec/config.json`:

```json
{
  "frontmatter": {
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string"
    }
  }
}
```

Now create specs with custom fields:

```bash
lspec create new-feature --field epic=PROJ-123 --field sprint=42 --field estimate=large
```

Filter by custom fields:

```bash
lspec list --field epic=PROJ-123
lspec search "API" --field sprint=42
```

## What's Next?

You now know the basics of LeanSpec! Here's what to explore next:

- **[Templates](/docs/guide/templates)** - Customize spec structure for your workflow
- **[Custom Fields](/docs/guide/custom-fields)** - Add project-specific metadata
- **[AI Integration](/docs/ai-integration/)** - Set up AI coding agents to use your specs
- **[CLI Reference](/docs/reference/cli)** - Learn all available commands

## Tips for Effective Specs

::: tip Keep It Lean
If a section doesn't add clarity, remove it. The goal is communication, not documentation.
:::

::: tip Update as You Learn
Specs are living documents. When you discover something new, update the spec immediately.
:::

::: tip Focus on Why
Always start with the problem you're solving. Context helps both humans and AI agents.
:::

::: tip Be Specific in Acceptance Criteria
Use concrete, testable conditions. "User can log in" is vague. "POST /api/auth/login returns 200 with JWT token" is specific.
:::

::: tip Use Non-Goals Effectively
Explicitly stating what you're NOT doing prevents scope creep and keeps focus sharp.
:::
