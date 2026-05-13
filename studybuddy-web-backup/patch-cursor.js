const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'apps/web/src/components/InfiniteCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Add cursor feedback for select mode
const insertPoint = `      if (store.activeTool === 'eraser') {
        setEraserCursor({ x, y });
      }`;

const cursorCode = `      if (store.activeTool === 'select' && engineRef.current) {
        const world = engineRef.current.canvasToWorld(x, y);
        const hit = engineRef.current.hitTest(x, y);
        
        if (hit && hit.type === 'shape') {
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const shape = schema.yshapes.get(hit.objectId);
          if (shape) {
            const handle = getResizeHandle(shape, world);
            let cursor = 'grab';
            
            if (handle === 'nw' || handle === 'se') cursor = 'nwse-resize';
            else if (handle === 'ne' || handle === 'sw') cursor = 'nesw-resize';
            else if (handle === 'n' || handle === 's') cursor = 'ns-resize';
            else if (handle === 'e' || handle === 'w') cursor = 'ew-resize';
            else if (handle === 'rotate') cursor = 'grab';
            
            canvasRef.current!.style.cursor = cursor;
          }
        } else {
          canvasRef.current!.style.cursor = 'default';
        }
      }

      if (store.activeTool === 'eraser') {
        setEraserCursor({ x, y });
      }`;

content = content.replace(insertPoint, cursorCode);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Added cursor feedback for handle types');
