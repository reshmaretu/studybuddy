# StudyBuddy Infinite Canvas Architecture Guide

## Overview

This document covers the complete refactor from basic HTML5 Canvas to a professional infinite canvas stack:

- **Engine**: Weave.js (coordinate math, viewport transforms)
- **State**: Yjs + Y.WebsocketProvider (conflict-free collab)
- **Rendering**: Perfect-Freehand (ink quality)
- **UI**: Radix UI + Framer Motion (accessible, animated toolbar)
- **Tools**: Zustand (state management)

---

## 1. Project Structure

```
packages/
├── canvas-engine/
│   ├── yjs-schema.ts          # Y.Doc structure & CRUD
│   ├── weave-engine.ts        # Canvas rendering loop
│   ├── mindmap-connectors.ts  # Connection drawing logic
│   └── index.ts               # Public API
├── api/
│   └── toolStore.ts           # Zustand tool state
└── ui/
    └── hooks.ts               # Canvas-specific hooks

apps/web/src/
├── components/
│   ├── InfiniteCanvas.tsx     # Main component
│   ├── CanvasToolbar.tsx      # Floating toolbar
│   ├── StickyNoteEditor.tsx   # Contenteditable overlay
│   └── ...
├── app/
│   └── canvas/
│       └── page.tsx           # Canvas page route
└── lib/
    └── supabase.ts            # Realtime provider
```

---

## 2. Setup: Initialize Canvas

### Install Dependencies

```bash
npm install yjs y-websocket y-indexeddb zustand framer-motion radix-ui perfect-freehand
```

### Create Canvas Route

```tsx
// apps/web/src/app/canvas/page.tsx
'use client';

import InfiniteCanvas from '@/components/InfiniteCanvas';
import { useUser } from '@/hooks/useAuth'; // Your auth hook

export default function CanvasPage() {
  const { user } = useUser();
  const roomId = 'default-canvas'; // or from URL params

  return (
    <InfiniteCanvas
      roomId={roomId}
      userId={user?.id!}
      userName={user?.name!}
      realtimeProvider="websocket"
    />
  );
}
```

---

## 3. Yjs Schema Deep Dive

### Creating Shapes

```typescript
import { addShape } from '@/packages/canvas-engine/yjs-schema';

// In your component or event handler
const shape = addShape(yshapes, ylayers, {
  type: 'rect',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  color: '#14b8a6',
  fillOpacity: 0.8,
  rotation: 0,
  locked: false,
  userId: currentUser.id,
});
```

### Observing Changes

```typescript
yshapes.observe((event) => {
  event.changes.added.forEach((item) => {
    const key = item.content.key;
    const shape = yshapes.get(key);
    console.log('New shape:', shape.toJSON());
  });
});
```

### Pen Strokes with Pressure

```typescript
// Start stroke
const stroke = addPenStroke(ystrokes, ylayers, {
  points: [],
  color: '#3b82f6',
  strokeWidth: 3,
  eraserMode: false,
  pressureEnabled: true,
  userId: currentUser.id,
});

// Append points as user draws
pointer.onMove((event) => {
  appendPointToPenStroke(ystrokes, strokeIndex, [
    event.x,
    event.y,
    event.pressure, // Pen pressure for variable width
  ]);
});
```

---

## 4. Weave.js Engine: Rendering Loop

### Zero-Lag Rendering

The engine uses `requestAnimationFrame` + dirty checking:

```typescript
private _startRenderLoop() {
  const render = () => {
    if (this.isDirty) {
      this._render();
      this.isDirty = false;
    }
    this.rafId = requestAnimationFrame(render);
  };
}
```

**Benefits:**
- Rendering only when needed
- Decoupled from React render cycle (no stuttering)
- Smooth pan/zoom via viewport transforms

### Viewport Transforms

```typescript
// Weave.js pattern
ctx.save();
ctx.translate(canvas.width / 2, canvas.height / 2);
ctx.scale(viewport.zoom, viewport.zoom);
ctx.translate(-canvas.width / 2 + viewport.x, -canvas.height / 2 + viewport.y);

// Draw at world coordinates
// ... render loop ...

ctx.restore();
```

---

## 5. Hit Testing for Interactivity

### Point-to-Shape

