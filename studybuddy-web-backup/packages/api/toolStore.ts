/**
 * Canvas Tool State Management
 * Zustand store for managing active tool, settings, and brush properties
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HitTestResult } from '@studybuddy/canvas-engine';

export type ToolType =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'mindmap'
  | 'sticky'
  | 'rect'
  | 'circle'
  | 'line'
  | 'triangle'
  | 'polygon'
  | 'text';
export type PenMode = 'ballpoint' | 'marker' | 'highlighter' | 'calligraphy';

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  mode: PenMode;
  smoothing: number; // 0-1, higher = smoother
  pressure: boolean;
}

export interface EraserSettings {
  size: number;
  mode: 'precise' | 'area'; // precise = point-based, area = selection box
  sensitivity: number;
}

export interface MindmapSettings {
  lineStyle: 'solid' | 'dashed' | 'curved';
  lineColor: string;
  lineWidth: number;
  labelColor: string;
  nodeFillColor: string;
  nodeTextColor: string;
  nodeStrokeColor: string;
  nodeStrokeWidth: number;
  nodeFontSize: number;
  nodeFontFamily: string;
}

export interface StickySettings {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
}

export interface TextSettings {
  color: string;
  fontSize: number;
  fontFamily: string;
}

export interface ShapeSettings {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeEnabled: boolean;
  fillEnabled: boolean;
  polygonSides: number;
}

export interface CanvasToolStore {
  // Active Tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Tool Settings
  brush: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  eraser: EraserSettings;
  setEraserSettings: (settings: Partial<EraserSettings>) => void;

  mindmap: MindmapSettings;
  setMindmapSettings: (settings: Partial<MindmapSettings>) => void;

  sticky: StickySettings;
  setStickySettings: (settings: Partial<StickySettings>) => void;

  text: TextSettings;
  setTextSettings: (settings: Partial<TextSettings>) => void;

  shape: ShapeSettings;
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;

  // UI State
  showToolbar: boolean;
  setShowToolbar: (show: boolean) => void;

  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;

  selectedColorMode:
    | 'brush'
    | 'mindmap-line'
    | 'mindmap-label'
    | 'mindmap-node-fill'
    | 'mindmap-node-text'
    | 'mindmap-node-stroke'
    | 'sticky-bg'
    | 'sticky-text'
    | 'text'
    | 'shape-stroke'
    | 'shape-fill';
  setSelectedColorMode: (mode: string) => void;

  gridEnabled: boolean;
  setGridEnabled: (enabled: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;

  // Multi-select
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[]) => void;
  toggleObjectSelection: (id: string) => void;
  clearSelection: () => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const defaultBrushSettings: BrushSettings = {
  color: '#2dd4bf',
  size: 3,
  opacity: 1,
  mode: 'ballpoint',
  smoothing: 0.7,
  pressure: true,
};

const defaultEraserSettings: EraserSettings = {
  size: 20,
  mode: 'area',
  sensitivity: 0.8,
};

const defaultMindmapSettings: MindmapSettings = {
  lineStyle: 'curved',
  lineColor: '#fbbf24',
  lineWidth: 2,
  labelColor: '#ffffff',
  nodeFillColor: '#0f172a',
  nodeTextColor: '#f8fafc',
  nodeStrokeColor: '#f59e0b',
  nodeStrokeWidth: 2,
  nodeFontSize: 16,
  nodeFontFamily: 'system-ui',
};

const defaultStickySettings: StickySettings = {
  backgroundColor: '#fef3c7',
  textColor: '#1f2937',
  fontSize: 14,
  fontFamily: 'system-ui',
};

const defaultTextSettings: TextSettings = {
  color: '#e2e8f0',
  fontSize: 20,
  fontFamily: 'system-ui',
};

const defaultShapeSettings: ShapeSettings = {
  strokeColor: '#2dd4bf',
  fillColor: '#0b1211',
  strokeWidth: 2,
  fillOpacity: 0.4,
  strokeEnabled: true,
  fillEnabled: true,
  polygonSides: 6,
};

export const useCanvasToolStore = create<CanvasToolStore>()(
  devtools(
    (set) => ({
      // Active Tool
      activeTool: 'select',
      setActiveTool: (tool) => set({ activeTool: tool }),

      // Brush Settings
      brush: defaultBrushSettings,
      setBrushSettings: (settings) =>
        set((state) => ({
          brush: { ...state.brush, ...settings },
        })),

      // Eraser Settings
      eraser: defaultEraserSettings,
      setEraserSettings: (settings) =>
        set((state) => ({
          eraser: { ...state.eraser, ...settings },
        })),

      // Mindmap Settings
      mindmap: defaultMindmapSettings,
      setMindmapSettings: (settings) =>
        set((state) => ({
          mindmap: { ...state.mindmap, ...settings },
        })),

      // Sticky Settings
      sticky: defaultStickySettings,
      setStickySettings: (settings) =>
        set((state) => ({
          sticky: { ...state.sticky, ...settings },
        })),

      text: defaultTextSettings,
      setTextSettings: (settings) =>
        set((state) => ({
          text: { ...state.text, ...settings },
        })),

      shape: defaultShapeSettings,
      setShapeSettings: (settings) =>
        set((state) => ({
          shape: { ...state.shape, ...settings },
        })),

      // UI State
      showToolbar: true,
      setShowToolbar: (show) => set({ showToolbar: show }),

      showColorPicker: false,
      setShowColorPicker: (show) => set({ showColorPicker: show }),

      selectedColorMode: 'brush',
      setSelectedColorMode: (mode) => set({ selectedColorMode: mode as any }),

      gridEnabled: true,
      setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
      snapEnabled: true,
      setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
      gridSize: 40,
      setGridSize: (size) => set({ gridSize: size }),

      // Multi-select
      selectedObjectIds: [],
      setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
      toggleObjectSelection: (id) =>
        set((state) => ({
          selectedObjectIds: state.selectedObjectIds.includes(id)
            ? state.selectedObjectIds.filter((i) => i !== id)
            : [...state.selectedObjectIds, id],
        })),
      clearSelection: () => set({ selectedObjectIds: [] }),

      // Undo/Redo (placeholder)
      canUndo: false,
      canRedo: false,
      undo: () => {}, // Wire to Y.UndoManager
      redo: () => {}, // Wire to Y.UndoManager
    }),
    { name: 'canvas-tool-store' }
  )
);

// ═══════════════════════════════════════════════════════════════
// ERASER LOGIC - Hit Testing & Deletion
// ═══════════════════════════════════════════════════════════════

/**
 * Execute eraser on all objects within a radius
 * Respects area vs precise mode
 */
