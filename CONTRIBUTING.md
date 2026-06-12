# Contributing

Thanks for your interest in improving Block Editor!

## Setup

- Node 22+ and Yarn 4 (run `corepack enable`).
- `yarn install` at the repo root installs all workspaces.

## Workflow

- `yarn typecheck` — typecheck every workspace.
- `yarn build` — build the editor package, server, and demo.
- `yarn test` — run editor + server tests.
- For the demo end-to-end test, see `apps/demo` (Playwright) and `docker-compose`.

## Project structure

- `packages/editor` — the publishable React package. Keep it framework-agnostic
  with respect to storage/auth: media goes through the `UploadAdapter`, custom
  blocks through the block registry, and copy through the i18n `strings` table.
- `apps/server` — reference backend. Keep routes thin; validation lives in
  `src/schemas` (Zod), storage behind `StorageDriver`.
- `apps/demo` — example consumer. New package features should be demonstrated here.

## Conventions

- TypeScript strict mode everywhere.
- Don't reintroduce app-specific coupling into `packages/editor` (no hardcoded
  API clients, no auth assumptions, no realtime/collab in v1).
- Add or update tests when changing editor logic (`editorUtils`) or the
  documents/media API.

## Relationship to upstream

This package was extracted from a larger application. It is a **standalone copy**;
fixes are consciously ported in either direction rather than shared automatically.

## License

By contributing you agree your contributions are licensed under the MIT License.
