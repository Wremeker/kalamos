# Block Editor

[English](README.md) · [Русский](README.ru.md)

**A Notion-style block editor for React that stores documents as plain JSON — no Tiptap, Slate, or Lexical to wrangle.**

![Block Editor demo](demo.png)

Drop `<BlockEditor>` into a React app and get headings, lists, to-dos, code,
math, media, and a slash menu out of the box. Documents are just
`{ blocks: Block[] }` — easy to store, diff, and render anywhere. Ships with a
reference backend (Koa + Sequelize + PostgreSQL) for persistence and media
uploads.

The editor is a from-scratch `contenteditable` block system, with rich text
stored as HTML on each block's `text` field.

## Quick start

```bash
npm install @kalamos/editor react react-dom
```

```tsx
import { useState } from 'react';
import { EditorProvider, BlockEditor, type Block } from '@kalamos/editor';
import '@kalamos/editor/styles.css';

export function MyEditor() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  return (
    <EditorProvider>
      <BlockEditor blocks={blocks} onChange={setBlocks} />
    </EditorProvider>
  );
}
```

That's a fully working editor. Wire up an `uploadAdapter` for media and a backend
for persistence when you're ready — see [below](#using-the-editor-package).

## Why not Tiptap / Slate / Lexical?

| | Block Editor | Tiptap / Slate / Lexical |
| --- | --- | --- |
| Document model | Plain JSON `{ blocks: Block[] }` | Framework-specific node trees |
| Dependencies | Zero editor-framework deps | ProseMirror / custom core |
| Block-first UX | Built in (slash menu, drag, reorder) | Build it yourself or via extensions |
| Storage | HTML-per-block, store anywhere | Serialize via the framework |
| Backend | Reference Koa + Postgres included | Bring your own |
| Customization | `registerBlock()` plugin API | Schema + node-view extensions |

Reach for Block Editor when you want a Notion-like, block-based UX with a simple,
portable JSON document and no large editor framework to learn. Reach for the
others when you need their mature ecosystems or fine-grained ProseMirror-level
control.

## Repository layout

```
kalamos/
├── packages/
│   └── editor/        @kalamos/editor — the React editor package
├── apps/
│   ├── server/        Koa + Sequelize + PostgreSQL reference backend
│   └── demo/          Vite + React 19 demo wiring the editor to the backend
├── docker-compose.yml postgres + server + demo
└── .github/workflows/ CI + publish
```

## Quick start (Docker)

```bash
docker compose up --build
# demo:   http://localhost:5173
# server: http://localhost:4000
```

Seed a sample document:

```bash
docker compose exec server yarn db:seed
```

## Local development

Requires Node 22+ and Yarn 4 (via Corepack).

```bash
corepack enable
yarn install

# Terminal 1 — backend (uses sqlite by default for zero-setup dev):
DB_DIALECT=sqlite yarn dev:server

# Terminal 2 — demo:
yarn dev:demo
```

Build everything / typecheck / test:

```bash
yarn build
yarn typecheck
yarn test
```

## Using the editor package

```bash
npm install @kalamos/editor react react-dom
```

```tsx
import { useState } from 'react';
import { EditorProvider, BlockEditor, type Block } from '@kalamos/editor';
import '@kalamos/editor/styles.css';

function MyEditor() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  return (
    <EditorProvider uploadAdapter={myUploadAdapter}>
      <BlockEditor blocks={blocks} onChange={setBlocks} />
    </EditorProvider>
  );
}
```

> **Styling:** the editor uses Tailwind utility classes. Either build Tailwind in
> your app and include the editor source via `@source` (see `apps/demo/src/index.css`),
> or supply your own equivalent classes. `@kalamos/editor/styles.css` ships
> the non-Tailwind pieces (KaTeX, highlight.js, contenteditable placeholders).

### UploadAdapter

Media uploads are injected so the editor stays storage-agnostic:

```ts
import type { UploadAdapter } from '@kalamos/editor';

const myUploadAdapter: UploadAdapter = {
  uploadImage: (file) => post('/api/v1/media/image', file),
  uploadVideo: (file) => post('/api/v1/media/video', file),
  uploadAudio: (file) => post('/api/v1/media/audio', file),
  uploadFile:  (file) => post('/api/v1/media/file', file),
  // optional: uploadImageFromUrl, deleteByUrl, proxyImageUrl, searchUnsplash, ...
};
```

Each method resolves to `{ url }`. See `apps/demo/src/uploadAdapter.ts`.

### Custom blocks (registry plugin API)

Register your own block types and (optionally) slash-menu entries:

```tsx
import { registerBlock, type BlockRendererProps } from '@kalamos/editor';

registerBlock({
  type: 'callout-tip',
  slashMenu: { group: 'Custom', label: 'Tip callout', keywords: ['tip'] },
  initialData: () => ({ text: 'A helpful tip.' }),
  render: ({ block, contentProps }: BlockRendererProps) => (
    <div className="rounded bg-emerald-50 p-3">
      <div {...contentProps} dangerouslySetInnerHTML={{ __html: block.text }} />
    </div>
  ),
});
```

See `apps/demo/src/customBlocks.tsx`.

### Localization

The editor ships English defaults. Override any string via `EditorProvider`:

```tsx
import { EditorProvider, defaultStrings } from '@kalamos/editor';

<EditorProvider strings={{ editor: { bold: 'Gras' } }}>{children}</EditorProvider>
```

## Document format

```jsonc
{
  "blocks": [
    { "id": "b1", "type": "h1", "text": "Title" },
    { "id": "b2", "type": "paragraph", "text": "Body with <b>bold</b>." },
    { "id": "b3", "type": "todo", "text": "Task", "checked": false }
  ]
}
```

Stored in Postgres as `documents.content` (`JSONB`). The `Block` type is exported
from the package.

## Reference backend

Koa + Sequelize-TypeScript + PostgreSQL (sqlite supported for dev/test).

- `GET/POST /api/v1/documents`, `GET/PUT/DELETE /api/v1/documents/:id`
- `POST /api/v1/media/{image,video,audio,file}` (multipart `file`)
- Pluggable `StorageDriver`: `local` disk (default) or S3-compatible (`@aws-sdk/client-s3`).
- Optional bearer-token guard via `API_TOKEN` (off by default).

See `apps/server/.env.example` for configuration.

## License

MIT