```typescript
hitTest(canvasX: number, canvasY: number, tolerance = 10): HitTestResult | null {
  // Convert canvas coords to world coords (accounting for viewport)
  const worldX = ...
  const worldY = ...

  // Check shapes in reverse layer order (topmost first)
  for (let i = layers.length - 1; i >= 0; i--) {
    const distance = pointToShapeDistance(worldX, worldY, shape);
    if (distance <= tolerance) {
      return { objectId, type: 'shape', distance };
    }
  }
}
```

### Eraser Hit Testing (Area Mode)

```typescript
export function executeErase(canvasX, canvasY, engine, settings) {
  if (settings.mode === 'area') {
    // Get all objects within eraser radius
    const allHits = engine.hitTestArea(canvasX, canvasY, settings.size);
    allHits.forEach(hit => deleteObject(hit.objectId));
  } else {
    // Precise: only delete topmost
    const hit = engine.hitTest(canvasX, canvasY, settings.size);
    if (hit) deleteObject(hit.objectId);
  }
}
```

---

## 6. Sticky Notes with Contenteditable

### Two-Layer System

1. **Canvas Layer**: Renders sticky rect + text (read-only view)
2. **Overlay Layer**: HTML contenteditable positioned over active sticky

```tsx
<StickyNoteEditor
  sticky={data}
  ymap={yshapes.get(id)}
  isActive={activeStickyId === id}
  canvasViewport={viewport}
  onBlur={() => saveAndClose()}
/>
```

### Position Calculation

```typescript
const canvasX = canvasRect.left + (sticky.x - viewport.x) * viewport.zoom;
const canvasY = canvasRect.top + (sticky.y - viewport.y) * viewport.zoom;

// The overlay div is positioned absolutely at these screen coords
```

### Real-time Sync

```typescript
const handleInput = () => {
  const text = contentEditableRef.current?.innerText || '';
  ymap.set('text', text); // Broadcasts to all clients
};
```

---

## 7. Mindmap Connectors

### Creating a Connection

```typescript
const connector = new MindmapConnectionManager(
  yconnections,
  yshapes,
  ylayers,
  'curved',
  '#fbbf24'
);

// User clicks "From" object
connector.startConnection(fromObjectId);

// User drags to preview
connector.updateConnectionPreview(x, y);

// User clicks "To" object
connector.finishConnection(toObjectId, 'Optional Label');
```

### Dynamic Rendering

The engine renders connections in layer order:

```typescript
private _renderConnection(ymap: Y.Map<any>) {
  const fromShape = this.yshapes.get(ymap.get('fromObjectId'));
  const toShape = this.yshapes.get(ymap.get('toObjectId'));

  // Calculate center points
  const fromX = fromShape.get('x') + fromShape.get('width') / 2;
  const toX = toShape.get('x') + toShape.get('width') / 2;
  // ... etc ...

  // Draw curve
  drawConnection({ ctx, fromX, fromY, toX, toY, ... });
}
```

**When objects move**: Connections update automatically via Yjs observers.

---

## 8. Zustand Tool Store

### Access Anywhere

```typescript
import { useCanvasToolStore } from '@/packages/api/toolStore';

function MyComponent() {
  const { activeTool, setActiveTool, brush, setBrushSettings } = useCanvasToolStore();

  return (
    <button onClick={() => setActiveTool('pen')}>
      Current: {activeTool}
    </button>
  );
}
```

### State Structure

```typescript
{
  activeTool: 'select' | 'pen' | 'eraser' | 'mindmap' | 'sticky',
  
  brush: {
    color: '#2dd4bf',
    size: 3,
    opacity: 1,
    mode: 'ballpoint',
    smoothing: 0.7,
    pressure: true,
  },
  
  eraser: {
    size: 20,
    mode: 'precise' | 'area',
    sensitivity: 0.8,
  },
  
  // ... mindmap, sticky settings ...
  
  selectedObjectIds: string[],
}
```

---

## 9. Floating Toolbar with Radix UI

### Features

- **Tool Buttons**: Switch between pen, eraser, select, etc.
- **Color Picker**: Grid of preset colors
- **Sliders**: Brush size, opacity, smoothing
- **Tabs**: Per-tool advanced settings
- **Animations**: Framer Motion bouncy entrance

