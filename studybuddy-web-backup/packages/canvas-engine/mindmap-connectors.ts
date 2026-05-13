/**
 * Mindmap Connector System
 * 
 * Advanced pattern for drawing dynamic connectors between objects.
 * Supports:
 * - Curved bezier paths
 * - Arrow endpoints
 * - Label rendering
 * - Dynamic updates when objects move
 */

import * as Y from 'yjs';
import type { ConnectionData, ShapeData } from './yjs-schema';

// ═══════════════════════════════════════════════════════════════
// CONNECTION DRAWING
// ═══════════════════════════════════════════════════════════════

export interface DrawConnectionOptions {
  ctx: CanvasRenderingContext2D;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'curved';
  label?: string;
  strokeWidth?: number;
  showArrows?: boolean;
}

/**
 * Draw a connection line between two points
 */
export function drawConnection(options: DrawConnectionOptions) {
  const {
    ctx,
    fromX,
    fromY,
    toX,
    toY,
    color,
    lineStyle,
    label,
    strokeWidth = 2,
    showArrows = true,
  } = options;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.fillStyle = color;

  // Draw line
  if (lineStyle === 'curved') {
    drawCurvedLine(ctx, fromX, fromY, toX, toY);
  } else if (lineStyle === 'dashed') {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }

  // Draw arrow endpoints
  if (showArrows) {
    drawArrowhead(ctx, toX, toY, fromX, fromY, color);
  }

  // Draw label
  if (label) {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    drawLabel(ctx, label, midX, midY, color);
  }

  ctx.restore();
}

/**
 * Quadratic bezier curve for smooth connections
 */
function drawCurvedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const cpX = (x1 + x2) / 2;
  const cpY = (y1 + y2) / 2 - 50; // Control point offset for aesthetics

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cpX, cpY, x2, y2);
  ctx.stroke();
}

/**
 * Draw arrow head at endpoint
 */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  toX: number,
  toY: number,
  fromX: number,
  fromY: number,
  color: string,
  size = 12
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw label text along connection
 */
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = 'bold 12px system-ui';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background for readability
  const metrics = ctx.measureText(text);
  const padding = 6;
  ctx.fillStyle = 'rgba(11, 18, 17, 0.9)';
  ctx.fillRect(
    x - metrics.width / 2 - padding,
    y - 8 - padding,
    metrics.width + padding * 2,
    16 + padding * 2
  );

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// ═══════════════════════════════════════════════════════════════
// MINDMAP INTERACTION HOOKS
// ═══════════════════════════════════════════════════════════════

export interface MindmapUIState {
  isCreatingConnection: boolean;
  fromObjectId: string | null;
  currentMouseX: number;
  currentMouseY: number;
}

/**
 * Handle the interaction flow for creating connections
 */
export class MindmapConnectionManager {
  private state: MindmapUIState = {
    isCreatingConnection: false,
    fromObjectId: null,
    currentMouseX: 0,
    currentMouseY: 0,
  };

  private yconnections: Y.Map<Y.Map<any>>;
  private yshapes: Y.Map<Y.Map<any>>;
  private ylayers: Y.Array<string>;
  private lineStyle: 'solid' | 'dashed' | 'curved';
  private lineColor: string;

  constructor(
    yconnections: Y.Map<Y.Map<any>>,
    yshapes: Y.Map<Y.Map<any>>,
    ylayers: Y.Array<string>,
    lineStyle: 'solid' | 'dashed' | 'curved' = 'curved',
    lineColor: string = '#fbbf24'
  ) {
    this.yconnections = yconnections;
    this.yshapes = yshapes;
    this.ylayers = ylayers;
    this.lineStyle = lineStyle;
    this.lineColor = lineColor;
  }

  /**
   * Start creating a connection from an object
   */
  startConnection(fromObjectId: string): void {
    // Validate that object exists
    if (!this.yshapes.has(fromObjectId)) {
      console.warn(`Object ${fromObjectId} not found`);
      return;
    }

    this.state.isCreatingConnection = true;
    this.state.fromObjectId = fromObjectId;
  }

  /**
   * Update the temporary endpoint during drag
   */
  updateConnectionPreview(x: number, y: number): void {
    if (!this.state.isCreatingConnection) return;
    this.state.currentMouseX = x;
    this.state.currentMouseY = y;
  }