export function executeErase(
  canvasX: number,
  canvasY: number,
  engine: any, // StudyBuddyCanvasEngine
  yshapes: any, // Y.Map
  ystrokes: any, // Y.Array
  yconnections: any, // Y.Map
  ylayers: any, // Y.Array
  settings: EraserSettings
) {
  const hit = engine.hitTest(canvasX, canvasY, settings.size);

  if (!hit) return;

  const world = engine.canvasToWorld(canvasX, canvasY);
  const radius = settings.size;

  const splitStrokeIfNeeded = (strokeId: string) => {
    const strokeIndex = findStrokeIndexById(ystrokes, strokeId);
    if (strokeIndex === -1) return false;
    const strokeMap = ystrokes.get(strokeIndex);
    if (!strokeMap) return false;

    const ypointsTemplate = strokeMap.get('points');
    const pointsArray = (ypointsTemplate as any)?.toArray?.() || [];
    const points = pointsArray.map((pt: any) => pt?.toArray?.() || [0, 0, 1]);
    if (points.length < 2) {
      deleteObjectFromYjs(strokeId, yshapes, ystrokes, yconnections, ylayers);
      return true;
    }

    const segments: Array<Array<[number, number, number]>> = [];
    let current: Array<[number, number, number]> = [];

    points.forEach(([px, py, pressure]: [number, number, number], idx: number) => {
      const prev = points[idx - 1];
      const inside = prev
        ? pointToSegmentDistance(world.x, world.y, prev[0], prev[1], px, py) <= radius
        : Math.hypot(px - world.x, py - world.y) <= radius;
      if (inside) {
        if (current.length >= 2) segments.push(current);
        current = [];
      } else {
        current.push([px, py, pressure ?? 1]);
      }
    });

    if (current.length >= 2) segments.push(current);

    if (segments.length === 0) {
      deleteObjectFromYjs(strokeId, yshapes, ystrokes, yconnections, ylayers);
      return true;
    }

    const originalLayerIndex = ylayers.toArray().indexOf(strokeId);
    const baseData = {
      color: strokeMap.get('color'),
      strokeWidth: strokeMap.get('strokeWidth'),
      eraserMode: strokeMap.get('eraserMode'),
      pressureEnabled: strokeMap.get('pressureEnabled'),
      zIndex: strokeMap.get('zIndex') ?? 0,
      userId: strokeMap.get('userId'),
      layerId: strokeMap.get('layerId'),
    };

    replaceStrokePoints(strokeMap, segments[0]);

    for (let i = 1; i < segments.length; i++) {
      const newId = generateId();
      const newStroke = new (strokeMap.constructor as any)();
      const ypoints = new ((ypointsTemplate ?? strokeMap.get('points')).constructor as any)();
      segments[i].forEach((pt) => {
        const ypoint = new (ypoints.constructor as any)();
        ypoint.push([pt[0], pt[1], pt[2]]);
        ypoints.push([ypoint]);
      });

      newStroke.set('id', newId);
      newStroke.set('points', ypoints);
      newStroke.set('color', baseData.color);
      newStroke.set('strokeWidth', baseData.strokeWidth);
      newStroke.set('eraserMode', baseData.eraserMode);
      newStroke.set('pressureEnabled', baseData.pressureEnabled);
      newStroke.set('zIndex', baseData.zIndex);
      newStroke.set('userId', baseData.userId);
      newStroke.set('layerId', baseData.layerId);
      newStroke.set('createdAt', Date.now());

      ystrokes.push([newStroke]);
      ylayers.push([newId]);

      if (originalLayerIndex !== -1) {
        const lastIdx = ylayers.length - 1;
        if (lastIdx !== originalLayerIndex + i) {
          ylayers.delete(lastIdx, 1);
          ylayers.insert(originalLayerIndex + i, [newId]);
        }
      }
    }

    reindexLayers(ylayers, yshapes, ystrokes, yconnections);
    return true;
  };

  // In 'area' mode, delete all objects in radius
  // In 'precise' mode, only delete the topmost
  if (settings.mode === 'area') {
    const allHits = engine.hitTestArea(canvasX, canvasY, settings.size);
    allHits.forEach((result: HitTestResult) => {
      if (isStrokeId(result.objectId, ystrokes)) {
        splitStrokeIfNeeded(result.objectId);
      } else {
        deleteObjectFromYjs(result.objectId, yshapes, ystrokes, yconnections, ylayers);
      }
    });
  } else {
    if (!splitStrokeIfNeeded(hit.objectId)) {
      deleteObjectFromYjs(hit.objectId, yshapes, ystrokes, yconnections, ylayers);
    }
  }

  engine._markDirty?.();
}

