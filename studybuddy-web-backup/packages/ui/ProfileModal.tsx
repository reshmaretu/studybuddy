"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Upload, Camera, Image as ImageIcon, Check, Ghost, Loader2, RotateCw, ZoomIn, ZoomOut, ShieldAlert, Terminal } from "lucide-react";
import { useStudyStore, supabase, useTerms } from "@studybuddy/api";
import { ChumRenderer } from "./ChumRenderer";
import Cropper from 'react-easy-crop';

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const rotRad = (rotation * Math.PI) / 180;
    canvas.width = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
    canvas.height = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);
    return new Promise((r, j) => canvas.toBlob(b => b ? r(b) : j(new Error('Canvas empty')), 'image/jpeg'));
};

export const ProfileModal = () => {
    const {
        isProfileModalOpen, setProfileModalOpen, avatarUrl, setAvatarUrl,
        triggerChumToast, useThematicUI, setThematicUI, isDev,
        useChumAvatar, setUseChumAvatar
    } = useStudyStore();
    const { terms } = useTerms();
    const [activeTab, setActiveTab] = useState<'custom' | 'chum'>('chum');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropComplete = useCallback((_: any, pixelArea: any) => setCroppedAreaPixels(pixelArea), []);

    if (!isProfileModalOpen) return null;

    const handleUpload = async () => {
        if (!image || !croppedAreaPixels) return;
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthenticated");
            const blob = await getCroppedImg(image, croppedAreaPixels, rotation);
            const fileName = `${user.id}-${Date.now()}.jpg`;
            await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true });
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const finalUrl = `${publicUrl}?v=${Date.now()}`;
            await supabase.from('profiles').update({ avatar_url: finalUrl }).eq('id', user.id);
            setAvatarUrl(finalUrl);
            setUseChumAvatar(false);
            triggerChumToast("Identity appearance harmonized.", "success");
            setImage(null);
        } catch (err) {
            triggerChumToast("Shard uplink failed.", "warning");
        } finally { setUploading(false); }
    };

    return (
        <AnimatePresence>
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setProfileModalOpen(false)} 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                        className="bg-(--bg-card) border-2 border-(--border-color) rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-(--border-color) flex justify-between items-center bg-(--bg-sidebar)/30">
                            <h3 className="text-xl font-black flex items-center gap-3">
                                <Camera size={20} className="text-(--accent-teal)" /> 
                                {terms.neurallinkAscended === "Neural Link Ascended" ? "Identity Mask" : "Profile Settings"}
                            </h3>
                            <button onClick={() => setProfileModalOpen(false)} className="p-2 rounded-xl hover:bg-(--bg-dark) transition-all text-(--text-muted) hover:text-(--text-main)">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 flex flex-col items-center gap-6">
                            <div className="w-32 h-32 rounded-full border-4 border-(--accent-teal)/20 p-2 bg-(--bg-dark) flex items-center justify-center relative shadow-inner">
                                {(avatarUrl && !useChumAvatar) ? (
                                    <img src={avatarUrl} alt="Identity" className="w-full h-full rounded-full object-cover shadow-sm" />
                                ) : (
                                    <ChumRenderer size="w-24 h-24" />
                                )}
                            </div>
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="w-full py-4 rounded-2xl bg-(--accent-teal) text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                            >
                                {terms.forgeShard === "Extract Shards" ? "Upload Shard" : "Upload Picture"}
                            </button>
                            
                            <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setImage(r.result as string); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />

                            <div className="w-full pt-4 border-t border-(--border-color) flex flex-col gap-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-(--text-muted) uppercase tracking-widest">Avatar Representation</span>
                                    <div className="flex bg-(--bg-dark) border border-(--border-color) rounded-lg p-1">
                                        <button 
                                            onClick={() => setUseChumAvatar(true)} 
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${useChumAvatar ? 'bg-(--accent-teal) text-white' : 'text-(--text-muted) hover:text-(--text-main)'}`}
                                        >
                                            Chum
                                        </button>
                                        <button 
                                            onClick={() => setUseChumAvatar(false)} 
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${!useChumAvatar ? 'bg-(--accent-teal) text-white' : 'text-(--text-muted) hover:text-(--text-main)'}`}
                                        >
                                            Photo
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-(--text-muted) uppercase tracking-widest">Interface Frequency</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${useThematicUI ? 'bg-(--accent-teal)/10 text-(--accent-teal)' : 'bg-(--text-muted)/10 text-(--text-muted)'}`}>
                                        {useThematicUI ? "THEMATIC" : "MINIMAL"}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setThematicUI(!useThematicUI)}
                                    className={`w-full py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${useThematicUI ? 'border-(--accent-teal) text-(--accent-teal) bg-(--accent-teal)/5 hover:bg-(--accent-teal)/10' : 'border-(--border-color) text-(--text-main) hover:border-(--text-muted)'}`}
                                >
                                    {useThematicUI ? <Sparkles size={14} /> : <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />}
                                    Switch to {useThematicUI ? "Minimal Mode" : "Gamified Mode"}
                                </button>
                            </div>
                        </div>

                        {/* Image Cropper Overlay */}
                        <AnimatePresence>
                            {image && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute inset-0 bg-(--bg-card) z-50 flex flex-col">
                                    <div className="relative flex-1 bg-black">
                                        <Cropper image={image} crop={crop} zoom={zoom} rotation={rotation} aspect={1} onCropChange={setCrop} onRotationChange={setRotation} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                                    </div>
                                    <div className="p-6 space-y-4 bg-(--bg-sidebar)/90 backdrop-blur-md">
                                        <div className="flex items-center gap-4">
                                            <ZoomOut size={16} className="text-(--text-muted)" />
                                            <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-(--accent-teal)" />
                                            <ZoomIn size={16} className="text-(--text-muted)" />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setImage(null)} className="flex-1 py-4 rounded-xl border border-(--border-color) text-xs font-black uppercase text-(--text-muted) hover:text-(--text-main)">Abort</button>
                                            <button onClick={handleUpload} disabled={uploading} className="flex-1 py-4 rounded-xl bg-(--accent-teal) text-black text-xs font-black uppercase flex items-center justify-center gap-2">
                                                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} 
                                                Finalize
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