  /**
   * Finalize the connection
   */
  finishConnection(toObjectId: string, label?: string): boolean {
    if (!this.state.isCreatingConnection || !this.state.fromObjectId) {
      return false;
    }

    // Prevent self-connections
    if (this.state.fromObjectId === toObjectId) {
      this.cancelConnection();
      return false;
    }

    // Create connection in Yjs
    const connectionId = `conn-${Date.now()}-${Math.random()}`;
    const connMap = new Y.Map();

    connMap.set('id', connectionId);
    connMap.set('fromObjectId', this.state.fromObjectId);
    connMap.set('toObjectId', toObjectId);
    connMap.set('label', label || '');
    connMap.set('color', this.lineColor);
    connMap.set('lineStyle', this.lineStyle);
    connMap.set('zIndex', this.ylayers.length);
    connMap.set('createdAt', Date.now());

    this.yconnections.set(connectionId, connMap);
    this.ylayers.push([connectionId]);

    this.cancelConnection();
    return true;
  }

  /**
   * Cancel connection creation
   */
  cancelConnection(): void {
    this.state.isCreatingConnection = false;
    this.state.fromObjectId = null;
  }

  /**
   * Render the preview line while dragging
   */
  renderPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.state.isCreatingConnection || !this.state.fromObjectId) return;

    const fromShape = this.yshapes.get(this.state.fromObjectId);
    if (!fromShape) return;

    const fromX = fromShape.get('x') + fromShape.get('width') / 2;
    const fromY = fromShape.get('y') + fromShape.get('height') / 2;

    ctx.save();
    ctx.strokeStyle = `${this.lineColor}40`; // Transparent preview
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(this.state.currentMouseX, this.state.currentMouseY);
    ctx.stroke();

    ctx.restore();
  }

  getState(): Readonly<MindmapUIState> {
    return { ...this.state };
  }

  setLineStyle(style: 'solid' | 'dashed' | 'curved'): void {
    this.lineStyle = style;
  }

  setLineColor(color: string): void {
    this.lineColor = color;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONNECTOR UPDATES ON OBJECT MOVE
// ═══════════════════════════════════════════════════════════════

/**
 * When an object moves, we need to update all connections
 * (This happens automatically via Yjs observers in the engine)
 */
export function getConnectedObjects(
  objectId: string,
  yconnections: Y.Map<Y.Map<any>>,
  yshapes: Y.Map<Y.Map<any>>
): {
  outgoing: ShapeData[];
  incoming: ShapeData[];
} {
  const outgoing: ShapeData[] = [];
  const incoming: ShapeData[] = [];

  yconnections.forEach((connMap) => {
    const fromId = connMap.get('fromObjectId');
    const toId = connMap.get('toObjectId');

    if (fromId === objectId && toId) {
      const toShape = yshapes.get(toId);
      if (toShape) {
        outgoing.push({
          id: toId,
          ...Object.fromEntries(toShape),
        } as ShapeData);
      }
    }

    if (toId === objectId && fromId) {
      const fromShape = yshapes.get(fromId);
      if (fromShape) {
        incoming.push({
          id: fromId,
          ...Object.fromEntries(fromShape),
        } as ShapeData);
      }
    }
  });

  return { outgoing, incoming };
}

// ═══════════════════════════════════════════════════════════════
// HIERARCHICAL LAYOUT HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Auto-layout objects in a hierarchical mindmap structure
 * Useful for initial organization
 */
export function autoLayoutMindmap(
  yshapes: Y.Map<Y.Map<any>>,
  rootObjectId: string,
  yconnections: Y.Map<Y.Map<any>>
) {
  const visited = new Set<string>();
  const queue: Array<{ id: string; x: number; y: number; depth: number }> = [
    { id: rootObjectId, x: 0, y: 0, depth: 0 },
  ];

  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 150;

  while (queue.length > 0) {
    const { id, x, y, depth } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    const shape = yshapes.get(id);
    if (shape) {
      shape.set('x', x);
      shape.set('y', y);
    }

    // Get connected objects
    const connectedIds: string[] = [];
    yconnections.forEach((connMap) => {
      if (connMap.get('fromObjectId') === id) {
        connectedIds.push(connMap.get('toObjectId'));
      }
    });

    // Layout children
    connectedIds.forEach((childId, index) => {
      const childX = x + HORIZONTAL_SPACING;
      const childY = y + (index - connectedIds.length / 2) * VERTICAL_SPACING;
      queue.push({ id: childId, x: childX, y: childY, depth: depth + 1 });
    });
  }
}
