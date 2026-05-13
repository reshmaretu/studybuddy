export type ElementType = 'path' | 'node' | 'image' | 'sticky' | 'shape' | 'text' | 'eraser';

export interface Point {
    x: number;
    y: number;
}

export interface Layer {
    id: string;
    name: string;
    isVisible: boolean;
    isLocked: boolean;
    opacity: number;
    blendMode: string;
}

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
    opacity?: number;
    rotation?: number;
    data: any; 
    zIndex: number;
    layerId: string; // 🔥 Adobe-style layering
}

export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    label?: string;
    color?: string;
}

export interface CanvasSnapshot {
    layers: Layer[];
    elements: CanvasElement[];
    connections: Connection[];
    stageConfig: {
        scale: number;
        x: number;
        y: number;
    };
}