```tsx
<CanvasToolbar onUndo={handleUndo} onRedo={handleRedo} />
```

### Customizing Colors

```tsx
const colors = [
  '#2dd4bf', // teal
  '#3b82f6', // blue
  '#8b5cf6', // purple
  // ...
];
```

---

## 10. Real-time Persistence

### WebSocket Provider

```typescript
new WebsocketProvider(
  'ws://localhost:1234',
  roomId,
  ydoc
);
```

### IndexedDB Local Persistence

```typescript
new IndexeddbPersistence(roomId, ydoc);
```

### Supabase Realtime (Future)

```typescript
const provider = new SupabaseProvider(ydoc, {
  supabaseClient: supabase,
  table: 'canvas_docs',
  channelName: roomId,
});
```

---

## 11. Performance Optimization

### 1. Canvas Batching

Use `requestAnimationFrame` + dirty flag to avoid redundant renders.

### 2. Layer Culling

Only render shapes within viewport bounds:

```typescript
if (shape.x + shape.width < viewport.x) continue; // Left edge
if (shape.x > viewport.x + canvasWidth) continue; // Right edge
// ... etc
```

### 3. Stroke Compression

For long strokes, use Douglas-Peucker or similar to reduce point count:

```typescript
import simplify from 'simplify-js';
const simplified = simplify(points, 2); // Tolerance = 2
```

### 4. Web Workers for Heavy Computations

Move layout, pathfinding, etc. to web workers.

---

## 12. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| P | Pen tool |
| E | Eraser tool |
| M | Mindmap tool |
| S | Sticky note tool |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Esc | Deselect all |

---

## 13. Migration Path from Old Canvas

### Phase 1: Setup (1-2 days)

- [ ] Install new dependencies
- [ ] Create Yjs schema
- [ ] Setup Weave.js engine
- [ ] Connect Zustand store

### Phase 2: Rendering (2-3 days)

- [ ] Implement basic shape rendering
- [ ] Add pen stroke rendering
- [ ] Implement viewport transforms
- [ ] Add hit testing

### Phase 3: UI (1-2 days)

- [ ] Build floating toolbar
- [ ] Implement tool switching
- [ ] Add color picker

### Phase 4: Advanced Features (2-3 days)

- [ ] Sticky notes + contenteditable
- [ ] Mindmap connectors
- [ ] Eraser logic

### Phase 5: Polish (1-2 days)

- [ ] Optimize performance
- [ ] Add animations
- [ ] Keyboard shortcuts
- [ ] Error handling

---

## 14. Example: Adding a Custom Shape

```typescript
// 1. Update Yjs schema type
export interface CustomShape extends ShapeData {
  type: 'custom';
  customProperty: string;
}

// 2. Add rendering
private _renderShape(ymap: Y.Map<any>) {
  if (ymap.get('type') === 'custom') {
    this.ctx.fillStyle = ymap.get('color');
    this.ctx.fillRect(...);
    // Draw custom content
  }
}

// 3. Handle creation
if (store.activeTool === 'custom') {
  addShape(yshapes, ylayers, {
    type: 'custom',
    x, y, width, height,
    customProperty: 'value',
    // ...
  });
}
```

---

## 15. Debugging

### Log Yjs State

```typescript
console.log(ydoc.toJSON());
```

### Monitor Changes

```typescript
ydoc.on('afterUpdate', (update) => {
  console.log('Update size:', update.length, 'bytes');
});
```

### WebSocket Traffic

Browser DevTools → Network → WS (WebSocket tab)

---

## 16. Deployment

### Self-Hosted WebSocket Server

```bash
npm install -g y-websocket-server
y-websocket-server --port 1234
```

### Production Checklist

- [ ] Enable WSS (secure WebSocket)
- [ ] Setup SSL certificate
- [ ] Configure CORS
- [ ] Monitor WebSocket connections
- [ ] Implement cleanup for idle rooms
- [ ] Add metrics/observability

---

## Resources

- **Yjs**: https://docs.yjs.dev
- **Weave.js**: https://github.com/[weave-project]
- **Perfect-Freehand**: https://github.com/steveruizok/perfect-freehand
- **Radix UI**: https://radix-ui.com
- **Framer Motion**: https://www.framer.com/motion

---

## Questions?

Refer to individual file docstrings for implementation details.
