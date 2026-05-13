import { CanvasElement, Connection, Point, Layer } from './types';

/**
 * The StudyBuddy "Adobe-Style" Canvas Engine
 * Advanced logic for professional-grade digital whiteboarding.
 */
export const CanvasEngine = {
    // 🎨 LAYER MANAGEMENT
    createDefaultLayer(): Layer {
        return {
            id: 'layer-0',
            name: 'Background Shard',
            isVisible: true,
            isLocked: false,
            opacity: 1,
            blendMode: 'normal'
        };
    },

    // 🌊 SVG PATH SMOOTHING (Catmull-Rom Spline interpolation)
    // Converts raw mouse points into smooth, professional curves.
    getSmoothPath(points: Point[]): string {
        if (points.length < 2) return "";
        
        let pathData = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? i : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2 === points.length ? i + 1 : i + 2];
            
            // Quadratic Bezier mid-point smoothing
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            
            pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        
        return pathData;
    },

    // 🧠 CONNECTION LOGIC: Intelligent anchoring
    getConnectionPoints(from: CanvasElement, to: CanvasElement) {
        return {
            start: { x: from.x + (from.width || 0) / 2, y: from.y + (from.height || 0) / 2 },
            end: { x: to.x + (to.width || 0) / 2, y: to.y + (to.height || 0) / 2 }
        };
    },

    // 🖌️ PATH ELEMENT CREATION
    createPathElement(points: Point[], color: string, zIndex: number, layerId: string): CanvasElement {
        return {
            id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'path',
            x: 0,
            y: 0,
            color,
            zIndex,
            layerId,
            data: { 
                points, 
                svgPath: this.getSmoothPath(points) // Pre-calculate smooth path
            }
        };
    },

    // 📌 MINDMAP NODE CREATION
    createMindmapNode(x: number, y: number, text: string, zIndex: number, layerId: string): CanvasElement {
        return {
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'node', x, y, width: 150, height: 60, zIndex, layerId,
            data: { text, theme: 'default' }
        };
    },

    // 🟦 SHAPE CREATION
    createShape(type: 'rect' | 'circle' | 'arrow', x: number, y: number, color: string, zIndex: number, layerId: string): CanvasElement {
        return {
            id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'shape', x, y, width: 100, height: 100, color, zIndex, layerId,
            data: { shapeType: type, strokeWidth: 2, fill: 'transparent' }
        };
    },

    // 📝 TEXT CREATION
    createText(x: number, y: number, text: string, color: string, zIndex: number, layerId: string): CanvasElement {
        return {
            id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'text', x, y, width: 200, height: 50, color, zIndex, layerId,
            data: { text, fontSize: 24, fontStyle: 'normal', align: 'left' }
        };
    },

    // 📒 STICKY NOTE CREATION
    createSticky(x: number, y: number, color: string, zIndex: number, layerId: string): CanvasElement {
        return {
            id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'sticky', x, y, width: 200, height: 200, color, zIndex, layerId,
            data: { text: "Focus Shard", fontSize: 16 }
        };
    },

    // 🛡️ SECURITY: Validate snapshot before loading
    validateSnapshot(json: any): boolean {
        return json && Array.isArray(json.elements) && Array.isArray(json.connections);
    }
};
