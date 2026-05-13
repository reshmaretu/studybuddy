const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'apps/web/src/components/InfiniteCanvas.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update dragStateRef initialization to include rotation
const dragInitOld = `        dragStateRef.current = {
          id: hit.objectId,
          mode: handle ? 'resize' : 'move',
          handle: handle ?? undefined,
          startWorld: world,
          startRect: {
            x: shape.get('x'),
            y: shape.get('y'),
            width: shape.get('width'),
            height: shape.get('height'),
          },
        };`;

const dragInitNew = `        let mode = handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move';
        dragStateRef.current = {
          id: hit.objectId,
          mode,
          handle: handle ?? undefined,
          startWorld: world,
          startRect: {
            x: shape.get('x'),
            y: shape.get('y'),
            width: shape.get('width'),
            height: shape.get('height'),
            rotation: shape.get('rotation') || 0,
          },
          shapeCenter: mode === 'rotate' ? { x: shape.get('x') + shape.get('width') / 2, y: shape.get('y') + shape.get('height') / 2 } : undefined,
        };`;

content = content.replace(dragInitOld, dragInitNew);

// 2. Replace handleCanvasPointerUp with full implementation
const pointerUpOld = `  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !ydocRef.current) return;
      if (dragStateRef.current) {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        dragStateRef.current = null;
        activePointerIdRef.current = null;
        return;
      }`;

const pointerUpNew = `  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !ydocRef.current || !engineRef.current) return;
      if (dragStateRef.current) {
        const drag = dragStateRef.current;
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const shape = schema.yshapes.get(drag.id);
        if (shape) {
          const rect = canvasRef.current.getBoundingClientRect();
          const world = engineRef.current.canvasToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
          );

          const dx = world.x - drag.startWorld.x;
          const dy = world.y - drag.startWorld.y;
          const updates: any = {};

          if (drag.mode === 'move') {
            updates.x = snapValue(drag.startRect.x + dx);
            updates.y = snapValue(drag.startRect.y + dy);
          } else if (drag.mode === 'resize' && drag.handle) {
            let { x: startX, y: startY, width, height } = drag.startRect;
            let newX = startX;
            let newY = startY;
            let newW = width;
            let newH = height;

            if (drag.handle === 'e') {
              newW = width + dx;
            } else if (drag.handle === 'w') {
              newW = width - dx;
              newX = startX + dx;
            } else if (drag.handle === 'n') {
              newH = height - dy;
              newY = startY + dy;
            } else if (drag.handle === 's') {
              newH = height + dy;
            } else if (drag.handle === 'nw') {
              newW = width - dx;
              newH = height - dy;
              newX = startX + dx;
              newY = startY + dy;
            } else if (drag.handle === 'ne') {
              newW = width + dx;
              newH = height - dy;
              newY = startY + dy;
            } else if (drag.handle === 'sw') {
              newW = width - dx;
              newH = height + dy;
              newX = startX + dx;
            } else if (drag.handle === 'se') {
              newW = width + dx;
              newH = height + dy;
            }

            newW = Math.max(10, newW);
            newH = Math.max(10, newH);
            updates.x = snapValue(newX);
            updates.y = snapValue(newY);
            updates.width = snapValue(newW);
            updates.height = snapValue(newH);
          } else if (drag.mode === 'rotate' && drag.shapeCenter) {
            const cx = drag.shapeCenter.x;
            const cy = drag.shapeCenter.y;
            const startAngle = Math.atan2(drag.startWorld.y - cy, drag.startWorld.x - cx);
            const endAngle = Math.atan2(world.y - cy, world.x - cx);
            const angleDelta = ((endAngle - startAngle) * 180) / Math.PI;
            let newRotation = drag.startRect.rotation + angleDelta;
            newRotation = ((newRotation % 360) + 360) % 360;
            updates.rotation = Math.round(newRotation);
          }

          if (Object.keys(updates).length > 0) {
            updateShape(schema.yshapes, drag.id, updates);
          }
        }

        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        dragStateRef.current = null;
        activePointerIdRef.current = null;
        return;
      }`;

content = content.replace(pointerUpOld, pointerUpNew);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Patched InfiniteCanvas.tsx with proper handle support');
