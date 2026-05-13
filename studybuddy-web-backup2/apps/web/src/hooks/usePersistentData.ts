/**
 * Enhanced Canvas Integration Layer
 * Integrates data persistence, chum customization, and task auto-loading into the canvas
 */

import { useEffect } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import {
  saveProfileData,
  getProfileData,
  saveAvatarUrl,
  getAvatarUrl,
  saveChumWardrobe,
  getChumWardrobe,
  saveTasks,
  migrateUserData,
  setCurrentUser,
} from "@/lib/dataPersistence";

/**
 * Hook to sync user data with localStorage on every change
 */
export const usePersistentUserData = (userId: string | undefined) => {
  const {
    displayName,
    fullName,
    userEmail,
    isVerified,
    avatarUrl,
    activeCrystalTheme,
    activeAtmosphereFilter,
    activeAppTheme,
    activeAccessories,
    activeBaseColor,
    tasks,
  } = useStudyStore();

  useEffect(() => {
    if (!userId) return;

    // Save profile
    saveProfileData(userId, {
      displayName,
      fullName,
      email: userEmail,
      isVerified,
    });

    // Save avatar
    if (avatarUrl) {
      saveAvatarUrl(userId, avatarUrl);
    }

    // Save chum wardrobe (including all customization options)
    saveChumWardrobe(userId, {
      activeCrystalTheme: activeCrystalTheme || "default",
      activeAtmosphereFilter: activeAtmosphereFilter || "default",
      activeAccessories: activeAccessories || [],
      activeAppTheme: activeAppTheme || "deep-teal",
      activeBaseColor: activeBaseColor || "base7",
    });

    // Save tasks
    saveTasks(userId, tasks);

    // Set as current user
    setCurrentUser(userId);
  }, [userId, displayName, fullName, userEmail, isVerified, avatarUrl, activeCrystalTheme, activeAtmosphereFilter, activeAppTheme, activeAccessories, activeBaseColor, tasks]);
};

/**
 * Hook to restore user data from localStorage on app init
 */
export const useRestorePersistentData = (userId: string | undefined) => {
  const {
    setDisplayName,
    setFullName,
    setAvatarUrl,
    setActiveCrystalTheme,
    setActiveAtmosphereFilter,
    setActiveAppTheme,
    setActiveAccessories,
    setActiveBaseColor,
  } = useStudyStore();

  useEffect(() => {
    if (!userId) return;

    // Restore profile
    const profile = getProfileData(userId);
    if (profile) {
      if (profile.displayName) setDisplayName(profile.displayName);
      if (profile.fullName) setFullName(profile.fullName);
    }

    // Restore avatar
    const avatar = getAvatarUrl(userId);
    if (avatar) {
      setAvatarUrl(avatar);
    }

    // Restore chum wardrobe (including all customizations)
    const wardrobe = getChumWardrobe(userId);
    if (wardrobe) {
      if (wardrobe.activeCrystalTheme) {
        setActiveCrystalTheme(wardrobe.activeCrystalTheme);
      }
      if (wardrobe.activeAtmosphereFilter) {
        setActiveAtmosphereFilter(wardrobe.activeAtmosphereFilter as 'default' | 'dark' | 'refreshing' | 'cool');
      }
      if (wardrobe.activeAccessories && wardrobe.activeAccessories.length > 0) {
        setActiveAccessories(wardrobe.activeAccessories);
      }
      if (wardrobe.activeAppTheme) {
        setActiveAppTheme(wardrobe.activeAppTheme);
      }
      if (wardrobe.activeBaseColor) {
        setActiveBaseColor(wardrobe.activeBaseColor);
      }
    }
  }, [userId, setDisplayName, setFullName, setAvatarUrl, setActiveCrystalTheme, setActiveAtmosphereFilter, setActiveAppTheme, setActiveAccessories, setActiveBaseColor]);
};

/**
 * Hook to handle account switching and data migration
 */
export const useAccountMigration = (oldUserId: string | undefined, newUserId: string | undefined) => {
  useEffect(() => {
    if (oldUserId && newUserId && oldUserId !== newUserId) {
      migrateUserData(oldUserId, newUserId);
    }
  }, [oldUserId, newUserId]);
};

/**
 * Hook to handle logout and data cleanup
 */
export const useLogoutCleanup = (userId: string | undefined) => {
  const handleLogout = () => {
    if (userId) {
      // Optionally keep data (for unverified users to retain progress)
      // clearUserData(userId);
    }
    setCurrentUser("");
  };

  return { handleLogout };
};
