#!/usr/bin/env bash
set -euo pipefail

# LeanSpec validation helper for skills-compatible agents.
# Runs the local LeanSpec validator.

node bin/lean-spec.js validate
