"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  StickyNote,
  PenTool,
  Link2,
  X,
  Square,
  Circle,
  Minus,
  Type,
  Plus,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { createCanvasSchema, ensureDefaultLayer } from "@studybuddy/canvas-engine";
import { useCanvasToolStore } from "@studybuddy/api";

interface CanvasLayersPanelProps {
  isOpen: boolean;
  ydoc: Y.Doc;
  onClose?: () => void;
}

interface LayerEntry {
  id: string;
  type: "shape" | "stroke" | "connection" | "unknown";
  label: string;
  shapeType?: string;
}

interface LayerGroupEntry {
  id: string;
  name: string;
  hidden: boolean;
}

export const CanvasLayersPanel: React.FC<CanvasLayersPanelProps> = ({
  isOpen,
  ydoc,
  onClose,
}) => {
  const store = useCanvasToolStore();
  const [layers, setLayers] = useState<LayerEntry[]>([]);
  const [layerGroups, setLayerGroups] = useState<LayerGroupEntry[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [pendingDeleteLayer, setPendingDeleteLayer] = useState<
    { id: string; name: string } | null
  >(null);

  const schema = useMemo(() => createCanvasSchema(ydoc), [ydoc]);

  useEffect(() => {
    ensureDefaultLayer(schema);
    const syncActive = () => {
      const active = schema.ymetadata.get("activeLayerId") || null;
      setActiveLayerId(active);
    };

    syncActive();
    const metadataObserver = () => syncActive();
    schema.ymetadata.observe(metadataObserver);

    return () => {
      schema.ymetadata.unobserve(metadataObserver);
    };
  }, [schema]);

  useEffect(() => {
    const buildLayerGroups = () => {
      const entries = schema.ylayerGroups
        .toArray()
        .map((layer) => ({
          id: layer.get("id"),
          name: layer.get("name"),
          hidden: Boolean(layer.get("hidden")),
        }));
      setLayerGroups(entries);
    };

    buildLayerGroups();
    const observer = () => buildLayerGroups();

    schema.ylayerGroups.observe(observer);
    return () => {
      schema.ylayerGroups.unobserve(observer);
    };
  }, [schema]);

  useEffect(() => {
    const buildLayers = () => {
      const ids = schema.ylayers.toArray();
      const strokeMap = new Map<string, Y.Map<any>>();
      schema.ystrokes.forEach((stroke) => {
        if (!stroke) return;
        strokeMap.set(stroke.get("id"), stroke);
      });

      const entries = ids
        .map((id) => {
          const shape = schema.yshapes.get(id);
          if (shape) {
            const shapeType = shape.get("type");
            return {
              id,
              type: "shape" as const,
              shapeType,
              label: shapeType === "sticky" ? "Sticky" : shapeType === "text" ? "Text" : shapeType,
            };
          }

          const stroke = strokeMap.get(id);
          if (stroke) {
            return { id, type: "stroke" as const, label: "Stroke" };
          }

          const conn = schema.yconnections.get(id);
          if (conn) {
            return { id, type: "connection" as const, label: "Connection" };
          }

          return { id, type: "unknown" as const, label: "Unknown" };
        })
        .reverse();

      setLayers(entries);
    };

    buildLayers();
    const observer = () => buildLayers();

    schema.ylayers.observe(observer);
    schema.yshapes.observe(observer);
    schema.ystrokes.observe(observer);
    schema.yconnections.observe(observer);

    return () => {
      schema.ylayers.unobserve(observer);
      schema.yshapes.unobserve(observer);
      schema.ystrokes.unobserve(observer);
      schema.yconnections.unobserve(observer);
    };
  }, [schema]);

  const addLayer = () => {
    const existing = schema.ylayerGroups
      .toArray()
      .map((layer) => String(layer.get("name") || ''))
      .map((name) => {
        const match = name.match(/Layer\s+(\d+)/i);
        return match ? Number(match[1]) : 0;
      });
    const nextIndex = existing.length ? Math.max(...existing) + 1 : 1;
    const layer = new Y.Map();
    const id = crypto.randomUUID();
    layer.set("id", id);
    layer.set("name", `Layer ${nextIndex}`);
    layer.set("hidden", false);
    layer.set("createdAt", Date.now());
    schema.ylayerGroups.push([layer]);
    schema.ymetadata.set("activeLayerId", id);
  };

  const toggleLayerHidden = (layerId: string) => {
    const layer = schema.ylayerGroups.toArray().find((entry) => entry.get("id") === layerId);
    if (!layer) return;
    layer.set("hidden", !layer.get("hidden"));
  };

  const deleteLayer = (layerId: string) => {
    if (schema.ylayerGroups.length <= 1) return;
    const layer = schema.ylayerGroups.toArray().find((entry) => entry.get("id") === layerId);
    const name = layer?.get("name") || 'this layer';
    setPendingDeleteLayer({ id: layerId, name });
    return;

  };

  const deleteLayerNow = (layerId: string) => {
    if (schema.ylayerGroups.length <= 1) return;

    const idx = schema.ylayerGroups.toArray().findIndex((entry) => entry.get("id") === layerId);
    if (idx === -1) return;

    const idsToDelete = new Set<string>();
    schema.yshapes.forEach((shape, id) => {
      if (shape.get("layerId") === layerId) idsToDelete.add(id);
    });
    schema.ystrokes.forEach((stroke) => {
      if (stroke.get("layerId") === layerId) idsToDelete.add(stroke.get("id"));
    });
    schema.yconnections.forEach((conn, id) => {
      if (conn.get("layerId") === layerId) idsToDelete.add(id);
    });

    idsToDelete.forEach((id) => {
      schema.yshapes.delete(id);
      for (let i = 0; i < schema.ystrokes.length; i++) {
        if (schema.ystrokes.get(i)?.get("id") === id) {
          schema.ystrokes.delete(i, 1);
          break;
        }
      }
      schema.yconnections.delete(id);
      const layerIdx = schema.ylayers.toArray().indexOf(id);
      if (layerIdx !== -1) schema.ylayers.delete(layerIdx, 1);
    });

    schema.ylayerGroups.delete(idx, 1);
    if (schema.ymetadata.get("activeLayerId") === layerId) {
      const next = schema.ylayerGroups.get(0);
      if (next) schema.ymetadata.set("activeLayerId", next.get("id"));
    }
  };

  const reorderLayer = (id: string, direction: "up" | "down" | "front" | "back") => {
    const order = schema.ylayers.toArray();
    const idx = order.indexOf(id);
    if (idx === -1) return;

    let newIdx = idx;
    switch (direction) {
      case "up":
        newIdx = Math.min(idx + 1, order.length - 1);
        break;
      case "down":
        newIdx = Math.max(idx - 1, 0);
        break;
      case "front":
        newIdx = order.length - 1;
        break;
      case "back":
        newIdx = 0;
        break;
      default:
        break;
    }

    if (newIdx === idx) return;

    schema.ylayers.delete(idx, 1);
    schema.ylayers.insert(newIdx, [id]);

    const strokeMap = new Map<string, Y.Map<any>>();
    schema.ystrokes.forEach((stroke) => {
      if (!stroke) return;
      strokeMap.set(stroke.get("id"), stroke);
    });

    schema.ylayers.toArray().forEach((layerId, index) => {
      const shape = schema.yshapes.get(layerId);
      if (shape) shape.set("zIndex", index);
      const stroke = strokeMap.get(layerId);
      if (stroke) stroke.set("zIndex", index);
      const conn = schema.yconnections.get(layerId);
      if (conn) conn.set("zIndex", index);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-6 top-24 z-[450] w-64 rounded-3xl border border-white/10 bg-[#0b1211]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-white/60">Layers</div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Close layers panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Layer Groups</div>
          <button
            onClick={addLayer}
            className="text-white/60 hover:text-white"
            title="Add layer"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {layerGroups.map((layer) => {
            const isActive = layer.id === activeLayerId;
            return (
              <div
                key={layer.id}
                className={`flex items-center gap-2 rounded-2xl border px-2 py-2 transition-all ${
                  isActive
                    ? "border-[#14b8a6] bg-[#14b8a6]/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                }`}
              >
                <button
                  onClick={() => schema.ymetadata.set("activeLayerId", layer.id)}
                  className="flex-1 text-left text-xs"
                >
                  {layer.name}
                </button>
                <button
                  onClick={() => toggleLayerHidden(layer.id)}
                  className="text-white/50 hover:text-white"
                  title={layer.hidden ? "Show layer" : "Hide layer"}
                >
                  {layer.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  onClick={() => deleteLayer(layer.id)}
                  className="text-white/50 hover:text-white"
                  title="Delete layer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          {layerGroups.length === 0 && (
            <div className="text-xs text-white/40">No layers yet.</div>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {layers.map((layer) => {
          const isSelected = store.selectedObjectIds.includes(layer.id);
          const icon =
            layer.type === "stroke"
              ? <PenTool size={14} />
              : layer.type === "connection"
              ? <Link2 size={14} />
              : layer.shapeType === "sticky"
              ? <StickyNote size={14} />
              : layer.shapeType === "circle"
              ? <Circle size={14} />
              : layer.shapeType === "line"
              ? <Minus size={14} />
              : layer.shapeType === "text"
              ? <Type size={14} />
              : <Square size={14} />;

          return (
            <div
              key={layer.id}
              className={`flex items-center gap-2 rounded-2xl border px-2 py-2 transition-all ${
                isSelected
                  ? "border-[#14b8a6] bg-[#14b8a6]/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
              }`}
            >
              <button
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey) {
                    store.toggleObjectSelection(layer.id);
                  } else {
                    store.setSelectedObjectIds([layer.id]);
                  }
                }}
                className="flex items-center gap-2 flex-1 text-xs"
              >
                <span className="text-white/70">{icon}</span>
                <span className="capitalize">{layer.label}</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => reorderLayer(layer.id, "front")}
                  className="text-white/40 hover:text-white"
                  title="Bring to front"
                >
                  <ChevronsUp size={12} />
                </button>
                <button
                  onClick={() => reorderLayer(layer.id, "up")}
                  className="text-white/40 hover:text-white"
                  title="Move up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => reorderLayer(layer.id, "down")}
                  className="text-white/40 hover:text-white"
                  title="Move down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() => reorderLayer(layer.id, "back")}
                  className="text-white/40 hover:text-white"
                  title="Send to back"
                >
                  <ChevronsDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
        {layers.length === 0 && (
          <div className="text-xs text-white/40">No layers yet.</div>
        )}
      </div>

      {pendingDeleteLayer && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPendingDeleteLayer(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-[#ef4444]">Destructive</div>
            <div className="mt-2 text-lg font-bold text-white">Delete {pendingDeleteLayer.name}?</div>
            <div className="mt-2 text-sm text-white/70">
              This removes the layer and all items inside it.
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDeleteLayer(null)}
                className="rounded-2xl border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = pendingDeleteLayer.id;
                  setPendingDeleteLayer(null);
                  deleteLayerNow(id);
                }}
                className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#ef4444] hover:bg-[#ef4444]/20"
              >
                Delete Layer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
