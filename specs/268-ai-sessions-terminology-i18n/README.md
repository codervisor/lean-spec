---
status: in-progress
created: 2026-01-30
priority: medium
tags:
- i18n
- ux
- terminology
created_at: 2026-01-30T14:55:25.187144Z
updated_at: 2026-01-30T14:58:52.637355Z
transitions:
- status: in-progress
  at: 2026-01-30T14:58:52.637355Z
---

# AI Sessions Terminology & i18n Evaluation

> **Status**: in-progress · **Priority**: medium · **Created**: 2026-01-30

## Overview

Evaluate the best terminology for "AI Sessions" concept, considering:
1. English term clarity and consistency
2. Chinese (zh-CN) translation quality
3. Alignment with industry standards

Current translation uses "会话" which may not be optimal.

## Problem Statement

"AI Sessions" is currently translated as "AI 会话" in Chinese. This needs evaluation because:
- "会话" is a generic term that doesn't convey the collaborative/task-oriented nature
- Industry tools use varied terminology, and we should align with best practices
- The concept may be better expressed as "Tasks" or "Conversations"

## Terminology Options

### Option A: Sessions → 会话
| Aspect | English                | Chinese                 |
| ------ | ---------------------- | ----------------------- |
| Term   | AI Sessions            | AI 会话                 |
| Pros   | Technical accuracy     | Direct translation      |
| Cons   | Generic, unclear scope | Feels like backend term |

### Option B: Tasks → 任务
| Aspect | English                     | Chinese                  |
| ------ | --------------------------- | ------------------------ |
| Term   | AI Tasks                    | AI 任务                  |
| Pros   | Clear work-oriented meaning | Action-focused, familiar |
| Cons   | May imply completion status | Less conversational      |

### Option C: Conversations → 对话
| Aspect | English                             | Chinese                   |
| ------ | ----------------------------------- | ------------------------- |
| Term   | AI Conversations                    | AI 对话                   |
| Pros   | Industry standard (ChatGPT, Claude) | Natural, widely adopted   |
| Cons   | Purely conversational connotation   | May not fit work contexts |

### Option D: Collaboration → 协作
| Aspect | English                | Chinese           |
| ------ | ---------------------- | ----------------- |
| Term   | AI Collaboration       | AI 协作           |
| Pros   | Emphasizes partnership | Work-oriented     |
| Cons   | Abstract               | May be too formal |

## Industry Analysis

| Tool            | English Term    | Chinese Translation |
| --------------- | --------------- | ------------------- |
| ChatGPT         | Chats           | 聊天                |
| Claude          | Conversations   | 对话                |
| GitHub Copilot  | Chat            | 聊天                |
| Cursor          | Chat / Composer | 聊天 / Composer     |
| Kimi (Moonshot) | 对话            | 对话                |
| 通义千问        | 对话            | 对话                |

**Observation**: "对话" is the dominant term in Chinese AI products.

## Plan

- [x] Audit current usage of "AI Sessions" in codebase
- [x] Determine if context is task-oriented or conversation-oriented → Task-oriented
- [x] Research "会话" definition → Confirmed: jargon/conversational, not task-related
- [x] Evaluate ecosystem consistency (VS Code, OpenCode) → Keep "Sessions" in EN
- [x] Select final terminology → Sessions (EN) / 任务 (ZH)
- [ ] Update zh-CN translations in codebase

## Research: "会话" Definition (Baidu Baike)

Web search confirmed "会话" has two meanings in Chinese:

| Meaning           | Definition                                                    | User Familiarity             |
| ----------------- | ------------------------------------------------------------- | ---------------------------- |
| **Traditional**   | 对话、聚谈 (conversation, dialogue)                           | ✅ Common but implies chat    |
| **Technical/Web** | 浏览器与服务器的交互过程 (browser-server interaction session) | ❌ Backend jargon, unfamiliar |

**Key finding**: "会话" does NOT mean "tasks" in Chinese. It's either:
- Conversation (wrong for work sessions)
- Web session (technical jargon, unfamiliar to most users)

## Ecosystem Consideration

Developer tools using "Sessions":
- VS Code: Debug Sessions, Terminal Sessions → 调试会话, 终端会话
- OpenCode: Sessions
- JetBrains: Run/Debug Configurations → 运行配置

**Trade-off**: Keeping "Sessions" in English maintains ecosystem consistency with IDE integrations.

## Decision

**Confirmed: Use "Sessions" (EN) / "任务" (ZH)**

### Rationale

1. **English: Keep "Sessions"**
   - Ecosystem consistency with VS Code, OpenCode
   - Familiar to developers in IDE context
   - No need to rename existing code/APIs

2. **Chinese: Use "任务" (not "会话")**
   - "会话" is either conversational OR technical jargon
   - Neither meaning fits "work-oriented AI sessions"
   - "任务" is universally understood (钉钉, 飞书, 企业微信 all use it)
   - Matches the mental model: start → progress → complete

3. **This is valid i18n practice**
   - Localize meaning, not literal translation
   - Prioritize user comprehension over 1:1 mapping
   - Same approach used by major software (Office, Adobe, etc.)

### Final Mapping

| Context    | English         | Chinese  |
| ---------- | --------------- | -------- |
| Navigation | Sessions        | 任务     |
| Singular   | Session         | 任务     |
| Action     | New Session     | 新建任务 |
| History    | Session History | 任务历史 |

## Test

- [x] New terminology is clear without explanation
- [x] Consistent with work-oriented mental model
- [x] Works in both navigation and content contexts
- [x] English consistent with VS Code/OpenCode ecosystem
- [ ] Implementation updated across UI

## Notes

- API/code can remain as `session` - only UI strings change for zh-CN
- "任务" aligns with productivity tools (Jira, Asana, Linear, 钉钉, 飞书)
- This hybrid approach (Sessions→任务) is a deliberate localization choice
