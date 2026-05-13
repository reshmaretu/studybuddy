"use client";

import React, { useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Path, Circle, Arrow, Line } from "react-konva";
import { useCanvasStore } from "@/store/useCanvasStore";
import { CanvasEngine, getSvgPathFromStroke, Point } from "@studybuddy/canvas-engine";
import Konva from "konva";

export default function StudyCanvas() {
    const stageRef = useRef<Konva.Stage>(null);
    const {
        elements,
        activeTool,
        setActiveTool,
        addElement,
        updateElement,
        // removeElements, // unused
        selectedElementIds,
        setSelectedElementIds,
        stageConfig,
        setStageConfig,
        saveToHistory,
        eraserSize
    } = useCanvasStore();

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [currentEraserPoints, setCurrentEraserPoints] = useState<number[]>([]);
    const pathRef = useRef<Point[]>([]);
    const eraserRef = useRef<number[]>([]);
    const rafRef = useRef<number | null>(null);

    const [drawingShapeId, setDrawingShapeId] = useState<string | null>(null);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editPos, setEditPos] = useState({ x: 0, y: 0, width: 0, height: 0, fontSize: 14, color: "#fff", padding: 0, align: "left", fontStyle: "normal" });

    // ─── STAGE CLICK (Deselect) ───
    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (e.target === stage) {
            setSelectedElementIds([]);
        }
    };

    // ─── MOUSE DOWN ───
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (editingId) { handleTextBlur(); return; }

        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getRelativePointerPosition();
        if (!pos) return;

        if (activeTool === 'select') return;

        if (activeTool === 'pen') {
            setIsDrawing(true);
            pathRef.current = [pos];
            setCurrentPath(pathRef.current);
        }
        else if (activeTool === 'eraser') {
            setIsDrawing(true);
            eraserRef.current = [pos.x, pos.y];
            setCurrentEraserPoints(eraserRef.current);
        }
        else if (['rect', 'circle', 'arrow'].includes(activeTool)) {
            const toolType = activeTool as 'rect' | 'circle' | 'arrow';
            const newShape = CanvasEngine.createShape(toolType, pos.x, pos.y, "#2dd4bf", elements.length, 'layer-0');
            newShape.width = 0;
            newShape.height = 0;
            addElement(newShape);
            setDrawingShapeId(newShape.id);
            setStartPos(pos);
        }
        else if (['text', 'sticky', 'node'].includes(activeTool)) {
            let newEl;
            if (activeTool === 'text') newEl = CanvasEngine.createText(pos.x, pos.y, "Double click to edit", "#e2e8f0", elements.length, 'layer-0');
            if (activeTool === 'sticky') newEl = CanvasEngine.createSticky(pos.x, pos.y, "#facc15", elements.length, 'layer-0');
            if (activeTool === 'node') newEl = CanvasEngine.createMindmapNode(pos.x, pos.y, "Mindmap Node", elements.length, 'layer-0');

            if (newEl) {
                addElement(newEl);
                setSelectedElementIds([newEl.id]);
                setActiveTool('select');
            }
        }
    };

    // ─── MOUSE MOVE ───
    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getRelativePointerPosition() || stage.getPointerPosition();
        if (!pos) return;

        if (isDrawing && activeTool === 'pen') {
            pathRef.current = [...pathRef.current, pos];
            if (rafRef.current !== null) return;
            const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;
            rafRef.current = raf(() => {
                setCurrentPath([...pathRef.current]);
                rafRef.current = null;
            });
        }
        else if (isDrawing && activeTool === 'eraser') {
            eraserRef.current = [...eraserRef.current, pos.x, pos.y];
            if (rafRef.current !== null) return;
            const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;
            rafRef.current = raf(() => {
                setCurrentEraserPoints([...eraserRef.current]);
                rafRef.current = null;
            });
        }
        else if (drawingShapeId && startPos) {
            updateElement(drawingShapeId, { width: pos.x - startPos.x, height: pos.y - startPos.y });
        }
    };

    // ─── MOUSE UP (Finalize & Lock Erased Shapes) ───
    const handleMouseUp = () => {
        if (isDrawing && activeTool === 'pen' && pathRef.current.length > 1) {
            const newPath = CanvasEngine.createPathElement(pathRef.current, "#2dd4bf", elements.length, 'layer-0');
            addElement(newPath);
            saveToHistory();
        }

        if (isDrawing && activeTool === 'eraser' && eraserRef.current.length > 2) {
            const newEraser: typeof elements[0] = {
                id: `eraser-${Date.now()}`,
                type: 'eraser',
                x: 0, y: 0,
                data: { points: eraserRef.current, size: eraserSize || 25 },
                zIndex: elements.length,
                layerId: 'layer-0'
            };
            addElement(newEraser);

            // 🔥 LOCKING LOGIC: Find any Pen stroke or Shape the eraser touched and lock it!
            let eMinX = Infinity, eMaxX = -Infinity, eMinY = Infinity, eMaxY = -Infinity;
            for (let i = 0; i < eraserRef.current.length; i += 2) {
                if (eraserRef.current[i] < eMinX) eMinX = eraserRef.current[i];
                if (eraserRef.current[i] > eMaxX) eMaxX = eraserRef.current[i];
                if (eraserRef.current[i + 1] < eMinY) eMinY = eraserRef.current[i + 1];
                if (eraserRef.current[i + 1] > eMaxY) eMaxY = eraserRef.current[i + 1];
            }
            const pad = (eraserSize || 25) / 2;
            eMinX -= pad; eMaxX += pad; eMinY -= pad; eMaxY += pad;

            elements.forEach(el => {
                // Ignore Stickies, Nodes, and Text so they NEVER get locked by the eraser
                if (!['path', 'shape'].includes(el.type)) return;

                let elMinX = el.x; let elMaxX = el.x + (el.width || 100);
                let elMinY = el.y; let elMaxY = el.y + (el.height || 100);

                if (el.type === 'path' && Array.isArray(el.data.points)) {
                    elMinX = Infinity; elMaxX = -Infinity; elMinY = Infinity; elMaxY = -Infinity;
                    el.data.points.forEach((pt: Point) => {
                        if (pt.x < elMinX) elMinX = pt.x; if (pt.x > elMaxX) elMaxX = pt.x;
                        if (pt.y < elMinY) elMinY = pt.y; if (pt.y > elMaxY) elMaxY = pt.y;
                    });
                }

                // If touched, mark it as erased to disable dragging
                if (eMinX <= elMaxX && eMaxX >= elMinX && eMinY <= elMaxY && eMaxY >= elMinY) {
                    updateElement(el.id, { data: { ...el.data, isErased: true } });
                    if (selectedElementIds.includes(el.id)) {
                        setSelectedElementIds(selectedElementIds.filter(id => id !== el.id));
                    }
                }
            });

            saveToHistory();
        }

        if (drawingShapeId) saveToHistory();

        setIsDrawing(false);
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        pathRef.current = [];
        eraserRef.current = [];
        setCurrentPath([]);
        setCurrentEraserPoints([]);
        setDrawingShapeId(null);
        setStartPos(null);
    };

    // ─── DOUBLE CLICK (Text Editing) ───
    const handleDblClick = (el: (typeof elements)[number], e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool !== 'select') return;
        const node = e.currentTarget as Konva.Node;
        const container = node instanceof Konva.Container ? node : node.getStage();
        const textNode = node.getClassName() === 'Text'
            ? (node as Konva.Text)
            : container?.findOne<Konva.Text>('Text');
        if (!textNode) return;

        const absPos = textNode.getAbsolutePosition();
        setEditingId(el.id);
        setEditValue(el.data.text);
        setEditPos({
            x: absPos.x, y: absPos.y,
            width: textNode.width() * stageConfig.scale, height: textNode.height() * stageConfig.scale,
            fontSize: textNode.fontSize() * stageConfig.scale, color: String(textNode.fill()),
            padding: (textNode.padding() || 0) * stageConfig.scale, align: textNode.align() || 'left', fontStyle: textNode.fontStyle() || 'normal'
        });
    };

    const handleTextBlur = () => {
        if (editingId) {
            const elementToUpdate = elements.find(e => e.id === editingId);
            if (elementToUpdate) {
                updateElement(editingId, { data: { ...elementToUpdate.data, text: editValue } });
                saveToHistory();
            }
            setEditingId(null);
        }
    };

    // 🔥 SORT ELEMENTS INTO THE TWO DISTINCT LAYERS 🔥
    const erasableElements = elements.filter(el => ['path', 'shape', 'eraser'].includes(el.type));
    const objectElements = elements.filter(el => ['node', 'sticky', 'text'].includes(el.type));

    return (
        <div id="canvas-vortex-anchor" className="w-full h-full bg-[var(--bg-dark)] relative overflow-hidden">
            <Stage
                width={typeof window !== 'undefined' ? window.innerWidth : 1000} height={typeof window !== 'undefined' ? window.innerHeight : 1000}
                ref={stageRef}
                onClick={handleStageClick}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                scaleX={stageConfig.scale} scaleY={stageConfig.scale} x={stageConfig.x} y={stageConfig.y}
                draggable={activeTool === 'select' && !editingId && selectedElementIds.length === 0}
                onDragEnd={(e) => { if (e.target === stageRef.current) setStageConfig({ x: e.target.x(), y: e.target.y() }); }}
            >
                {/* ─── LAYER 1: ERASABLE WHITEBOARD (Pen & Shapes) ─── */}
                <Layer>
                    {/* 1. DRAWINGS & SHAPES */}
                    {erasableElements.filter(el => el.type !== 'eraser').map((el) => {
                        const isErased = el.data?.isErased;
                        const isSelect = activeTool === 'select';
                        const isSelected = selectedElementIds.includes(el.id);

                        const strokeColor = isSelected ? "#00ffff" : (el.color || "#2dd4bf");
                        const strokeWidth = isSelected ? (el.data?.strokeWidth || 2) + 2 : (el.data?.strokeWidth || 2);

                        const interactProps = {
                            onPointerDown: () => {
                                if (activeTool === 'select' && !isErased) setSelectedElementIds([el.id]);
                            },
                            draggable: isSelect && !isErased // Locks erased items
                        };

                        if (el.type === 'path') {
                            return <Path key={el.id} data={getSvgPathFromStroke(el.data.points)} fill={strokeColor} opacity={el.opacity || 1} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x(), y: e.target.y() }); saveToHistory(); }} />;
                        }

                        if (el.type === 'shape') {
                            if (el.data.shapeType === 'rect') return <Rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} fill={el.data.fill} stroke={strokeColor} strokeWidth={strokeWidth} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x(), y: e.target.y() }); saveToHistory(); }} />;
                            if (el.data.shapeType === 'circle') return <Circle key={el.id} x={el.x + (el.width || 0) / 2} y={el.y + (el.height || 0) / 2} radius={Math.abs((el.width || 0) / 2)} fill={el.data.fill} stroke={strokeColor} strokeWidth={strokeWidth} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x() - (el.width || 0) / 2, y: e.target.y() - (el.height || 0) / 2 }); saveToHistory(); }} />;
                            if (el.data.shapeType === 'arrow') return <Arrow key={el.id} points={[el.x, el.y, el.x + (el.width || 0), el.y + (el.height || 0)]} stroke={strokeColor} fill={strokeColor} strokeWidth={strokeWidth} pointerLength={10} pointerWidth={10} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x(), y: e.target.y() }); saveToHistory(); }} />;
                        }
                        return null;
                    })}

                    {/* 2. ERASERS: Masks ONLY the items in Layer 1 */}
                    {erasableElements.filter(el => el.type === 'eraser').map((el) => (
                        <Line
                            key={el.id} points={el.data.points} stroke="black" strokeWidth={el.data.size}
                            globalCompositeOperation="destination-out" lineCap="round" lineJoin="round" tension={0.5}
                            listening={false} // Lets clicks pass through to empty space
                        />
                    ))}

                    {/* LIVE DRAWING FOR LAYER 1 */}
                    {isDrawing && activeTool === 'pen' && currentPath.length > 0 && <Path data={getSvgPathFromStroke(currentPath)} fill="#2dd4bf" opacity={0.6} />}
                    {isDrawing && activeTool === 'eraser' && currentEraserPoints.length > 0 && (
                        <Line points={currentEraserPoints} stroke="black" strokeWidth={eraserSize || 25} globalCompositeOperation="destination-out" lineCap="round" lineJoin="round" tension={0.5} />
                    )}
                </Layer>

                {/* ─── LAYER 2: INTERACTIVE OBJECTS (Stickies, Nodes, Text) ─── */}
                <Layer>
                    {objectElements.map((el) => {
                        const isSelect = activeTool === 'select';
                        const isSelected = selectedElementIds.includes(el.id);
                        const isHidden = editingId === el.id;

                        const strokeColor = isSelected ? "#00ffff" : (el.color || "#2dd4bf");
                        const strokeWidth = isSelected ? (el.data?.strokeWidth || 2) + 2 : (el.data?.strokeWidth || 2);

                        // Objects NEVER lock! They are always draggable with Select tool
                        const interactProps = {
                            onPointerDown: () => {
                                if (activeTool === 'select') setSelectedElementIds([el.id]);
                            },
                            draggable: isSelect
                        };

                        if (el.type === 'node') {
                            return (
                                <Group key={el.id} x={el.x} y={el.y} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x(), y: e.target.y() }); saveToHistory(); }} onDblClick={(e) => handleDblClick(el, e)}>
                                    <Rect width={el.width || 150} height={el.height || 60} fill="#1e293b" stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={12} shadowBlur={isSelected ? 20 : 10} shadowColor={isSelected ? "#00ffff" : "rgba(0,0,0,0.3)"} />
                                    <Text text={el.data.text} width={el.width || 150} height={el.height || 60} fontSize={14} fontStyle="bold" fill="#e2e8f0" align="center" verticalAlign="middle" opacity={isHidden ? 0 : 1} />
                                </Group>
                            );
                        }

                        if (el.type === 'text') {
                            return (
                                <Text key={el.id} x={el.x} y={el.y} text={el.data.text} width={el.width} fontSize={el.data.fontSize || 16} fill={el.color} fontStyle={el.data.fontStyle} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x(), y: e.target.y() }); saveToHistory(); }} onDblClick={(e) => handleDblClick(el, e)} opacity={isHidden ? 0 : 1} shadowBlur={isSelected ? 10 : 0} shadowColor="#00ffff" />
                            );
                        }

                        if (el.type === 'sticky') {
                            return (
                                <Group key={el.id} x={el.x} y={el.y} {...interactProps} onDragEnd={(e) => { updateElement(el.id, { x: e.target.x(), y: e.target.y() }); saveToHistory(); }} onDblClick={(e) => handleDblClick(el, e)}>
                                    <Rect width={el.width || 200} height={el.height || 200} fill={el.color} stroke={isSelected ? "#00ffff" : "transparent"} strokeWidth={isSelected ? 3 : 0} shadowBlur={isSelected ? 20 : 10} shadowColor={isSelected ? "#00ffff" : "rgba(0,0,0,0.2)"} />
                                    <Text text={el.data.text} width={el.width || 200} height={el.height || 200} padding={20} fontSize={el.data.fontSize || 16} fill="#1e293b" fontStyle="bold" opacity={isHidden ? 0 : 1} />
                                </Group>
                            );
                        }
                        return null;
                    })}
                </Layer>
            </Stage>

            {/* NATIVE TEXT EDITING OVERLAY */}
            {editingId && (
                <textarea
                    value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleTextBlur} onKeyDown={(e) => { if (e.key === 'Escape') handleTextBlur(); }} autoFocus
                    className="absolute z-[100] bg-transparent outline-none resize-none overflow-hidden"
                    style={{
                        top: editPos.y, left: editPos.x, width: Math.max(editPos.width, 100), height: Math.max(editPos.height, 50),
                        color: editPos.color, fontSize: editPos.fontSize, fontWeight: editPos.fontStyle.includes('bold') ? 'bold' : 'normal',
                        fontStyle: editPos.fontStyle.includes('italic') ? 'italic' : 'normal', padding: editPos.padding, textAlign: editPos.align as CanvasTextAlign, fontFamily: 'sans-serif',
                    }}
                />
            )}
        </div>
    );
}