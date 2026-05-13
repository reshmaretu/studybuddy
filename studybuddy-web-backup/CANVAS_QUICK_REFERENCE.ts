/**
 * QUICK REFERENCE: Common Canvas Operations
 * 
 * Copy-paste patterns for frequent tasks
 */

// ═══════════════════════════════════════════════════════════════
// 1. CREATING SHAPES
// ═══════════════════════════════════════════════════════════════

import { addShape, updateShape, deleteShape } from '@/packages/canvas-engine/yjs-schema';

// Create rectangle
const rect = addShape(yshapes, ylayers, {
  type: 'rect',
  x: 50, y: 50,
  width: 200, height: 100,
  color: '#3b82f6',
  fillOpacity: 0.8,
  rotation: 0,
  layerId: activeLayerId,
  strokeWidth: 2,
  locked: false,
  userId: user.id,
});

// Create circle
const circle = addShape(yshapes, ylayers, {
  type: 'circle',
  x: 300, y: 100,
  width: 100, height: 100,
  color: '#10b981',
  fillOpacity: 1,
  rotation: 0,
  layerId: activeLayerId,
  strokeWidth: 1,
  locked: false,
  userId: user.id,
});

// Create sticky note
const sticky = addShape(yshapes, ylayers, {
  type: 'sticky',
  x: 100, y: 200,
  width: 200, height: 150,
  color: '#fef3c7',
  fillOpacity: 1,
  rotation: 0,
  layerId: activeLayerId,
  strokeWidth: 0,
  locked: false,
  userId: user.id,
  // Sticky-specific
  text: 'Click to edit...',
  textColor: '#1f2937',
  fontSize: 14,
  fontFamily: 'system-ui',
  isFocused: false,
});

// ═══════════════════════════════════════════════════════════════
// 2. MODIFYING SHAPES
// ═══════════════════════════════════════════════════════════════

// Move shape
updateShape(yshapes, shapeId, {
  x: newX,
  y: newY,
});

// Resize
updateShape(yshapes, shapeId, {
  width: newWidth,
  height: newHeight,
});

// Change color
updateShape(yshapes, shapeId, {
  color: '#ff0000',
  fillOpacity: 0.5,
});

// Rotate
updateShape(yshapes, shapeId, {
  rotation: 45, // degrees
});

// Update sticky text
updateShape(yshapes, stickyId, {
  text: 'New text content',
  fontSize: 16,
});

// Lock shape
updateShape(yshapes, shapeId, {
  locked: true,
});

// ═══════════════════════════════════════════════════════════════
// 3. WORKING WITH PEN STROKES
// ═══════════════════════════════════════════════════════════════

import { addPenStroke, appendPointToPenStroke } from '@/packages/canvas-engine/yjs-schema';

// Start drawing
const stroke = addPenStroke(ystrokes, ylayers, {
  points: [],
  layerId: activeLayerId,
  color: '#2dd4bf',
  strokeWidth: 3,
  eraserMode: false,
  pressureEnabled: true,
  userId: user.id,
});

// During draw, append points
onPointerMove((e) => {
  const pressure = e.pressure || 1; // 0-1
  appendPointToPenStroke(ystrokes, strokeIndex, [
    e.clientX,
    e.clientY,
    pressure,
  ]);
});

// Highlighter effect (low opacity)
const highlight = addPenStroke(ystrokes, ylayers, {
  points: [],
  layerId: activeLayerId,
  color: '#fbbf24',
  strokeWidth: 20,
  eraserMode: false,
  pressureEnabled: false,
  userId: user.id,
  // Render with opacity
  opacity: 0.3,
});

// Eraser stroke
const eraseStroke = addPenStroke(ystrokes, ylayers, {
  points: [],
  layerId: activeLayerId,
  color: '#ffffff',
  strokeWidth: 15,
  eraserMode: true,
  pressureEnabled: true,
  userId: user.id,
});

// ═══════════════════════════════════════════════════════════════
// 4. LAYER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

import { reorderLayers } from '@/packages/canvas-engine/yjs-schema';

// Move to front
reorderLayers(yshapes, ylayers, shapeId, 'front');

// Move to back
reorderLayers(yshapes, ylayers, shapeId, 'back');

