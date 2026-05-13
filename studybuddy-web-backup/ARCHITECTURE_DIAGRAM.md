# 🏗️ StudyBuddy Canvas Architecture - Visual Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Component Layer                  │
│              InfiniteCanvas.tsx (Integration)               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Event Handlers (click, pointerMove, wheel)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Zustand Store   │  │   Yjs Y.Doc      │  │  Canvas Renderer │
│  (toolStore.ts)  │  │ (yjs-schema.ts)  │  │(weave-engine.ts) │
│                  │  │                  │  │                  │
│ - activeTool     │  │ - yshapes        │  │ - RAF loop       │
│ - brush settings │  │ - ystrokes       │  │ - Hit testing    │
│ - selection      │  │ - yconnections   │  │ - Viewport xform │
│                  │  │ - ylayers        │  │ - Selection UI   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                    │                    │
         └────────┬───────────┴────────┬───────────┘
                  │                    │
                  ▼                    ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  Real-time Sync  │  │   UI Components  │
         │  (WebSocket +    │  │  (Toolbar, etc)  │
         │   IndexedDB)     │  │                  │
         └──────────────────┘  └──────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Remote Clients  │
         │   (Multiplayer)  │
         └──────────────────┘
```

---

## Component Hierarchy

```
InfiniteCanvas (Main)
├── Canvas Element (Ref)
│   └── StudyBuddyCanvasEngine (instance)
│       ├── Renders Shapes
│       ├── Renders Strokes
│       ├── Renders Connections
│       └── Hit Testing
│
├── CanvasToolbar (Floating)
│   ├── Tool Buttons (select, pen, eraser, mindmap, sticky)
│   ├── Color Picker (Radix Popover)
│   ├── Brush Settings (Radix Slider)
│   ├── Undo/Redo Buttons
│   └── Advanced Toggle
│
├── StickyNoteEditor (Overlay)
│   └── Contenteditable div (positioned on sticky)
│
├── Keyboard Shortcuts Handler
│   ├── V → Select tool
│   ├── P → Pen tool
│   ├── E → Eraser tool
│   ├── M → Mindmap tool
│   ├── S → Sticky tool
│   ├── Ctrl+Z → Undo
│   └── Ctrl+Y → Redo
│
└── Providers
    ├── Yjs WebsocketProvider
    └── IndexedDB Persistence
```

---

## Data Flow: User Creates Shape

```
User clicks canvas
  │
  ▼
handleCanvasClick fires
  │
  ├─→ Get canvas coordinates
  │
  ├─→ If tool === 'select':
  │   └─→ hitTest(x, y) → find shape
  │       └─→ store.setSelectedObjectIds()
  │
  └─→ If tool === 'sticky':
      └─→ addShape(yshapes, ylayers, {type: 'sticky', x, y, ...})
          │
          ▼
      Yjs broadcasts to all clients
          │
          ├─→ Local engine observes change
          │   └─→ _markDirty() = true
          │
          └─→ Remote clients receive update
              └─→ Yjs merges CRDT automatically
                  └─→ Remote engines re-render
                  
      Next RAF call:
          └─→ isDirty = true
              └─→ render()
                  ├─→ Clear canvas
                  ├─→ Apply viewport transform
                  ├─→ Draw shapes in layer order
                  ├─→ Draw strokes
                  ├─→ Draw connections
                  ├─→ Draw selection handles
                  └─→ isDirty = false
