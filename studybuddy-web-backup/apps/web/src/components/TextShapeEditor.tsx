"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Y from "yjs";

interface TextShapeData {
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

interface TextShapeEditorProps {
  textShape: TextShapeData;
  ymap: Y.Map<any>;
  isActive: boolean;
  canvasViewport: { zoom: number; x: number; y: number };
  canvasRect: DOMRect;
  onBlur?: () => void;
}

export const TextShapeEditor: React.FC<TextShapeEditorProps> = ({
  textShape,
  ymap,
  isActive,
  canvasViewport,
  canvasRect,
  onBlur,
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const canvasX = canvasRect.left + (textShape.x - canvasViewport.x) * canvasViewport.zoom;
  const canvasY = canvasRect.top + (textShape.y - canvasViewport.y) * canvasViewport.zoom;

  const styles = {
    left: `${canvasX}px`,
    top: `${canvasY}px`,
    width: `${textShape.width * canvasViewport.zoom}px`,
    height: `${textShape.height * canvasViewport.zoom}px`,
  };

  useEffect(() => {
    if (!isActive || !contentEditableRef.current) return;

    contentEditableRef.current.focus();

    const handleInput = () => {
      const text = contentEditableRef.current?.innerText || "";
      ymap.set("text", text);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBlur?.();
      }
    };

    const node = contentEditableRef.current;
    node.addEventListener("input", handleInput);
    node.addEventListener("blur", handleBlur);
    node.addEventListener("keydown", handleKeyDown);

    return () => {
      node.removeEventListener("input", handleInput);
      node.removeEventListener("blur", handleBlur);
      node.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, ymap, onBlur]);

  useEffect(() => {
    const handleChange = () => {
      if (contentEditableRef.current && !isComposing) {
        const currentText = contentEditableRef.current.innerText;
        const newText = ymap.get("text") || "";
        if (currentText !== newText) {
          contentEditableRef.current.innerText = newText;
        }
      }
    };

    ymap.observe(handleChange);
    return () => ymap.unobserve(handleChange);
  }, [ymap, isComposing]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[999] pointer-events-auto"
          style={styles}
        >
          <div className="w-full h-full rounded-lg border border-[#14b8a6] bg-[#0b1211]/40 p-2 shadow-xl backdrop-blur">
            <div
              ref={contentEditableRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck="true"
              className="w-full h-full outline-none text-sm leading-relaxed overflow-y-auto"
              style={{
                color: textShape.textColor,
                fontSize: `${textShape.fontSize}px`,
                fontFamily: textShape.fontFamily,
                caretColor: "#14b8a6",
                WebkitUserSelect: "text",
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
            >
              {textShape.text}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
