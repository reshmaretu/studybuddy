import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudyStore, Task } from '@/store/useStudyStore';
import { Check, X, Moon, Sunrise, Trash2 } from 'lucide-react';
import { SquishyButton, ConfirmationModal } from '@studybuddy/ui';

export default function UnDoneModal({ onClose }: { onClose: () => void }) {
    const { tasks, completeTask, deleteTask, updateTask } = useStudyStore();
    const activeQuests = tasks.filter(t => !t.isCompleted);

    // Keep track of which tasks we have 'resolved' in this modal
    const [resolvedTaskIds, setResolvedTaskIds] = useState<string[]>([]);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    const handleMoveToTomorrow = (task: Task) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(tomorrow.getHours() - tomorrow.getTimezoneOffset() / 60);
        
        updateTask(task.id, { 
            deadline: tomorrow.toISOString().slice(0, 16),
            // Reset daily tracking states if necessary
            isFrog: false,
            eisenhowerQuadrant: undefined,
            ivyRank: undefined
        });
        setResolvedTaskIds([...resolvedTaskIds, task.id]);
    };

    const handleDeleteClick = (id: string) => {
        setTaskToDelete(id);
    };

    const confirmDelete = () => {
        if (taskToDelete) {
            deleteTask(taskToDelete);
            setResolvedTaskIds([...resolvedTaskIds, taskToDelete]);
            setTaskToDelete(null);
        }
    };

    const unresolvedQuests = activeQuests.filter(t => !resolvedTaskIds.includes(t.id));

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0b1211]/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[95vh] relative overflow-y-auto custom-scrollbar"
            >
                <SquishyButton 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 rounded-xl transition-all"
                >
                    <X size={20} />
                </SquishyButton>

                <div className="text-center mb-6 pt-2">
                    <div className="flex justify-center mb-4">
                        <Moon size={40} className="text-[var(--accent-teal)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-1">Wrap Up the Day</h2>
                    <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-widest">
                        {unresolvedQuests.length > 0 
                            ? `You have ${unresolvedQuests.length} unfinished quest${unresolvedQuests.length > 1 ? 's' : ''}.`
                            : "Your board is clear."}
                    </p>
                </div>

                <div className="flex-1 space-y-3 mb-6 min-h-[100px]">
                    {unresolvedQuests.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-[var(--text-muted)] italic gap-2 opacity-50">
                            <Check size={32} />
                            <p>All caught up!</p>
                        </div>
                    ) : (
                        unresolvedQuests.map((task) => (
                            <div key={task.id} className="bg-[var(--bg-dark)]/50 border border-[var(--border-color)] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-[var(--accent-teal)]/30">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-[var(--text-main)] text-sm truncate">{task.title}</h4>
                                    {task.description && <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">{task.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <SquishyButton 
                                        onClick={() => handleMoveToTomorrow(task)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--bg-sidebar)] hover:bg-[var(--accent-teal)]/20 border border-[var(--border-color)] hover:border-[var(--accent-teal)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:text-[var(--accent-teal)] transition-all"
                                    >
                                        <Sunrise size={12} /> Tomorrow
                                    </SquishyButton>
                                    <SquishyButton 
                                        onClick={() => handleDeleteClick(task.id)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--bg-sidebar)] hover:bg-red-500/10 border border-[var(--border-color)] hover:border-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:text-red-400 transition-all text-red-400"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </SquishyButton>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <SquishyButton
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                >
                    {unresolvedQuests.length > 0 ? "Finish Anyway" : "Rest Well"}
                </SquishyButton>
            </motion.div>

            <ConfirmationModal
                isOpen={!!taskToDelete}
                title="Release Quest?"
                message="Are you sure you want to release this quest? This cannot be undone."
                confirmText="Release"
                cancelText="Keep"
                isDangerous={true}
                onConfirm={confirmDelete}
                onCancel={() => setTaskToDelete(null)}
            />
        </div>
    );
}
