/**
 * Main Infinite Canvas Component
 * 
 * Integrates:
 * - Yjs for collaborative state
 * - Weave.js engine for rendering
 * - Zustand for tool state
 * - Floating toolbar
 * - Sticky note editor
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { UndoManager } from 'yjs';
import { StudyBuddyCanvasEngine } from '@studybuddy/canvas-engine';
import { SupabaseYjsProvider } from '@/lib/yjs-supabase-provider';
import {
  createCanvasSchema,
  addShape,
  addPenStroke,
  appendPointToPenStroke,
  finalizePenStroke,
  updateShape,
  ensureDefaultLayer,
  reconcileLayerGroups,
  addConnection,
} from '@studybuddy/canvas-engine';
import { useCanvasToolStore, executeErase } from '@studybuddy/api';
import { useStudyStore } from '@/store/useStudyStore';
import { CanvasToolbar } from './CanvasToolbar';
import { StickyNoteEditor } from './StickyNoteEditor';
import { CanvasLayersPanel } from './CanvasLayersPanel';
import { TextShapeEditor } from './TextShapeEditor';
import type { StickyNoteData } from '@studybuddy/canvas-engine';

interface InfiniteCanvasProps {
  roomId: string;
  userId: string;
  userName: string;
  roomTitle?: string | null;
  roomDescription?: string | null;
  // Supabase/Liveblocks connection (optional)
  realtimeProvider?: 'websocket' | 'supabase' | 'liveblocks';
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  roomId,
  userId,
  userName,
  roomTitle,
  roomDescription,
  realtimeProvider = 'supabase',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudyBuddyCanvasEngine | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const schemaRef = useRef<ReturnType<typeof createCanvasSchema> | null>(null);
  const activeStrokeIndexRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeShapeIdRef = useRef<string | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<
    | {
        id: string;
        mode: 'move' | 'resize' | 'rotate';
        handle?: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'rotate';
        startWorld: { x: number; y: number };
        startRect: { x: number; y: number; width: number; height: number; rotation: number };
        shapeCenter?: { x: number; y: number };
        selectedIds?: string[];
        selectedRects?: Map<string, { x: number; y: number; width: number; height: number; rotation: number }>;
        selectedStrokes?: Map<string, Array<[number, number, number]>>;
      }
    | null
  >(null);
  const connectionDragRef = useRef<
    | {
        id: string;
        startWorld: { x: number; y: number };
        startControl: { x: number; y: number };
      }
    | null
  >(null);
  const panStateRef = useRef<
    | {
        lastCanvas: { x: number; y: number };
      }
    | null
  >(null);
  const marqueeRef = useRef<{ start: { x: number; y: number }; active: boolean } | null>(
    null
  );
  const clipboardRef = useRef<
    | {
        shapes: Array<{ data: any }>;
        strokes: Array<{ data: any }>;
      }
    | null
  >(null);
  const spaceDownRef = useRef(false);
  const penRafRef = useRef<number | null>(null);
  const pendingPenPointRef = useRef<[number, number, number] | null>(null);
  const lastPenAppendRef = useRef(0);
  const previewRafRef = useRef<number | null>(null);
  const pendingPreviewUpdateRef = useRef<(() => void) | null>(null);
  const eraseRafRef = useRef<number | null>(null);
  const pendingEraseRef = useRef<{ x: number; y: number } | null>(null);
  const lastOfflineToastRef = useRef(0);
  const suppressClickRef = useRef(false);

  const store = useCanvasToolStore();
  const { triggerChumToast } = useStudyStore();

  // Sticky note editor state
  const [activeStickyNoteId, setActiveStickyNoteId] = useState<string | null>(null);
  const [activeStickyData, setActiveStickyData] = useState<StickyNoteData | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeTextData, setActiveTextData] = useState<
    | {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        textColor: string;
        fontSize: number;
        fontFamily: string;
      }
    | null
  >(null);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<
    | { x: number; y: number; width: number; height: number }
    | null
  >(null);
  const mindmapFromRef = useRef<string | null>(null);
  const lastErasePosRef = useRef<{ x: number; y: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'synced' | 'offline'
  >('connecting');
  const isSynced = connectionStatus === 'synced';

  const maybeToastOffline = useCallback(() => {
    const now = Date.now();
    if (now - lastOfflineToastRef.current < 3000) return;
    lastOfflineToastRef.current = now;
    triggerChumToast?.('Offline - edits paused.', 'warning');
  }, [triggerChumToast]);

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Initialize schema
    const schema = createCanvasSchema(ydoc);
    schemaRef.current = schema;

    const defaultLayerId = ensureDefaultLayer(schema);
    if (defaultLayerId) {
      schema.ymetadata.set('activeLayerId', defaultLayerId);
      schema.yshapes.forEach((shape) => {
        if (!shape.get('layerId')) {
          shape.set('layerId', defaultLayerId);
        }
      });
      schema.ystrokes.forEach((stroke) => {
        if (!stroke.get('layerId')) {
          stroke.set('layerId', defaultLayerId);
        }
      });
      schema.yconnections.forEach((conn) => {
        if (!conn.get('layerId')) {
          conn.set('layerId', defaultLayerId);
        }
      });
    }

    const persistence = new IndexeddbPersistence(roomId, ydoc);
    persistence.on('synced', () => {
      if (!schemaRef.current) return;
      reconcileLayerGroups(schemaRef.current);
    });

    let realtimeCleanup: (() => void) | null = null;

    if (realtimeProvider === 'websocket') {
      const provider = new WebsocketProvider(
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234',
        roomId,
        ydoc
      );
      realtimeCleanup = () => provider.destroy();
      setConnectionStatus('connecting');
      provider.on('status', (event: { status: string }) => {
        if (event.status === 'connected') setConnectionStatus('synced');
        if (event.status === 'disconnected') setConnectionStatus('offline');
      });
    }

    if (realtimeProvider === 'supabase') {
      setConnectionStatus('connecting');
      const provider = new SupabaseYjsProvider(roomId, ydoc, (status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('synced');
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setConnectionStatus('offline');
        }
      });
      provider.connect();
      realtimeCleanup = () => provider.destroy();
    }

    // Initialize canvas engine
    const engine = new StudyBuddyCanvasEngine(canvasRef.current, ydoc);
    engineRef.current = engine;

    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Setup Undo/Redo
    const undoManager = new UndoManager([
      schema.yshapes,
      schema.ystrokes,
      schema.yconnections,
    ]);
    const updateUndoState = () => {
      useCanvasToolStore.setState({
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
      });
    };

    undoManager.on('stack-item-added', updateUndoState);
    undoManager.on('stack-item-updated', updateUndoState);
    undoManager.on('stack-item-popped', updateUndoState);
    undoManager.on('stack-cleared', updateUndoState);

    useCanvasToolStore.setState({
      undo: () => {
        undoManager.undo();
        updateUndoState();
      },
      redo: () => {
        undoManager.redo();
        updateUndoState();
      },
    });

    updateUndoState();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      undoManager.off('stack-item-added', updateUndoState);
      undoManager.off('stack-item-updated', updateUndoState);
      undoManager.off('stack-item-popped', updateUndoState);
      undoManager.off('stack-cleared', updateUndoState);
      useCanvasToolStore.setState({
        canUndo: false,
        canRedo: false,
        undo: () => {},
        redo: () => {},
      });
      engine.destroy();
      realtimeCleanup?.();
      ydoc.destroy();
      schemaRef.current = null;
      setConnectionStatus('offline');
      if (eraseRafRef.current !== null) {
        cancelAnimationFrame(eraseRafRef.current);
        eraseRafRef.current = null;
      }
      if (penRafRef.current !== null) {
        cancelAnimationFrame(penRafRef.current);
        penRafRef.current = null;
      }
      if (previewRafRef.current !== null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
        pendingPreviewUpdateRef.current = null;
      }
    };
  }, [roomId, realtimeProvider]);

  useEffect(() => {
    if (store.activeTool !== 'eraser') {
      setEraserCursor(null);
    }
  }, [store.activeTool]);

  useEffect(() => {
    engineRef.current?.setSelectedObjectIds?.(store.selectedObjectIds);
  }, [store.selectedObjectIds]);

  useEffect(() => {
    const schema = schemaRef.current;
    if (!schema) return;
    schema.ymetadata.set('gridEnabled', store.gridEnabled);
    schema.ymetadata.set('gridSize', store.gridSize);
  }, [store.gridEnabled, store.gridSize]);

  const snapValue = useCallback(
    (value: number) => {
      if (!store.snapEnabled) return value;
      const size = store.gridSize || 1;
      return Math.round(value / size) * size;
    },
    [store.snapEnabled, store.gridSize]
  );

  const updateMarqueeSelection = useCallback(
    (box: { left: number; top: number; right: number; bottom: number }, additive: boolean) => {
      const schema = schemaRef.current ?? (ydocRef.current ? createCanvasSchema(ydocRef.current) : null);
      if (!schema || !engineRef.current) return;

      const hiddenLayerIds = new Set<string>();
      schema.ylayerGroups.forEach((layer) => {
        if (layer?.get('hidden')) hiddenLayerIds.add(layer.get('id'));
      });

      const selected: string[] = [];
      schema.yshapes.forEach((shape, id) => {
        if (hiddenLayerIds.has(shape.get('layerId'))) return;
        const topLeft = engineRef.current!.worldToCanvas(shape.get('x'), shape.get('y'));
        const bottomRight = engineRef.current!.worldToCanvas(
          shape.get('x') + shape.get('width'),
          shape.get('y') + shape.get('height')
        );
        if (
          topLeft.x <= box.right &&
          bottomRight.x >= box.left &&
          topLeft.y <= box.bottom &&
          bottomRight.y >= box.top
        ) {
          selected.push(id);
        }
      });

      schema.ystrokes.forEach((stroke) => {
        if (!stroke) return;
        if (hiddenLayerIds.has(stroke.get('layerId'))) return;
        const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
        if (points.length === 0) return;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        points.forEach(([px, py]: [number, number]) => {
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        });
        const topLeft = engineRef.current!.worldToCanvas(minX, minY);
        const bottomRight = engineRef.current!.worldToCanvas(maxX, maxY);
        if (
          topLeft.x <= box.right &&
          bottomRight.x >= box.left &&
          topLeft.y <= box.bottom &&
          bottomRight.y >= box.top
        ) {
          selected.push(stroke.get('id'));
        }
      });

      if (additive) {
        const merged = new Set([...store.selectedObjectIds, ...selected]);
        store.setSelectedObjectIds(Array.from(merged));
      } else {
        store.setSelectedObjectIds(selected);
      }
    },
    [store]
  );

  const getResizeHandle = useCallback(
    (shape: Y.Map<any>, point: { x: number; y: number }) => {
      const viewport = engineRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 };
      const handleSize = 16 / viewport.zoom;
      const x = shape.get('x');
      const y = shape.get('y');
      const w = shape.get('width');
      const h = shape.get('height');
      const rotation = shape.get('rotation') || 0;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rad = (rotation * Math.PI) / 180;
      const rotatePoint = (px: number, py: number) => {
        const dx = px - cx;
        const dy = py - cy;
        return {
          x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
          y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
        };
      };

      const corners = [
        rotatePoint(x, y),
        rotatePoint(x + w, y),
        rotatePoint(x + w, y + h),
        rotatePoint(x, y + h),
      ];
      const xs = corners.map((c) => c.x);
      const ys = corners.map((c) => c.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const boxW = maxX - minX;
      const boxH = maxY - minY;
      const armLength = Math.max(boxW, boxH) / 2 + 20 / viewport.zoom;

      const handles = [
        { id: 'nw' as const, x: minX, y: minY },
        { id: 'ne' as const, x: maxX, y: minY },
        { id: 'sw' as const, x: minX, y: maxY },
        { id: 'se' as const, x: maxX, y: maxY },
        { id: 'n' as const, x: (minX + maxX) / 2, y: minY },
        { id: 's' as const, x: (minX + maxX) / 2, y: maxY },
        { id: 'w' as const, x: minX, y: (minY + maxY) / 2 },
        { id: 'e' as const, x: maxX, y: (minY + maxY) / 2 },
        { id: 'rotate' as const, x: (minX + maxX) / 2, y: minY - armLength },
      ];

      for (const handle of handles) {
        const dx = Math.abs(point.x - handle.x);
        const dy = Math.abs(point.y - handle.y);
        const size = handle.id === 'rotate' ? handleSize * 1.8 : handleSize;
        if (dx <= size && dy <= size) {
          return handle.id;
        }
      }
      return null;
    },
    []
  );

  const getSelectionBounds = useCallback(
    (ids: string[]) => {
      const schema = schemaRef.current ?? (ydocRef.current ? createCanvasSchema(ydocRef.current) : null);
      if (!schema) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasAny = false;

      const expandWithPoint = (x: number, y: number) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      };

      ids.forEach((id) => {
        const shape = schema.yshapes.get(id);
        if (shape) {
          const x = shape.get('x');
          const y = shape.get('y');
          const w = shape.get('width');
          const h = shape.get('height');
          const rotation = shape.get('rotation') || 0;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rad = (rotation * Math.PI) / 180;
          const rotatePoint = (px: number, py: number) => {
            const dx = px - cx;
            const dy = py - cy;
            return {
              x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
              y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
            };
          };
          const corners = [
            rotatePoint(x, y),
            rotatePoint(x + w, y),
            rotatePoint(x + w, y + h),
            rotatePoint(x, y + h),
          ];
          corners.forEach((pt) => expandWithPoint(pt.x, pt.y));
          hasAny = true;
          return;
        }

        const stroke = schema.ystrokes.toArray().find((s) => s?.get('id') === id);
        if (stroke) {
          const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
          points.forEach(([px, py]: [number, number]) => expandWithPoint(px, py));
          hasAny = true;
        }
      });

      if (!hasAny) return null;
      return { minX, minY, maxX, maxY };
    },
    []
  );

  const getHandleCursor = useCallback((handle: ReturnType<typeof getResizeHandle>) => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'w':
      case 'e':
        return 'ew-resize';
      case 'rotate':
        return 'grab';
      default:
        return 'default';
    }
  }, [getResizeHandle]);

  const getConnectionCurveData = useCallback(
    (conn: Y.Map<any>) => {
      if (!schemaRef.current || !engineRef.current) return null;
      const fromId = conn.get('fromObjectId');
      const toId = conn.get('toObjectId');
      if (!fromId || !toId) return null;
      const schema = schemaRef.current;
      const fromShape = schema.yshapes.get(fromId);
      const toShape = schema.yshapes.get(toId);
      if (!fromShape || !toShape) return null;

      const getEdgePoint = (
        rect: { x: number; y: number; w: number; h: number },
        target: { x: number; y: number }
      ) => {
        const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
        const dx = target.x - center.x;
        const dy = target.y - center.y;
        if (dx === 0 && dy === 0) return center;
        const halfW = rect.w / 2 || 1;
        const halfH = rect.h / 2 || 1;
        const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
        return { x: center.x + dx * scale, y: center.y + dy * scale };
      };

      const fromRect = {
        x: fromShape.get('x'),
        y: fromShape.get('y'),
        w: fromShape.get('width'),
        h: fromShape.get('height'),
      };
      const toRect = {
        x: toShape.get('x'),
        y: toShape.get('y'),
        w: toShape.get('width'),
        h: toShape.get('height'),
      };
      const fromCenter = { x: fromRect.x + fromRect.w / 2, y: fromRect.y + fromRect.h / 2 };
      const toCenter = { x: toRect.x + toRect.w / 2, y: toRect.y + toRect.h / 2 };
      const start = getEdgePoint(fromRect, toCenter);
      const end = getEdgePoint(toRect, fromCenter);
      const stored = conn.get('controlPoint') as { x: number; y: number } | undefined;
      const cpX = stored?.x ?? (start.x + end.x) / 2;
      const cpY = stored?.y ?? (start.y + end.y) / 2 - 50;
      const t = 0.5;
      const handleX =
        (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cpX + t * t * end.x;
      const handleY =
        (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cpY + t * t * end.y;
      return {
        start,
        end,
        control: { x: cpX, y: cpY },
        handle: { x: handleX, y: handleY },
      };
    },
    []
  );

  // ─────────────────────────────────────────────────────────────
  // TOOL INTERACTIONS
  // ─────────────────────────────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);

      if (store.activeTool === 'sticky') {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        // Create sticky note
        const stickyData = {
          type: 'sticky' as const,
          x,
          y,
          width: 200,
          height: 200,
          rotation: 0,
          layerId: schema.ymetadata.get('activeLayerId') || ensureDefaultLayer(schema),
          zIndex: 0,
          color: store.sticky.backgroundColor,
          fillColor: store.sticky.backgroundColor,
          strokeColor: store.sticky.backgroundColor,
          fillEnabled: true,
          strokeEnabled: false,
          fillOpacity: 1,
          strokeWidth: 2,
          locked: false,
          userId,
          text: '',
          textColor: store.sticky.textColor,
          fontSize: store.sticky.fontSize,
          fontFamily: store.sticky.fontFamily,
          isFocused: true,
          focusedBy: userId,
        };

        const sticky = addShape(schema.yshapes, schema.ylayers, stickyData);
        setActiveStickyNoteId(sticky.id);
        setActiveStickyData(sticky as StickyNoteData);
      } else if (store.activeTool === 'select') {
        return;
      }
    },
    [store, userId, isSynced, maybeToastOffline]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;
      if (store.activeTool !== 'select') return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
      const hit = engineRef.current.hitTest(x, y);
      if (!hit || hit.type !== 'shape') return;

      const shape = schema.yshapes.get(hit.objectId);
      if (!shape) return;
      if (shape.get('type') === 'text') {
        setActiveTextId(hit.objectId);
        setActiveTextData({
          id: hit.objectId,
          x: shape.get('x'),
          y: shape.get('y'),
          width: shape.get('width'),
          height: shape.get('height'),
          text: shape.get('text') || 'Text',
          textColor: shape.get('textColor') || shape.get('color') || '#e2e8f0',
          fontSize: shape.get('fontSize') || 20,
          fontFamily: shape.get('fontFamily') || 'system-ui',
        });
        return;
      }

      if (shape.get('type') === 'sticky') {
        setActiveStickyNoteId(hit.objectId);
        setActiveStickyData({
          id: hit.objectId,
          type: 'sticky',
          x: shape.get('x'),
          y: shape.get('y'),
          width: shape.get('width'),
          height: shape.get('height'),
          rotation: shape.get('rotation'),
          color: shape.get('color'),
          fillOpacity: shape.get('fillOpacity'),
          strokeWidth: shape.get('strokeWidth'),
          locked: shape.get('locked'),
          userId: shape.get('userId'),
          text: shape.get('text'),
          textColor: shape.get('textColor'),
          fontSize: shape.get('fontSize'),
          fontFamily: shape.get('fontFamily'),
          isFocused: true,
          focusedBy: userId,
          createdAt: shape.get('createdAt'),
          updatedAt: shape.get('updatedAt'),
        } as StickyNoteData);
      }
    },
    [store.activeTool]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (store.activeTool === 'select') {
        const world = engineRef.current.canvasToWorld(x, y);
        if (connectionDragRef.current) {
          const drag = connectionDragRef.current;
          const dx = world.x - drag.startWorld.x;
          const dy = world.y - drag.startWorld.y;
          engineRef.current?.setPreviewConnectionControlPoint(drag.id, {
            x: drag.startControl.x + dx,
            y: drag.startControl.y + dy,
          });
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
          return;
        }
        if (mindmapFromRef.current) {
          // No preview line yet; pointer moves do not affect selection.
        }
        if (marqueeRef.current?.active) {
          const start = marqueeRef.current.start;
          const nextX = Math.min(start.x, x);
          const nextY = Math.min(start.y, y);
          setMarqueeBox({
            x: nextX,
            y: nextY,
            width: Math.abs(x - start.x),
            height: Math.abs(y - start.y),
          });
          updateMarqueeSelection(
            {
              left: Math.min(start.x, x),
              top: Math.min(start.y, y),
              right: Math.max(start.x, x),
              bottom: Math.max(start.y, y),
            },
            e.ctrlKey || e.metaKey
          );
          return;
        }
        if (panStateRef.current) {
          const zoom = engineRef.current?.getViewport().zoom || 1;
          const dx = (x - panStateRef.current.lastCanvas.x) / zoom;
          const dy = (y - panStateRef.current.lastCanvas.y) / zoom;
          engineRef.current?.pan(dx, dy);
          panStateRef.current.lastCanvas = { x, y };
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
          return;
        }
        if (dragStateRef.current) {
          if (!isSynced) {
            maybeToastOffline();
            return;
          }
          const drag = dragStateRef.current;
          const dx = world.x - drag.startWorld.x;
          const dy = world.y - drag.startWorld.y;
          const normalizeRadians = (value: number) => {
            let v = value;
            while (v > Math.PI) v -= Math.PI * 2;
            while (v < -Math.PI) v += Math.PI * 2;
            return v;
          };

          const schedulePreview = (update: () => void) => {
            pendingPreviewUpdateRef.current = update;
            if (previewRafRef.current !== null) return;
            previewRafRef.current = window.requestAnimationFrame(() => {
              previewRafRef.current = null;
              pendingPreviewUpdateRef.current?.();
              pendingPreviewUpdateRef.current = null;
            });
          };

          if (drag.mode === 'move') {
            if (drag.selectedIds && drag.selectedRects) {
              schedulePreview(() => {
                drag.selectedIds?.forEach((id) => {
                  const rect = drag.selectedRects?.get(id);
                  if (!rect) return;
                  engineRef.current?.setPreviewTransform(id, {
                    x: rect.x + dx,
                    y: rect.y + dy,
                    width: rect.width,
                    height: rect.height,
                    rotation: rect.rotation,
                  });
                });
                drag.selectedStrokes?.forEach((_points, id) => {
                  engineRef.current?.setPreviewStrokeOffset(id, { dx, dy });
                });
              });
            } else {
              schedulePreview(() => {
                engineRef.current?.setPreviewTransform(drag.id, {
                  x: drag.startRect.x + dx,
                  y: drag.startRect.y + dy,
                  width: drag.startRect.width,
                  height: drag.startRect.height,
                  rotation: drag.startRect.rotation,
                });
                drag.selectedStrokes?.forEach((_points, id) => {
                  engineRef.current?.setPreviewStrokeOffset(id, { dx, dy });
                });
              });
            }
          } else if (drag.mode === 'resize' && drag.handle) {
            const { x: startX, y: startY, width, height } = drag.startRect;
            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(drag.handle);
            let newX = startX;
            let newY = startY;
            let newW = width;
            let newH = height;
            const localDx = dx;
            const localDy = dy;

            if (isCorner) {
              const ratio = width / height || 1;
              const deltaW = drag.handle.includes('e') ? localDx : -localDx;
              const deltaH = drag.handle.includes('s') ? localDy : -localDy;
              const useWidth = Math.abs(deltaW) >= Math.abs(deltaH);
              newW = width + deltaW;
              newH = height + deltaH;
              if (useWidth) {
                newH = newW / ratio;
              } else {
                newW = newH * ratio;
              }
              if (drag.handle.includes('w')) {
                newX = startX + (width - newW);
              }
              if (drag.handle.includes('n')) {
                newY = startY + (height - newH);
              }
            } else {
              if (drag.handle.includes('e')) {
                newW = width + localDx;
              }
              if (drag.handle.includes('s')) {
                newH = height + localDy;
              }
              if (drag.handle.includes('w')) {
                newW = width - localDx;
                newX = startX + localDx;
              }
              if (drag.handle.includes('n')) {
                newH = height - localDy;
                newY = startY + localDy;
              }
            }

            newW = Math.max(10, newW);
            newH = Math.max(10, newH);

            schedulePreview(() => {
              engineRef.current?.setPreviewTransform(drag.id, {
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                rotation: drag.startRect.rotation,
              });
            });
          } else if (drag.mode === 'rotate' && drag.shapeCenter) {
            const startAngle = Math.atan2(
              drag.startWorld.y - drag.shapeCenter.y,
              drag.startWorld.x - drag.shapeCenter.x
            );
            const currentAngle = Math.atan2(
              world.y - drag.shapeCenter.y,
              world.x - drag.shapeCenter.x
            );
            const deltaDeg = (normalizeRadians(currentAngle - startAngle) * 180) / Math.PI;
            schedulePreview(() => {
              engineRef.current?.setPreviewTransform(drag.id, {
                x: drag.startRect.x,
                y: drag.startRect.y,
                width: drag.startRect.width,
                height: drag.startRect.height,
                rotation: drag.startRect.rotation + deltaDeg,
              });
            });
          }
          if (canvasRef.current) {
            canvasRef.current.style.cursor = drag.mode === 'move' ? 'grabbing' : getHandleCursor(drag.handle ?? null);
          }
          return;
        }

        let hit = engineRef.current.hitTest(x, y);
        if (!hit && schemaRef.current) {
          const schema = schemaRef.current;
          const tolerance = 10 / (engineRef.current?.getViewport().zoom || 1);
          schema.yconnections.forEach((conn, id) => {
            if (hit) return;
            if ((conn.get('lineStyle') || 'curved') !== 'curved') return;
            const curve = getConnectionCurveData(conn);
            if (!curve) return;
            const dist = Math.hypot(world.x - curve.handle.x, world.y - curve.handle.y);
            if (dist <= tolerance) {
              hit = { objectId: id, type: 'connection', distance: dist } as any;
            }
          });
        }
        if (hit && hit.type === 'shape') {
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const shape = schema.yshapes.get(hit.objectId);
          if (shape && canvasRef.current) {
            const handle = getResizeHandle(shape, world);
            canvasRef.current.style.cursor = handle ? getHandleCursor(handle) : 'grab';
          }
        } else if (hit && hit.type === 'connection' && canvasRef.current) {
          canvasRef.current.style.cursor = 'grab';
        } else if (canvasRef.current && store.selectedObjectIds.length) {
          const bounds = getSelectionBounds(store.selectedObjectIds);
          if (bounds) {
            const padding = 6 / (engineRef.current?.getViewport().zoom || 1);
            const inside =
              world.x >= bounds.minX - padding &&
              world.x <= bounds.maxX + padding &&
              world.y >= bounds.minY - padding &&
              world.y <= bounds.maxY + padding;
            if (inside) {
              canvasRef.current.style.cursor = 'grab';
              return;
            }
          }
          canvasRef.current.style.cursor = 'default';
        } else if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
      }

      if (activeShapeIdRef.current && shapeStartRef.current) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        const world = engineRef.current.canvasToWorld(x, y);
        const start = shapeStartRef.current;
        const width = world.x - start.x;
        const height = world.y - start.y;
        const tool = store.activeTool;

        if (tool === 'line') {
          engineRef.current?.setPreviewTransform(activeShapeIdRef.current, {
            x: start.x,
            y: start.y,
            width,
            height,
            rotation: 0,
          });
        } else {
          const nextX = Math.min(start.x, world.x);
          const nextY = Math.min(start.y, world.y);
          engineRef.current?.setPreviewTransform(activeShapeIdRef.current, {
            x: nextX,
            y: nextY,
            width: Math.abs(width),
            height: Math.abs(height),
            rotation: 0,
          });
        }
        return;
      }

      if (store.activeTool === 'pen' && activeStrokeIndexRef.current !== null) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const world = engineRef.current.canvasToWorld(x, y);
        const now = performance.now();
        const nextPoint: [number, number, number] = [world.x, world.y, e.pressure || 1];
        const shouldAppendNow = now - lastPenAppendRef.current >= 8;

        if (shouldAppendNow) {
          appendPointToPenStroke(schema.ystrokes, activeStrokeIndexRef.current, nextPoint);
          engineRef.current?.requestRender?.();
          lastPenAppendRef.current = now;
          pendingPenPointRef.current = null;
        } else {
          pendingPenPointRef.current = nextPoint;
          if (penRafRef.current === null) {
            penRafRef.current = window.requestAnimationFrame(() => {
              penRafRef.current = null;
              if (!pendingPenPointRef.current || activeStrokeIndexRef.current === null) return;
              appendPointToPenStroke(
                schema.ystrokes,
                activeStrokeIndexRef.current,
                pendingPenPointRef.current
              );
              engineRef.current?.requestRender?.();
              lastPenAppendRef.current = performance.now();
              pendingPenPointRef.current = null;
            });
          }
        }
        return;
      }

      if (store.activeTool === 'eraser') {
        setEraserCursor({ x, y });
      }

      if (store.activeTool === 'eraser' && e.isPrimary && e.buttons === 1) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        if (lastErasePosRef.current) {
          const dx = x - lastErasePosRef.current.x;
          const dy = y - lastErasePosRef.current.y;
          if (Math.hypot(dx, dy) < 4) {
            return;
          }
        }
        lastErasePosRef.current = { x, y };
        pendingEraseRef.current = { x, y };
        if (eraseRafRef.current === null) {
          eraseRafRef.current = window.requestAnimationFrame(() => {
            eraseRafRef.current = null;
            if (!pendingEraseRef.current) return;
            const { x: px, y: py } = pendingEraseRef.current;
            pendingEraseRef.current = null;
            const schema = createCanvasSchema(ydocRef.current!);
            executeErase(
              px,
              py,
              engineRef.current!,
              schema.yshapes,
              schema.ystrokes,
              schema.yconnections,
              schema.ylayers,
              store.eraser
            );
          });
        }
      }
    },
    [store.activeTool, store.eraser, isSynced, maybeToastOffline, snapValue]
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;
      const shapeTools = ['rect', 'circle', 'line', 'triangle', 'polygon', 'text'] as const;

      if (store.activeTool === 'select') {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const world = engineRef.current.canvasToWorld(x, y);
        const connectionTolerance = 10 / (engineRef.current?.getViewport().zoom || 1);
        let hitConnection: string | null = null;
        schema.yconnections.forEach((conn, id) => {
          if (hitConnection) return;
          if ((conn.get('lineStyle') || 'curved') !== 'curved') return;
          const curve = getConnectionCurveData(conn);
          if (!curve) return;
          const dist = Math.hypot(world.x - curve.handle.x, world.y - curve.handle.y);
          if (dist <= connectionTolerance) {
            hitConnection = id;
          }
        });

        if (hitConnection) {
          const conn = schema.yconnections.get(hitConnection);
          const curve = conn ? getConnectionCurveData(conn) : null;
          if (curve) {
            connectionDragRef.current = {
              id: hitConnection,
              startWorld: world,
              startControl: curve.control,
            };
            activePointerIdRef.current = e.pointerId;
            (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
            if (canvasRef.current) {
              canvasRef.current.style.cursor = 'grabbing';
            }
            return;
          }
        }
        const selectedHandle = store.selectedObjectIds.length === 1
          ? store.selectedObjectIds
              .map((id) => schema.yshapes.get(id))
              .find((shape) => shape && getResizeHandle(shape, world))
          : undefined;

        if (selectedHandle) {
          const handle = getResizeHandle(selectedHandle, world);
          const hitId = selectedHandle.get('id');
          dragStateRef.current = {
            id: hitId,
            mode: handle === 'rotate' ? 'rotate' : 'resize',
            handle: handle ?? undefined,
            startWorld: world,
            startRect: {
              x: selectedHandle.get('x'),
              y: selectedHandle.get('y'),
              width: selectedHandle.get('width'),
              height: selectedHandle.get('height'),
              rotation: selectedHandle.get('rotation') || 0,
            },
            shapeCenter: handle === 'rotate'
              ? { x: selectedHandle.get('x') + selectedHandle.get('width') / 2, y: selectedHandle.get('y') + selectedHandle.get('height') / 2 }
              : undefined,
          };
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          return;
        }

        if (store.selectedObjectIds.length) {
          const bounds = getSelectionBounds(store.selectedObjectIds);
          if (bounds) {
            const padding = 6 / (engineRef.current?.getViewport().zoom || 1);
            const inside =
              world.x >= bounds.minX - padding &&
              world.x <= bounds.maxX + padding &&
              world.y >= bounds.minY - padding &&
              world.y <= bounds.maxY + padding;
            if (inside) {
              const selectedIds = store.selectedObjectIds;
              const selectedRects = new Map<string, { x: number; y: number; width: number; height: number; rotation: number }>();
              const selectedStrokes = new Map<string, Array<[number, number, number]>>();
              selectedIds.forEach((id) => {
                const selectedShape = schema.yshapes.get(id);
                if (selectedShape) {
                  selectedRects.set(id, {
                    x: selectedShape.get('x'),
                    y: selectedShape.get('y'),
                    width: selectedShape.get('width'),
                    height: selectedShape.get('height'),
                    rotation: selectedShape.get('rotation') || 0,
                  });
                }
              });
              schema.ystrokes.forEach((stroke) => {
                if (!stroke) return;
                const id = stroke.get('id');
                if (!selectedIds.includes(id)) return;
                const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
                selectedStrokes.set(id, points);
              });

              dragStateRef.current = {
                id: selectedIds[0],
                mode: 'move',
                startWorld: world,
                startRect: {
                  x: selectedRects.get(selectedIds[0])?.x ?? 0,
                  y: selectedRects.get(selectedIds[0])?.y ?? 0,
                  width: selectedRects.get(selectedIds[0])?.width ?? 0,
                  height: selectedRects.get(selectedIds[0])?.height ?? 0,
                  rotation: selectedRects.get(selectedIds[0])?.rotation ?? 0,
                },
                selectedIds,
                selectedRects,
                selectedStrokes,
              };
              activePointerIdRef.current = e.pointerId;
              (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
              if (canvasRef.current) {
                canvasRef.current.style.cursor = 'grabbing';
              }
              return;
            }
          }
        }

        const hit = engineRef.current.hitTest(x, y);
        if (!hit) {
          if (spaceDownRef.current || e.button === 1) {
            panStateRef.current = {
              lastCanvas: { x, y },
            };
            activePointerIdRef.current = e.pointerId;
            (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
            if (canvasRef.current) {
              canvasRef.current.style.cursor = 'grabbing';
            }
            return;
          }
          marqueeRef.current = { start: { x, y }, active: true };
          setMarqueeBox({ x, y, width: 0, height: 0 });
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          if (!e.ctrlKey && !e.metaKey) {
            store.clearSelection();
          }
          return;
        }

        if (!e.ctrlKey && !e.metaKey && store.selectedObjectIds.length > 1) {
          const selectedIds = store.selectedObjectIds;
          const selectedRects = new Map<string, { x: number; y: number; width: number; height: number; rotation: number }>();
          const selectedStrokes = new Map<string, Array<[number, number, number]>>();
          selectedIds.forEach((id) => {
            const selectedShape = schema.yshapes.get(id);
            if (!selectedShape) return;
            selectedRects.set(id, {
              x: selectedShape.get('x'),
              y: selectedShape.get('y'),
              width: selectedShape.get('width'),
              height: selectedShape.get('height'),
              rotation: selectedShape.get('rotation') || 0,
            });
          });
          schema.ystrokes.forEach((stroke) => {
            if (!stroke) return;
            const id = stroke.get('id');
            if (!selectedIds.includes(id)) return;
            const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
            selectedStrokes.set(id, points);
          });

          dragStateRef.current = {
            id: selectedIds[0],
            mode: 'move',
            startWorld: world,
            startRect: {
              x: selectedRects.get(selectedIds[0])?.x ?? 0,
              y: selectedRects.get(selectedIds[0])?.y ?? 0,
              width: selectedRects.get(selectedIds[0])?.width ?? 0,
              height: selectedRects.get(selectedIds[0])?.height ?? 0,
              rotation: selectedRects.get(selectedIds[0])?.rotation ?? 0,
            },
            selectedIds,
            selectedRects,
            selectedStrokes,
          };
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
          return;
        }

        if (e.ctrlKey || e.metaKey) {
          store.toggleObjectSelection(hit.objectId);
        } else if (store.selectedObjectIds.length <= 1) {
          if (!store.selectedObjectIds.includes(hit.objectId)) {
            store.setSelectedObjectIds([hit.objectId]);
          }
        }
        if (hit.type === 'stroke') {
          const stroke = schema.ystrokes.toArray().find((s) => s?.get('id') === hit.objectId);
          if (!stroke) return;
          const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
          const isAlreadySelected = store.selectedObjectIds.includes(hit.objectId);
          if (isAlreadySelected && store.selectedObjectIds.length > 1 && !e.ctrlKey && !e.metaKey) {
            const selectedIds = store.selectedObjectIds;
            const selectedRects = new Map<string, { x: number; y: number; width: number; height: number; rotation: number }>();
            const selectedStrokes = new Map<string, Array<[number, number, number]>>();
            selectedIds.forEach((id) => {
              const selectedShape = schema.yshapes.get(id);
              if (!selectedShape) return;
              selectedRects.set(id, {
                x: selectedShape.get('x'),
                y: selectedShape.get('y'),
                width: selectedShape.get('width'),
                height: selectedShape.get('height'),
                rotation: selectedShape.get('rotation') || 0,
              });
            });
            schema.ystrokes.forEach((s) => {
              if (!s) return;
              const id = s.get('id');
              if (!selectedIds.includes(id)) return;
              const strokePoints = (s.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
              selectedStrokes.set(id, strokePoints);
            });
            dragStateRef.current = {
              id: selectedIds[0],
              mode: 'move',
              startWorld: world,
              startRect: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
              selectedIds,
              selectedRects,
              selectedStrokes,
            };
          } else {
            dragStateRef.current = {
              id: hit.objectId,
              mode: 'move',
              startWorld: world,
              startRect: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
              selectedIds: [hit.objectId],
              selectedRects: new Map(),
              selectedStrokes: new Map([[hit.objectId, points]]),
            };
          }
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          return;
        }
        if (hit.type !== 'shape') return;

        const shape = schema.yshapes.get(hit.objectId);
        if (!shape) return;

        let handle = getResizeHandle(shape, world);
        const isAlreadySelected = store.selectedObjectIds.includes(hit.objectId);
        if (isAlreadySelected && store.selectedObjectIds.length > 1 && !e.ctrlKey && !e.metaKey) {
          handle = null;
        }
        if (e.altKey) {
          dragStateRef.current = {
            id: hit.objectId,
            mode: 'rotate',
            handle: 'rotate',
            startWorld: world,
            startRect: {
              x: shape.get('x'),
              y: shape.get('y'),
              width: shape.get('width'),
              height: shape.get('height'),
              rotation: shape.get('rotation') || 0,
            },
            shapeCenter: { x: shape.get('x') + shape.get('width') / 2, y: shape.get('y') + shape.get('height') / 2 },
          };
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          return;
        }
        let mode: 'move' | 'resize' | 'rotate' = handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move';

        const selectedIds = (e.ctrlKey || e.metaKey)
          ? store.selectedObjectIds.includes(hit.objectId)
            ? store.selectedObjectIds
            : [...store.selectedObjectIds, hit.objectId]
          : isAlreadySelected && store.selectedObjectIds.length > 1
          ? store.selectedObjectIds
          : [hit.objectId];
        const selectedRects = new Map<string, { x: number; y: number; width: number; height: number; rotation: number }>();
        const selectedStrokes = new Map<string, Array<[number, number, number]>>();
        selectedIds.forEach((id) => {
          const selectedShape = schema.yshapes.get(id);
          if (!selectedShape) return;
          selectedRects.set(id, {
            x: selectedShape.get('x'),
            y: selectedShape.get('y'),
            width: selectedShape.get('width'),
            height: selectedShape.get('height'),
            rotation: selectedShape.get('rotation') || 0,
          });
        });
        schema.ystrokes.forEach((stroke) => {
          if (!stroke) return;
          const id = stroke.get('id');
          if (!selectedIds.includes(id)) return;
          const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
          selectedStrokes.set(id, points);
        });

        dragStateRef.current = {
          id: hit.objectId,
          mode,
          handle: handle ?? undefined,
          startWorld: world,
          startRect: {
            x: shape.get('x'),
            y: shape.get('y'),
            width: shape.get('width'),
            height: shape.get('height'),
            rotation: shape.get('rotation') || 0,
          },
          shapeCenter: mode === 'rotate'
            ? { x: shape.get('x') + shape.get('width') / 2, y: shape.get('y') + shape.get('height') / 2 }
            : undefined,
          selectedIds: mode === 'move' ? selectedIds : undefined,
          selectedRects: mode === 'move' ? selectedRects : undefined,
          selectedStrokes: mode === 'move' ? selectedStrokes : undefined,
        };

        if (!e.ctrlKey && !e.metaKey && !isAlreadySelected) {
          store.setSelectedObjectIds([hit.objectId]);
        }

        activePointerIdRef.current = e.pointerId;
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
        return;
      }

      if (shapeTools.includes(store.activeTool as (typeof shapeTools)[number])) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        activePointerIdRef.current = e.pointerId;
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const world = engineRef.current.canvasToWorld(x, y);
        const startX = snapValue(world.x);
        const startY = snapValue(world.y);

        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const tool = store.activeTool;
        const baseShape = {
          x: startX,
          y: startY,
          width: tool === 'text' ? 240 : 1,
          height: tool === 'text' ? 64 : 1,
          rotation: 0,
          layerId: schema.ymetadata.get('activeLayerId') || ensureDefaultLayer(schema),
          zIndex: 0,
          color: tool === 'text' ? store.text.color : store.shape.fillColor,
          fillOpacity: tool === 'line' || tool === 'text' ? 0 : store.shape.fillOpacity,
          strokeWidth: store.shape.strokeWidth,
          fillColor: store.shape.fillColor,
          strokeColor: store.shape.strokeColor,
          fillEnabled: tool === 'line' || tool === 'text' ? false : store.shape.fillEnabled,
          strokeEnabled: store.shape.strokeEnabled,
          locked: false,
          userId,
        };

        const shapeData =
          tool === 'text'
            ? {
                ...baseShape,
                type: 'text' as const,
                text: 'Text',
                textColor: store.text.color,
                fontSize: store.text.fontSize,
                fontFamily: store.text.fontFamily,
              }
            : {
                ...baseShape,
                type: tool as 'rect' | 'circle' | 'line' | 'triangle' | 'polygon',
                ...(tool === 'polygon' ? { sides: store.shape.polygonSides } : {}),
              };

        const created = addShape(schema.yshapes, schema.ylayers, shapeData as any);
        activeShapeIdRef.current = created.id;
        shapeStartRef.current = { x: startX, y: startY };
        return;
      }

      if (store.activeTool !== 'pen') {
        if (store.activeTool === 'mindmap') {
          if (!isSynced) {
            maybeToastOffline();
            return;
          }
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const world = engineRef.current.canvasToWorld(x, y);
          const hit = engineRef.current.hitTest(x, y);
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const layerId = schema.ymetadata.get('activeLayerId') || ensureDefaultLayer(schema);
          if (hit?.type === 'shape') {
            if (!mindmapFromRef.current) {
              mindmapFromRef.current = hit.objectId;
            } else if (mindmapFromRef.current === hit.objectId) {
              mindmapFromRef.current = null;
            } else {
              addConnection(schema.yconnections, schema.ylayers, {
                fromObjectId: mindmapFromRef.current,
                toObjectId: hit.objectId,
                label: '',
                color: store.mindmap.lineColor,
                lineStyle: store.mindmap.lineStyle,
                lineWidth: store.mindmap.lineWidth,
                zIndex: schema.ylayers.length,
                layerId,
              });
              mindmapFromRef.current = null;
            }
            return;
          }

          addShape(schema.yshapes, schema.ylayers, {
            type: 'sticky',
            x: snapValue(world.x - 90),
            y: snapValue(world.y - 24),
            width: 180,
            height: 48,
            rotation: 0,
            layerId,
            zIndex: schema.ylayers.length,
            color: store.mindmap.nodeFillColor,
            fillOpacity: 1,
            strokeWidth: store.mindmap.nodeStrokeWidth,
            fillColor: store.mindmap.nodeFillColor,
            strokeColor: store.mindmap.nodeStrokeColor,
            fillEnabled: true,
            strokeEnabled: store.mindmap.nodeStrokeWidth > 0,
            locked: false,
            userId,
            text: 'Mindmap Node',
            textColor: store.mindmap.nodeTextColor,
            fontSize: store.mindmap.nodeFontSize,
            fontFamily: store.mindmap.nodeFontFamily,
            isFocused: false,
            focusedBy: null,
          } as any);
          return;
        }
        if (store.activeTool === 'eraser') {
          if (!isSynced) {
            maybeToastOffline();
            return;
          }
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setEraserCursor({ x, y });
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);

          executeErase(
            x,
            y,
            engineRef.current,
            schema.yshapes,
            schema.ystrokes,
            schema.yconnections,
            schema.ylayers,
            store.eraser
          );
        }
        return;
      }

      if (!isSynced) {
        maybeToastOffline();
        return;
      }
      activePointerIdRef.current = e.pointerId;
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const world = engineRef.current.canvasToWorld(x, y);

      const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
      const strokeIndex = schema.ystrokes.length;
      const penMode = store.brush.mode;
      const modeSettings = (() => {
        switch (penMode) {
          case 'marker':
            return { opacity: 0.7, size: store.brush.size * 1.2, pressure: false };
          case 'highlighter':
            return { opacity: 0.3, size: store.brush.size * 2.2, pressure: false };
          case 'calligraphy':
            return { opacity: 0.9, size: store.brush.size * 1.4, pressure: true };
          case 'ballpoint':
          default:
            return { opacity: 1, size: store.brush.size, pressure: store.brush.pressure };
        }
      })();
      addPenStroke(schema.ystrokes, schema.ylayers, {
        points: [[world.x, world.y, e.pressure || 1]],
        layerId: schema.ymetadata.get('activeLayerId') || ensureDefaultLayer(schema),
        color: store.brush.color,
        strokeWidth: modeSettings.size,
        eraserMode: false,
        pressureEnabled: modeSettings.pressure,
        zIndex: 0,
        userId,
        opacity: modeSettings.opacity,
        mode: penMode,
        smoothing: store.brush.smoothing,
      });

      activeStrokeIndexRef.current = strokeIndex;
      lastPenAppendRef.current = 0;
    },
    [
      store.activeTool,
      store.brush,
      store.shape,
      store.text,
      userId,
      isSynced,
      maybeToastOffline,
      snapValue,
      getResizeHandle,
    ]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !ydocRef.current) return;
      if (connectionDragRef.current) {
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const drag = connectionDragRef.current;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const world = engineRef.current?.canvasToWorld(x, y) ?? { x, y };
        const dx = world.x - drag.startWorld.x;
        const dy = world.y - drag.startWorld.y;
        const conn = schema.yconnections.get(drag.id);
        if (conn) {
          conn.set('controlPoint', { x: drag.startControl.x + dx, y: drag.startControl.y + dy });
        }
        engineRef.current?.clearPreviewConnectionControlPoint(drag.id);
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        connectionDragRef.current = null;
        activePointerIdRef.current = null;
        suppressClickRef.current = true;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
        return;
      }
      if (dragStateRef.current) {
        if (previewRafRef.current !== null) {
          cancelAnimationFrame(previewRafRef.current);
          previewRafRef.current = null;
          pendingPreviewUpdateRef.current = null;
        }
        if (isSynced && engineRef.current && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const world = engineRef.current.canvasToWorld(x, y);
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const drag = dragStateRef.current;
          const dx = world.x - drag.startWorld.x;
          const dy = world.y - drag.startWorld.y;
          const normalizeRadians = (value: number) => {
            let v = value;
            while (v > Math.PI) v -= Math.PI * 2;
            while (v < -Math.PI) v += Math.PI * 2;
            return v;
          };

          if (drag.mode === 'move') {
            if (drag.selectedIds && drag.selectedRects) {
              drag.selectedIds.forEach((id) => {
                const rect = drag.selectedRects?.get(id);
                if (!rect) return;
                updateShape(schema.yshapes, id, {
                  x: snapValue(rect.x + dx),
                  y: snapValue(rect.y + dy),
                });
                engineRef.current?.clearPreviewTransform(id);
              });
            } else {
              updateShape(schema.yshapes, drag.id, {
                x: snapValue(drag.startRect.x + dx),
                y: snapValue(drag.startRect.y + dy),
              });
              engineRef.current?.clearPreviewTransform(drag.id);
            }

            if (drag.selectedStrokes) {
              drag.selectedStrokes.forEach((points, id) => {
                const strokeIndex = schema.ystrokes.toArray().findIndex((s) => s?.get('id') === id);
                if (strokeIndex === -1) return;
                const shifted = points.map(([px, py, pr]) => [px + dx, py + dy, pr]);
                const strokeMap = schema.ystrokes.get(strokeIndex);
                const ypoints = strokeMap?.get('points') as Y.Array<any> | undefined;
                if (!ypoints) return;
                ypoints.delete(0, ypoints.length);
                shifted.forEach((pt) => {
                  const ypoint = new (ypoints.constructor as any)();
                  ypoint.push([pt[0], pt[1], pt[2]]);
                  ypoints.push([ypoint]);
                });
                engineRef.current?.clearPreviewStrokeOffset(id);
              });
            }
          } else if (drag.mode === 'resize' && drag.handle) {
            const { x: startX, y: startY, width, height } = drag.startRect;
            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(drag.handle);
            let newX = startX;
            let newY = startY;
            let newW = width;
            let newH = height;
            const localDx = dx;
            const localDy = dy;

            if (isCorner) {
              const ratio = width / height || 1;
              const deltaW = drag.handle.includes('e') ? localDx : -localDx;
              const deltaH = drag.handle.includes('s') ? localDy : -localDy;
              const useWidth = Math.abs(deltaW) >= Math.abs(deltaH);
              newW = width + deltaW;
              newH = height + deltaH;
              if (useWidth) {
                newH = newW / ratio;
              } else {
                newW = newH * ratio;
              }
              if (drag.handle.includes('w')) {
                newX = startX + (width - newW);
              }
              if (drag.handle.includes('n')) {
                newY = startY + (height - newH);
              }
            } else {
              if (drag.handle.includes('e')) {
                newW = width + localDx;
              }
              if (drag.handle.includes('s')) {
                newH = height + localDy;
              }
              if (drag.handle.includes('w')) {
                newW = width - localDx;
                newX = startX + localDx;
              }
              if (drag.handle.includes('n')) {
                newH = height - localDy;
                newY = startY + localDy;
              }
            }

            newW = Math.max(10, newW);
            newH = Math.max(10, newH);

            updateShape(schema.yshapes, drag.id, {
              x: snapValue(newX),
              y: snapValue(newY),
              width: snapValue(newW),
              height: snapValue(newH),
            });
            engineRef.current?.clearPreviewTransform(drag.id);
          } else if (drag.mode === 'rotate' && drag.shapeCenter) {
            const startAngle = Math.atan2(
              drag.startWorld.y - drag.shapeCenter.y,
              drag.startWorld.x - drag.shapeCenter.x
            );
            const currentAngle = Math.atan2(
              world.y - drag.shapeCenter.y,
              world.x - drag.shapeCenter.x
            );
            const deltaDeg = (normalizeRadians(currentAngle - startAngle) * 180) / Math.PI;
            updateShape(schema.yshapes, drag.id, {
              rotation: drag.startRect.rotation + deltaDeg,
            });
            engineRef.current?.clearPreviewTransform(drag.id);
          }
        }
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
        dragStateRef.current = null;
        activePointerIdRef.current = null;
        suppressClickRef.current = true;
        return;
      }
      if (mindmapFromRef.current) {
        if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = engineRef.current.hitTest(x, y);
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const layerId = schema.ymetadata.get('activeLayerId') || ensureDefaultLayer(schema);
        if (hit?.type === 'shape' && hit.objectId !== mindmapFromRef.current) {
          addConnection(schema.yconnections, schema.ylayers, {
            fromObjectId: mindmapFromRef.current,
            toObjectId: hit.objectId,
            label: '',
            color: store.mindmap.lineColor,
            lineStyle: store.mindmap.lineStyle,
            lineWidth: store.mindmap.lineWidth,
            zIndex: schema.ylayers.length,
            layerId,
          });
        }
        mindmapFromRef.current = null;
        engineRef.current?.clearPreviewConnection();
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        activePointerIdRef.current = null;
        suppressClickRef.current = true;
        return;
      }
      if (marqueeRef.current?.active) {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const start = marqueeRef.current.start;
        const box = {
          left: Math.min(start.x, x),
          top: Math.min(start.y, y),
          right: Math.max(start.x, x),
          bottom: Math.max(start.y, y),
        };
        updateMarqueeSelection(box, e.ctrlKey || e.metaKey);

        marqueeRef.current = null;
        setMarqueeBox(null);
        activePointerIdRef.current = null;
        suppressClickRef.current = true;
        return;
      }
      if (panStateRef.current) {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        panStateRef.current = null;
        activePointerIdRef.current = null;
        suppressClickRef.current = true;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
        return;
      }
      if (activeShapeIdRef.current) {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        if (engineRef.current && shapeStartRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const world = engineRef.current.canvasToWorld(x, y);
          const start = shapeStartRef.current;
          const width = world.x - start.x;
          const height = world.y - start.y;
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          if (store.activeTool === 'line') {
            updateShape(schema.yshapes, activeShapeIdRef.current, {
              x: start.x,
              y: start.y,
              width,
              height,
            });
          } else {
            const nextX = Math.min(start.x, world.x);
            const nextY = Math.min(start.y, world.y);
            updateShape(schema.yshapes, activeShapeIdRef.current, {
              x: nextX,
              y: nextY,
              width: Math.abs(width),
              height: Math.abs(height),
            });
          }
          engineRef.current?.clearPreviewTransform(activeShapeIdRef.current);
        }
        activeShapeIdRef.current = null;
        shapeStartRef.current = null;
        activePointerIdRef.current = null;
        return;
      }
      if (store.activeTool !== 'pen') {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
          activePointerIdRef.current = null;
        }
        return;
      }

      if (activePointerIdRef.current !== null) {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
          activePointerIdRef.current
        );
      }

      if (activeStrokeIndexRef.current !== null) {
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        if (engineRef.current && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const world = engineRef.current.canvasToWorld(x, y);
          const strokeMap = schema.ystrokes.get(activeStrokeIndexRef.current);
          const points = strokeMap?.get('points') as Y.Array<any> | undefined;
          if (points && points.length < 2) {
            appendPointToPenStroke(schema.ystrokes, activeStrokeIndexRef.current, [
              world.x,
              world.y,
              e.pressure || 1,
            ]);
          }
        }
        if (pendingPenPointRef.current) {
          appendPointToPenStroke(
            schema.ystrokes,
            activeStrokeIndexRef.current,
            pendingPenPointRef.current
          );
          lastPenAppendRef.current = performance.now();
          pendingPenPointRef.current = null;
        }
        finalizePenStroke(schema.ystrokes, activeStrokeIndexRef.current);
      }

      activeStrokeIndexRef.current = null;
      activePointerIdRef.current = null;
    },
    [store.activeTool]
  );

  const handleCanvasPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handleCanvasPointerUp(e);
    },
    [handleCanvasPointerUp]
  );

  const handleClearBoard = useCallback(() => {
    if (!ydocRef.current) return;
    const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
    ensureDefaultLayer(schema);

    ydocRef.current.transact(() => {
      schema.yshapes.clear();
      schema.ystrokes.delete(0, schema.ystrokes.length);
      schema.yconnections.clear();
      schema.ylayers.delete(0, schema.ylayers.length);
    });

    store.clearSelection();
    setActiveStickyNoteId(null);
    setActiveStickyData(null);
    setActiveTextId(null);
    setActiveTextData(null);
    triggerChumToast?.('Board cleared. Tap to undo.', 'warning', () => store.undo());
  }, [store, triggerChumToast]);

  const handleConfirmClear = useCallback(() => {
    setShowClearConfirm(false);
    handleClearBoard();
  }, [handleClearBoard]);

  // ─────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceDownRef.current = true;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          store.undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          store.redo();
        }
        if (e.key.toLowerCase() === 'c') {
          const schema = schemaRef.current ?? (ydocRef.current ? createCanvasSchema(ydocRef.current) : null);
          if (!schema) return;
          const shapes: Array<{ data: any }> = [];
          const strokes: Array<{ data: any }> = [];
          store.selectedObjectIds.forEach((id) => {
            const shape = schema.yshapes.get(id);
            if (shape) {
              shapes.push({ data: Object.fromEntries(shape) });
              return;
            }
            const stroke = schema.ystrokes.toArray().find((s) => s?.get('id') === id);
            if (stroke) {
              const points = (stroke.get('points') as Y.Array<any>).toArray().map((pt) => pt.toArray());
              strokes.push({ data: { ...Object.fromEntries(stroke), points } });
            }
          });
          clipboardRef.current = { shapes, strokes };
        }
        if (e.key.toLowerCase() === 'v') {
          const schema = schemaRef.current ?? (ydocRef.current ? createCanvasSchema(ydocRef.current) : null);
          if (!schema || !clipboardRef.current) return;
          const offset = 24;
          const activeLayerId = schema.ymetadata.get('activeLayerId') || ensureDefaultLayer(schema);
          clipboardRef.current.shapes.forEach(({ data }) => {
            const { id: _, createdAt: __, updatedAt: ___, ...rest } = data;
            addShape(schema.yshapes, schema.ylayers, {
              ...rest,
              x: rest.x + offset,
              y: rest.y + offset,
              layerId: activeLayerId,
            });
          });
          clipboardRef.current.strokes.forEach(({ data }) => {
            const { id: _, createdAt: __, points, ...rest } = data;
            const shifted = (points as Array<[number, number, number]>).map(([px, py, pr]) => [px + offset, py + offset, pr]);
            addPenStroke(schema.ystrokes, schema.ylayers, {
              ...rest,
              points: shifted,
              layerId: activeLayerId,
            });
          });
        }
      }

      // Tool shortcuts
      if (e.key === 'v') store.setActiveTool('select');
      if (e.key === 'p') store.setActiveTool('pen');
      if (e.key === 'e') store.setActiveTool('eraser');
      if (e.key === 'm') store.setActiveTool('mindmap');
      if (e.key === 's') store.setActiveTool('sticky');
      if (e.key === 'r') store.setActiveTool('rect');
      if (e.key === 'c') store.setActiveTool('circle');
      if (e.key === 'l') store.setActiveTool('line');
      if (e.key === 't') store.setActiveTool('text');
      if (e.key === 'Escape') {
        setActiveStickyNoteId(null);
        store.clearSelection();
        setActiveTextId(null);
        setActiveTextData(null);
        mindmapFromRef.current = null;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const schema = schemaRef.current ?? (ydocRef.current ? createCanvasSchema(ydocRef.current) : null);
        if (!schema) return;
        store.selectedObjectIds.forEach((id) => {
          if (schema.yshapes.has(id)) {
            schema.yshapes.delete(id);
          }
          for (let i = 0; i < schema.ystrokes.length; i++) {
            if (schema.ystrokes.get(i)?.get('id') === id) {
              schema.ystrokes.delete(i, 1);
              break;
            }
          }
          if (schema.yconnections.has(id)) {
            schema.yconnections.delete(id);
          }
          const idx = schema.ylayers.toArray().indexOf(id);
          if (idx !== -1) schema.ylayers.delete(idx, 1);
        });
        store.clearSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceDownRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [store]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-[#0b1211] overflow-hidden"
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerCancel}
        onPointerLeave={() => setEraserCursor(null)}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
      />

      {marqueeBox && (
        <div
          className="pointer-events-none absolute border border-[#14b8a6] bg-[#14b8a6]/10"
          style={{
            left: marqueeBox.x,
            top: marqueeBox.y,
            width: marqueeBox.width,
            height: marqueeBox.height,
          }}
        />
      )}

      {store.activeTool === 'eraser' && eraserCursor && (
        <div
          className="pointer-events-none absolute rounded-full border border-[#ef4444] bg-[#ef4444]/10"
          style={{
            width: store.eraser.size,
            height: store.eraser.size,
            left: eraserCursor.x - store.eraser.size / 2,
            top: eraserCursor.y - store.eraser.size / 2,
          }}
        />
      )}

      {(roomTitle || roomDescription) && (
        <div className="absolute left-6 top-6 z-[200] max-w-sm rounded-3xl border border-white/10 bg-[#0b1211]/80 px-4 py-3 text-white/80 shadow-xl backdrop-blur">
          {roomTitle && (
            <div className="text-sm font-black text-white">{roomTitle}</div>
          )}
          {roomDescription && (
            <div className="text-[11px] text-white/50 mt-1 line-clamp-2">
              {roomDescription}
            </div>
          )}
          <button
            onClick={() => {
              const code = roomId.startsWith('canvas-') ? roomId.slice(7) : roomId;
              const link = `${window.location.origin}/canvas?room=${code}`;
              navigator.clipboard?.writeText(link).catch(() => undefined);
            }}
            className="mt-3 text-[10px] uppercase tracking-widest text-[#14b8a6] hover:text-white transition-colors"
          >
            Copy Link
          </button>
        </div>
      )}

      {/* Sticky Note Editor Overlay */}
      {activeStickyData && ydocRef.current && (
        <StickyNoteEditor
          sticky={activeStickyData}
          ymap={
            ydocRef.current
              .getMap('shapes')
              .get(activeStickyNoteId!) as Y.Map<any>
          }
          isActive={activeStickyNoteId !== null}
          canvasViewport={engineRef.current?.getViewport() || { x: 0, y: 0, zoom: 1 }}
          canvasRect={
            canvasRef.current?.getBoundingClientRect() || new DOMRect()
          }
          onBlur={() => {
            setActiveStickyNoteId(null);
            setActiveStickyData(null);
          }}
        />
      )}

      {ydocRef.current && (
        <CanvasLayersPanel
          isOpen={showLayers}
          ydoc={ydocRef.current}
          onClose={() => setShowLayers(false)}
        />
      )}

      {activeTextData && ydocRef.current && (
        <TextShapeEditor
          textShape={activeTextData}
          ymap={
            ydocRef.current
              .getMap('shapes')
              .get(activeTextId!) as Y.Map<any>
          }
          isActive={activeTextId !== null}
          canvasViewport={engineRef.current?.getViewport() || { x: 0, y: 0, zoom: 1 }}
          canvasRect={canvasRef.current?.getBoundingClientRect() || new DOMRect()}
          onBlur={() => {
            setActiveTextId(null);
            setActiveTextData(null);
          }}
        />
      )}

      {/* Floating Toolbar */}
      <CanvasToolbar
        connectionStatus={connectionStatus}
        onToggleLayers={() => setShowLayers((prev) => !prev)}
        isLayersOpen={showLayers}
        onClearBoard={() => setShowClearConfirm(true)}
      />

      <div className="absolute right-6 top-6 z-[200] max-w-xs rounded-3xl border border-white/10 bg-[#0b1211]/80 px-4 py-3 text-[11px] text-white/70 shadow-xl backdrop-blur">
        <div className="text-[10px] uppercase tracking-widest text-white/50">Shortcuts</div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <div>V Select</div>
          <div>P Pen</div>
          <div>E Eraser</div>
          <div>M Mindmap</div>
          <div>S Sticky</div>
          <div>R Rect</div>
          <div>C Circle</div>
          <div>L Line</div>
          <div>T Text</div>
          <div>Esc Deselect</div>
          <div>Ctrl/Cmd+C Copy</div>
          <div>Ctrl/Cmd+V Paste</div>
          <div>Ctrl/Cmd+Z Undo</div>
          <div>Shift+Ctrl/Cmd+Z Redo</div>
          <div>Del/Backspace Delete</div>
          <div>Space+Drag Pan</div>
          <div>Drag Marquee Select</div>
          <div>Ctrl/Cmd+Click Multi</div>
          <div>Alt+Drag Rotate</div>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-[#ef4444]">Destructive</div>
            <div className="mt-2 text-lg font-bold text-white">Clear entire board?</div>
            <div className="mt-2 text-sm text-white/70">
              This removes all shapes, strokes, and connections. You can undo once after clearing.
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-2xl border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#ef4444] hover:bg-[#ef4444]/20"
              >
                Clear Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Legend (optional) */}
      <div className="fixed top-4 right-4 text-xs text-white/40 space-y-1">
        <div>V: Select | P: Pen | E: Eraser</div>
        <div>M: Mindmap | S: Sticky | Esc: Deselect</div>
      </div>
    </div>
  );
};

export default InfiniteCanvas;
