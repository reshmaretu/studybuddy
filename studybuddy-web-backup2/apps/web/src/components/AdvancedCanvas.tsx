/**
 * Enhanced Canvas Component v2
 * Features: Multiple tools, layers, history, exports, real-time collaboration prep
 * Similar to tldraw but integrated with StudyBuddy
 */

"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  Download,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Layers,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Lock,
  Eye,
  Settings,
  Share2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CanvasToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  onExport: (format: "png" | "svg" | "pdf") => void;
  onToggleAxis: () => void;
  showAxis: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onUndo,
  onRedo,
  onClear,
  onDownload,
  onExport,
  onToggleAxis,
  showAxis,
  zoom,
  onZoomIn,
  onZoomOut,
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-lg backdrop-blur-sm"
    >
      {/* Edit Tools */}
      <div className="flex gap-1 border-r border-[var(--border-color)] pr-3">
        <button
          onClick={onUndo}
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
        <button
          onClick={onClear}
          className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
          title="Clear All"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* View Tools */}
      <div className="flex gap-1 border-r border-[var(--border-color)] pr-3">
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors text-sm font-medium"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="px-2 py-1 text-xs font-bold text-[var(--text-muted)]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={onToggleAxis}
          className={`p-2 rounded transition-colors ${
            showAxis
              ? "bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]"
              : "hover:bg-[var(--bg-dark)]"
          }`}
          title="Toggle Grid"
        >
          <Grid3x3 size={16} />
        </button>
      </div>

      {/* Export & Share */}
      <div className="flex gap-1 border-r border-[var(--border-color)] pr-3">
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
            title="Export"
          >
            <Download size={16} />
          </button>
          <AnimatePresence>
            {exportMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full mt-2 left-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-50"
              >
                <button
                  onClick={() => {
                    onExport("png");
                    setExportMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-dark)] first:rounded-t-lg"
                >
                  PNG
                </button>
                <button
                  onClick={() => {
                    onExport("svg");
                    setExportMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-dark)]"
                >
                  SVG
                </button>
                <button
                  onClick={() => {
                    onExport("pdf");
                    setExportMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-dark)] last:rounded-b-lg"
                >
                  PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onDownload}
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Download"
        >
          <Copy size={16} />
        </button>
        <button
          className="p2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Share (Coming Soon)"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Layers & Settings */}
      <div className="flex gap-1 ml-auto">
        <button
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Layers"
        >
          <Layers size={16} />
        </button>
        <button
          className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </motion.div>
  );
};

interface CanvasSidebarProps {
  tools: Array<{ id: string; name: string; icon: React.ReactNode }>;
  activeTool: string;
  onSelectTool: (toolId: string) => void;
}

const CanvasSidebar: React.FC<CanvasSidebarProps> = ({
  tools,
  activeTool,
  onSelectTool,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative w-16 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col items-center gap-2 p-3 overflow-y-auto"
    >
      {tools.map((tool) => (
        <motion.button
          key={tool.id}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectTool(tool.id)}
          className={`relative w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
            activeTool === tool.id
              ? "bg-[var(--accent-teal)] text-[#0b1211] shadow-lg"
              : "hover:bg-[var(--bg-dark)] text-[var(--text-muted)]"
          }`}
          title={tool.name}
        >
          {tool.icon}
          {activeTool === tool.id && (
            <motion.div
              layoutId="activeToolIndicator"
              className="absolute inset-0 rounded-lg border-2 border-[var(--accent-teal)] opacity-50"
            />
          )}
        </motion.button>
      ))}
      <div className="mt-auto pt-4 border-t border-[var(--border-color)]">
        <button className="p-2 hover:bg-[var(--bg-dark)] rounded transition-colors">
          <Plus size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default function AdvancedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(100);
  const [showAxis, setShowAxis] = useState(false);
  const [activeTool, setActiveTool] = useState("pen");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const tools = [
    { id: "select", name: "Select", icon: "↗" },
    { id: "pen", name: "Pen", icon: "✏" },
    { id: "eraser", name: "Eraser", icon: "⊘" },
    { id: "rect", name: "Rectangle", icon: "▭" },
    { id: "circle", name: "Circle", icon: "◯" },
    { id: "line", name: "Line", icon: "—" },
    { id: "arrow", name: "Arrow", icon: "→" },
    { id: "text", name: "Text", icon: "A" },
    { id: "image", name: "Image", icon: "🖼" },
    { id: "sticky", name: "Sticky Note", icon: "📝" },
    { id: "mindmap", name: "Mind Map", icon: "🧠" },
  ];

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 300));
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50));
  const handleClear = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-120px)] flex flex-col bg-[var(--bg-dark)]">
      {/* Toolbar */}
      <div className="p-4 border-b border-[var(--border-color)]">
        <CanvasToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onDownload={() => alert("Download feature coming soon")}
          onExport={(format) => alert(`Export as ${format} coming soon`)}
          onToggleAxis={() => setShowAxis(!showAxis)}
          showAxis={showAxis}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>

      {/* Canvas Area */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Sidebar */}
        <CanvasSidebar
          tools={tools}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
        />

        {/* Main Canvas */}
        <div
          className="flex-1 overflow-auto bg-gradient-to-br from-[var(--bg-dark)] to-[var(--bg-sidebar)]"
          style={{
            backgroundImage: showAxis
              ? `
                linear-gradient(0deg, transparent 24%, rgba(20, 184, 166, 0.05) 25%, rgba(20, 184, 166, 0.05) 26%, transparent 27%, transparent 74%, rgba(20, 184, 166, 0.05) 75%, rgba(20, 184, 166, 0.05) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(20, 184, 166, 0.05) 25%, rgba(20, 184, 166, 0.05) 26%, transparent 27%, transparent 74%, rgba(20, 184, 166, 0.05) 75%, rgba(20, 184, 166, 0.05) 76%, transparent 77%, transparent)
              `
              : "",
            backgroundSize: "50px 50px",
          }}
        >
          <div className="inline-flex p-8" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              className="bg-white rounded-xl shadow-2xl cursor-crosshair border border-[var(--border-color)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
