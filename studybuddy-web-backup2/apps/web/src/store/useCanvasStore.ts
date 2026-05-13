import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanvasElement, Connection, Layer, CanvasSnapshot, CanvasEngine } from '@studybuddy/canvas-engine';

interface CanvasState {
    eraserSize: number;
    setEraserSize: (size: number) => void;
    elements: CanvasElement[];
    connections: Connection[];
    layers: Layer[];
    activeTool: 'select' | 'pen' | 'node' | 'eraser' | 'sticky' | 'rect' | 'circle' | 'arrow' | 'text';
    selectedElementIds: string[];

    // Viewport state
    stageConfig: {
        scale: number;
        x: number;
        y: number;
    };

    // History for Undo/Redo
    history: CanvasSnapshot[];
    historyIndex: number;

    // Actions
    setElements: (elements: CanvasElement[]) => void;
    addElement: (element: CanvasElement) => void;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    removeElements: (ids: string[]) => void;

    addConnection: (fromId: string, toId: string) => void;
    removeConnection: (id: string) => void;

    setActiveTool: (tool: CanvasState['activeTool']) => void;
    setSelectedElementIds: (ids: string[]) => void;
    setStageConfig: (config: Partial<CanvasState['stageConfig']>) => void;

    // Undo/Redo
    saveToHistory: () => void;
    undo: () => void;
    redo: () => void;

    // Snapshot logic
    loadFromSnapshot: (snapshot: CanvasSnapshot) => void;
    getSnapshot: () => CanvasSnapshot;
}

export const useCanvasStore = create<CanvasState>()(
    persist(
        (set, get) => ({
            elements: [],
            connections: [],
            layers: [CanvasEngine.createDefaultLayer()],
            activeTool: 'select',
            selectedElementIds: [],
            stageConfig: { scale: 1, x: 0, y: 0 },
            history: [],
            historyIndex: -1,

            eraserSize: 25,
            setEraserSize: (eraserSize) => set({ eraserSize }),

            setElements: (elements) => set({ elements }),

            addElement: (element) => {
                set((state) => ({ elements: [...state.elements, element] }));
                get().saveToHistory();
            },

            updateElement: (id, updates) => {
                set((state) => ({
                    elements: state.elements.map((el) =>
                        el.id === id ? { ...el, ...updates } : el
                    )
                }));
            },

            removeElements: (ids) => {
                set((state) => ({
                    elements: state.elements.filter((el) => !ids.includes(el.id)),
                    connections: state.connections.filter((conn) =>
                        !ids.includes(conn.fromId) && !ids.includes(conn.toId)
                    ),
                    selectedElementIds: state.selectedElementIds.filter(id => !ids.includes(id))
                }));
                get().saveToHistory();
            },

            addConnection: (fromId, toId) => {
                const newConn = {
                    id: `conn-${Date.now()}`,
                    fromId,
                    toId
                };
                set((state) => ({ connections: [...state.connections, newConn] }));
                get().saveToHistory();
            },

            removeConnection: (id) => {
                set((state) => ({
                    connections: state.connections.filter(c => c.id !== id)
                }));
                get().saveToHistory();
            },

            setActiveTool: (activeTool) => set({ activeTool }),

            setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),

            setStageConfig: (config) => set((state) => ({
                stageConfig: { ...state.stageConfig, ...config }
            })),

            saveToHistory: () => {
                const snapshot = get().getSnapshot();
                const { history, historyIndex } = get();

                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(snapshot);

                // Limit history to 50 steps
                if (newHistory.length > 50) newHistory.shift();

                set({
                    history: newHistory,
                    historyIndex: newHistory.length - 1
                });
            },

            undo: () => {
                const { history, historyIndex } = get();
                if (historyIndex > 0) {
                    const prevSnapshot = history[historyIndex - 1];
                    set({
                        elements: prevSnapshot.elements,
                        connections: prevSnapshot.connections,
                        layers: prevSnapshot.layers || [],
                        stageConfig: prevSnapshot.stageConfig,
                        historyIndex: historyIndex - 1
                    });
                }
            },

            redo: () => {
                const { history, historyIndex } = get();
                if (historyIndex < history.length - 1) {
                    const nextSnapshot = history[historyIndex + 1];
                    set({
                        elements: nextSnapshot.elements,
                        connections: nextSnapshot.connections,
                        layers: nextSnapshot.layers || [],
                        stageConfig: nextSnapshot.stageConfig,
                        historyIndex: historyIndex + 1
                    });
                }
            },

            getSnapshot: () => ({
                elements: get().elements,
                connections: get().connections,
                layers: get().layers,
                stageConfig: get().stageConfig
            }),

            loadFromSnapshot: (snapshot) => {
                if (CanvasEngine.validateSnapshot(snapshot)) {
                    set({
                        elements: snapshot.elements,
                        connections: snapshot.connections,
                        layers: snapshot.layers,
                        stageConfig: snapshot.stageConfig,
                        history: [snapshot],
                        historyIndex: 0
                    });
                }
            }
        }),
        {
            name: 'studybuddy-canvas-storage',
            partialize: (state) => ({
                // Only persist the actual canvas data, not UI/History state
                elements: state.elements,
                connections: state.connections,
                layers: state.layers,
                stageConfig: state.stageConfig
            })
        }
    )
);