function findStrokeIndexById(ystrokes: any, id: string) {
  for (let i = 0; i < ystrokes.length; i++) {
    if (ystrokes.get(i)?.get('id') === id) return i;
  }
  return -1;
}

function isStrokeId(id: string, ystrokes: any) {
  return findStrokeIndexById(ystrokes, id) !== -1;
}

function replaceStrokePoints(strokeMap: any, points: Array<[number, number, number]>) {
  const ypoints = strokeMap.get('points');
  if (!ypoints) return;
  ypoints.delete(0, ypoints.length);
  points.forEach((pt) => {
    const ypoint = new (ypoints.constructor as any)();
    ypoint.push([pt[0], pt[1], pt[2]]);
    ypoints.push([ypoint]);
  });
}

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `stroke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function reindexLayers(ylayers: any, yshapes: any, ystrokes: any, yconnections: any) {
  const strokeMap = new Map<string, any>();
  for (let i = 0; i < ystrokes.length; i++) {
    const stroke = ystrokes.get(i);
    if (stroke) strokeMap.set(stroke.get('id'), stroke);
  }

  ylayers.toArray().forEach((layerId: string, index: number) => {
    const shape = yshapes.get(layerId);
    if (shape) shape.set('zIndex', index);
    const stroke = strokeMap.get(layerId);
    if (stroke) stroke.set('zIndex', index);
    const conn = yconnections.get(layerId);
    if (conn) conn.set('zIndex', index);
  });
}

function deleteObjectFromYjs(
  id: string,
  yshapes: any,
  ystrokes: any,
  yconnections: any,
  ylayers: any
) {
  if (yshapes.has(id)) {
    yshapes.delete(id);
  }

  for (let i = 0; i < ystrokes.length; i++) {
    if (ystrokes.get(i)?.get('id') === id) {
      ystrokes.delete(i, 1);
      break;
    }
  }

  if (yconnections.has(id)) {
    yconnections.delete(id);
  }

  const idx = ylayers.toArray().indexOf(id);
  if (idx !== -1) {
    ylayers.delete(idx, 1);
  }
}
