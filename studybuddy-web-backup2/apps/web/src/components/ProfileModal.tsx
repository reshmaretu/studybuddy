"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Camera, Image as ImageIcon, Check, Ghost, Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { supabase } from "@/lib/supabase";
import ChumRenderer from "./ChumRenderer";
import Cropper from 'react-easy-crop';

// --- UTILS FOR CANVAS CROP ---
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0
): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bBoxWidth, height: bBoxHeight } = {
        width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
        height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
    };

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    );

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(data, 0, 0);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas is empty'));
            resolve(blob);
        }, 'image/jpeg');
    });
};

export default function ProfileModal() {
    const { 
        isProfileModalOpen, setProfileModalOpen, 
        avatarUrl, setAvatarUrl,
        useChumAvatar, setUseChumAvatar,
        triggerChumToast 
    } = useStudyStore();
    
    const [activeTab, setActiveTab] = useState<'custom' | 'chum'>('chum');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop States
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    const onCropComplete = useCallback((_: unknown, pixelArea: { x: number; y: number; width: number; height: number }) => {
        setCroppedAreaPixels(pixelArea);
    }, []);

    if (!isProfileModalOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            triggerChumToast("Avatar too heavy (Max 2MB).", "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => setImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!image || !croppedAreaPixels) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthenticated");

            // Perform Crop
            const blob = await getCroppedImg(image, croppedAreaPixels, rotation);
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

            const fileName = `avatar-${Date.now()}.jpg`;
            const filePath = `${user.id}/${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Add cache busting
            const finalUrl = `${publicUrl}?v=${Date.now()}`;

            await supabase
                .from('profiles')
                .update({ avatar_url: finalUrl })
                .eq('id', user.id);

            setAvatarUrl(finalUrl);
            await setUseChumAvatar(false);
            triggerChumToast("Identity appearance harmonized.", "success");
            setImage(null);
            setActiveTab('custom');
        } catch (err) {
            console.error(err);
            triggerChumToast("Shard uplink failed.", "warning");
        } finally {
            setUploading(false);
        }
    };

    const useChumAvatarChoice = async () => {
        try {
            await setUseChumAvatar(true);
            triggerChumToast("Returned to Chum form.", "success");
            setActiveTab('chum');
        } catch (err) {
            triggerChumToast("Metamorphosis failed.", "warning");
        }
    };

    const useCustomAvatarChoice = async () => {
        if (!avatarUrl) return;
        try {
            await setUseChumAvatar(false);
            triggerChumToast("Switched to custom shard.", "success");
        } catch (err) {
            triggerChumToast("Avatar sync failed.", "warning");
        }
    };

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setProfileModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
            />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]/30">
                    <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-3">
                        <Camera size={20} className="text-[var(--accent-teal)]" /> Identity Mask
                    </h3>
                    <button 
                        onClick={() => setProfileModalOpen(false)}
                        className="p-2 rounded-xl hover:bg-[var(--bg-dark)] text-[var(--text-muted)] hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cropping UI Overlay */}
                <AnimatePresence>
                    {image && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-[var(--bg-card)] flex flex-col"
                        >
                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Harmonize Shard</h4>
                                <button onClick={() => setImage(null)} className="text-[var(--text-muted)] hover:text-white"><X size={18} /></button>
                            </div>
                            
                            <div className="flex-1 relative bg-black">
                                <Cropper
                                    image={image}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                    onCropComplete={onCropComplete}
                                />
                            </div>

                            <div className="p-6 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-color)] space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <ZoomOut size={16} className="text-[var(--text-muted)]" />
                                        <input 
                                            type="range" value={zoom} min={1} max={3} step={0.1}
                                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                                            className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-[var(--accent-teal)]"
                                        />
                                        <ZoomIn size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <RotateCw size={16} className="text-[var(--text-muted)]" />
                                        <input 
                                            type="range" value={rotation} min={0} max={360} step={1}
                                            onChange={(e) => setRotation(parseFloat(e.target.value))}
                                            className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-[var(--accent-teal)]"
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="w-full py-4 rounded-2xl bg-[var(--accent-teal)] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <><Loader2 size={14} className="animate-spin" /> Engraving Persona...</>
                                    ) : (
                                        "Save and Harmonize"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs */}
                <div className="flex p-2 bg-[var(--bg-dark)]/50 mx-6 mt-6 rounded-2xl border border-[var(--border-color)]">
                    <button 
                        onClick={() => setActiveTab('chum')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'chum' ? 'bg-[var(--accent-teal)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
                    >
                        <Ghost size={14} /> Chum Form
                    </button>
                    <button 
                        onClick={() => setActiveTab('custom')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'custom' ? 'bg-[var(--accent-teal)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
                    >
                        <ImageIcon size={14} /> Custom Shard
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'chum' ? (
                            <motion.div 
                                key="chum-tab"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="w-32 h-32 rounded-full border-4 border-[var(--accent-teal)]/20 p-4 bg-[var(--bg-dark)] flex items-center justify-center relative group">
                                    <ChumRenderer size="w-20 h-20" />
                                    {useChumAvatar !== false && (
                                        <div className="absolute -top-2 -right-2 bg-[var(--accent-teal)] text-black p-1.5 rounded-full shadow-lg">
                                            <Check size={14} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-[var(--text-main)]">Standard Spirit Guard</p>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Universal across the Lantern Net</p>
                                </div>
                                <button 
                                    onClick={useChumAvatarChoice}
                                    disabled={useChumAvatar}
                                    className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${useChumAvatar ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] cursor-default' : 'bg-[var(--bg-dark)] border border-[var(--border-color)] hover:border-[var(--accent-teal)] text-white'}`}
                                >
                                    {useChumAvatar ? "Active Form" : "Revert to Spirit"}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="custom-tab"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div 
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className="w-32 h-32 rounded-full border-4 border-dashed border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-center relative cursor-pointer group hover:border-[var(--accent-teal)]/50 transition-all overflow-hidden"
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="text-[var(--text-muted)] group-hover:text-[var(--accent-teal)] transition-colors" size={32} />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="text-[var(--accent-teal)] animate-spin" size={24} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-[8px] font-black text-white uppercase">Replace shard</p>
                                    </div>
                                </div>
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                    className="hidden" 
                                />

                                <div className="text-center">
                                    <p className="text-sm font-bold text-[var(--text-main)]">Custom Identity Shard</p>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Visible to all chums in the Void</p>
                                </div>

                                {avatarUrl && (
                                    <button 
                                        onClick={useCustomAvatarChoice}
                                        disabled={!useChumAvatar}
                                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!useChumAvatar ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] cursor-default' : 'bg-[var(--bg-dark)] border border-[var(--border-color)] hover:border-[var(--accent-teal)] text-white'}`}
                                    >
                                        {!useChumAvatar ? "Active Form" : "Equip Custom Shard"}
                                    </button>
                                )}

                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full py-4 rounded-2xl bg-[var(--accent-teal)] text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[var(--accent-teal)]/20"
                                >
                                    {avatarUrl ? "Upload New Shard" : "Upload Identity Shard"}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-6 bg-[var(--bg-sidebar)]/30 border-t border-[var(--border-color)] text-center">
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Identity changes sync across the entire Lantern Network
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