```

---

## Real-time Collaboration Flow

```
CLIENT A                          SERVER                        CLIENT B
┌──────────────────┐         ┌──────────┐         ┌──────────────────┐
│  User draws      │         │ Message  │         │  Watches canvas  │
│  on canvas       │         │ Broker   │         │  (idle)          │
└─────────┬────────┘         └──────────┘         └──────────────────┘
          │                        │                       ▲
          ▼                        │                       │
    Pen stroke added to ystrokes  │                       │
          │                        │                       │
          ▼                        │                       │
    Yjs generates update           │                       │
    (~200 bytes binary)            │                       │
          │                        │                       │
          └───────────────────────►│                       │
                                   │                       │
                    Broadcast to all connected clients
                                   │                       │
                                   ├──────────────────────►
                                   │                       │
                                   │         Yjs merges update
                                   │         (CRDT: conflict-free)
                                   │                       │
                                   │                       ▼
                                   │         Engine observes change
                                   │                       │
                                   │                       ▼
                                   │         _markDirty() = true
                                   │                       │
                                   │                       ▼
                                   │         Next RAF: render()
                                   │         stroke appears on screen
```

---

## Yjs State Structure

```
Y.Doc
├── Y.Map: yshapes
│   ├── "uuid1" → Y.Map {
│   │   id: "uuid1"
│   │   type: "rect"
│   │   x: 100, y: 100
│   │   width: 200, height: 150
│   │   color: "#3b82f6"
│   │   fillOpacity: 0.8
│   │   strokeWidth: 2
│   │   locked: false
│   │   userId: "user123"
│   │   createdAt: 1234567890
│   │   updatedAt: 1234567891
│   │ }
│   └── "uuid2" → Y.Map {
│       type: "sticky"
│       text: "Remember..."
│       ...
│   }
│
├── Y.Array: ystrokes
│   ├── [0] → Y.Map {
│   │   points: Y.Array [
│   │     [100, 100, 0.8],  // [x, y, pressure]
│   │     [102, 101, 0.85],
│   │     [105, 103, 0.9],
│   │     ...
│   │   ]
│   │   color: "#2dd4bf"
│   │   strokeWidth: 3
│   │ }
│   └── [1] → Y.Map { ... }
│
├── Y.Map: yconnections
│   ├── "conn1" → Y.Map {
│   │   fromObjectId: "uuid1"
│   │   toObjectId: "uuid2"
│   │   lineStyle: "curved"
│   │   lineColor: "#fbbf24"
│   │   label: "Related to"
│   │ }
│   └── ...
│
├── Y.Array: ylayers
│   └── ["uuid1", "uuid2", "stroke1", "stroke2", ...]  // Z-order
│
└── Y.Map: ymetadata
    ├── viewportX: 0
    ├── viewportY: 0
    ├── viewportZoom: 1.0
    ├── selectedIds: Y.Array [...]
    └── ...
```

---

## Rendering Pipeline

```
Engine._startRenderLoop()
    │
    ├─→ requestAnimationFrame
    │   │
    │   ▼
    ├─→ Check isDirty flag
    │   │
    │   ├─→ If false: skip render (optimization!)
    │   │
    │   └─→ If true:
    │       │
    │       ▼
    │   Engine._render()
    │       │
    │       ├─→ ctx.clearRect()  // Clear canvas
    │       │
    │       ├─→ ctx.translate(viewport.x, viewport.y)
    │       ├─→ ctx.scale(viewport.zoom, viewport.zoom)
    │       │
    │       ├─→ For each ID in ylayers (in order):
    │       │   │
    │       │   ├─→ Get object from yshapes/ystrokes/yconnections
    │       │   │
    │       │   ├─→ If shape:
    │       │   │   └─→ _renderShape(ymap)
    │       │   │       ├─→ Fill rect/circle
    │       │   │       ├─→ Apply rotation
    │       │   │       └─→ Draw stroke border
    │       │   │
    │       │   ├─→ If stroke:
    │       │   │   └─→ _renderStroke(ymap)
    │       │   │       ├─→ Draw polyline
    │       │   │       └─→ Apply pressure/opacity
    │       │   │
    │       │   └─→ If connection:
    │       │       └─→ _renderConnection(ymap)
    │       │           ├─→ Draw bezier curve
    │       │           ├─→ Draw arrowhead
    │       │           └─→ Draw label
    │       │
    │       ├─→ If selection active:
    │       │   └─→ Draw selection handles (squares at corners)
    │       │
    │       └─→ isDirty = false  // Until next change
    │
    └─→ Loop continues with next RAF call
