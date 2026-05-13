# 🔧 StudyBuddy Bug Fixes & Polish Implementation Guide
## April 24, 2026

### Priority Order (By Impact)

---

## 1️⃣ CRITICAL: Chum Avatar Sync + Avatar Toggle

**Status**: ✅ Database migration created  
**Remaining**: ProfileModal UI + Rendering logic

### Steps:
1. ✅ Migration file created: `20260424_add_chum_base_color.sql`
2. ✅ Store state added: `useChumAvatar` boolean + `setUseChumAvatar` setter
3. ✅ Wardrobe sync updated to include `use_chum_avatar` field

### TODO:
**File**: `apps/web/src/components/ProfileModal.tsx`
- Add toggle UI for "Use Chum Form" vs "Use Custom Picture"
- Reference: `PROFILE_MODAL_PATCH.tsx` in root

**File**: `apps/web/src/components/CanvasPresenceSidebar.tsx` (line 80+)
```tsx
// Update rendering logic to respect useChumAvatar flag
{user.avatarUrl && get().useChumAvatar === false ? (
    <img src={user.avatarUrl} ... />
) : user.chumBaseColor ? (
    <ChumRenderer ... />
) : (
    <div>...</div>
)}
```

**File**: `apps/web/src/app/lantern/page.tsx` (line 100+)
- Add `useChumAvatar` field to LanternUser interface
- Update presence sync to send this flag
- Update rendering to check this flag before displaying avatar

---

## 2️⃣ HIGH: Tutorial Morning Planning Modal

**Location**: `apps/web/src/components/TutorialIntro.tsx`

### Add New Step:
```tsx
// Around line 180, add this step before "Incomplete Tasks" step
{
    title: "Frame Your Day",
    message: "Choose your task prioritization method: 1-3-5 (1 big, 3 medium, 5 small), Eisenhower Matrix (by importance/urgency), or Ivy Lee Method (top 6 tasks). Pick what works for you.",
    icon: <Sun className="text-yellow-300" size={24} />,
    path: "/garden",
    selector: "#framework-dropdown-selector",
    skipIfMissing: true,
}
```

### Show Morning Planning Modal:
Add before the step:
```tsx
const shouldShowMorningPlanning = () => {
    const lastPlanned = localStorage.getItem('lastPlannedDate');
    const today = new Date().toDateString();
    const hasFramework = get().activeFramework !== null;
    return lastPlanned !== today && !hasFramework;
};
```

---

## 3️⃣ HIGH: Crystal Size by Growth %

**Location**: Where crystals are rendered (likely 3D scene or CSS)

### Implementation:
```tsx
const getCrystalScale = (growthPercent: number): number => {
  const minScale = 0.2;  // 1% → 20% size
  const maxScale = 1.0;   // 100% → 100% size
  const percentage = Math.min(Math.max(growthPercent, 0), 100);
  return minScale + (percentage / 100) * (maxScale - minScale);
};

// Usage:
<div style={{ transform: `scale(${getCrystalScale(crystalGrowth)})` }} />
```

---

## 4️⃣ MEDIUM: Wardrobe Reset Button

**Location**: `apps/web/src/app/wardrobe/page.tsx`

Add near other buttons (line ~340):
```tsx
<button 
    onClick={handleResetToDefault}
    className="p-3 rounded-xl border border-[var(--border-color)] text-[10px] font-black 
               uppercase tracking-widest hover:bg-[var(--bg-sidebar)] transition-all"
    title="Reset all customizations to defaults"
>
    <RotateCcw size={14} className="mr-2" /> Reset to Defaults
</button>
```

Handler:
```tsx
const handleResetToDefault = async () => {
    if (!confirm('Reset all customizations?')) return;
    setActiveBaseColor('base14');
    setActiveCrystalTheme('quartz');
    setActiveAtmosphereFilter('default');
    setActiveAccessories([]);
    await get().syncWardrobe();
};
```

---

## 5️⃣ MEDIUM: Add Tooltips

**Location**: `apps/web/src/components/Tooltip.tsx` (new file)

```tsx
export const Tooltip = ({ text, children }) => (
    <div className="group relative">
        {children}
        <div className="hidden group-hover:block absolute bottom-full left-1/2 
            -translate-x-1/2 mb-2 z-50 bg-[var(--bg-dark)] border 
            border-[var(--border-color)] rounded px-2 py-1 text-[10px]">
            {text}
        </div>
    </div>
);
```

Apply to:
- Wardrobe base colors: "Choose your chum's primary appearance color"
- App themes: "Switch between different interface styles"
- Framework dropdown: "Select a task prioritization method"
- ProfileModal tabs: "Your Chum appears in shared spaces" / "Custom photo"

---

## 6️⃣ MEDIUM: Tutorial X Button Confirmation

