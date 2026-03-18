# Stage 1: pull the platform binary and UI dist from npm
FROM node:20-slim AS builder
ARG NPM_TAG=latest
ARG PLATFORM_PKG=http-linux-x64
RUN npm install -g @leanspec/${PLATFORM_PKG}@${NPM_TAG} @leanspec/ui@${NPM_TAG}

# Stage 2: minimal runtime — no Node, just the Rust binary + static files
FROM debian:13-slim

ARG PLATFORM_PKG=http-linux-x64

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/node_modules/@leanspec/${PLATFORM_PKG}/leanspec-http /usr/local/bin/leanspec-http
COPY --from=builder /usr/local/lib/node_modules/@leanspec/ui/dist /app/ui-dist

# Non-root user
RUN groupadd -r leanspec && useradd -r -g leanspec -m -d /home/leanspec leanspec

ENV LEANSPEC_UI_DIST=/app/ui-dist
ENV HOME=/home/leanspec
ENV LEANSPEC_LOG_FORMAT=json

EXPOSE 3000

USER leanspec

# --no-open: skip browser launch (not available in containers)
# --host 0.0.0.0: bind all interfaces so Docker port mapping works
ENTRYPOINT ["leanspec-http", "--no-open", "--host", "0.0.0.0"]