```

---

## Hit Testing Algorithm

```
User clicks at (100, 200)
    │
    ▼
Engine.hitTest(100, 200, tolerance=10)
    │
    ├─→ Convert canvas coords to world coords
    │   world_x = (100 - viewport.x) / viewport.zoom
    │   world_y = (200 - viewport.y) / viewport.zoom
    │
    ├─→ Iterate ylayers in REVERSE (topmost first)
    │   │
    │   ├─→ For each object ID:
    │   │   │
    │   │   ├─→ Get object from yshapes/ystrokes
    │   │   │
    │   │   ├─→ If shape:
    │   │   │   │
    │   │   │   ├─→ Calculate distance to shape boundary
    │   │   │   │   - Rect: |x - closest_edge|
    │   │   │   │   - Circle: |distance_to_center - radius|
    │   │   │   │
    │   │   │   ├─→ If distance ≤ tolerance:
    │   │   │   │   return { objectId, type: 'shape', distance }  ✓ HIT!
    │   │   │   └─→ Else: continue
    │   │   │
    │   │   └─→ If stroke:
    │   │       │
    │   │       ├─→ For each line segment in polyline:
    │   │       │   │
    │   │       │   └─→ Calculate point-to-line distance
    │   │       │       (perpendicular distance)
    │   │       │
    │   │       ├─→ If min_distance ≤ tolerance:
    │   │       │   return { objectId, type: 'stroke', distance }  ✓ HIT!
    │   │       └─→ Else: continue
    │   │
    │   └─→ If all checked, nothing hit
    │
    └─→ Return null (no hit)
```

---

## Tool State Machine

```
START
  │
  ├─→ Tool = "select"
  │   └─→ On click: hitTest() → select object
  │
  ├─→ Tool = "pen"
  │   ├─→ On pointerDown: Start stroke
  │   ├─→ On pointerMove: Append point
  │   └─→ On pointerUp: Finalize stroke
  │
  ├─→ Tool = "eraser"
  │   ├─→ On pointerDown: Find hits
  │   ├─→ On pointerMove: Highlight erasable objects
  │   └─→ On pointerUp: Delete hits
  │
  ├─→ Tool = "mindmap"
  │   ├─→ On click (1st): startConnection(objectId)
  │   ├─→ On move: updateConnectionPreview(x, y)
  │   └─→ On click (2nd): finishConnection(toObjectId)
  │
  └─→ Tool = "sticky"
      ├─→ On click: Create sticky at position
      └─→ On double-click: Open editor
```

---

## Sticky Note Editing Flow

```
User clicks sticky note
    │
    ▼
Engine detects hit
    │
    ├─→ setActiveStickyId(id)
    │
    ▼
<StickyNoteEditor> mounts with props={stickyId, ...}
    │
    ├─→ Calculate screen position:
    │   canvasX = rect.left + (sticky.x - viewport.x) * zoom
    │   canvasY = rect.top  + (sticky.y - viewport.y) * zoom
    │
    ├─→ Position overlay <div> absolutely at (canvasX, canvasY)
    │
    ├─→ Get <div contentEditable /> focus
    │
    ▼
User types "Learn Yjs"
    │
    ├─→ handleInput fires
    │
    ├─→ Get new text: "Learn Yjs"
    │
    ├─→ Sync to Yjs:
    │   yshapes.get(stickyId).set('text', 'Learn Yjs')
    │
    ▼
Yjs broadcasts update to all clients
    │
    ├─→ Local: Text visible in editor
    ├─→ Remote: ymap observer triggers → re-render sticky with new text
    │
    ▼
User presses Escape
    │
    ├─→ setActiveStickyId(null)
    │
    └─→ <StickyNoteEditor> unmounts