**Location**: `apps/web/src/components/TutorialIntro.tsx` (line ~200)

Replace X button with:
```tsx
const [showSkipConfirm, setShowSkipConfirm] = useState(false);

{showSkipConfirm ? (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-xs">
            <h3 className="font-black mb-2">Skip Tutorial?</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
                You can revisit it from settings.
            </p>
            <div className="flex gap-3">
                <button onClick={() => setShowSkipConfirm(false)}>Continue</button>
                <button onClick={() => { 
                    setCompletedTutorial(true);
                    setShowSkipConfirm(false);
                }}>Skip</button>
            </div>
        </div>
    </div>
) : (
    <button onClick={() => setShowSkipConfirm(true)}>
        <X size={20} />
    </button>
)}
```

---

## 7️⃣ MEDIUM: Skeleton UI for Networked Lists

**Location**: `apps/web/src/components/SkeletonLoaders.tsx` (new file)

```tsx
export const ListSkeleton = () => (
    <div className="space-y-2">
        {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-sidebar)]/30 
                rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-sidebar)]/50" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-sidebar)]/50 rounded w-32" />
                    <div className="h-3 bg-[var(--bg-sidebar)]/30 rounded w-20" />
                </div>
            </div>
        ))}
    </div>
);
```

Apply to:
- Lantern Network (isNetworkLoading)
- Friends list (isFriendsLoading)
- Leaderboard (isLeaderboardLoading)
- Presence sidebar (isLoadingParticipants)

---

## 8️⃣ LOW: Accessibility Improvements

**Global improvements**:
1. Add `role="dialog"` to all modals
2. Add `aria-modal="true"` to modal backdrops
3. Add `aria-label` to icon buttons
4. Implement focus trap in modals (Escape to close)
5. Add `role="tablist"` to tab containers
6. Add keyboard navigation (Tab, Shift+Tab)

**Example**:
```tsx
<div 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="modal-title"
    onKeyDown={(e) => e.key === 'Escape' && closeModal()}
>
    <h2 id="modal-title">...</h2>
</div>
```

---

## 9️⃣ LOW: Last Online Indicator

**Location**: `apps/web/src/app/lantern/page.tsx` (LanternUser display)

```tsx
const getLastOnlineText = (lastSeen: string): string => {
    const diff = Math.floor((new Date().getTime() - new Date(lastSeen).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// Add to presence tracking:
await channel.track({
    name: userName,
    lastSeenAt: new Date().toISOString(),
    // ...other fields
});

// Display:
<span className="text-[10px] text-[var(--text-muted)]">
    {getLastOnlineText(user.lastSeenAt)}
</span>
```

---

## 🔟 LOW: Image Optimization

**For base chums and accessories**:

1. Convert to WebP format
2. Create picture elements with fallbacks:
```tsx
<picture>
    <source srcSet="/assets/chum/base1.webp" type="image/webp" />
    <img src="/assets/chum/base1.png" alt="Chum base" loading="lazy" />
</picture>
```

3. Add `loading="lazy"` to all accessory images
4. Use Next.js Image component where possible:
```tsx
<Image 
    src="/assets/chum/base1.png" 
    alt="Chum" 
    width={256} 
    height={256}
    priority={false}
/>
```

---

## 📋 Implementation Checklist

- [ ] PR #1: Database migrations + store state
- [ ] PR #2: ProfileModal avatar toggle + presence sync
- [ ] PR #3: Tutorial morning planning step
- [ ] PR #4: Crystal scaling by growth %
- [ ] PR #5: Wardrobe reset button + tooltips
- [ ] PR #6: Tutorial skip confirmation
- [ ] PR #7: Skeleton UI components
- [ ] PR #8: Accessibility improvements
- [ ] PR #9: Last online indicators
- [ ] PR #10: Image optimization

---

## 🧪 Testing Checklist

- [ ] Switch between Chum and Custom avatar → Appears in Lantern/presence
- [ ] Morning modal shows only when no framework chosen today
- [ ] Crystal scales from 1% (tiny) to 100% (full size)
- [ ] Wardrobe reset works and syncs to DB
- [ ] Tooltips appear on hover with accessibility
- [ ] Tutorial X button shows confirmation modal
- [ ] Skeletons show while lists load
- [ ] Tab navigation works in all modals
- [ ] Last online updates every 30s
- [ ] WebP images load, PNG fallbacks work

---

## 📦 Files Created

- ✅ `supabase/migrations/20260424_add_chum_base_color.sql`
- 📝 `PROFILE_MODAL_PATCH.tsx` - Reference implementation
- 📝 `COMPREHENSIVE_FIXES.ts` - All code snippets
- 📝 `IMPLEMENTATION_GUIDE.md` - This file

---

**Estimated Effort**: 4-5 hours for complete implementation  
**Priority**: Fix 1-4 first, polish 5-10 as time permits