// Move up one layer
reorderLayers(yshapes, ylayers, shapeId, 'up');

// Move down one layer
reorderLayers(yshapes, ylayers, shapeId, 'down');

// ═══════════════════════════════════════════════════════════════
// 5. MINDMAP CONNECTORS
// ═══════════════════════════════════════════════════════════════

import { 
  MindmapConnectionManager,
  getConnectedObjects,
  autoLayoutMindmap,
} from '@/packages/canvas-engine/mindmap-connectors';

// Initialize connector manager
const mindmap = new MindmapConnectionManager(
  yconnections,
  yshapes,
  ylayers,
  'curved', // lineStyle
  '#fbbf24' // lineColor
);

// User clicks first object
mindmap.startConnection(fromObjectId);

// User hovers during drag (for preview)
mindmap.updateConnectionPreview(mouseX, mouseY);

// User clicks second object
const connected = mindmap.finishConnection(toObjectId, 'Causes');

// Render preview while dragging
mindmap.renderPreview(canvasContext);

// Get connected objects
const { outgoing, incoming } = getConnectedObjects(objectId, yconnections, yshapes);

// Auto-layout hierarchical structure
autoLayoutMindmap(yshapes, rootObjectId, yconnections);

// ═══════════════════════════════════════════════════════════════
// 6. HIT TESTING & SELECTION
// ═══════════════════════════════════════════════════════════════

// Test if point hits an object
const hit = engine.hitTest(canvasX, canvasY, tolerance = 10);

if (hit) {
  console.log(`Hit: ${hit.objectId} (${hit.type}), distance: ${hit.distance}`);
}

// Select multiple objects
store.setSelectedObjectIds([id1, id2, id3]);

// Toggle selection
store.toggleObjectSelection(objectId);

// Clear selection
store.clearSelection();

// Get selected IDs
const selectedIds = store.selectedObjectIds;

// ═══════════════════════════════════════════════════════════════
// 7. TOOL STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

import { useCanvasToolStore } from '@/packages/api/toolStore';

// In component
const store = useCanvasToolStore();

// Switch tool
store.setActiveTool('pen'); // 'select' | 'pen' | 'eraser' | 'mindmap' | 'sticky'

// Update brush
store.setBrushSettings({
  color: '#2dd4bf',
  size: 5,
  opacity: 0.8,
  mode: 'marker', // 'ballpoint' | 'marker' | 'highlighter' | 'calligraphy'
  smoothing: 0.7,
  pressure: true,
});

// Update eraser
store.setEraserSettings({
  size: 30,
  mode: 'area', // 'precise' | 'area'
  sensitivity: 0.9,
});

// Update mindmap
store.setMindmapSettings({
  lineStyle: 'curved', // 'solid' | 'dashed' | 'curved'
  lineColor: '#fbbf24',
  labelColor: '#ffffff',
});

// Update sticky
store.setStickySettings({
  backgroundColor: '#fef3c7',
  textColor: '#1f2937',
  fontSize: 14,
  fontFamily: 'system-ui',
});

// ═══════════════════════════════════════════════════════════════
// 8. VIEWPORT CONTROL
// ═══════════════════════════════════════════════════════════════

// Pan canvas
engine.pan(dx, dy);

// Zoom
engine.zoom(1.2); // > 1 to zoom in, < 1 to zoom out

// Get current viewport
const { x, y, zoom } = engine.getViewport();

// ═══════════════════════════════════════════════════════════════
// 9. STICKY NOTE EDITOR
// ═══════════════════════════════════════════════════════════════

// In click handler
if (hit?.type === 'shape' && yshapes.get(hit.objectId).get('type') === 'sticky') {
  setActiveStickyId(hit.objectId);
  
  // Editor component handles sync via ymap observer
}

// Listen for text changes
ymap.observe((event) => {
  const text = ymap.get('text');
  console.log('Sticky text updated:', text);
});

// ═══════════════════════════════════════════════════════════════
// 10. DRAG & DROP
// ═══════════════════════════════════════════════════════════════

// Select on pointerdown
const hit = engine.hitTest(x, y);
if (hit) store.setSelectedObjectIds([hit.objectId]);

// Update position on pointermove
if (store.selectedObjectIds.length > 0) {
  store.selectedObjectIds.forEach(id => {
    updateShape(yshapes, id, { x: newX, y: newY });
  });
}