```

---

## Viewport Transform

```
World Space          Canvas Space
    (0,0)                (0,0)
     •                     •
     │ (user's zoom)  │ (screen)
     │                     │
     ▼ (100, 100)          ▼ (250, 150)
   shape                  shape
   
To transform:
  canvas_x = (world_x - viewport.x) * viewport.zoom + canvas_offset_x
  canvas_y = (world_y - viewport.y) * viewport.zoom + canvas_offset_y

Reverse (click to world):
  world_x = canvas_x / viewport.zoom + viewport.x - canvas_offset_x
  world_y = canvas_y / viewport.zoom + viewport.y - canvas_offset_y

Canvas context automatically:
  ctx.translate(-viewport.x * zoom, -viewport.y * zoom)
  ctx.scale(zoom, zoom)
```

---

## Keyboard Shortcut Map

```
┌─────────────────────────────────────┐
│        KEYBOARD SHORTCUTS           │
├─────────────────────────────────────┤
│  V              → Select tool       │
│  P              → Pen tool          │
│  E              → Eraser tool       │
│  M              → Mindmap tool      │
│  S              → Sticky tool       │
│  Escape         → Deselect all      │
│  Ctrl+Z / Cmd+Z → Undo              │
│  Ctrl+Y / Cmd+Y → Redo              │
│  Delete         → Delete selected   │
│  Arrow keys     → Move selected     │
└─────────────────────────────────────┘
```

---

## Event Loop (1 Frame)

```
START OF FRAME (16.67ms for 60 FPS)
    │
    ├─→ Handle keyboard events
    │   └─→ User pressed 'P' → setActiveTool('pen')
    │
    ├─→ Handle pointer events
    │   ├─→ pointerDown at (x, y)
    │   ├─→ pointerMove at (x', y')
    │   └─→ pointerUp at (x'', y'')
    │
    ├─→ Update Yjs state
    │   └─→ addShape(), updateShape(), etc.
    │
    ├─→ Yjs observers trigger
    │   └─→ engine._markDirty()
    │
    ├─→ requestAnimationFrame callback
    │   │
    │   ├─→ Check isDirty
    │   │
    │   ├─→ If true:
    │   │   ├─→ Clear canvas
    │   │   ├─→ Apply transforms
    │   │   ├─→ Render all objects
    │   │   └─→ isDirty = false
    │   │
    │   └─→ Schedule next frame
    │
    └─→ END OF FRAME
        └─→ Next event arrives or wait ~16.67ms
```

---

## Connection: Shapes to Types

```
yshapes (Y.Map)
    │
    ├─→ Each entry: "uuid" → ShapeData Y.Map
    │   │
    │   └─→ ShapeData = {
    │       id: string
    │       type: 'rect' | 'circle' | 'sticky'
    │       x, y, width, height: number
    │       color, fillOpacity: string/number
    │       rotation: number
    │       locked: boolean
    │       userId: string
    │       createdAt, updatedAt: number
    │       // If sticky:
    │       text: string
    │       textColor, fontSize: ...
    │     }
    │
    └─→ Engine accesses: yshapes.get('uuid').toJSON()
        └─→ Returns typed object for rendering
```

---

## Provider Chain

```
Yjs WebsocketProvider
    ├─→ Connects to ws://localhost:1234
    ├─→ Syncs entire Y.Doc on connect
    ├─→ Broadcasts updates as binary
    └─→ Handles reconnection

Y.Doc
    ├─→ Stores canonical state
    ├─→ Broadcasts to all providers
    └─→ All clients receive same state

IndexedDB Persistence
    ├─→ Persists Y.Doc locally
    ├─→ Survives page refresh
    └─→ Syncs with WebSocket on startup
```

---

**Diagrams updated**: April 16, 2026  
**For detailed code**: See ARCHITECTURE_GUIDE.md and CANVAS_QUICK_REFERENCE.ts
