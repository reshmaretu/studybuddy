/**
 * Weave.js Canvas Renderer with Yjs Integration
 * 
 * This replaces the basic useEffect drawing loop with a professional
 * rendering lifecycle that handles:
 * - Viewport transforms (pan/zoom)
 * - Layer rendering
 * - Hit testing
 * - Event coordination
 */

import type { ShapeData, StickyNoteData, PenStrokeData, ConnectionData } from './yjs-schema';
import * as Y from 'yjs';
import { getStroke } from 'perfect-freehand';

// Weave.js stubs (install weave-js package)
// import { Camera, CanvasRenderer, Action } from 'weave-js';

// ═══════════════════════════════════════════════════════════════
// CANVAS STATE & RENDERING
// ═══════════════════════════════════════════════════════════════

export interface CanvasRenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  width: number;
  height: number;
}

export interface HitTestResult {
  objectId: string;
  type: 'shape' | 'stroke' | 'connection';
  distance: number;
}

/**
 * Main Canvas Engine using Weave.js
 * Handles rendering coordination, hit testing, and tool interactions
 */
export class StudyBuddyCanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ydoc: Y.Doc;

  private viewport = { x: 0, y: 0, zoom: 1 };
  private selectedObjectIds = new Set<string>();
  private activeTool: 'pen' | 'select' | 'eraser' | 'mindmap' | 'sticky' = 'select';
  private isDrawing = false;

  // Yjs refs
  private yshapes: Y.Map<Y.Map<any>>;
  private ystrokes: Y.Array<Y.Map<any>>;
  private yconnections: Y.Map<Y.Map<any>>;
  private ylayers: Y.Array<string>;
  private ymetadata: Y.Map<any>;
  private ylayerGroups: Y.Array<Y.Map<any>>;
  private previewTransforms = new Map<
    string,
    { x: number; y: number; width: number; height: number; rotation: number }
  >();
  private previewStrokeOffsets = new Map<string, { dx: number; dy: number }>();
  private previewConnection:
    | { fromId: string; toX: number; toY: number; color: string; lineStyle: 'solid' | 'dashed' | 'curved' }
    | null = null;
  private previewConnectionControlPoints = new Map<string, { x: number; y: number }>();
  private strokeCache = new Map<string, { key: string; updatedAt: number; outline: Array<[number, number]> }>();
  private lastCacheClear = Date.now();
  private maxStrokeCacheSize = 200;

  // Animation frame for render loop
  private rafId?: number;

  // Observer subscriptions for Yjs changes
  private observers: (() => void)[] = [];
  private renderStats = { lastFrameTime: Date.now(), frameCount: 0, avgFrameTime: 0 };

  constructor(canvas: HTMLCanvasElement, ydoc: Y.Doc) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ydoc = ydoc;

    // Initialize Yjs refs
    const schema = this._initializeSchema();
    this.yshapes = schema.yshapes;
    this.ystrokes = schema.ystrokes;
    this.yconnections = schema.yconnections;
    this.ylayers = schema.ylayers;
    this.ymetadata = schema.ymetadata;
    this.ylayerGroups = schema.ylayerGroups;

    this._setupEventListeners();
    this._subscribeToYjsChanges();
    this._startRenderLoop();

    console.log('✨ StudyBuddy Canvas Engine initialized');
  }

  setSelectedObjectIds(ids: string[]) {
    this.selectedObjectIds = new Set(ids);
    this._markDirty();
  }

  setPreviewTransform(
    id: string,
    transform: { x: number; y: number; width: number; height: number; rotation: number }
  ) {
    this.previewTransforms.set(id, transform);
    this._markDirty();
  }

  clearPreviewTransform(id: string) {
    if (this.previewTransforms.delete(id)) {
      this._markDirty();
    }
  }

  clearAllPreviewTransforms() {
    if (this.previewTransforms.size > 0) {
      this.previewTransforms.clear();
      this._markDirty();
    }
  }

  setPreviewStrokeOffset(id: string, offset: { dx: number; dy: number }) {
    this.previewStrokeOffsets.set(id, offset);
    this._markDirty();
  }

  clearPreviewStrokeOffset(id: string) {
    if (this.previewStrokeOffsets.delete(id)) {
      this._markDirty();
    }
  }

  clearAllPreviewStrokeOffsets() {
    if (this.previewStrokeOffsets.size > 0) {
      this.previewStrokeOffsets.clear();
      this._markDirty();
    }
  }

  setPreviewConnection(connection: {
    fromId: string;
    toX: number;
    toY: number;
    color: string;
    lineStyle: 'solid' | 'dashed' | 'curved';
  }) {
    this.previewConnection = connection;
    this._markDirty();
  }

  clearPreviewConnection() {
    if (this.previewConnection) {
      this.previewConnection = null;
      this._markDirty();
    }
  }

  setPreviewConnectionControlPoint(id: string, point: { x: number; y: number }) {
    this.previewConnectionControlPoints.set(id, point);
    this._markDirty();
  }

  clearPreviewConnectionControlPoint(id: string) {
    if (this.previewConnectionControlPoints.delete(id)) {
      this._markDirty();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────

  private _initializeSchema() {
    const yshapes = this.ydoc.getMap<Y.Map<any>>('shapes');
    const ystrokes = this.ydoc.getArray<Y.Map<any>>('strokes');
    const yconnections = this.ydoc.getMap<Y.Map<any>>('connections');
    const ylayers = this.ydoc.getArray<string>('layerOrder');
    const ymetadata = this.ydoc.getMap<any>('metadata');
    const ylayerGroups = this.ydoc.getArray<Y.Map<any>>('layers');

    return { yshapes, ystrokes, yconnections, ylayers, ymetadata, ylayerGroups };
  }

  private _subscribeToYjsChanges() {
    const reshapeObserver = () => this._markDirty();

    this.yshapes.observe(reshapeObserver);
    this.ystrokes.observe(reshapeObserver);
    this.yconnections.observe(reshapeObserver);
    this.ylayers.observe(reshapeObserver);
    this.ymetadata.observe(reshapeObserver);
    this.ylayerGroups.observe(reshapeObserver);

    this.observers.push(
      () => this.yshapes.unobserve(reshapeObserver),
      () => this.ystrokes.unobserve(reshapeObserver),
      () => this.yconnections.unobserve(reshapeObserver),
      () => this.ylayers.unobserve(reshapeObserver),
      () => this.ymetadata.unobserve(reshapeObserver),
      () => this.ylayerGroups.unobserve(reshapeObserver)
    );
  }

  private _setupEventListeners() {
    this.canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER LOOP (Weave.js equivalent)
  // ─────────────────────────────────────────────────────────────

  private isDirty = true;
  private _markDirty() {
    this.isDirty = true;
  }

  private _startRenderLoop() {
    let framesSinceLastUpdate = 0;
    const render = () => {
      if (this.isDirty) {
        const frameStart = performance.now();
        this._render();
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        
        // Track stats every 30 frames
        this.renderStats.frameCount++;
        this.renderStats.avgFrameTime = 
          (this.renderStats.avgFrameTime * Math.max(0, this.renderStats.frameCount - 1) + frameTime) / 
          this.renderStats.frameCount;
        
        if (frameTime > 16) {
          console.warn(`⚠️  Slow frame: ${frameTime.toFixed(1)}ms (budget: 16ms)`);
        }
        
        this.isDirty = false;
        framesSinceLastUpdate = 0;
      } else {
        framesSinceLastUpdate++;
      }
      
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  private _render() {
    const { ctx, canvas, viewport } = this;
    const hiddenLayerIds = new Set<string>();
    this.ylayerGroups.forEach((layer) => {
      if (layer?.get('hidden')) {
        hiddenLayerIds.add(layer.get('id'));
      }
    });

    // Clear canvas
    ctx.fillStyle = '#0b1211';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save state
    ctx.save();

    // Apply viewport transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-canvas.width / 2 + viewport.x, -canvas.height / 2 + viewport.y);

    this._renderGrid();

    // Render in layer order
    const layerOrder = this.ylayers.toArray();
    for (const id of layerOrder) {
      // Try shape
      const shape = this.yshapes.get(id);
      if (shape) {
        if (hiddenLayerIds.has(shape.get('layerId'))) {
          continue;
        }
        const preview = this.previewTransforms.get(id);
        this._renderShape(shape, preview);
        continue;
      }

      // Try stroke
      for (let i = 0; i < this.ystrokes.length; i++) {
        const stroke = this.ystrokes.get(i);
        if (stroke?.get('id') === id) {
          if (hiddenLayerIds.has(stroke.get('layerId'))) {
            break;
          }
          this._renderStroke(stroke);
          break;
        }
      }

      // Try connection
      const conn = this.yconnections.get(id);
      if (conn) {
        if (hiddenLayerIds.has(conn.get('layerId'))) {
          continue;
        }
        this._renderConnection(conn);
      }
    }

    ctx.restore();

    if (this.previewConnection) {
      const fromShape = this.yshapes.get(this.previewConnection.fromId);
      if (fromShape) {
        const fromPreview = this.previewTransforms.get(this.previewConnection.fromId);
        const startX = (fromPreview?.x ?? fromShape.get('x')) + (fromPreview?.width ?? fromShape.get('width')) / 2;
        const startY = (fromPreview?.y ?? fromShape.get('y')) + (fromPreview?.height ?? fromShape.get('height')) / 2;
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
        this.ctx.translate(-this.canvas.width / 2 + this.viewport.x, -this.canvas.height / 2 + this.viewport.y);
        this.ctx.strokeStyle = `${this.previewConnection.color}66`;
        this.ctx.lineWidth = 2 / this.viewport.zoom;
        if (this.previewConnection.lineStyle === 'dashed') {
          this.ctx.setLineDash([5 / this.viewport.zoom, 5 / this.viewport.zoom]);
        }
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(this.previewConnection.toX, this.previewConnection.toY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();
      }
    }

    // Render UI overlays
    this._renderSelectionHandles();
  }

  private _renderGrid() {
    const gridEnabled = this.ymetadata.get('gridEnabled');
    if (!gridEnabled) return;

    const gridSize = this.ymetadata.get('gridSize') || 40;
    const { ctx, canvas, viewport } = this;
    const width = canvas.width / viewport.zoom;
    const height = canvas.height / viewport.zoom;
    const worldLeft = canvas.width / 2 - viewport.x - width / 2;
    const worldTop = canvas.height / 2 - viewport.y - height / 2;
    const worldRight = worldLeft + width;
    const worldBottom = worldTop + height;

    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1 / viewport.zoom;

    for (let x = startX; x <= worldRight + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, worldTop - gridSize);
      ctx.lineTo(x, worldBottom + gridSize);
      ctx.stroke();
    }

    for (let y = startY; y <= worldBottom + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(worldLeft - gridSize, y);
      ctx.lineTo(worldRight + gridSize, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private _renderShape(
    ymap: Y.Map<any>,
    preview?: { x: number; y: number; width: number; height: number; rotation: number }
  ) {
    const type = ymap.get('type');
    const x = preview?.x ?? ymap.get('x');
    const y = preview?.y ?? ymap.get('y');
    const w = preview?.width ?? ymap.get('width');
    const h = preview?.height ?? ymap.get('height');
    const color = ymap.get('color');
    const fillOpacity = ymap.get('fillOpacity');
    const rotation = preview?.rotation ?? ymap.get('rotation');
    const strokeWidth = ymap.get('strokeWidth') || 2;
    const fillColor = ymap.get('fillColor') || color;
    const strokeColor = ymap.get('strokeColor') || color;
    const fillEnabled = ymap.get('fillEnabled') ?? true;
    const strokeEnabled = ymap.get('strokeEnabled') ?? false;
    const isSelected = this.selectedObjectIds.has(ymap.get('id'));
    const allowSingleOutline = this.selectedObjectIds.size <= 1;

    this.ctx.save();
    this.ctx.translate(x + w / 2, y + h / 2);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.translate(-w / 2, -h / 2);

    if (type === 'rect') {
      if (fillEnabled) {
        this.ctx.fillStyle = this._applyAlphaToColor(fillColor, fillOpacity);
        this.ctx.fillRect(0, 0, w, h);
      }
      if (strokeEnabled) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.strokeRect(0, 0, w, h);
      }
    } else if (type === 'circle') {
      this.ctx.beginPath();
      this.ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      if (fillEnabled) {
        this.ctx.fillStyle = this._applyAlphaToColor(fillColor, fillOpacity);
        this.ctx.fill();
      }
      if (strokeEnabled) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.stroke();
      }
    } else if (type === 'line') {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(w, h);
      this.ctx.stroke();
    } else if (type === 'triangle' || type === 'polygon') {
      const sides = type === 'triangle' ? 3 : Math.max(3, ymap.get('sides') || 6);
      const points = this._getPolygonPoints(type, 0, 0, w, h, sides);
      this.ctx.beginPath();
      points.forEach(([px, py], index) => {
        if (index === 0) {
          this.ctx.moveTo(px, py);
        } else {
          this.ctx.lineTo(px, py);
        }
      });
      this.ctx.closePath();
      if (fillEnabled) {
        this.ctx.fillStyle = this._applyAlphaToColor(fillColor, fillOpacity);
        this.ctx.fill();
      }
      if (strokeEnabled) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.stroke();
      }
    } else if (type === 'sticky') {
      const stickyFill = fillColor || color;
      const stickyOpacity = fillOpacity ?? 1;
      const stickyStroke = strokeColor || color;

      if (fillEnabled) {
        this.ctx.fillStyle = this._applyAlphaToColor(stickyFill, stickyOpacity);
        this.ctx.fillRect(0, 0, w, h);
      }
      if (strokeEnabled && strokeWidth > 0) {
        this.ctx.strokeStyle = stickyStroke;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.strokeRect(0, 0, w, h);
      }

      // Render text
      const text = ymap.get('text');
      const fontSize = ymap.get('fontSize') || 14;
      const fontFamily = ymap.get('fontFamily') || 'system-ui';
      this.ctx.fillStyle = ymap.get('textColor') || '#000';
      this.ctx.font = `${fontSize}px ${fontFamily}`;
      this.ctx.textBaseline = 'top';
      
      const lines = text.split('\n');
      lines.forEach((line: string, i: number) => {
        this.ctx.fillText(line, 8, 8 + i * (fontSize + 4));
      });
    } else if (type === 'text') {
      const text = ymap.get('text') || 'Text';
      const fontSize = ymap.get('fontSize') || 20;
      const fontFamily = ymap.get('fontFamily') || 'system-ui';
      this.ctx.fillStyle = ymap.get('textColor') || color;
      this.ctx.font = `${fontSize}px ${fontFamily}`;
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(text, 0, 0);
    }

    // Selection outline
    if (isSelected && allowSingleOutline) {
      this.ctx.strokeStyle = '#14b8a6';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(0, 0, w, h);
    }

    this.ctx.restore();
  }

  private _renderStroke(ymap: Y.Map<any>) {
    const strokeId = ymap.get('id');
    const points = (ymap.get('points') as Y.Array<any>).toArray();
    const color = ymap.get('color');
    const strokeWidth = ymap.get('strokeWidth');
    const eraserMode = ymap.get('eraserMode');
    const pressureEnabled = ymap.get('pressureEnabled');
    const opacity = ymap.get('opacity') ?? 1;
    const mode = ymap.get('mode');
    const smoothing = ymap.get('smoothing') ?? 0.5;
    const previewOffset = this.previewStrokeOffsets.get(strokeId);

    if (points.length < 2) return;

    // Check cache
    const cached = this.strokeCache.get(strokeId);
    const lastPoint = points[points.length - 1]?.toArray?.() || [0, 0, 1];
    const updateSeed = ymap.get('_lastUpdateTime') ?? 0;
    const updateKey = `${updateSeed}-${points.length}-${lastPoint[0]}-${lastPoint[1]}-${lastPoint[2]}`;
    let outline: Array<[number, number]>;
    
    if (cached && cached.key === updateKey) {
      outline = cached.outline;
    } else {
      const strokePoints = points.map((pt) => {
        const [x, y, pressure] = pt?.toArray?.() || [0, 0, 1];
        return {
          x: x + (previewOffset?.dx ?? 0),
          y: y + (previewOffset?.dy ?? 0),
          pressure: pressure ?? 1,
        };
      });

      const modeThinning = mode === 'calligraphy' ? 0.8 : pressureEnabled ? 0.6 : 0;
      const modeStreamline = mode === 'highlighter' ? 0.7 : 0.5;
      outline = getStroke(strokePoints, {
        size: strokeWidth,
        thinning: modeThinning,
        smoothing: smoothing,
        streamline: modeStreamline,
        simulatePressure: !pressureEnabled,
      });

      if (outline.length) {
        this.strokeCache.set(strokeId, { 
          key: updateKey,
          updatedAt: Date.now(),
          outline 
        });
        
        // Periodically clear old cache entries to prevent memory bloat
        if (this.strokeCache.size > this.maxStrokeCacheSize) {
          const now = Date.now();
          if (now - this.lastCacheClear > 5000) {
            const entries = Array.from(this.strokeCache.entries());
            entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
            for (let i = this.maxStrokeCacheSize; i < entries.length; i++) {
              this.strokeCache.delete(entries[i][0]);
            }
            this.lastCacheClear = now;
          }
        }
      }
    }

    if (!outline.length) return;

    const path = new Path2D(this._getSvgPathFromStroke(outline));
    this.ctx.fillStyle = eraserMode
      ? 'rgba(255,255,255,0.1)'
      : this._applyAlphaToColor(color, opacity);
    this.ctx.fill(path);
  }

  private _getSvgPathFromStroke(points: Array<[number, number]>) {
    if (!points.length) return '';
    const d = points
      .map((point, i) => `${i === 0 ? 'M' : 'L'}${point[0]} ${point[1]}`)
      .join(' ');
    return `${d} Z`;
  }

  private _applyAlphaToColor(color: string, alpha: number) {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const normalized = hex.length === 3
        ? hex.split('').map((c) => `${c}${c}`).join('')
        : hex;
      const clampedAlpha = Math.max(0, Math.min(1, alpha));
      const alphaHex = Math.round(clampedAlpha * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${normalized}${alphaHex}`;
    }
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    const prev = this.ctx.fillStyle;
    this.ctx.fillStyle = color;
    const normalized = `${this.ctx.fillStyle}`;
    this.ctx.fillStyle = prev;

    const match = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (!match) return color;
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    const a = match[4] ? Number(match[4]) : 1;
    return `rgba(${r}, ${g}, ${b}, ${a * clampedAlpha})`;
  }

  private _renderConnection(ymap: Y.Map<any>) {
    const fromId = ymap.get('fromObjectId');
    const toId = ymap.get('toObjectId');
    const lineStyle = ymap.get('lineStyle') || 'curved';
    const color = ymap.get('color');
    const lineWidth = ymap.get('lineWidth') || 2;

    const fromShape = this.yshapes.get(fromId);
    const toShape = this.yshapes.get(toId);

    if (!fromShape || !toShape) return;

    const fromPreview = this.previewTransforms.get(fromId);
    const toPreview = this.previewTransforms.get(toId);

    const fromRect = {
      x: fromPreview?.x ?? fromShape.get('x'),
      y: fromPreview?.y ?? fromShape.get('y'),
      w: fromPreview?.width ?? fromShape.get('width'),
      h: fromPreview?.height ?? fromShape.get('height'),
    };
    const toRect = {
      x: toPreview?.x ?? toShape.get('x'),
      y: toPreview?.y ?? toShape.get('y'),
      w: toPreview?.width ?? toShape.get('width'),
      h: toPreview?.height ?? toShape.get('height'),
    };

    const fromCenter = { x: fromRect.x + fromRect.w / 2, y: fromRect.y + fromRect.h / 2 };
    const toCenter = { x: toRect.x + toRect.w / 2, y: toRect.y + toRect.h / 2 };

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

    const start = getEdgePoint(fromRect, toCenter);
    const end = getEdgePoint(toRect, fromCenter);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    if (lineStyle === 'curved') {
      const storedControl = ymap.get('controlPoint') as { x: number; y: number } | undefined;
      const previewControl = this.previewConnectionControlPoints.get(ymap.get('id'));
      const baseControl = previewControl || storedControl;
      const cpX = baseControl ? baseControl.x : (start.x + end.x) / 2;
      const cpY = baseControl ? baseControl.y : (start.y + end.y) / 2 - 50;
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.quadraticCurveTo(cpX, cpY, end.x, end.y);
      this.ctx.stroke();
      const t = 0.5;
      const handleX =
        (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cpX + t * t * end.x;
      const handleY =
        (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cpY + t * t * end.y;
      const baseRadius = Math.max(4, lineWidth * 3);
      this.ctx.save();
      this.ctx.fillStyle = `${color}33`;
      this.ctx.beginPath();
      this.ctx.arc(handleX, handleY, baseRadius * 2.2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(handleX, handleY, baseRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    } else if (lineStyle === 'dashed') {
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
    }
  }

  private _renderSelectionHandles() {
    if (this.selectedObjectIds.size === 0) return;

    // Align selection overlays with the world transform so zoom/pan stays in sync.
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
    this.ctx.translate(
      -this.canvas.width / 2 + this.viewport.x,
      -this.canvas.height / 2 + this.viewport.y
    );

    if (this.selectedObjectIds.size > 1) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const expand = (x: number, y: number) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      };

      this.selectedObjectIds.forEach((id) => {
        const shape = this.yshapes.get(id);
        if (shape) {
          const preview = this.previewTransforms.get(id);
          const x = preview?.x ?? shape.get('x');
          const y = preview?.y ?? shape.get('y');
          const w = preview?.width ?? shape.get('width');
          const h = preview?.height ?? shape.get('height');
          const rotation = (preview?.rotation ?? shape.get('rotation')) || 0;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rad = (rotation * Math.PI) / 180;
          const rotatePoint = (rx: number, ry: number) => {
            const dx = rx - cx;
            const dy = ry - cy;
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
          corners.forEach((pt) => expand(pt.x, pt.y));
          return;
        }

        for (let i = 0; i < this.ystrokes.length; i++) {
          const stroke = this.ystrokes.get(i);
          if (!stroke || stroke.get('id') !== id) continue;
          const offset = this.previewStrokeOffsets.get(id);
          const points = (stroke.get('points') as Y.Array<any>).toArray();
          points.forEach((pt) => {
            const [px, py] = pt?.toArray?.() || [0, 0];
            expand(px + (offset?.dx ?? 0), py + (offset?.dy ?? 0));
          });
          break;
        }
      });

      if (minX !== Infinity && minY !== Infinity) {
        const boxW = maxX - minX;
        const boxH = maxY - minY;
        const midStroke = 2 / this.viewport.zoom;
        this.ctx.strokeStyle = '#14b8a6';
        this.ctx.lineWidth = midStroke;
        this.ctx.setLineDash([3 / this.viewport.zoom, 3 / this.viewport.zoom]);
        this.ctx.strokeRect(minX, minY, boxW, boxH);
        this.ctx.setLineDash([]);
      }

      this.ctx.restore();
      return;
    }

    this.selectedObjectIds.forEach((id) => {
      const shape = this.yshapes.get(id);
      if (!shape) return;

      const x = shape.get('x');
      const y = shape.get('y');
      const w = shape.get('width');
      const h = shape.get('height');
      const preview = this.previewTransforms.get(id);
      const rotation = (preview?.rotation ?? shape.get('rotation')) || 0;
      const px = preview?.x ?? x;
      const py = preview?.y ?? y;
      const pw = preview?.width ?? w;
      const ph = preview?.height ?? h;

      const cx = px + pw / 2;
      const cy = py + ph / 2;
      const rad = (rotation * Math.PI) / 180;
      const rotatePoint = (rx: number, ry: number) => {
        const dx = rx - cx;
        const dy = ry - cy;
        return {
          x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
          y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
        };
      };
      const rotatedCorners = [
        rotatePoint(px, py),
        rotatePoint(px + pw, py),
        rotatePoint(px + pw, py + ph),
        rotatePoint(px, py + ph),
      ];
      const xs = rotatedCorners.map((c) => c.x);
      const ys = rotatedCorners.map((c) => c.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      const handleSize = 6 / this.viewport.zoom;
      const midStroke = 2 / this.viewport.zoom;

      // Draw selection box
      this.ctx.strokeStyle = '#14b8a6';
      this.ctx.lineWidth = midStroke;
      this.ctx.setLineDash([3 / this.viewport.zoom, 3 / this.viewport.zoom]);
      this.ctx.strokeRect(minX, minY, boxW, boxH);
      this.ctx.setLineDash([]);

      // Corner handles (yellow) - for resize 1:1 or rotate
      const corners = [
        { pos: 'nw', x: minX, y: minY },
        { pos: 'ne', x: maxX, y: minY },
        { pos: 'sw', x: minX, y: maxY },
        { pos: 'se', x: maxX, y: maxY },
      ];

      // Side handles (teal) - for width/height
      const sides = [
        { pos: 'n', x: (minX + maxX) / 2, y: minY },
        { pos: 's', x: (minX + maxX) / 2, y: maxY },
        { pos: 'w', x: minX, y: (minY + maxY) / 2 },
        { pos: 'e', x: maxX, y: (minY + maxY) / 2 },
      ];

      // Draw corner handles
      this.ctx.fillStyle = '#fbbf24';
      corners.forEach(({ x: hx, y: hy }) => {
        this.ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      });

      // Draw side handles
      this.ctx.fillStyle = '#14b8a6';
      sides.forEach(({ x: hx, y: hy }) => {
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, handleSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
      });

      // Draw rotation indicator (straight up in local space)
      const armLength = Math.max(boxW, boxH) / 2 + 20 / this.viewport.zoom;
      const rx = (minX + maxX) / 2;
      const ry = minY - armLength;

      this.ctx.strokeStyle = '#a78bfa';
      this.ctx.lineWidth = midStroke;
      this.ctx.beginPath();
      this.ctx.moveTo((minX + maxX) / 2, (minY + maxY) / 2);
      this.ctx.lineTo(rx, ry);
      this.ctx.stroke();

      // Rotation handle (circle at end of arm)
      this.ctx.fillStyle = '#a78bfa';
      this.ctx.beginPath();
      this.ctx.arc(rx, ry, handleSize / 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Angle label (screen-aligned)
      this.ctx.save();
      this.ctx.font = `${12 / this.viewport.zoom}px monospace`;
      this.ctx.fillStyle = '#a78bfa';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${Math.round(rotation)}°`, cx, cy - 15 / this.viewport.zoom);
      this.ctx.restore();
    });

    this.ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // HIT TESTING
  // ─────────────────────────────────────────────────────────────

  hitTest(canvasX: number, canvasY: number, tolerance = 10): HitTestResult | null {
    // Convert canvas coords to world coords
    const worldX = (canvasX - this.canvas.width / 2) / this.viewport.zoom + this.canvas.width / 2 - this.viewport.x;
    const worldY = (canvasY - this.canvas.height / 2) / this.viewport.zoom + this.canvas.height / 2 - this.viewport.y;

    const hiddenLayerIds = new Set<string>();
    this.ylayerGroups.forEach((layer) => {
      if (layer?.get('hidden')) hiddenLayerIds.add(layer.get('id'));
    });

    let closest: HitTestResult | null = null;

    // Check shapes (in reverse layer order for topmost first)
    const layers = this.ylayers.toArray();
    for (let i = layers.length - 1; i >= 0; i--) {
      const id = layers[i];
      const shape = this.yshapes.get(id);

      if (!shape) continue;
      if (hiddenLayerIds.has(shape.get('layerId'))) continue;

      const x = shape.get('x');
      const y = shape.get('y');
      const w = shape.get('width');
      const h = shape.get('height');
      const type = shape.get('type');

      const distance = this._pointToShapeDistance(
        worldX,
        worldY,
        x,
        y,
        w,
        h,
        type as any,
        shape.get('strokeWidth') || 2,
        shape.get('sides')
      );
      if (distance !== null && distance <= tolerance) {
        return {
          objectId: id,
          type: 'shape',
          distance,
        };
      }
    }

    // Check strokes
    for (let i = 0; i < this.ystrokes.length; i++) {
      const stroke = this.ystrokes.get(i);
      if (!stroke) continue;

      const points = (stroke.get('points') as Y.Array<any>).toArray();
      const strokeWidth = stroke.get('strokeWidth');

      if (hiddenLayerIds.has(stroke.get('layerId'))) {
        continue;
      }

      const distance = this._pointToStrokeDistance(worldX, worldY, points, strokeWidth);
      if (distance !== null && distance <= tolerance) {
        const result: HitTestResult = {
          objectId: stroke.get('id'),
          type: 'stroke',
          distance,
        };
        if (!closest || distance < closest.distance) {
          closest = result;
        }
      }
    }

    return closest;
  }

  hitTestArea(canvasX: number, canvasY: number, radius = 10): HitTestResult[] {
    const world = this.canvasToWorld(canvasX, canvasY);
    const results: HitTestResult[] = [];

    const hiddenLayerIds = new Set<string>();
    this.ylayerGroups.forEach((layer) => {
      if (layer?.get('hidden')) hiddenLayerIds.add(layer.get('id'));
    });

    const layers = this.ylayers.toArray();
    for (let i = layers.length - 1; i >= 0; i--) {
      const id = layers[i];
      const shape = this.yshapes.get(id);

      if (shape) {
        if (hiddenLayerIds.has(shape.get('layerId'))) continue;
        const distance = this._pointToShapeDistance(
          world.x,
          world.y,
          shape.get('x'),
          shape.get('y'),
          shape.get('width'),
          shape.get('height'),
          shape.get('type'),
          shape.get('strokeWidth') || 2,
          shape.get('sides')
        );
        if (distance !== null && distance <= radius) {
          results.push({ objectId: id, type: 'shape', distance });
        }
        continue;
      }

      for (let j = 0; j < this.ystrokes.length; j++) {
        const stroke = this.ystrokes.get(j);
        if (!stroke || stroke.get('id') !== id) continue;
        if (hiddenLayerIds.has(stroke.get('layerId'))) continue;

        const points = (stroke.get('points') as Y.Array<any>).toArray();
        const strokeWidth = stroke.get('strokeWidth');
        const distance = this._pointToStrokeDistance(
          world.x,
          world.y,
          points,
          strokeWidth
        );
        if (distance !== null && distance <= radius) {
          results.push({ objectId: id, type: 'stroke', distance });
        }
        break;
      }
    }

    return results;
  }

  private _pointToShapeDistance(
    px: number,
    py: number,
    x: number,
    y: number,
    w: number,
    h: number,
    type: 'rect' | 'circle' | 'sticky' | 'line' | 'text' | 'triangle' | 'polygon',
    strokeWidth = 2,
    sides?: number
  ): number | null {
    if (type === 'rect' || type === 'sticky' || type === 'text') {
      if (px >= x && px <= x + w && py >= y && py <= y + h) return 0;
      const dx = Math.max(x - px, px - (x + w));
      const dy = Math.max(y - py, py - (y + h));
      return Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2);
    } else if (type === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      return Math.abs(d - r);
    } else if (type === 'line') {
      const dist = this._pointToLineDistance(px, py, x, y, x + w, y + h);
      return dist <= strokeWidth ? dist : null;
    } else if (type === 'triangle' || type === 'polygon') {
      const count = type === 'triangle' ? 3 : Math.max(3, sides || 6);
      const points = this._getPolygonPoints(type, x, y, w, h, count);
      return this._pointToPolygonDistance(px, py, points);
    }
    return null;
  }

  private _getPolygonPoints(
    type: 'triangle' | 'polygon',
    x: number,
    y: number,
    w: number,
    h: number,
    sides: number
  ): Array<[number, number]> {
    if (type === 'triangle') {
      return [
        [x + w / 2, y],
        [x + w, y + h],
        [x, y + h],
      ];
    }

    const count = Math.max(3, sides || 3);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const start = -Math.PI / 2;
    const points: Array<[number, number]> = [];
    for (let i = 0; i < count; i++) {
      const angle = start + (i * Math.PI * 2) / count;
      points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
    }
    return points;
  }

  private _pointToPolygonDistance(
    px: number,
    py: number,
    points: Array<[number, number]>
  ): number {
    if (this._pointInPolygon(px, py, points)) return 0;
    let min = Infinity;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      min = Math.min(min, this._pointToLineDistance(px, py, x1, y1, x2, y2));
    }
    return min;
  }

  private _pointInPolygon(px: number, py: number, points: Array<[number, number]>) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0];
      const yi = points[i][1];
      const xj = points[j][0];
      const yj = points[j][1];

      const intersect = yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private _pointToStrokeDistance(
    px: number,
    py: number,
    points: any[],
    strokeWidth: number
  ): number | null {
    let minDist = Infinity;

    for (let i = 0; i < points.length - 1; i++) {
      const pt1 = points[i]?.toArray?.() || [0, 0];
      const pt2 = points[i + 1]?.toArray?.() || [0, 0];

      const dist = this._pointToLineDistance(px, py, pt1[0], pt1[1], pt2[0], pt2[1]);
      minDist = Math.min(minDist, dist);
    }

    return minDist <= strokeWidth / 2 ? minDist : null;
  }

  private _pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
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

  // ─────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────

  private _onPointerDown(e: PointerEvent) {
    const hit = this.hitTest(e.clientX - this.canvas.getBoundingClientRect().left, e.clientY - this.canvas.getBoundingClientRect().top);

    if (this.activeTool === 'select' && hit) {
      this.selectedObjectIds.clear();
      this.selectedObjectIds.add(hit.objectId);
      this.isDrawing = true;
    } else if (this.activeTool === 'pen') {
      this.isDrawing = true;
      // Start new stroke (will be filled in pointermove)
    } else if (this.activeTool === 'eraser' && hit) {
      this._deleteObject(hit.objectId);
    }

    this._markDirty();
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this.isDrawing) return;
    // TODO: Implement drag logic for select, drawing for pen
  }

  private _onPointerUp(e: PointerEvent) {
    this.isDrawing = false;
  }

  private _onWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.viewport.zoom *= zoomFactor;
    this.viewport.zoom = Math.max(0.1, Math.min(5, this.viewport.zoom));

    this._markDirty();
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  setActiveTool(tool: 'pen' | 'select' | 'eraser' | 'mindmap' | 'sticky') {
    this.activeTool = tool;
  }

  pan(dx: number, dy: number) {
    this.viewport.x += dx;
    this.viewport.y += dy;
    this._markDirty();
  }

  zoom(factor: number) {
    this.viewport.zoom *= factor;
    this.viewport.zoom = Math.max(0.1, Math.min(5, this.viewport.zoom));
    this._markDirty();
  }

  getViewport() {
    return { ...this.viewport };
  }

  requestRender() {
    this._markDirty();
  }

  canvasToWorld(canvasX: number, canvasY: number) {
    const worldX =
      (canvasX - this.canvas.width / 2) / this.viewport.zoom +
      this.canvas.width / 2 -
      this.viewport.x;
    const worldY =
      (canvasY - this.canvas.height / 2) / this.viewport.zoom +
      this.canvas.height / 2 -
      this.viewport.y;
    return { x: worldX, y: worldY };
  }

  worldToCanvas(worldX: number, worldY: number) {
    const canvasX =
      (worldX - this.canvas.width / 2 + this.viewport.x) * this.viewport.zoom +
      this.canvas.width / 2;
    const canvasY =
      (worldY - this.canvas.height / 2 + this.viewport.y) * this.viewport.zoom +
      this.canvas.height / 2;
    return { x: canvasX, y: canvasY };
  }

  getSelectedObjectIds() {
    return Array.from(this.selectedObjectIds);
  }

  selectObjects(ids: string[]) {
    this.selectedObjectIds.clear();
    ids.forEach((id) => this.selectedObjectIds.add(id));
    this._markDirty();
  }

  private _deleteObject(id: string) {
    // Delete from appropriate collection
    if (this.yshapes.has(id)) {
      this.yshapes.delete(id);
    }

    for (let i = 0; i < this.ystrokes.length; i++) {
      if (this.ystrokes.get(i)?.get('id') === id) {
        this.ystrokes.delete(i, 1);
        break;
      }
    }

    if (this.yconnections.has(id)) {
      this.yconnections.delete(id);
    }

    const idx = this.ylayers.toArray().indexOf(id);
    if (idx !== -1) {
      this.ylayers.delete(idx, 1);
    }

    this._markDirty();
  }

  destroy() {
    this.observers.forEach((unsubscribe) => unsubscribe());
    if (this.rafId) cancelAnimationFrame(this.rafId);
    
    // Clear caches
    this.strokeCache.clear();
    this.previewTransforms.clear();
    this.previewStrokeOffsets.clear();
    this.previewConnectionControlPoints.clear();
    this.selectedObjectIds.clear();
    
    console.log(`✓ Canvas engine destroyed. Final stats:`, {
      totalFrames: this.renderStats.frameCount,
      avgFrameTime: this.renderStats.avgFrameTime.toFixed(2) + 'ms',
      cachedStrokes: this.strokeCache.size,
    });
  }
}