// ═══════════════════════════════════════════════════════════════
// 11. TOOLBAR WITH RADIX UI
// ═══════════════════════════════════════════════════════════════

import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';

// Simple button
<button
  onClick={() => store.setActiveTool('pen')}
  className={store.activeTool === 'pen' ? 'active' : ''}
>
  Pen
</button>

// Popover for settings
<Popover.Root>
  <Popover.Trigger>Settings</Popover.Trigger>
  <Popover.Content>
    <label>Size</label>
    <Slider.Root
      value={[store.brush.size]}
      onValueChange={([v]) => store.setBrushSettings({ size: v })}
      min={1}
      max={30}
    >
      <Slider.Track>
        <Slider.Range />
      </Slider.Track>
      <Slider.Thumb />
    </Slider.Root>
  </Popover.Content>
</Popover.Root>

// Color picker
const colors = ['#2dd4bf', '#3b82f6', '#ef4444', '#fbbf24'];
{colors.map(c => (
  <button
    key={c}
    style={{ backgroundColor: c }}
    onClick={() => store.setBrushSettings({ color: c })}
  />
))}

// ═══════════════════════════════════════════════════════════════
// 12. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'v') store.setActiveTool('select');
    if (e.key === 'p') store.setActiveTool('pen');
    if (e.key === 'e') store.setActiveTool('eraser');
    if (e.key === 'm') store.setActiveTool('mindmap');
    if (e.key === 's') store.setActiveTool('sticky');
    if (e.key === 'Escape') store.clearSelection();
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') handleUndo();
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') handleRedo();
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// ═══════════════════════════════════════════════════════════════
// 13. PERSISTENCE & SYNC
// ═══════════════════════════════════════════════════════════════

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// Create doc
const ydoc = new Y.Doc();

// Local persistence
new IndexeddbPersistence(roomId, ydoc);

// Real-time sync
new WebsocketProvider(
  'ws://localhost:1234',
  roomId,
  ydoc
);

// Listen to external updates
ydoc.on('update', (update, origin) => {
  if (origin !== 'local') {
    console.log('Remote update received');
  }
});

// ═══════════════════════════════════════════════════════════════
// 14. UNDO/REDO
// ═══════════════════════════════════════════════════════════════

import { UndoManager } from 'yjs';

const undoManager = new UndoManager([yshapes, ystrokes, yconnections]);

// Undo
undoManager.undo();

// Redo
undoManager.redo();

// Stop recording (for batch operations)
undoManager.stopCapturing();
// ... multiple operations ...
undoManager.startCapturing(); // Resume

// ═══════════════════════════════════════════════════════════════
// 15. ANIMATION WITH FRAMER MOTION
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';

// Toolbar entrance
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
  <CanvasToolbar />
</motion.div>

// Shape appearance
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
>
  Content
</motion.div>

// Hover interaction
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click me
</motion.button>

// ═══════════════════════════════════════════════════════════════
// 16. DEBUG UTILITIES
// ═══════════════════════════════════════════════════════════════

// Log entire canvas state
console.log('Canvas state:', ydoc.toJSON());

// Log specific collection
console.log('Shapes:', yshapes.toJSON());

// Monitor update sizes
ydoc.on('update', (update) => {
  console.log(`Update: ${update.length} bytes`);
});

// Check collection sizes
console.log('Shapes:', yshapes.size);
console.log('Strokes:', ystrokes.length);
console.log('Connections:', yconnections.size);

// Verify observer is active
const testUpdate = (event: Y.YMapEvent<Y.Map<any>>) => {
  console.log('Observer triggered!', event);
};
yshapes.observe(testUpdate);

// ═══════════════════════════════════════════════════════════════
// 17. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

try {
  const shape = addShape(yshapes, ylayers, data);
  if (!shape.id) throw new Error('Shape creation failed');
} catch (error) {
  console.error('Failed to add shape:', error);
  store.triggerToast?.('Failed to create shape', 'error');
}

// Validate shape exists before update
const shape = yshapes.get(shapeId);
if (!shape) {
  console.warn(`Shape ${shapeId} not found`);
  return;
}

// ═══════════════════════════════════════════════════════════════

export {}; // Keep this as module
