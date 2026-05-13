/**
 * Sticky Note Editor Component
 * 
 * Renders an HTML contenteditable overlay on top of a sticky note shape,
 * allowing real-time editing with Yjs sync.
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Y from 'yjs';
import type { StickyNoteData } from '@studybuddy/canvas-engine';

interface StickyNoteEditorProps {
  sticky: StickyNoteData;
  ymap: Y.Map<any>;
  isActive: boolean;
  canvasViewport: { zoom: number; x: number; y: number };
  canvasRect: DOMRect;
  onBlur?: () => void;
}

export const StickyNoteEditor = React.forwardRef<HTMLDivElement, StickyNoteEditorProps>(
  (
    {
      sticky,
      ymap,
      isActive,
      canvasViewport,
      canvasRect,
      onBlur,
    },
    ref
  ) => {
    const contentEditableRef = useRef<HTMLDivElement>(null);
    const [isComposing, setIsComposing] = useState(false);

    // Compute absolute canvas position
    const canvasX = canvasRect.left + (sticky.x - canvasViewport.x) * canvasViewport.zoom;
    const canvasY = canvasRect.top + (sticky.y - canvasViewport.y) * canvasViewport.zoom;

    const styles = {
      left: `${canvasX}px`,
      top: `${canvasY}px`,
      width: `${sticky.width * canvasViewport.zoom}px`,
      height: `${sticky.height * canvasViewport.zoom}px`,
    };

    // ─────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────

    useEffect(() => {
      if (!isActive || !contentEditableRef.current) return;

      // Focus the editor
      contentEditableRef.current.focus();

      // Listen for text changes
      const handleInput = () => {
        const text = contentEditableRef.current?.innerText || '';
        ymap.set('text', text);
      };

      const handleBlur = () => {
        onBlur?.();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onBlur?.();
        }
      };

      contentEditableRef.current.addEventListener('input', handleInput);
      contentEditableRef.current.addEventListener('blur', handleBlur);
      contentEditableRef.current.addEventListener('keydown', handleKeyDown);

      return () => {
        contentEditableRef.current?.removeEventListener('input', handleInput);
        contentEditableRef.current?.removeEventListener('blur', handleBlur);
        contentEditableRef.current?.removeEventListener('keydown', handleKeyDown);
      };
    }, [isActive, ymap, onBlur]);

    // Listen to remote changes
    useEffect(() => {
      const handleChange = () => {
        if (contentEditableRef.current && !isComposing) {
          const currentText = contentEditableRef.current.innerText;
          const newText = ymap.get('text');
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
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[999] pointer-events-auto"
            style={styles}
          >
            <div
              className="w-full h-full rounded-lg shadow-xl border-2 border-[#14b8a6] p-3 overflow-hidden flex flex-col"
              style={{
                backgroundColor: sticky.color,
              }}
            >
              {/* Top bar with close button */}
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-black/10">
                <span className="text-xs font-black uppercase tracking-widest text-black/50">
                  Editing
                </span>
                <button
                  onClick={() => onBlur?.()}
                  className="text-black/40 hover:text-black/60 transition-colors"
                  aria-label="Close editor"
                >
                  ✕
                </button>
              </div>

              {/* Contenteditable area */}
              <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck="true"
                className="flex-1 outline-none resize-none text-sm leading-relaxed overflow-y-auto"
                style={{
                  color: sticky.textColor,
                  fontSize: `${sticky.fontSize}px`,
                  fontFamily: sticky.fontFamily,
                  caretColor: '#14b8a6',
                  WebkitUserSelect: 'text',
                }}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
              >
                {sticky.text}
              </div>

              {/* Footer with character count */}
              <div className="text-[10px] text-black/40 mt-2 pt-2 border-t border-black/10">
                {sticky.text.length} characters
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

StickyNoteEditor.displayName = 'StickyNoteEditor';

// ═══════════════════════════════════════════════════════════════
// LEXICAL INTEGRATION (Optional - for rich text)
// ═══════════════════════════════════════════════════════════════

/**
 * Alternative: Use Lexical for rich text editing
 * 
 * import { LexicalComposer } from '@lexical/react/LexicalComposer';
 * import { ContentEditable } from '@lexical/react/LexicalContentEditable';
 * import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
 * import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
 */

interface LexicalStickyNoteEditorProps extends StickyNoteEditorProps {
  useLexical?: boolean;
}

export const LexicalStickyNoteEditor: React.FC<LexicalStickyNoteEditorProps> = ({
  sticky,
  ymap,
  isActive,
  canvasViewport,
  canvasRect,
  onBlur,
  useLexical = false,
}) => {
  if (!useLexical) {
    return (
      <StickyNoteEditor
        sticky={sticky}
        ymap={ymap}
        isActive={isActive}
        canvasViewport={canvasViewport}
        canvasRect={canvasRect}
        onBlur={onBlur}
      />
    );
  }

  // TODO: Implement Lexical editor integration
  // This would provide:
  // - Rich text formatting (bold, italic, etc.)
  // - Lists and indentation
  // - Better undo/redo via Lexical
  // - Markdown support

  return null;
};
