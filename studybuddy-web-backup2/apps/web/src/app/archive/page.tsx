"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Hammer, BrainCircuit, Sparkles, CheckCircle2, UploadCloud, X, Trash2, File as FileIcon } from "lucide-react";
import { useStudyStore, Shard, TutorSession } from "@/store/useStudyStore";
import { useTerms } from "@/hooks/useTerms";
import { SquishyButton } from "@studybuddy/ui";

function ShardCard({ shard, onRead }: { shard: Shard, onRead: (shard: Shard) => void }) {
    // 1. Pull the state and the checker from the store
    const isPremiumUser = useStudyStore((state) => state.isPremiumUser);
    const checkPremiumStatus = useStudyStore((state) => state.checkPremiumStatus);

    // 2. Force a refresh when the component mounts
    useEffect(() => {
        checkPremiumStatus();
    }, []);

    const { startTutorMode, deleteShard, isTutorModeActive, triggerChumToast, setPremiumModalOpen } = useStudyStore();
    const formattedDate = new Date(shard.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="group relative flex flex-col justify-between p-5 rounded-3xl bg-(--bg-card) border border-(--border-color) shadow-sm hover:border-(--accent-teal)/30 transition-all duration-300">

            {shard.isMastered && (
                <>
                    <div className="absolute inset-0 bg-(--accent-teal)/5 rounded-3xl pointer-events-none" />
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-(--accent-teal) flex items-center justify-center text-[#0b1211] shadow-[0_0_15px_rgba(20,184,166,0.5)] z-10">
                        <CheckCircle2 size={16} strokeWidth={3} />
                    </div>
                </>
            )}

            {/* Delete Button (Visible on Hover) */}
            <SquishyButton
                onClick={() => { if (window.confirm("Shatter this shard forever?")) deleteShard(shard.id); }}
                className="absolute top-4 right-4 text-(--text-muted) hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent shadow-none p-1"
            >
                <Trash2 size={16} />
            </SquishyButton>

            <div>
                <div className="flex justify-between items-start mb-3 pr-6">
                    <span className="text-[10px] font-mono text-(--text-muted) flex items-center gap-1"><FileText size={10} /> {formattedDate}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-widest uppercase border ${shard.isMastered ? 'bg-(--accent-teal)/10 text-(--accent-teal) border-(--accent-teal)/30' : 'bg-(--bg-dark) text-(--text-muted) border-(--border-color)'}`}>
                        {shard.isMastered ? "Mastered" : "Forged"}
                    </span>
                </div>
                <h3 className="text-(--text-main) font-bold text-lg leading-tight mb-2 line-clamp-1">{shard.title}</h3>
                <p className="text-(--text-muted) text-xs line-clamp-2 leading-relaxed italic border-l-2 border-(--border-color) pl-2">
                    {shard.files?.length ? `[Contains ${shard.files.length} attached file(s)]` : `"${shard.content}"`}
                </p>
            </div>

            <div className="mt-5 space-y-4">
                <div>
                    <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase mb-1">
                        <span className="text-(--text-muted)">Mastery</span>
                        <span className={shard.isMastered ? "text-(--accent-teal)" : "text-(--accent-yellow)"}>{shard.mastery}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-(--bg-dark) rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${shard.isMastered ? 'bg-(--accent-teal)' : 'bg-(--accent-yellow)'}`} style={{ width: `${shard.mastery}%` }} />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex gap-1 p-1 bg-(--bg-dark) rounded-xl border border-(--border-color)">
                        {(['mixed', 'multiple choice', 'identification', 'true or false'] as const).map((type) => (
                            <SquishyButton
                                key={type}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Use setTutorSessionState to update the preferred type
                                    useStudyStore.getState().updateTutorSessionState({ preferredType: type });
                                }}
                                className={`flex-1 py-1 text-[8px] font-bold uppercase rounded-lg transition-all border-none shadow-none ${useStudyStore.getState().tutorSessionState.preferredType === type
                                    ? 'bg-(--accent-yellow) text-black'
                                    : 'text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-sidebar)'
                                    }`}
                            >
                                {type === 'multiple choice' ? 'MC' : type === 'identification' ? 'ID' : type === 'true or false' ? 'TF' : 'All'}
                            </SquishyButton>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <SquishyButton
                            disabled={isTutorModeActive}
                            onClick={() => onRead(shard)}
                            className="py-2 rounded-xl border border-(--border-color) text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-sidebar) text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Read
                        </SquishyButton>
                        <SquishyButton
                            disabled={shard.isMastered || isTutorModeActive}
                            onClick={() => {
                                // 👇 THE BOUNCER LOGIC
                                if (!isPremiumUser) {
                                    triggerChumToast(
                                        "The AI Tutor requires a higher neural link. Upgrade to StudyBuddy Pro to train this Shard.",
                                        "warning",
                                        () => setPremiumModalOpen(true)
                                    );
                                    return;
                                }
                                startTutorMode(shard.id, useStudyStore.getState().tutorSessionState.preferredType);
                            }}
                            className="relative overflow-hidden group py-2 rounded-xl bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 text-[var(--accent-yellow)] text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-yellow)] hover:text-[#0b1211]"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-1.5">
                                <BrainCircuit size={14} /> Train
                                {/* 👇 Only show the PRO badge if they AREN'T premium yet */}
                                {!isPremiumUser && <span className="text-[8px] bg-[var(--accent-yellow)] text-black px-1 rounded uppercase">Pro</span>}
                            </span>
                        </SquishyButton>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function TheForge() {

    useEffect(() => {
        const initStore = async () => {
            const store = useStudyStore.getState();
            // Only fetch if we haven't already pulled the data this session
            if (!store.isInitialized) {
                await store.initializeData();
            }
        };
        initStore();
    }, []);

    const [viewingLog, setViewingLog] = useState<TutorSession | null>(null);
    const [isForging, setIsForging] = useState(false);
    const { shards, forgeShard, triggerChumToast } = useStudyStore();
    const [isMounted, setIsMounted] = useState(false);

    const { isGamified } = useTerms();

    // Modal States
    const [isForgeModalOpen, setIsForgeModalOpen] = useState(false);
    const [readShard, setReadShard] = useState<Shard | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    // We upgraded the files state to hold the actual Base64 content!
    const [files, setFiles] = useState<{ name: string, type: string, content: string }[]>([]);

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    // Security constraints
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.csv', '.md', '.html', '.xml', '.rtf'];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (!selectedFiles.length) return;

        selectedFiles.forEach(file => {
            // 1. Validate File Type
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                triggerChumToast(`Unsupported file type: ${file.name}. Please use PDF, TXT, CSV, MD, or RTF.`, "warning");
                return;
            }

            // 2. Validate File Size
            if (file.size > MAX_FILE_SIZE) {
                triggerChumToast(`File too large: ${file.name}. Please keep files under 5MB.`, "warning");
                return;
            }

            // 3. Read the file into the React "waiting room" (Does NOT save to database yet)
            const reader = new FileReader();
            reader.onloadend = () => {
                setFiles(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    content: reader.result as string
                }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset the input so you can upload the same file again if you delete it
        e.target.value = '';
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // 1. Make sure 'async' is here!
    const handleForge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() && !content.trim() && files.length === 0) return;

        setIsForging(true); // Lock the button

        try {
            // 2. Make sure 'await' is here! This makes it wait for the cloud.
            await forgeShard({
                title: title || (files.length > 0 ? files[0].name : "Untitled Shard"),
                content,
                files
            });

            // Only clear the form IF it succeeds
            setTitle("");
            setContent("");
            setFiles([]);
            setIsForgeModalOpen(false);
        } catch (error) {
            triggerChumToast("The Forge rejected the sequence. Check your network link.", "warning");
        } finally {
            setIsForging(false); // Unlock the button
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col space-y-8 pb-12 relative">

            {/* HEADER */}
            <header id="archive-forge-header" className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-(--text-main) flex items-center gap-3">
                        <Hammer className="text-(--accent-yellow)" size={32} />
                        {isGamified ? "The Prism" : "Modules"}
                    </h1>
                    <p className="text-(--text-muted) mt-1">
                        {isGamified ? "Input your raw notes to forge Shards. Train them to complete mastery." : "Input your raw notes to forge Modules. Train them to complete mastery."}
                    </p>
                </div>
                {/* STRIKE ANVIL BUTTON */}
                <SquishyButton
                    id="archive-forge-trigger"
                    onClick={() => setIsForgeModalOpen(true)}
                    className="bg-(--accent-yellow)/10 text-(--accent-yellow) border border-(--accent-yellow)/30 px-6 py-3 rounded-2xl font-bold hover:bg-(--accent-yellow) hover:text-[#0b1211] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                >
                    <Sparkles size={18} /> {isGamified ? "Extract Shards" : "Create Modules"}
                </SquishyButton>
            </header>

            {/* THE ARMORY (Shard Grid) */}
            <div id="archive-shard-vault">
                {shards.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* THE SEED SHARD (Tutorial Sample) */}
                        <div id="archive-demo-shard">
                            <ShardCard
                                onRead={() => { }}
                                shard={{
                                    id: 'demo-seed-shard',
                                    title: "Neural Gardening: The Basics",
                                    content: "Welcome to the garden. Shards represent your extracted knowledge. You can master them through AI-driven sessions.",
                                    mastery: 42,
                                    isMastered: false,
                                    createdAt: new Date().toISOString()
                                }}
                            />
                        </div>

                        <div id="archive-dormant-infographic" className="flex flex-col items-center justify-center border-2 border-dashed border-(--border-color) rounded-3xl p-12 text-center opacity-60 bg-(--bg-card)/50 col-span-1 md:col-span-1 lg:col-span-2">
                            <Hammer size={48} className="text-(--text-muted) mb-4" />
                            <h3 className="text-xl font-bold text-(--text-main) mb-2">The {isGamified ? "prism" : "module"} is dormant.</h3>
                            <p className="text-(--text-muted) max-w-sm">
                                {isGamified ? "You haven't extracted any shards yet. Begin extraction to start." : "You haven't created any modules yet. Begin creation to start."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <AnimatePresence>
                            {shards.map(shard => (
                                <ShardCard key={shard.id} shard={shard} onRead={setReadShard} />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* FORGE MODAL */}
            <AnimatePresence>
                {isForgeModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsForgeModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-(--bg-sidebar) border border-(--border-color) rounded-3xl w-full max-w-2xl overflow-hidden relative z-10 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-(--text-main) flex items-center gap-2"><Hammer size={24} className="text-(--accent-yellow)" /> Forge a Shard</h2>
                                <SquishyButton onClick={() => setIsForgeModalOpen(false)} className="text-(--text-muted) hover:text-(--text-main) border-none bg-transparent shadow-none p-1"><X size={20} /></SquishyButton>
                            </div>

                            <form onSubmit={handleForge} className="flex flex-col gap-4">
                                <input type="text" placeholder="Shard Title (e.g., Biology Chapter 4)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-(--bg-dark) border border-(--border-color) text-(--text-main) text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-yellow) transition-colors placeholder:text-(--text-muted)/50 font-bold" />

                                <textarea placeholder="Paste plain text, or notes here..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full bg-(--bg-dark) border border-(--border-color) text-(--text-main) text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-(--accent-yellow) transition-colors placeholder:text-(--text-muted)/50 custom-scrollbar" />

                                {/* Secure File Upload Area */}
                                <div className="p-4 border-2 border-dashed border-(--border-color) rounded-xl bg-(--bg-dark)/50 transition-colors hover:bg-(--bg-dark)">
                                    <label className="flex flex-col items-center justify-center cursor-pointer p-4 w-full h-full group">
                                        <UploadCloud size={28} className="mb-2 text-(--text-muted) group-hover:text-(--accent-teal) transition-colors" />
                                        <span className="text-sm font-bold text-(--text-main) group-hover:text-(--accent-teal) transition-colors">Attach PDF, TXT, CSV, MD, RTF</span>
                                        <span className="text-xs mt-1 text-(--text-muted) opacity-80">Max file size: 5MB per document</span>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept=".pdf,.txt,.csv,.md,.html,.xml,.rtf"
                                            onChange={handleFileUpload}
                                        />
                                    </label>

                                    {/* Attached Files Pill Container */}
                                    {files.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-(--border-color) flex flex-wrap gap-2">
                                            {files.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-(--bg-card) border border-(--border-color) pl-3 pr-2 py-1.5 rounded-lg text-xs text-(--text-main) shadow-sm">
                                                    <FileIcon size={14} className="text-(--accent-teal)" />
                                                    <span className="truncate max-w-[180px] font-medium">{f.name}</span>
                                                    <SquishyButton
                                                        type="button"
                                                        onClick={() => removeFile(i)}
                                                        className="ml-1 text-(--text-muted) hover:text-red-400 p-1 rounded hover:bg-(--bg-dark) transition-colors border-none bg-transparent shadow-none"
                                                    >
                                                        <X size={14} />
                                                    </SquishyButton>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <SquishyButton
                                    type="submit"
                                    disabled={isForging || (!title.trim() && !content.trim() && files.length === 0)}
                                    className="mt-4 bg-(--accent-yellow) text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isForging ? "Forging Shard..." : "Finalize Shard"}
                                </SquishyButton>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* READ MODAL */}
                {readShard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReadShard(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-(--bg-sidebar) border border-(--border-color) rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden relative z-10 shadow-2xl flex flex-col">
                            <div className="p-6 border-b border-(--border-color) flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-(--text-main)">{readShard.title}</h2>
                                    <span className="text-xs text-(--text-muted) font-mono">{new Date(readShard.createdAt).toLocaleString()}</span>
                                </div>
                                <SquishyButton onClick={() => setReadShard(null)} className="p-2 rounded-full hover:bg-(--bg-dark) text-(--text-muted) hover:text-(--text-main) border-none bg-transparent shadow-none"><X size={20} /></SquishyButton>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                                {readShard.content || "No text content available."}

                                {readShard.files && readShard.files.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-(--border-color)">
                                        <h4 className="text-xs font-bold uppercase text-(--text-muted) mb-2">Attached Files</h4>
                                        <div className="flex flex-col gap-2">
                                            {readShard.files.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 p-3 bg-(--bg-dark) border border-(--border-color) rounded-xl cursor-pointer hover:border-(--accent-teal) transition-colors">
                                                    <FileIcon size={16} className="text-(--accent-teal)" /> {f.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}