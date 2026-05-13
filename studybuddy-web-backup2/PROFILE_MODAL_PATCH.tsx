
// 🔧 PATCH: Add this to ProfileModal.tsx to include avatar choice toggle
// This code should be added inside the tab content area, replacing the Chum Form tab content

const ChumFormContent = () => {
    const { useChumAvatar, setUseChumAvatar, triggerChumToast, avatarUrl } = useStudyStore();

    const handleUseChum = async () => {
        await setUseChumAvatar(true);
        triggerChumToast("Now displaying your Chum form in all spaces.", "success");
    };

    return (
        <motion.div 
            key="chum-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col items-center gap-6"
        >
            <div className="w-32 h-32 rounded-full border-4 border-[var(--accent-teal)]/20 p-4 bg-[var(--bg-dark)] flex items-center justify-center relative group">
                <ChumRenderer size="w-20 h-20" />
                {useChumAvatar && (
                    <div className="absolute -top-2 -right-2 bg-[var(--accent-teal)] text-black p-1.5 rounded-full shadow-lg">
                        <Check size={14} strokeWidth={4} />
                    </div>
                )}
            </div>
            
            <div className="text-center">
                <h4 className="text-sm font-black text-[var(--text-main)] mb-2">Your Chum Form</h4>
                <p className="text-[10px] text-[var(--text-muted)] mb-4">Displayed in the Lantern Network and all shared spaces</p>
                <button
                    onClick={handleUseChum}
                    disabled={useChumAvatar}
                    className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                        useChumAvatar
                            ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)] text-[var(--accent-teal)]'
                            : 'bg-[var(--accent-teal)] text-black hover:brightness-110'
                    }`}
                    title={useChumAvatar ? 'Already using your Chum form' : 'Switch to Chum form'}
                >
                    {useChumAvatar ? '✓ Using Chum Form' : 'Use Chum Form'}
                </button>
            </div>

            {avatarUrl && (
                <div className="text-[10px] text-[var(--text-muted)] text-center p-3 bg-[var(--bg-dark)]/50 rounded-xl border border-[var(--border-color)]">
                    💡 You have a custom profile picture saved. Switch to it under the "Custom Shard" tab to display it instead.
                </div>
            )}
        </motion.div>
    );
};

// Add this to the Custom Form content:
const handleUsePicture = async () => {
    await setUseChumAvatar(false);
    triggerChumToast("Now displaying your custom picture in all spaces.", "success");
};

// Add button to custom tab:
{useChumAvatar === false && (
    <div className="absolute -top-2 -right-2 bg-[var(--accent-teal)] text-black p-1.5 rounded-full shadow-lg">
        <Check size={14} strokeWidth={4} />
    </div>
)}

// And add this button in the custom tab content:
<button
    onClick={handleUsePicture}
    disabled={useChumAvatar === false}
    className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
        useChumAvatar === false
            ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)] text-[var(--accent-teal)]'
            : 'bg-[var(--accent-teal)] text-black hover:brightness-110'
    }`}
>
    {useChumAvatar === false ? '✓ Using Custom Picture' : 'Use Custom Picture'}
</button>
