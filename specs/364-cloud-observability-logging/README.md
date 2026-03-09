---
status: planned
created: 2026-03-09
priority: medium
tags:
- cloud
- observability
- logging
- infrastructure
parent: 355-cloud-deployment-readiness
created_at: 2026-03-09T13:35:05.707296Z
updated_at: 2026-03-09T13:35:56.616374Z
---

# Cloud Observability & Logging

## Overview

Cloud log aggregators (Datadog, CloudWatch, Grafana, etc.) require structured JSON logs. The current text-based logging is insufficient for production monitoring.

## Design

- Add `LEANSPEC_LOG_FORMAT` env var (`text` | `json`, default: `text`)
- JSON format includes: timestamp, level, message, span context, request_id
- Add `LEANSPEC_LOG_LEVEL` env var (default: `info`)
- Use `tracing-subscriber` JSON layer for structured output
- Include request duration and status code in access logs

## Plan

- [ ] Add `LEANSPEC_LOG_FORMAT` env var support
- [ ] Implement JSON log formatting layer
- [ ] Add `LEANSPEC_LOG_LEVEL` env var support
- [ ] Add request_id to log spans
- [ ] Include request duration metrics in access logs

## Test

- [ ] `LEANSPEC_LOG_FORMAT=json` produces valid JSON log lines
- [ ] JSON logs include timestamp, level, message, and span context
- [ ] `LEANSPEC_LOG_LEVEL=debug` increases verbosity
- [ ] Default format remains `text` when env var is unset