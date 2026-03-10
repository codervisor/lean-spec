# Stage 1: pull the linux-x64 binary and UI dist from npm
FROM node:20-slim AS builder
RUN npm install -g @leanspec/http-linux-x64 @leanspec/ui

# Stage 2: minimal runtime — no Node, just the Rust binary + static files
FROM debian:12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/node_modules/@leanspec/http-linux-x64/leanspec-http /usr/local/bin/leanspec-http
COPY --from=builder /usr/local/lib/node_modules/@leanspec/ui/dist /app/ui-dist

ENV LEANSPEC_UI_DIST=/app/ui-dist

EXPOSE 3000

# Mount your project specs directory here
VOLUME ["/specs"]

# --no-open: skip browser launch (not available in containers)
# --host 0.0.0.0: bind all interfaces so Docker port mapping works
ENTRYPOINT ["leanspec-http", "--no-open", "--host", "0.0.0.0"]
