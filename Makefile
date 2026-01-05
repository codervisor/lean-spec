.PHONY: help dev dev-web dev-desktop build test typecheck format clean install

# Default target - show help
help:
	@echo "LeanSpec Development Commands"
	@echo ""
	@echo "Daily Development:"
	@echo "  make dev          - Start full stack (Rust HTTP + Vite SPA)"
	@echo "  make dev-web      - Start Vite SPA only"
	@echo "  make dev-desktop  - Start Tauri desktop app"
	@echo ""
	@echo "Build & Test:"
	@echo "  make build        - Build all packages"
	@echo "  make test         - Run tests"
	@echo "  make test-watch   - Run tests in watch mode"
	@echo "  make test-ui      - Run tests with UI"
	@echo "  make typecheck    - Type check all packages"
	@echo ""
	@echo "Code Quality:"
	@echo "  make format       - Format all code"
	@echo "  make lint         - Lint all packages"
	@echo "  make pre-release  - Full pre-release validation"
	@echo ""
	@echo "Rust Development:"
	@echo "  make rust-build   - Build Rust binaries (release)"
	@echo "  make rust-dev     - Build Rust binaries (dev)"
	@echo "  make rust-test    - Run Rust tests"
	@echo "  make rust-check   - Check Rust code"
	@echo "  make rust-fmt     - Format Rust code"
	@echo "  make rust-clean   - Clean Rust build artifacts"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs         - Start docs dev server"
	@echo "  make docs-build   - Build documentation"
	@echo ""
	@echo "Publishing:"
	@echo "  make release      - Prepare and validate release"
	@echo "  make sync-ver     - Sync versions across packages"
	@echo ""
	@echo "Utilities:"
	@echo "  make install      - Install dependencies"
	@echo "  make clean        - Clean all build artifacts"
	@echo "  make cli          - Run LeanSpec CLI (use: make cli ARGS='list')"

# Development
dev:
	pnpm dev

dev-web:
	pnpm dev:web

dev-desktop:
	pnpm dev:desktop

# Build & Test
build:
	pnpm build

build-desktop:
	turbo run build:desktop --filter=@leanspec/desktop

test:
	pnpm test

test-watch:
	vitest

test-ui:
	vitest --ui

test-coverage:
	vitest run --coverage

typecheck:
	pnpm typecheck

# Code Quality
format:
	pnpm format

lint:
	turbo run lint

pre-release:
	pnpm pre-release

# Rust Development
rust-build:
	cargo build --release --manifest-path rust/Cargo.toml
	node scripts/copy-rust-binaries.mjs

rust-dev:
	cargo build --manifest-path rust/Cargo.toml
	node scripts/copy-rust-binaries.mjs

rust-build-http:
	cargo build --release --manifest-path rust/Cargo.toml -p leanspec-http

rust-test:
	cargo test --manifest-path rust/Cargo.toml

rust-test-watch:
	cargo watch -x 'test --manifest-path rust/Cargo.toml'

rust-check:
	cargo check --manifest-path rust/Cargo.toml

rust-clippy:
	cargo clippy --manifest-path rust/Cargo.toml -- -D warnings

rust-fmt:
	cargo fmt --manifest-path rust/Cargo.toml

rust-fmt-check:
	cargo fmt --manifest-path rust/Cargo.toml -- --check

rust-clean:
	cargo clean --manifest-path rust/Cargo.toml

# Documentation
docs:
	pnpm --dir docs-site start

docs-build:
	pnpm --dir docs-site build

docs-serve:
	pnpm --dir docs-site serve

# Publishing
release: pre-release
	@echo "Ready for release! Next steps:"
	@echo "1. Create and push tag: git tag v0.x.x && git push origin v0.x.x"
	@echo "2. Run: make publish"

sync-ver:
	tsx scripts/sync-versions.ts
	tsx scripts/sync-rust-versions.ts

prepare-publish:
	tsx scripts/prepare-publish.ts

publish-platforms:
	tsx scripts/publish-platform-packages.ts

publish-main:
	tsx scripts/publish-main-packages.ts

restore-packages:
	tsx scripts/restore-packages.ts

publish: prepare-publish publish-platforms publish-main restore-packages
	@echo "Publishing complete!"

# Utilities
install:
	pnpm install

clean: rust-clean
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/.next
	rm -rf docs-site/node_modules
	rm -rf docs-site/build

cli:
	@node bin/lean-spec.js $(ARGS)

# Convenience aliases
.PHONY: dev-full web desktop docs-dev test-w watch
dev-full: dev
web: dev-web
desktop: dev-desktop
docs-dev: docs
test-w: test-watch
watch: test-watch
