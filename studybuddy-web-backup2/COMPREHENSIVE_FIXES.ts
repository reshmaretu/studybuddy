/**
 * 🔧 COMPREHENSIVE FIXES & POLISH PATCHES
 * Apply these changes to implement all remaining features
 */

// ========== 1. CRYSTAL SIZING BY GROWTH % ==========
// Add this to CrystalGarden or wherever crystals are rendered
export const getCrystalScale = (growthPercent: number): number => {
  // At 1%, crystal is 20% of full size
  // At 100%, crystal is 100% of full size
  const minScale = 0.2; // 1% growth = 20% size
  const maxScale = 1.0;  // 100% growth = 100% size
  
  const percentage = Math.min(Math.max(growthPercent, 0), 100);
  return minScale + (percentage / 100) * (maxScale - minScale);
};

// Usage in THREE.js or any crystal renderer:
// const scale = getCrystalScale(crystalGrowth);
// crystalMesh.scale.set(scale, scale, scale);
// OR for CSS:
// <div style={{ transform: `scale(${getCrystalScale(crystalGrowth)})` }} />


// ========== 2. TUTORIAL MORNING PLANNING MODAL STEP ==========
// Add this to STEPS array in TutorialIntro.tsx

const MORNING_PLANNING_STEP = {
    title: "Frame Your Day",
    message: "Choose a prioritization framework: The 1-3-5 Method plans 1 big task, 3 medium, 5 small. The Eisenhower Matrix sorts by urgency/importance. The Ivy Lee Method focuses on top 6 tasks.",
    icon: <Sun className="text-yellow-300" size={24} />,
    path: "/garden",
    selector: "#framework-dropdown-selector",
    skipIfMissing: true,
    condition: () => {
        // Only show if user hasn't planned today
        const lastPlanned = localStorage.getItem('lastPlannedDate');
        const today = new Date().toDateString();
        return lastPlanned !== today;
    }
};

// Add before the incomplete tasks step


// ========== 3. WARDROBE RESET TO DEFAULT BUTTON ==========
// Add to wardrobe page

const handleResetToDefault = async () => {
    if (!confirm('Reset all customizations to defaults?')) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Reset to defaults
        setActiveBaseColor('base14');
        setActiveCrystalTheme('quartz');
        setActiveAtmosphereFilter('default');
        setActiveAppTheme('deep-teal');
        setActiveAccessories([]);
        
        // Sync to DB
        await supabase.from('chum_wardrobe').upsert({
            user_id: user.id,
            active_chum_base_color: 'base14',
            active_crystal_theme: 'quartz',
            active_atmosphere_filter: 'default',
            active_app_theme: 'deep-teal',
            active_accessories: []
        }, { onConflict: 'user_id' });
        
        triggerChumToast('Reset to sanctuary defaults.', 'success');
    } catch (err) {
        triggerChumToast('Reset failed.', 'error');
    }
};

// Add button in wardrobe UI:
// <button onClick={handleResetToDefault} className="...">
//     <RotateCcw size={14} /> Reset to Defaults
// </button>


// ========== 4. ACCESSIBILITY IMPROVEMENTS ==========
// Add to ProfileModal and Wardrobe components

const accessibilityProps = {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "modal-title",
    tabIndex: -1,
    onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
        if (e.key === 'Tab') handleTabFocus(e);
    }
};

// Focus trap implementation
const useFocusTrap = (ref: React.RefObject<HTMLDivElement>) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const focusableElements = ref.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements?.length) return;
            
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };
        
        ref.current?.addEventListener('keydown', handleKeyDown);
        return () => ref.current?.removeEventListener('keydown', handleKeyDown);
    }, [ref]);
};


// ========== 5. SKELETON LOADING COMPONENTS ==========

export const SkeletonLoader: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
        {Array(count).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse bg-[var(--bg-sidebar)]/50 rounded-xl h-12" />
        ))}
    </div>
);

export const ListSkeleton = () => (
    <div className="space-y-2">
        {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-sidebar)]/50" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-sidebar)]/50 rounded w-24" />
                    <div className="h-3 bg-[var(--bg-sidebar)]/30 rounded w-16" />
                </div>
            </div>
        ))}
    </div>
);

// Usage:
// {isLoading ? <ListSkeleton /> : <YourList />}


// ========== 6. TUTORIAL SKIP WITH CONFIRMATION ==========
// Update TutorialIntro.tsx to add confirmation when clicking X

const [showSkipConfirm, setShowSkipConfirm] = useState(false);

const handleSkipTutorial = () => {
    setShowSkipConfirm(true);
};

const confirmSkip = () => {
    setCompletedTutorial(true);
    triggerChumToast('Tutorial marked complete. Revisit anytime from settings.', 'info');
};

// Replace the X button with:
{!showSkipConfirm && (
    <button onClick={handleSkipTutorial} className="...">
        <X size={20} />
    </button>
)}

{showSkipConfirm && (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4">
        <motion.div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-xs">
            <h3 className="font-black mb-2">Skip Tutorial?</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
                You can revisit it anytime from settings.
            </p>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowSkipConfirm(false)}
                    className="flex-1 py-2 rounded-xl border border-[var(--border-color)]"
                >
                    Continue
                </button>
                <button 
                    onClick={confirmSkip}
                    className="flex-1 py-2 rounded-xl bg-[var(--accent-teal)] text-black font-black"
                >
                    Skip
                </button>
            </div>
        </motion.div>
    </div>
)}


// ========== 7. IMAGE OPTIMIZATION ==========
// For base chum images and accessories

const OPTIMIZED_IMAGES = {
    // Use WebP with PNG fallback
    chum: {
        sources: [
            { srcSet: '/assets/chum/base1.webp', type: 'image/webp' },
            { srcSet: '/assets/chum/base1.png', type: 'image/png' }
        ]
    },
    accessories: {
        sources: [
            { srcSet: '/assets/accessories/clip1.webp', type: 'image/webp' },
            { srcSet: '/assets/accessories/clip1.png', type: 'image/png' }
        ]
    }
};

// Usage in components:
// <picture>
//     <source srcSet="/assets/chum/base1.webp" type="image/webp" />
//     <img src="/assets/chum/base1.png" alt="Chum" />
// </picture>

// Or with Next.js Image:
// <Image src="/assets/chum/base1.png" alt="Chum" fill priority />


// ========== 8. LAST ONLINE INDICATOR ==========
// Add to Lantern Network or friends list

const getLastOnlineText = (lastSeen: string): string => {
    const now = new Date();
    const then = new Date(lastSeen);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// Add to presence sync tracking:
// track({ lastSeenAt: new Date().toISOString() })

// Display in UI:
// <span className="text-[10px] text-[var(--text-muted)]">
//     {getLastOnlineText(user.lastSeenAt)}
// </span>


// ========== 9. TOOLTIP COMPONENT ==========
// Reusable tooltip for all UI

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    const [show, setShow] = useState(false);
    
    return (
        <div className="relative inline-block group">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block 
                z-50 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-3 py-2 
                text-[10px] text-[var(--text-muted)] whitespace-nowrap pointer-events-none">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 
                    border-transparent border-t-[var(--border-color)]"></div>
            </div>
        </div>
    );
};

// Usage:
// <Tooltip text="Choose your study method">
//     <button>Framework</button>
// </Tooltip>
