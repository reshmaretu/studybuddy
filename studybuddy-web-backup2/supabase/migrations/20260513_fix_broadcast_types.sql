-- Relax check constraint on synthetic_logs to allow room broadcasts
ALTER TABLE public.synthetic_logs DROP CONSTRAINT IF EXISTS synthetic_logs_broadcast_type_check;

ALTER TABLE public.synthetic_logs ADD CONSTRAINT synthetic_logs_broadcast_type_check 
CHECK (broadcast_type IN ('custom-status', 'milestone', 'quest-progress', 'feedback', 'study-room', 'canvas-room'));
