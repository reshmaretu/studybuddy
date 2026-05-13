# Canvas Refactor: Setup & Dependencies

## Installation

### 1. Install New Packages

```bash
cd studybuddy-repository

# Core engine & state
pnpm add yjs y-websocket y-indexeddb y-protocols

# State management
pnpm add zustand zustand-middleware

# UI & Animation
pnpm add framer-motion
pnpm add @radix-ui/react-popover @radix-ui/react-dropdown-menu @radix-ui/react-slider @radix-ui/react-tabs @radix-ui/react-dialog

# Ink & Icons
pnpm add perfect-freehand lucide-react

# Utilities
pnpm add uuid lodash-es

# Dev dependencies
pnpm add -D @types/lodash-es
```

### 2. Update TypeScript Config

Ensure `apps/web/tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 3. Tailwind Configuration

Your tailwind.config.ts already has the necessary color scheme. No changes needed.

---

## File Organization

```
packages/
├── canvas-engine/
│   ├── index.ts                    # Export public API
│   ├── yjs-schema.ts               # Y.Doc structure
│   ├── weave-engine.ts             # Canvas renderer
│   ├── mindmap-connectors.ts       # Connection logic
│   ├── performance.ts              # Optimization utils
│   └── package.json                # Exports types
│
├── api/
│   ├── toolStore.ts                # Zustand tool state
│   ├── canvasApi.ts                # Data fetching
│   └── package.json

apps/web/src/
├── components/
│   ├── InfiniteCanvas.tsx          # Main entry
│   ├── CanvasToolbar.tsx           # Floating menu
│   ├── StickyNoteEditor.tsx        # Contenteditable
│   ├── canvas/
│   │   ├── SelectTool.tsx
│   │   ├── PenTool.tsx
│   │   ├── EraserTool.tsx
│   │   └── MindmapTool.tsx
│   └── ...existing components
│
├── app/
│   ├── canvas/
│   │   └── page.tsx                # Canvas route
│   └── ...existing routes
│
├── lib/
│   ├── supabase.ts                 # Already exists
│   ├── yjs-provider.ts             # Realtime setup
│   └── canvas-utils.ts             # Helpers

types/
├── canvas.ts                       # Canvas types
└── yjs.d.ts                        # Yjs augmentations
```

---

## Quick Start Example

### Create Canvas Page

```tsx
// apps/web/src/app/canvas/page.tsx
'use client';

import { Suspense } from 'react';
import { useUser } from '@/hooks/useAuth';
import InfiniteCanvas from '@/components/InfiniteCanvas';
import { Loader } from 'lucide-react';

export default function CanvasPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  const roomId = 'canvas-' + (user.id || 'demo');

  return (
    <Suspense fallback={<Loader />}>
      <InfiniteCanvas
        roomId={roomId}
        userId={user.id}
        userName={user.name || 'Anonymous'}
        realtimeProvider="supabase"
      />
    </Suspense>
  );
}
```

---

## Environment Variables

Add to `.env.local`:

```bash
# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional WebSocket Server (if you still want it for local dev)
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:1234
```

---

## Local Testing (Supabase)

### Option A: Use Your Hosted Supabase Project

1. Ensure Realtime is enabled for your project.
2. Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Run the app and open two browser windows on `/canvas` to verify sync.

### Option B: Supabase Local Development

If you use the Supabase CLI locally, point your env vars at the local instance:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

---

## Running WebSocket Server Locally (Optional)

### Option 1: y-websocket-server

```bash
# Install globally
npm install -g y-websocket-server

# Run
y-websocket-server --port 1234
```

### Option 2: Docker

```yaml
# docker-compose.yml
version: '3'
services:
  yjs-websocket:
    image: dmonad/y-websocket:latest
    ports:
      - "1234:1234"
```

```bash
docker-compose up
```

---

## Vercel Deployment (Supabase Only)

1. Set these env vars in the Vercel project settings:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Ensure Supabase Realtime is enabled in your project.

3. Deploy. No WebSocket server is required on Vercel when using Supabase Realtime.

---

## TypeScript Path Aliases

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/packages/*": ["../../../packages/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"]
    }
  }
}
```

---

## Common Patterns

### 1. Access Tool State

```typescript
import { useCanvasToolStore } from '@/packages/api/toolStore';

export function MyComponent() {
  const { activeTool, brush, setActiveTool } = useCanvasToolStore();
  
  return <button onClick={() => setActiveTool('pen')}>Pen</button>;
}
```

### 2. Use Yjs

```typescript
import { createCanvasSchema } from '@/packages/canvas-engine/yjs-schema';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const { yshapes, ystrokes, yconnections } = createCanvasSchema(ydoc);
```

### 3. Create Custom Radix Component

```tsx
import * as Popover from '@radix-ui/react-popover';

export function MyPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger>Open</Popover.Trigger>
      <Popover.Content>Content</Popover.Content>
    </Popover.Root>
  );
}
```

### 4. Animate with Framer Motion

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## Testing

### Unit Tests (Vitest)

```typescript
// __tests__/yjs-schema.test.ts
import { describe, it, expect } from 'vitest';
import { createCanvasSchema, addShape } from '@/packages/canvas-engine/yjs-schema';
import * as Y from 'yjs';

describe('Yjs Schema', () => {
  it('should add a shape', () => {
    const ydoc = new Y.Doc();
    const { yshapes, ylayers } = createCanvasSchema(ydoc);

    const shape = addShape(yshapes, ylayers, {
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: '#fff',
      fillOpacity: 1,
      rotation: 0,
      locked: false,
      userId: 'test',
    });

    expect(shape.id).toBeDefined();
    expect(yshapes.size).toBe(1);
  });
});
```

### Integration Tests (Playwright)

```typescript
// e2e/canvas.spec.ts
import { test, expect } from '@playwright/test';

test('canvas loads', async ({ page }) => {
  await page.goto('/canvas');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});

test('toolbar appears', async ({ page }) => {
  await page.goto('/canvas');
  const toolbar = page.locator('[data-testid="canvas-toolbar"]');
  await expect(toolbar).toBeVisible();
});
```

---

## Performance Checklist

- [ ] Implement layer culling (don't render off-screen)
- [ ] Use dirty flag for efficient re-rendering
- [ ] Compress stroke data with Douglas-Peucker
- [ ] Debounce viewport updates
- [ ] Lazy load Lexical for rich text (optional)
- [ ] Profile with DevTools Performance tab
- [ ] Monitor memory in WebGL context

---

## Common Issues

### Issue: Canvas blurry on high-DPI

**Solution:**

```typescript
const scale = window.devicePixelRatio;
canvas.width = container.clientWidth * scale;
canvas.height = container.clientHeight * scale;
ctx.scale(scale, scale);
```

### Issue: Lag when many users editing

**Solution:**

- Reduce update frequency with debouncing
- Use spatial partitioning for hit tests
- Implement data compression for Yjs updates

### Issue: Sticky notes not syncing

**Solution:**

- Ensure `ymap.set('text', ...)` is called
- Check that Yjs observer is active
- Verify Y.Doc is connected to provider

---

## Next Steps

1. **Setup**: Follow installation steps above
2. **Run Dev Server**: `pnpm dev`
3. **Test Canvas**: Navigate to `/canvas`
4. **Build Features**: Implement tools one by one
5. **Optimize**: Use Chrome DevTools profiling
6. **Deploy**: Setup WSS + SSL for production

---

## Support

- Check ARCHITECTURE_GUIDE.md for detailed patterns
- Review component JSDoc comments
- Use VS Code IntelliSense (TypeScript)
- Monitor console for warnings/errors
