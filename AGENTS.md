<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Presentasi AI

Presentasi AI generates executive-grade, editable PowerPoint presentations. Domain: `https://presentasi.rominur.com`.

## Current milestone

M0 only: Presentation DSL → deterministic TR-01 layout → web renderer → editable PPTX. Do not add OpenRouter, auth, database, uploads, Visual QA, or image generation until asked.

## Architecture

Keep presentation logic in `src/presentation/`:

- `dsl/` semantic structures. No x/y/width/height.
- `archetypes/` registered layout functions. TR-01 is the only implemented archetype.
- `themes/` style tokens.
- `renderer/web/` and `renderer/pptx/` both consume LayoutIR produced from the same DSL.

Never duplicate slide copy between web and PPTX. The sample lives in `src/presentation/dsl/sample-tr01.ts`.

## Hard rules

- OpenRouter only, later, and only on the server. Never put `OPENROUTER_API_KEY` in `NEXT_PUBLIC_*` or client code.
- Never hard-code model identifiers. Use a model router when AI is introduced.
- AI must not emit slide coordinates. Archetypes own geometry.
- PPTX must stay editable: native text and shapes. No full-slide screenshots.
- Layout must be deterministic for the same DSL + theme.

## Adding an archetype later

1. Extend `ArchetypeId` / `REGISTERED_ARCHETYPES`.
2. Add a layout function under `src/presentation/archetypes/`.
3. Register it in `registry.ts`.
4. Do not special-case web or PPTX copy.
