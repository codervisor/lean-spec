---
id: 'principles'
title: 'Agile Principles'
sidebar_position: 5
---
# Agile Principles

LeanSpec is built on six core principles that guide how specifications should be created and maintained.

## 🎯 Clarity over Documentation

**Write just enough to communicate intent clearly. If it doesn't add clarity, don't write it.**

### What This Means

- Focus on communication, not documentation
- Every word should serve a purpose
- If removing a sentence doesn't reduce understanding, remove it
- Clarity is measured by the reader's comprehension, not the writer's effort

### In Practice

❌ **Not This:**
```markdown
The user authentication system, which will be implemented using 
industry-standard security practices and methodologies, will provide 
a secure mechanism for users to authenticate themselves against the 
system using their credentials, which will be validated against the 
database to ensure that only authorized users gain access to the 
system's protected resources.
```

✅ **This:**
```markdown
Users log in with email/password. System validates credentials 
against database and returns JWT token for accessing protected endpoints.
```

### Guidelines

- Use simple, direct language
- Avoid jargon unless your audience knows it
- Prefer short sentences over long ones
- Use bullet points for lists, not paragraphs
- Include examples to clarify abstract concepts

---

## 🚀 Essential Scenarios over Exhaustive Lists

**Focus on the 20% of scenarios that deliver 80% of the value. Document what must work, not every possible edge case.**

### What This Means

- Identify the critical user journeys
- Focus on happy paths and important error cases
- Don't enumerate every possible edge case upfront
- Edge cases can be discovered and handled during implementation

### In Practice

❌ **Not This:**
```markdown
## All Possible Scenarios

1. User logs in successfully
2. User enters wrong password
3. User enters wrong email
4. User enters email that doesn't exist
5. User's account is suspended
6. User's account is deleted
7. User's account is locked due to too many attempts
8. User's password expired
9. User's session expired
10. User tries to access without logging in
... (20 more edge cases)
```

✅ **This:**
```markdown
## Key Scenarios

1. **Successful Login**: User enters valid credentials → receives JWT token
2. **Invalid Credentials**: User enters wrong password → clear error message
3. **Expired Token**: User's session expires → 401, must re-authenticate

## Edge Cases to Handle

- Account suspended/deleted
- Rate limiting for failed attempts
- (Discover others during implementation)
```

### Guidelines

- Start with 3-5 critical scenarios
- Add edge cases only if they're business-critical
- Use "things to consider" sections for edge cases
- Trust developers to handle reasonable edge cases

---

## 📱 Living Guide over Frozen Contract

**Specs should evolve with the project. Update them as you learn, don't treat them as immutable contracts.**

### What This Means

- Specs are guides, not contracts
- Update specs when you discover new information
- Reflect reality, not just initial plans
- Specs should match the current state, not the original vision

### In Practice

When you discover during implementation that your approach needs to change:

❌ **Not This:**
- Leave the spec unchanged
- Consider the spec "done" after initial review
- Treat changes as scope creep

✅ **This:**
- Update the spec to reflect new understanding
- Add a note about what changed and why
- Keep the spec as the source of truth

### Guidelines

- Update specs as work progresses
- Add a "Changes" or "Learnings" section if helpful
- Don't be afraid to rewrite sections that were wrong
- Archive specs when work is complete

---

## 🧠 Reduced Mind Burden over Comprehensive Coverage

**Keep specs short and scannable. The goal is to reduce cognitive load, not create reference manuals.**

### What This Means

- Minimize mental effort required to understand
- Optimize for scanning before deep reading
- Use structure and formatting to aid comprehension
- Keep it short enough to read in one sitting

### In Practice

❌ **Not This:**
```markdown
# User Authentication System

[3000 word essay covering every aspect of authentication, 
security considerations, historical context, industry best practices, 
detailed implementation approaches, comprehensive API documentation, 
etc.]
```

✅ **This:**
```markdown
# User Authentication

## Goal
Secure login with JWT tokens for mobile app.

## Key Scenarios
1. Login → JWT token
2. Access API with token
3. Token expires → re-auth

## Technical Approach
- POST /api/auth/login
- JWT with 24h expiry
- bcrypt for passwords

See [detailed API docs] for complete reference.
```

### Guidelines

- Target 1-2 pages for most specs
- Use headings liberally
- Break information into scannable chunks
- Link to detailed docs rather than embedding them
- If it's over 3 pages, consider splitting it

---

## ⚡ Speed over Perfection

**Ship a "good enough" spec quickly. You can always refine it based on feedback and learning.**

### What This Means

- Done is better than perfect
- Get the spec in front of people quickly
- Iterate based on feedback
- Don't overthink the initial version

### In Practice

❌ **Not This:**
- Spend days perfecting the spec before sharing
- Wait until you've thought through every detail
- Delay work until the spec is "complete"

✅ **This:**
- Write a rough draft in 30 minutes
- Share it and get feedback
- Start work while refining the spec
- Update as you learn

### Guidelines

- Time-box spec writing (30 min to 2 hours for most features)
- Share early drafts for feedback
- Mark unclear sections with "TBD" and move on
- Refine during implementation, not before

---

## 🤝 Collaboration over Specification

**Use specs as conversation starters, not as replacements for human communication.**

### What This Means

- Specs facilitate discussion, they don't replace it
- Encourage questions and feedback
- Use specs to align understanding, not dictate solutions
- Dialog is more valuable than documentation

### In Practice

❌ **Not This:**
- Write spec in isolation
- Treat questions as spec failures
- Avoid discussions by making specs more detailed
- Use specs to avoid talking to people

✅ **This:**
- Share drafts early for feedback
- Use specs to frame discussions
- Welcome questions and update specs accordingly
- Use specs as shared reference during conversations

### Guidelines

- Share specs before they're "done"
- Invite feedback explicitly
- Update specs based on discussions
- Link specs to related conversations (PRs, issues, Slack threads)

---

## Applying the Principles

These principles work together:

1. **Start Fast**: Write a quick draft (Speed over Perfection)
2. **Stay Focused**: Cover key scenarios only (Essential over Exhaustive)
3. **Be Clear**: Use simple, direct language (Clarity over Documentation)
4. **Stay Brief**: Keep it scannable (Reduced Mind Burden)
5. **Get Feedback**: Share and discuss (Collaboration over Specification)
6. **Iterate**: Update as you learn (Living Guide over Frozen Contract)

When these principles conflict, use your judgment. The goal is **effective communication**, not dogmatic adherence to rules.

---

**Next**: Learn [When to Use](/docs/guide/when-to-use) LeanSpec for maximum effectiveness, or explore the [Template System](/docs/guide/templates).
