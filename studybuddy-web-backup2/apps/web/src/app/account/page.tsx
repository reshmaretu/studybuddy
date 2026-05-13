"use client";

import { useStudyStore } from "@/store/useStudyStore";
import PasswordValidator from "@/components/PasswordValidator";
import { Invoice } from "@studybuddy/api";
import {
    Terminal,
    Sparkles,
    User, Mail, Lock, Trash2, Crown, LogOut,
    Camera, CheckCircle2, AlertCircle, RefreshCcw, X, ShieldAlert, ShieldCheck,
    QrCode, Download, CreditCard, Send, Fingerprint, Settings, MousePointer2, Hand, Cpu, Eye, EyeOff, Waves, Maximize2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import emailjs from '@emailjs/browser';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useTerms } from "@/hooks/useTerms";
import ChumRenderer from "@/components/ChumRenderer";

export default function AccountPage() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const router = useRouter();
    const { terms } = useTerms();

    const {
        isPremiumUser, level, displayName, fullName, userEmail, setUserEmail, triggerChumToast,
        setPremiumStatus, setDisplayName, setFullName, mockInvoices, addMockInvoice,
        isVerified, setIsVerified, avatarUrl, setProfileModalOpen, setPremiumModalOpen,
        doubleClickToComplete = true, dndEnabled = true, setSettings, handleLogout,
        requestNotificationPermission,
        playTickEnabled = true, playChimeEnabled = true, requireCompletionConfirmation = true,
        performanceSettings = { mode: 'auto', showParticles: true, bloomEnabled: true, antialiasing: true },
        accessibilitySettings = { highContrast: false, largeText: false, reducedMotion: false },
        useThematicUI, setThematicUI, isDev
    } = useStudyStore();

    const [notificationPermission, setNotificationPermission] = useState<string>('default');
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);

    // UI States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    // Deleted local isVerified (now in store)
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const otpRef = useRef("");
    const [refNumber, setRefNumber] = useState("");

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showPurgePassword, setShowPurgePassword] = useState(false);
    const [showCardCvv, setShowCardCvv] = useState(false);

    const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
    const [verificationCode, setVerificationCode] = useState(''); // User input
    const [activeRecoveryCode, setActiveRecoveryCode] = useState(''); // Generated code

    // Cooldown/Meta States
    const [meta, setMeta] = useState({
        firstName: "",
        lastName: "",
        lastIdentityUpdate: 0,
        lastDisplayUpdate: 0
    });

    // Form States
    const [formData, setFormData] = useState({
        newDisplayName: displayName || "",
        newFirstName: "",
        newLastName: "", // Renamed from newFullName
        newEmail: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        purgePassword: ""
    });

    const [deletionCountdown, setDeletionCountdown] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [checkoutMethod, setCheckoutMethod] = useState<'manual' | 'qrph' | 'card'>('qrph');
    const [otpPurpose, setOtpPurpose] = useState<'verify' | 'email'>('verify');

    // MOCK CARD DATA
    const [cardData, setCardData] = useState({
        number: "4242 4242 4242 4242",
        expiry: "12/26",
        cvv: "789",
        name: displayName?.toUpperCase() || "ARCHITECT"
    });

    useEffect(() => {
        const syncUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "");

                // Pull latest profile
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    setIsVerified(!!profile.is_verified);

                    const m_firstName = profile.full_name?.split(' ')[0] || "";
                    const m_lastName = profile.full_name?.split(' ').slice(1).join(' ') || "";

                    setMeta({
                        firstName: m_firstName,
                        lastName: m_lastName,
                        lastIdentityUpdate: profile.last_full_name_change ? new Date(profile.last_full_name_change).getTime() : 0,
                        lastDisplayUpdate: profile.last_display_name_change ? new Date(profile.last_display_name_change).getTime() : 0,
                    });

                    setFormData(prev => ({
                        ...prev,
                        newDisplayName: profile.display_name || displayName,
                        newFirstName: m_firstName,
                        newLastName: m_lastName
                    }));
                }
            }
        };
        syncUser();
    }, []);

    // ⚡ SNAPSHOT & REVERT PATTERN (Placeholder for complex logic, used in identity commit)

    // --- IDENTITY LOGIC ---

    const handleForgotPassword = async (emailInput: string) => {
        if (!emailInput) {
            return triggerChumToast("Email coordinate required for relay.", "warning");
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-secure-otp', {
                body: {
                    userEmail: emailInput,
                    action: 'reset_password'
                }
            });

            if (error || !data?.success) {
                throw new Error(data?.error || "Relay transmission failed.");
            }

            triggerChumToast("Recovery link dispatched to your coordinates.", "success");
        } catch (err: any) {
            triggerChumToast(err.message, "warning");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!formData.newPassword) return triggerChumToast("New cipher required.", "warning");

        setLoading(true);

        // If not in recovery bypass mode, we must check the current password
        if (formData.currentPassword !== "RECOVERY_BYPASS") {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: formData.currentPassword,
            });

            if (authError) {
                setLoading(false);
                return triggerChumToast("Current cipher incorrect.", "warning");
            }
        }


        // Perform update
        const { error } = await supabase.auth.updateUser({ password: formData.newPassword });

        if (error) {
            triggerChumToast(error.message, "warning");
        } else {
            triggerChumToast("Cipher successfully rewritten.", "success");
            setActiveModal(null);

            // FIX: Spread the previous state to maintain other form fields
            setFormData(prev => ({
                ...prev,
                currentPassword: "",
                newPassword: ""
            }));

            setRecoveryStep('request');
        }
    }


    const handleSendOTP = async (purpose: 'verify' | 'email' = 'verify') => {
        setLoading(true);
        setOtpPurpose(purpose);

        try {
            let targetEmail = purpose === 'email' ? formData.newEmail : userEmail;
            if (!targetEmail) throw new Error("Target coordinate missing.");

            const { data, error } = await supabase.functions.invoke('send-secure-otp', {
                body: {
                    action: 'send_otp',
                    userEmail: targetEmail, // CHANGED from 'email' to 'userEmail'
                    userId: (await supabase.auth.getUser()).data.user?.id,
                }
            });

            if (error || !data?.success) throw new Error(data?.error || "Relay failed.");

            triggerChumToast("Cozy cipher dispatched to your inbox.", "success");
            setActiveModal('verify-otp');
        } catch (err: any) {
            triggerChumToast(err.message, "warning");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);

        try {
            // CALL THE EDGE FUNCTION INSTEAD OF LOCAL CHECK
            const { data, error } = await supabase.functions.invoke('secure-verify-relay', {
                body: {
                    code: otp.trim(),
                    type: otpPurpose, // 'verify' or 'email'
                    newEmail: formData.newEmail,
                    userId: (await supabase.auth.getUser()).data.user?.id
                }
            });

            if (error || !data?.success) {
                throw new Error("Neural match failed.");
            }

            // Handle success UI
            if (otpPurpose === 'email') {
                setUserEmail(formData.newEmail);
                triggerChumToast("Relay coordinate migrated.", "success");
            } else {
                setIsVerified(true);
                triggerChumToast("Identity Permanently Verified.", "success");
            }

            setActiveModal(null);
            setOtp("");
        } catch (err: any) {
            triggerChumToast(err.message, "warning");
        } finally {
            setLoading(false);
        }
    };

    const commitIdentity = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const nowMs = Date.now();
        const displayCooldown = 7 * 24 * 60 * 60 * 1000;
        const identityCooldown = 14 * 24 * 60 * 60 * 1000;

        // 🛡️ Cooldown Check
        const isChangingDisplay = formData.newDisplayName !== (displayName || "");
        const finalFullName = `${formData.newFirstName} ${formData.newLastName}`.trim();
        const isChangingIdentity = finalFullName !== (fullName || "");

        if (isChangingDisplay && meta.lastDisplayUpdate > 0 && (nowMs - meta.lastDisplayUpdate) < displayCooldown) {
            const remaining = Math.ceil((displayCooldown - (nowMs - meta.lastDisplayUpdate)) / (24 * 60 * 60 * 1000));
            return triggerChumToast(`Garden Label is resting. Wait ${remaining} more days to tend it again.`, "warning");
        }

        if (isChangingIdentity && meta.lastIdentityUpdate > 0 && (nowMs - meta.lastIdentityUpdate) < identityCooldown) {
            const remaining = Math.ceil((identityCooldown - (nowMs - meta.lastIdentityUpdate)) / (24 * 60 * 60 * 1000));
            return triggerChumToast(`Spirit Core needs ${remaining} days to stabilize.`, "warning");
        }

        setLoading(true);
        const nowISO = new Date().toISOString();
        const profileUpdates: {
            display_name?: string;
            last_display_name_change?: string;
            full_name?: string;
            last_full_name_change?: string;
        } = {};
        if (isChangingDisplay) {
            profileUpdates.display_name = formData.newDisplayName;
            profileUpdates.last_display_name_change = nowISO;
        }
        if (isChangingIdentity) {
            profileUpdates.full_name = finalFullName;
            profileUpdates.last_full_name_change = nowISO;
        }

        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Update store immediately
            if (isChangingDisplay) await setDisplayName(formData.newDisplayName);
            if (isChangingIdentity) await setFullName(finalFullName);

            triggerChumToast("Garden identity harmonized.", "success");
            setActiveModal(null);

            // Updated last identity change locally to reflect cooldown immediately
            setMeta(prev => ({
                ...prev,
                lastDisplayUpdate: isChangingDisplay ? nowMs : prev.lastDisplayUpdate,
                lastIdentityUpdate: isChangingIdentity ? nowMs : prev.lastIdentityUpdate
            }));
        } catch (err: any) {
            triggerChumToast(err.message || "Sync failed. Reverting shards.", "warning");
        } finally {
            setLoading(false);
        }
    };

    const startDeleteCountdown = async () => {
        if (!formData.purgePassword) return triggerChumToast("Password required.", "warning");
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Verify password via a re-auth attempt
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: formData.purgePassword
        });

        if (verifyError) {
            setLoading(false);
            return triggerChumToast("Heartbeat mismatch. Resetting the hearth.", "warning");
        }

        setLoading(false);
        setDeletionCountdown(20);
        triggerChumToast("Setting the hearth to rest. You have 20 seconds to change your mind.", "info");
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (deletionCountdown !== null && deletionCountdown > 0) {
            timer = setTimeout(() => setDeletionCountdown(deletionCountdown - 1), 1000);
        } else if (deletionCountdown === 0) {
            handleFinalDelete();
        }
        return () => clearTimeout(timer);
    }, [deletionCountdown]);

    const handleFinalDelete = async () => {
        setIsDeleting(true);
        const { error } = await supabase.rpc('delete_user_own_account');
        if (error) {
            triggerChumToast("Something went wrong with the rest pulse. Please try again.", "warning");
            setDeletionCountdown(null);
            setIsDeleting(false);
        } else {
            await supabase.auth.signOut();
            window.location.href = "/";
        }
    };

    const cancelDeletion = () => {
        setDeletionCountdown(null);
        triggerChumToast("Glad you decided to stay in the garden!", "success");
    };

    // --- PAYMENT & RECEIPTS ---

    const generateReceiptPDF = async (targetInvoice?: Invoice) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a6'
        });

        const { data: { user } } = await supabase.auth.getUser();

        // Use either the provided invoice or fallback to current details
        const invoiceId = targetInvoice?.id || `SB-${Date.now().toString().slice(-6)}`;
        const amount = targetInvoice?.amount || "PHP 99.00";
        const date = targetInvoice?.date || new Date().toLocaleDateString();
        const method = targetInvoice?.method || "NEURAL_RELAY";

        // Futuristic Design
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, 105, 148, 'F');

        // Header Accent
        doc.setFillColor(0, 255, 200);
        doc.rect(0, 0, 105, 15, 'F');

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text('OFFICIAL TRANSMISSION', 10, 10);

        doc.setTextColor(0, 255, 200);
        doc.setFontSize(18);
        doc.text('NEURAL RECEIPT', 10, 30);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`ARCHITECT_ID: ${user?.id?.substring(0, 12)}...`, 10, 45);
        doc.text(`TIMESTAMP: ${date}`, 10, 52);
        doc.text(`INVOICE_ID: ${invoiceId}`, 10, 59);

        doc.setDrawColor(0, 255, 200);
        doc.line(10, 65, 95, 65);

        doc.setFontSize(12);
        doc.text('NEURAL_ASCENDANT_UPGRADE', 10, 80);
        doc.text(amount, 70, 80);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`METHOD: ${method.toUpperCase()}`, 10, 88);

        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text('This log validates your garden growth access.', 10, 130);
        doc.text('StudyBuddy Garden v2.0 - Peace Protocol', 10, 135);

        doc.save(`receipt_${invoiceId}.pdf`);
        triggerChumToast("Garden logbook extracted.", "success");
    };

    const handleUniversalPayment = async () => {
        if (checkoutMethod === 'manual') {
            if (!refNumber) return triggerChumToast("Neural Cipher required.", "warning");
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return triggerChumToast("Uplink failed: No Active Architect.", "warning");
            }

            try {
                const response = await fetch('/api/premium/unlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        token: refNumber
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Logic already exists to sync DB
                    setPremiumStatus(true);

                    const newInvoice = {
                        id: `SB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        date: new Date().toLocaleDateString(),
                        amount: "PHP 99.00",
                        method: "EXPO-CIPHER"
                    };
                    addMockInvoice(newInvoice);

                    triggerChumToast("Garden Soul Blossomed!", "success");
                    setActiveModal(null);
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    triggerChumToast(result.error || "Neural Shard Rejection.", "warning");
                }
            } catch (err) {
                triggerChumToast("Relay connection timed out.", "warning");
            } finally {
                setLoading(false);
            }
        } else {
            // GCash / Card Path (Mock High-Speed Upgrade)
            setLoading(true);
            setTimeout(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update({ is_premium: true }).eq('id', user.id);
                    setPremiumStatus(true);

                    const newInvoice = {
                        id: `SB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        date: new Date().toLocaleDateString(),
                        amount: "PHP 99.00",
                        method: checkoutMethod === 'qrph' ? "GCASH_SECURE" : "MOCK_CARD_INT"
                    };
                    addMockInvoice(newInvoice);

                    triggerChumToast(`${checkoutMethod === 'qrph' ? 'GCash' : 'Neural Card'} Stream Verified!`, "success");
                    setActiveModal(null);
                    setTimeout(() => window.location.reload(), 1000);
                }
                setLoading(false);
            }, 3000);
        }
    };


    if (!isMounted) return null;

    return (
        < div className="min-h-screen w-full flex flex-col items-center p-6 md:p-12 overflow-y-auto bg-(--bg-dark) select-none custom-scrollbar" >
            <div className="w-full max-w-4xl h-full flex flex-col gap-6 animate-in fade-in duration-700">

                {/* Centered Profile Section (Cozy/Refined) */}
                <div id="account-identity-module" className="flex flex-col items-center text-center gap-6 mt-4">
                    <button
                        id="account-identity-vessel"
                        onClick={() => setProfileModalOpen(true)}
                        className="relative group cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="w-40 h-40 rounded-full border-4 border-[var(--accent-teal)]/20 p-1.5 bg-(--bg-card) flex items-center justify-center relative transition-all duration-500 group-hover:border-[var(--accent-teal)] group-hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="PFP"
                                    className="w-full h-full object-cover rounded-full z-20 relative"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-chum');
                                        if (fallback) fallback.classList.remove('invisible');
                                    }}
                                />
                            ) : null}
                            <div className={`absolute inset-0 p-6 flex items-center justify-center fallback-chum ${avatarUrl ? 'invisible' : ''}`}>
                                <ChumRenderer size="w-full h-full scale-150" />
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 z-30">
                                <Camera size={24} className="text-white" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Reflect Identity</span>
                            </div>
                        </div>
                    </button>

                    <div className="space-y-1">
                        <div className="flex items-center justify-center gap-3">
                            <h1 className="text-4xl font-bold tracking-tight text-(--text-main) leading-tight">
                                {displayName || fullName || userEmail.split('@')[0] || "Guardian"}
                            </h1>
                            <button
                                onClick={() => setActiveModal('premium-status')}
                                className={`p-2 rounded-2xl transition-all shadow-lg ${isPremiumUser ? 'bg-(--accent-yellow) text-black' : 'bg-(--bg-card) text-(--text-muted) hover:text-(--text-main) border border-(--border-color)'}`}
                            >
                                <Crown size={20} fill={isPremiumUser ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <p className="text-sm font-medium text-[var(--accent-teal)]/80 tracking-wide">{userEmail}</p>
                        <div id="account-security-vault" className="flex items-center justify-center gap-2 mt-2">
                            <span className="text-[10px] font-bold bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border border-[var(--accent-teal)]/20 px-3 py-1 rounded-full uppercase tracking-wider">{terms.level} {level}</span>
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-2 border shadow-sm ${isVerified ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-[var(--accent-teal)]/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                {isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                {isVerified ? 'Verified' : 'Unverified'}
                            </div>
                        </div>
                        {!isVerified && (
                            <button
                                onClick={() => handleSendOTP('verify')}
                                disabled={loading}
                                className="mt-4 px-6 py-2.5 rounded-full bg-(--accent-teal) text-white text-[10px] font-bold uppercase hover:opacity-90 transition-all flex items-center gap-2 mx-auto active:scale-95 shadow-xl"
                            >
                                {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                                {useThematicUI ? "Verify Relay" : "Verify Email"}
                            </button>
                        )}
                    </div>
                </div>
                {/* Cozy Action Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full mt-6">
                    <button onClick={() => setActiveModal('identity')} className="flex flex-col items-center justify-center gap-4 p-8 rounded-[40px] border bg-(--bg-card) border-(--border-color) hover:bg-[var(--accent-teal)]/10 hover:border-[var(--accent-teal)]/30 transition-all group shadow-sm">
                        <User size={28} className="text-[var(--accent-teal)] group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">{useThematicUI ? "Identity" : "Profile"}</span>
                    </button>
                    <button onClick={() => setActiveModal('email')} className="flex flex-col items-center justify-center gap-4 p-8 rounded-[40px] border bg-(--bg-card) border-(--border-color) hover:bg-[var(--accent-teal)]/10 hover:border-[var(--accent-teal)]/30 transition-all group shadow-sm">
                        <Mail size={28} className="text-[var(--accent-teal)] group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">{useThematicUI ? "Relay" : "Email"}</span>
                    </button>
                    <button onClick={() => setActiveModal('password')} className="flex flex-col items-center justify-center gap-4 p-8 rounded-[40px] border bg-(--bg-card) border-(--border-color) hover:bg-[var(--accent-teal)]/10 hover:border-[var(--accent-teal)]/30 transition-all group shadow-sm">
                        <Lock size={28} className="text-[var(--accent-teal)] group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">{useThematicUI ? "Cipher" : "Password"}</span>
                    </button>
                    <button onClick={() => setActiveModal('delete')} className="flex flex-col items-center justify-center gap-4 p-8 rounded-[40px] border bg-(--bg-card) border-(--border-color) hover:border-red-500/40 hover:bg-red-500/5 transition-all group shadow-sm">
                        <Trash2 size={28} className="text-red-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">{useThematicUI ? "Sever Link" : "Delete Account"}</span>
                    </button>
                    <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-4 p-8 rounded-[40px] border bg-(--bg-card) border-(--border-color) hover:border-red-500/40 hover:bg-red-500/5 transition-all group shadow-sm">
                        <LogOut size={28} className="text-red-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80">{useThematicUI ? "Log out" : "Logout"}</span>
                    </button>
                </div>

                {/* ⚙️ GARDEN PROTOCOLS (Settings) - MOVED BELOW */}
                <div className="w-full bg-(--bg-card) border border-(--border-color) rounded-[40px] p-8 mt-6 backdrop-blur-md shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-[var(--accent-teal)]/10 rounded-2xl border border-[var(--accent-teal)]/20">
                            <Settings size={20} className="text-[var(--accent-teal)]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-(--text-main)">{terms.neuralProtocols}</h3>
                            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1 text-(--text-muted)">
                                {useThematicUI ? "Configure your garden interaction nodes" : "Manage your app preferences"}
                            </p>
                        </div>
                    </div>

                    <div id="account-neural-protocols" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Double Tap Toggle */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${doubleClickToComplete ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                    <MousePointer2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">Neural Double-Tap</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Quick complete via double click</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ doubleClickToComplete: !doubleClickToComplete })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${doubleClickToComplete ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${doubleClickToComplete ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Drag & Drop Toggle */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${dndEnabled ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                    <Hand size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">Kinetic Relay</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Enable/Disable Drag & Drop</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ dndEnabled: !dndEnabled })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${dndEnabled ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${dndEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Web Push / Notifications Toggle */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-black/20 border border-white/5 group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${notificationPermission === 'granted' ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-white/5 text-white/20'}`}>
                                    <Fingerprint size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">Neural Transmissions</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5">Desktop & Background Alerts</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    const granted = await requestNotificationPermission();
                                    if (granted) {
                                        setNotificationPermission('granted');
                                        triggerChumToast("Neural Link established!", "success");
                                    } else {
                                        setNotificationPermission('denied');
                                        triggerChumToast("Link rejected by host.", "warning");
                                    }
                                }}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${notificationPermission === 'granted' ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${notificationPermission === 'granted' ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* UI Generation Toggle (Thematic UI) */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${useThematicUI ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">UI Atmosphere</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Toggle Gamified Terminology</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setThematicUI(!useThematicUI)}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${useThematicUI ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${useThematicUI ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Audio Toggles */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${playTickEnabled ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                    <MousePointer2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">Tactile Feedback</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Toggle Tick/Click Sounds</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ playTickEnabled: !playTickEnabled })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${playTickEnabled ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${playTickEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${playChimeEnabled ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">Victory Chimes</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Toggle Mastery Chime Sounds</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ playChimeEnabled: !playChimeEnabled })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${playChimeEnabled ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${playChimeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Confirmation Toggle */}
                        <div className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) group hover:border-[var(--accent-teal)]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${requireCompletionConfirmation ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                    <AlertCircle size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">Safety Protocols</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Confirm quest completion</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ requireCompletionConfirmation: !requireCompletionConfirmation })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${requireCompletionConfirmation ? 'bg-[var(--accent-teal)]' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${requireCompletionConfirmation ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                    </div>

                    {/* ⚡ ENVIRONMENTAL OPTIMIZATION (Performance) */}
                    <div id="account-environmental-sync" className="mt-8 pt-8 border-t border-(--border-color)">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-2 bg-[var(--accent-yellow)]/10 rounded-xl border border-[var(--accent-yellow)]/20">
                                <Cpu size={16} className="text-[var(--accent-yellow)]" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-(--text-main)">Environmental Sync</h4>
                                <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5 text-(--text-muted)">Performance tweaks for 3D realms</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-(--bg-dark)/40 border border-(--border-color)">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-(--text-muted)">Processor Mode</span>
                                    <span className="text-[9px] font-bold text-[var(--accent-teal)] uppercase">{performanceSettings.mode}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['auto', 'low', 'balanced', 'high'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setSettings({ performanceSettings: { mode: m } })}
                                            className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${performanceSettings.mode === m ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)] text-black' : 'bg-(--bg-card) border-(--border-color) text-(--text-muted) hover:text-(--text-main)'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSettings({ performanceSettings: { showParticles: !performanceSettings.showParticles } })}
                                    className={`flex items-center justify-between p-4 rounded-2xl bg-(--bg-dark)/40 border transition-all ${performanceSettings.showParticles ? 'border-[var(--accent-teal)]/30' : 'border-(--border-color) opacity-50'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-(--text-main)">Shaders</span>
                                    <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-all ${performanceSettings.showParticles ? 'bg-[var(--accent-teal)]' : 'bg-(--bg-dark)'}`}>
                                        <div className={`w-3 h-3 rounded-full bg-black transition-all ${performanceSettings.showParticles ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                                <button
                                    onClick={() => setSettings({ performanceSettings: { bloomEnabled: !performanceSettings.bloomEnabled } })}
                                    className={`flex items-center justify-between p-4 rounded-2xl bg-(--bg-dark)/40 border transition-all ${performanceSettings.bloomEnabled ? 'border-[var(--accent-teal)]/30' : 'border-(--border-color) opacity-50'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-(--text-main)">Bloom</span>
                                    <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-all ${performanceSettings.bloomEnabled ? 'bg-[var(--accent-teal)]' : 'bg-(--bg-dark)'}`}>
                                        <div className={`w-3 h-3 rounded-full bg-black transition-all ${performanceSettings.bloomEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                            </div>

                            {/* ♿ ACCESSIBILITY CONTROLS */}
                            <div className="grid grid-cols-3 gap-4 border-t border-(--border-color) pt-4 mt-2">
                                <button
                                    onClick={() => setSettings({ accessibilitySettings: { highContrast: !accessibilitySettings.highContrast } })}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-(--bg-dark)/40 border transition-all ${accessibilitySettings.highContrast ? 'border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5' : 'border-(--border-color) opacity-50'}`}
                                >
                                    <Eye size={16} className={accessibilitySettings.highContrast ? 'text-[var(--accent-teal)]' : 'text-(--text-muted)'} />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-(--text-main)">High Contrast</span>
                                </button>
                                <button
                                    onClick={() => setSettings({ accessibilitySettings: { largeText: !accessibilitySettings.largeText } })}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-(--bg-dark)/40 border transition-all ${accessibilitySettings.largeText ? 'border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5' : 'border-(--border-color) opacity-50'}`}
                                >
                                    <Maximize2 size={16} className={accessibilitySettings.largeText ? 'text-[var(--accent-teal)]' : 'text-(--text-muted)'} />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-(--text-main)">Large Text</span>
                                </button>
                                <button
                                    onClick={() => setSettings({ accessibilitySettings: { reducedMotion: !accessibilitySettings.reducedMotion } })}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-(--bg-dark)/40 border transition-all ${accessibilitySettings.reducedMotion ? 'border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5' : 'border-(--border-color) opacity-50'}`}
                                >
                                    <Waves size={16} className={accessibilitySettings.reducedMotion ? 'text-[var(--accent-teal)]' : 'text-(--text-muted)'} />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-(--text-main)">Soft Motion</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- 💰 INVOICE LEDGER (If Premium) --- */}
                {isPremiumUser && mockInvoices.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-(--bg-card) border border-(--border-color) p-10 rounded-[48px] backdrop-blur-md shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-(--text-main)">Transaction Ledger</h3>
                                <p className="text-[10px] opacity-40 uppercase font-bold mt-1 tracking-wide text-(--text-muted)">Historical neural shard acquisition logs</p>
                            </div>
                            <ShieldCheck size={20} className="text-(--accent-teal) opacity-50" />
                        </div>

                        <div className="space-y-4">
                            {mockInvoices.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-6 rounded-3xl bg-(--bg-dark)/40 border border-(--border-color) hover:border-[var(--accent-teal)]/30 transition-all group">
                                    <div className="flex gap-6 items-center">
                                        <div className="p-3 bg-(--bg-card) border border-(--border-color) rounded-2xl">
                                            <Download size={16} className="text-(--text-muted) group-hover:text-(--accent-teal) transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black tracking-widest text-(--text-main)">{inv.id}</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase text-(--text-muted)">{inv.date} • {inv.method}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <p className="text-[11px] font-black text-(--accent-teal)">{inv.amount}</p>
                                        <button
                                            onClick={() => generateReceiptPDF(inv)}
                                            className="px-4 py-2 rounded-xl bg-(--bg-card) border border-(--border-color) text-[9px] font-black uppercase hover:bg-(--accent-teal) text-(--text-main) hover:text-(--bg-dark) transition-all shadow-sm"
                                        >
                                            Extract PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* --- MODAL SYSTEM --- */}
            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={() => setActiveModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className={`bg-(--bg-card) border border-white/10 w-full rounded-[48px] relative shadow-2xl flex flex-col p-10 max-w-md overflow-hidden`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setActiveModal(null)}
                                className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {/* Premium Status Modal */}
                            {activeModal === 'premium-status' && (
                                <div className="space-y-8 flex flex-col items-center">
                                    <div className="p-8 bg-white/5 rounded-[40px] text-(--accent-yellow) relative group overflow-hidden border border-(--accent-yellow)/20">
                                        <Crown size={64} className="drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] relative z-10" />
                                        <div className="absolute inset-0 bg-(--accent-yellow)/5 blur-3xl rounded-full" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                                            {isPremiumUser ? "Ascendant Soul" : "Sprout Guardian"}
                                        </h2>
                                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">
                                            {isPremiumUser ? "Eternal Garden Access Active" : "Unlock the full potential of your sanctuary"}
                                        </p>
                                    </div>

                                    <div className="w-full space-y-4">
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-(--accent-teal)">
                                                <div className="w-1.5 h-1.5 rounded-full bg-(--accent-teal)" />
                                                Infinite Knowledge Shards
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-(--accent-teal)">
                                                <div className="w-1.5 h-1.5 rounded-full bg-(--accent-teal)" />
                                                Priority Forge Pipelines
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-(--accent-teal)">
                                                <div className="w-1.5 h-1.5 rounded-full bg-(--accent-teal)" />
                                                Elite Chum Wardrobe
                                            </div>
                                        </div>

                                        {!isPremiumUser ? (
                                            <button
                                                onClick={() => setActiveModal('ph-payment')}
                                                className="w-full py-6 bg-white text-black rounded-[32px] text-xs font-black uppercase hover:bg-(--accent-teal) transition-all shadow-2xl active:scale-95"
                                            >
                                                Tend the Garden (₱99)
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => generateReceiptPDF(mockInvoices[0])}
                                                    className="w-full py-5 bg-(--accent-teal)/10 text-(--accent-teal) border border-(--accent-teal)/20 rounded-[32px] text-[10px] font-black uppercase hover:bg-(--accent-teal)/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Download size={14} /> Extract Logbook
                                                </button>
                                                <p className="text-[9px] font-bold opacity-30 text-center uppercase">Member since {mockInvoices[0]?.date || 'the beginning'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Identity Config */}
                            {activeModal === 'identity' && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                                            {useThematicUI ? "Identity Shards" : "Profile Details"}
                                        </h2>
                                        <div className="px-3 py-1 bg-(--accent-teal)/10 border border-(--accent-teal)/20 rounded-full text-[8px] font-black text-(--accent-teal) uppercase tracking-widest">Protocol V2.1</div>
                                    </div>
                                    
                                    <div className="p-4 rounded-2xl bg-(--bg-dark)/50 border border-white/5 space-y-2">
                                        <div className="text-[10px] font-black uppercase text-(--text-muted) tracking-widest mb-2 flex items-center gap-2">
                                            <span className="inline-block w-1 h-1 rounded-full bg-(--accent-yellow)" /> Naming Conventions
                                        </div>
                                        <ul className="space-y-1">
                                            <li className="text-[9px] font-bold text-(--text-muted)/60 flex justify-between">
                                                <span>Minimum Length</span>
                                                <span className="text-(--text-main)">3 Characters</span>
                                            </li>
                                            <li className="text-[9px] font-bold text-(--text-muted)/60 flex justify-between">
                                                <span>Maximum Length</span>
                                                <span className="text-(--text-main)">20 Characters</span>
                                            </li>
                                            <li className="text-[9px] font-bold text-(--text-muted)/60 flex justify-between">
                                                <span>Allowed Glyphs</span>
                                                <span className="text-(--text-main)">Alphanumeric & Spaces</span>
                                            </li>
                                            <li className="text-[9px] font-bold text-(--accent-yellow)/60 flex justify-between pt-1 border-t border-white/5 mt-1">
                                                <span>Cooldown (Display Name)</span>
                                                <span className="text-(--accent-yellow)">14 Days</span>
                                            </li>
                                            <li className="text-[9px] font-bold text-(--accent-yellow)/60 flex justify-between">
                                                <span>Cooldown (Full Name)</span>
                                                <span className="text-(--accent-yellow)">30 Days</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase opacity-30 ml-3">First Name</label>
                                                <input maxLength={20} value={formData.newFirstName} onChange={e => setFormData({ ...formData, newFirstName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal) font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase opacity-30 ml-3">Last Name</label>
                                                <input maxLength={20} value={formData.newLastName} onChange={e => setFormData({ ...formData, newLastName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal) font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase opacity-30 ml-3">Display Label</label>
                                            <input maxLength={20} value={formData.newDisplayName} onChange={e => setFormData({ ...formData, newDisplayName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal) font-bold" />
                                        </div>
                                        <div className="pt-2">
                                            <button onClick={commitIdentity} disabled={loading} className="w-full py-5 bg-(--accent-teal) text-black rounded-[24px] text-[11px] font-black uppercase shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                                {loading ? "SYNCHRONIZING..." : "SYNCHRONIZE SHARDS"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Verification OTP Modal */}
                            {activeModal === 'verify-otp' && (
                                <div className="space-y-8 py-4">
                                    <div className="text-center space-y-2">
                                        <Fingerprint size={48} className="mx-auto text-(--accent-teal) animate-pulse" />
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                                            {useThematicUI ? "Neural Verification" : "Email Verification"}
                                        </h2>
                                        <p className="text-[10px] font-bold opacity-30 uppercase">
                                            {useThematicUI ? "Enter the 6-digit sync code sent to your relay." : "Enter the 6-digit code sent to your email."}
                                        </p>
                                    </div>
                                    <div className="space-y-6">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={otp}
                                            autoComplete="off"
                                            inputMode="numeric"
                                            onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full bg-white/5 border border-white/10 rounded-[32px] p-8 text-4xl text-center font-bold tracking-[0.5em] outline-none focus:border-teal-400 text-teal-400"
                                        />
                                        <button onClick={handleVerifyOTP} disabled={loading} className="w-full py-5 bg-(--accent-teal) text-black rounded-[24px] text-[11px] font-black uppercase shadow-[0_0_30px_-5px_rgba(45,212,191,0.5)]">
                                            {loading ? "Synchronizing..." : "FINAL VERIFICATION"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Universal QR Ph Modal */}
                            {activeModal === 'ph-payment' && (
                                <div className="space-y-8 flex flex-col h-full overflow-hidden">
                                    <div className="text-center space-y-1">
                                        <Fingerprint size={40} className="mx-auto text-(--accent-teal)" />
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none pt-2">Neural Unlock Terminal</h2>
                                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Manual Private Key Relay</p>
                                    </div>

                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button
                                            onClick={() => setCheckoutMethod('qrph')}
                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${checkoutMethod === 'qrph' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            GCash
                                        </button>
                                        <button
                                            onClick={() => setCheckoutMethod('card')}
                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${checkoutMethod === 'card' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Neural Card
                                        </button>
                                        <button
                                            onClick={() => setCheckoutMethod('manual')}
                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${checkoutMethod === 'manual' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Shard Key
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                                        {checkoutMethod === 'qrph' ? (
                                            <div className="space-y-6">
                                                <div className="bg-white p-6 rounded-[32px] flex items-center justify-center relative group">
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`qrph://studybuddy.heritage/pay?amount=99&userId=${displayName}`)}`}
                                                        className="w-48 h-48 group-hover:scale-105 transition-transform"
                                                        alt="Universal QR Ph"
                                                    />
                                                    <div className="absolute inset-0 bg-(--accent-teal)/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                </div>
                                                <div className="flex items-center justify-center gap-4">
                                                    <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase">Verified GCash</div>
                                                    <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase">InstaPay Sync</div>
                                                </div>
                                                <p className="text-[9px] font-bold opacity-30 text-center uppercase tracking-widest px-8">Scan to trigger neural relay upgrade. System will auto-verify on completion.</p>
                                            </div>
                                        ) : checkoutMethod === 'card' ? (
                                            <div className="space-y-6">
                                                <div className="bg-linear-to-br from-zinc-700 to-black p-8 rounded-[48px] border border-white/20 shadow-2xl relative overflow-hidden group">
                                                    <div className="flex justify-between items-start mb-12">
                                                        <Fingerprint size={32} className="text-(--accent-teal)" />
                                                        <p className="text-[8px] font-black opacity-30 tracking-widest uppercase">Secured Neural Link</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xl font-black tracking-[0.2em]">{cardData.number}</p>
                                                        <div className="flex justify-between items-end">
                                                            <p className="text-[10px] uppercase font-bold text-white/40">{cardData.name}</p>
                                                            <p className="text-[10px] uppercase font-bold text-white/40">{cardData.expiry}</p>
                                                        </div>
                                                    </div>
                                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-(--accent-teal)/10 blur-3xl rounded-full group-hover:bg-(--accent-teal)/20 transition-all" />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black uppercase opacity-30 ml-3">CVV</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showCardCvv ? "text" : "password"}
                                                                maxLength={3}
                                                                value={cardData.cvv}
                                                                onChange={e => setCardData({ ...cardData, cvv: e.target.value })}
                                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-10 text-xs outline-none focus:border-(--accent-teal)"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowCardCvv(!showCardCvv)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                                            >
                                                                {showCardCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] flex flex-col items-center justify-center relative group">
                                                    <ShieldAlert size={48} className="text-white opacity-20 group-hover:opacity-40 transition-opacity" />
                                                    <p className="text-[9px] font-bold opacity-30 mt-4 text-center max-w-[200px]">ENTER YOUR PRIVATE EXPO CIPHER KEY TO SYNC NEURAL ASSETS.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black uppercase opacity-30 ml-3">Private Neural Cipher</label>
                                                        <input
                                                            placeholder="EXPO-XXXX-XXXX"
                                                            value={refNumber}
                                                            onChange={e => setRefNumber(e.target.value)}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm uppercase font-bold outline-none focus:border-(--accent-teal) text-center tracking-widest"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <button onClick={handleUniversalPayment} disabled={loading} className="w-full py-5 bg-white text-black rounded-[24px] text-[11px] font-black uppercase shadow-xl hover:bg-(--accent-teal) transition-all">
                                            {loading ? "Decrypting Sync Stream..." : (checkoutMethod === 'manual' ? "SYNCHRONIZE CIPHER" : "VERIFY TRANSACTION")}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Email Modal */}
                            {activeModal === 'email' && (
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Relay Coordinate</h2>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase opacity-30 ml-3">Current Relay</label>
                                            <input disabled value={userEmail} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none opacity-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase opacity-30 ml-3">New Relay Coordinate</label>
                                            <input value={formData.newEmail} onChange={e => setFormData({ ...formData, newEmail: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                        </div>
                                        <button onClick={() => handleSendOTP('email')} className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase transition-all">MIGRATE COORDINATE</button>
                                    </div>
                                </div>
                            )}

                            {/* Change Password Modal */}
                            {activeModal === 'password' && (
                                <div className="space-y-8 animate-in fade-in zoom-in duration-200">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                                            {recoveryStep === 'request' ? (useThematicUI ? "Cipher Update" : "Change Password") : (useThematicUI ? "Verify Relay" : "Enter Code")}
                                        </h2>
                                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                                            {recoveryStep === 'request'
                                                ? (useThematicUI ? "Secure your neural connection" : "Update your account password")
                                                : (useThematicUI ? "Check your terminal for a code" : "Check your email for a code")}
                                        </p>
                                    </div>

                                    {recoveryStep === 'request' ? (
                                        <div className="space-y-4">
                                            {/* Current Password Input - Hidden if Identity is Verified via Relay */}
                                            {formData.currentPassword !== "RECOVERY_BYPASS" ? (
                                                <div className="relative">
                                                    <label className="text-[8px] font-black uppercase opacity-30 ml-3 mb-1 block">Current Cipher</label>
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        value={formData.currentPassword}
                                                        onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-12 text-sm outline-none focus:border-(--accent-teal) transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-4 bottom-5 text-white/40 hover:text-(--accent-teal)"
                                                    >
                                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-4 border border-(--accent-teal)/30 bg-(--accent-teal)/5 rounded-2xl border-dashed">
                                                    <p className="text-[10px] text-(--accent-teal) font-black uppercase tracking-[0.2em] text-center">
                                                        Neural Identity Verified: Bypass Active
                                                    </p>
                                                </div>
                                            )}

                                            {/* New Password Input */}
                                            <div className="relative">
                                                <label className="text-[8px] font-black uppercase opacity-30 ml-3 mb-1 block">New Neural Cipher</label>
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={formData.newPassword}
                                                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                                    onFocus={() => setIsNewPasswordFocused(true)}
                                                    onBlur={() => setIsNewPasswordFocused(false)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-12 text-sm outline-none focus:border-(--accent-teal) transition-all"
                                                />
                                                <PasswordValidator password={formData.newPassword} isVisible={isNewPasswordFocused} />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-4 bottom-5 text-white/40 hover:text-(--accent-teal)"
                                                >
                                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-4 pt-2">
                                                {formData.currentPassword !== "RECOVERY_BYPASS" && (
                                                    <button
                                                        onClick={() => handleForgotPassword(userEmail)}
                                                        disabled={loading}
                                                        className="text-[9px] font-black uppercase tracking-widest text-(--accent-teal) hover:underline text-left ml-2 disabled:opacity-30"
                                                    >
                                                        Lost your password? Recover via email
                                                    </button>
                                                )}

                                                <button
                                                    onClick={handlePasswordChange}
                                                    disabled={loading || !formData.newPassword}
                                                    className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase hover:bg-(--accent-teal) transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                                                >
                                                    {loading ? "Updating..." : "UPDATE PASSWORD"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* OTP Verification Input */}
                                            <div className="relative">
                                                <label className="text-[8px] font-black uppercase opacity-30 text-center mb-3 block">Enter 6-Digit Sync Code</label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-white/5 border border-(--accent-teal) rounded-2xl p-6 text-center text-3xl tracking-[0.5em] font-black outline-none shadow-[0_0_30px_-10px_rgba(45,212,191,0.4)]"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={async () => {
                                                        // verify-email function call
                                                        const { data, error } = await supabase.functions.invoke('secure-verify-relay', {
                                                            body: { code: verificationCode, userId: (await supabase.auth.getUser()).data.user?.id }
                                                        });

                                                        if (data?.success) {
                                                            setRecoveryStep('request');
                                                            setFormData({ ...formData, currentPassword: "RECOVERY_BYPASS" });
                                                            triggerChumToast("Identity verified. Enter new cipher.", "success");
                                                        } else {
                                                            triggerChumToast(error?.message || "Invalid relay code.", "warning");
                                                        }
                                                    }}
                                                    className="w-full py-5 bg-(--accent-teal) text-black rounded-2xl text-[11px] font-black uppercase hover:brightness-110 transition-all shadow-lg shadow-(--accent-teal)/20"
                                                >
                                                    Verify Identity
                                                </button>
                                                <button
                                                    onClick={() => setRecoveryStep('request')}
                                                    className="text-[9px] font-black opacity-40 uppercase text-center tracking-widest hover:opacity-100 transition-opacity"
                                                >
                                                    Cancel Recovery
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Delete Modal */}
                            {activeModal === 'delete' && (
                                <div className="space-y-8 text-center py-4">
                                    <Trash2 size={48} className="mx-auto text-red-500" />
                                    <h2 className="text-2xl font-black uppercase italic">
                                        {useThematicUI ? "Lay to Rest?" : "Delete Account?"}
                                    </h2>
                                    <p className="text-[10px] uppercase font-bold opacity-30">
                                        {useThematicUI
                                            ? "This garden will be forgotten forever. All memory shards will be lost. Enter your password to proceed."
                                            : "This action is permanent and cannot be undone. Enter your password to proceed."}
                                    </p>

                                    {deletionCountdown === null ? (
                                        <>
                                            <div className="relative">
                                                <input
                                                    type={showPurgePassword ? "text" : "password"}
                                                    placeholder="Password"
                                                    value={formData.purgePassword}
                                                    onChange={e => setFormData({ ...formData, purgePassword: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-12 text-sm outline-none focus:border-red-500 text-center"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPurgePassword(!showPurgePassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                                >
                                                    {showPurgePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-white/5 rounded-2xl text-[11px] font-black uppercase">Stay awhile</button>
                                                <button onClick={startDeleteCountdown} className="flex-1 py-5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] border border-red-500/50">Rest now</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="text-5xl font-black text-red-500 animate-pulse">{deletionCountdown}</div>
                                            <p className="text-xs font-bold text-white/50 italic">Preparing the final rest pulse...</p>
                                            <button onClick={cancelDeletion} disabled={isDeleting} className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase">Hold on, let me stay!</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
