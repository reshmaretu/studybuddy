/**
 * Data Persistence & Migration Layer
 * Handles cross-browser data retention for profile, avatars, tasks, and chum customization
 * Supports both verified and unverified users
 */

import { Task } from "@/store/useStudyStore";
import { WardrobeAccessory } from "@studybuddy/api";

const STORAGE_KEYS = {
  PROFILE_DATA: "studybuddy_profile",
  AVATAR_URL: "studybuddy_avatar_url",
  CHUM_AVATAR: "studybuddy_chum_avatar",
  CHUM_WARDROBE: "studybuddy_chum_wardrobe",
  TASKS: "studybuddy_tasks",
  LAST_USER_ID: "studybuddy_last_user_id",
  VERIFIED_USERS: "studybuddy_verified_users",
};

// ─── Profile Data Structure ───
interface StoredProfileData {
  userId: string;
  displayName: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  timestamp: number;
}

// ─── Chum Wardrobe with Color Customization ───
interface StoredChumWardrobe {
  userId: string;
  baseEmoji: string;
  hatEmoji: string;
  activeAccessories: WardrobeAccessory[];
  activeCrystalTheme: string;
  activeAtmosphereFilter: string;
  activeAppTheme: string;
  activeBaseColor: string;
  timestamp: number;
}

/**
 * Save profile data to localStorage
 */
export const saveProfileData = (userId: string, data: Partial<StoredProfileData>) => {
  try {
    const existing = (getProfileData(userId) || {}) as Partial<StoredProfileData>;
    const updated: StoredProfileData = {
      userId,
      displayName: data.displayName || existing.displayName || "",
      fullName: data.fullName || existing.fullName || "",
      email: data.email || existing.email || "",
      isVerified: data.isVerified ?? existing.isVerified ?? false,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_DATA}_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save profile data:", e);
  }
};

/**
 * Retrieve profile data from localStorage
 */
export const getProfileData = (userId?: string): StoredProfileData | null => {
  try {
    const user = userId || localStorage.getItem(STORAGE_KEYS.LAST_USER_ID);
    if (!user) return null;
    const data = localStorage.getItem(`${STORAGE_KEYS.PROFILE_DATA}_${user}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn("Failed to retrieve profile data:", e);
    return null;
  }
};

/**
 * Save avatar URL
 */
export const saveAvatarUrl = (userId: string, url: string) => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.AVATAR_URL}_${userId}`, url);
  } catch (e) {
    console.warn("Failed to save avatar URL:", e);
  }
};

/**
 * Get avatar URL
 */
export const getAvatarUrl = (userId?: string): string | null => {
  try {
    const user = userId || localStorage.getItem(STORAGE_KEYS.LAST_USER_ID);
    if (!user) return null;
    return localStorage.getItem(`${STORAGE_KEYS.AVATAR_URL}_${user}`);
  } catch (e) {
    console.warn("Failed to get avatar URL:", e);
    return null;
  }
};

/**
 * Save chum wardrobe with all customization options
 */
export const saveChumWardrobe = (userId: string, wardrobe: Partial<StoredChumWardrobe>) => {
  try {
    const existing = (getChumWardrobe(userId) || {}) as Partial<StoredChumWardrobe>;
    const updated: StoredChumWardrobe = {
      userId,
      baseEmoji: wardrobe.baseEmoji || existing.baseEmoji || "👻",
      hatEmoji: wardrobe.hatEmoji || existing.hatEmoji || "",
      activeAccessories: wardrobe.activeAccessories || existing.activeAccessories || [],
      activeCrystalTheme: wardrobe.activeCrystalTheme || existing.activeCrystalTheme || "default",
      activeAtmosphereFilter: wardrobe.activeAtmosphereFilter || existing.activeAtmosphereFilter || "default",
      activeAppTheme: wardrobe.activeAppTheme || existing.activeAppTheme || "deep-teal",
      activeBaseColor: wardrobe.activeBaseColor || existing.activeBaseColor || "base7",
      timestamp: Date.now(),
    };
    localStorage.setItem(`${STORAGE_KEYS.CHUM_WARDROBE}_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save chum wardrobe:", e);
  }
};

/**
 * Get chum wardrobe
 */
export const getChumWardrobe = (userId?: string): StoredChumWardrobe | null => {
  try {
    const user = userId || localStorage.getItem(STORAGE_KEYS.LAST_USER_ID);
    if (!user) return null;
    const data = localStorage.getItem(`${STORAGE_KEYS.CHUM_WARDROBE}_${user}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn("Failed to get chum wardrobe:", e);
    return null;
  }
};

/**
 * Save tasks for offline/backup purposes
 */
export const saveTasks = (userId: string, tasks: Task[]) => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.TASKS}_${userId}`, JSON.stringify(tasks));
  } catch (e) {
    console.warn("Failed to save tasks:", e);
  }
};

/**
 * Get tasks from localStorage
 */
export const getTasks = (userId?: string): Task[] | null => {
  try {
    const user = userId || localStorage.getItem(STORAGE_KEYS.LAST_USER_ID);
    if (!user) return null;
    const data = localStorage.getItem(`${STORAGE_KEYS.TASKS}_${user}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn("Failed to retrieve tasks:", e);
    return null;
  }
};

/**
 * Mark a user as verified (for tracking verified vs unverified accounts)
 */
export const markUserAsVerified = (userId: string) => {
  try {
    const verified = localStorage.getItem(STORAGE_KEYS.VERIFIED_USERS);
    const verifiedUsers = verified ? JSON.parse(verified) : [];
    if (!verifiedUsers.includes(userId)) {
      verifiedUsers.push(userId);
      localStorage.setItem(STORAGE_KEYS.VERIFIED_USERS, JSON.stringify(verifiedUsers));
    }
  } catch (e) {
    console.warn("Failed to mark user as verified:", e);
  }
};

/**
 * Migrate data from old user to new user when switching accounts
 * Handles both verified and unverified user transitions
 */
export const migrateUserData = (fromUserId: string, toUserId: string) => {
  try {
    // Copy profile data
    const profileData = getProfileData(fromUserId);
    if (profileData) {
      saveProfileData(toUserId, { ...profileData, userId: toUserId });
    }

    // Copy avatar
    const avatar = getAvatarUrl(fromUserId);
    if (avatar) {
      saveAvatarUrl(toUserId, avatar);
    }

    // Copy chum wardrobe
    const wardrobe = getChumWardrobe(fromUserId);
    if (wardrobe) {
      saveChumWardrobe(toUserId, { ...wardrobe, userId: toUserId });
    }

    // Copy tasks
    const tasks = getTasks(fromUserId);
    if (tasks) {
      saveTasks(toUserId, tasks);
    }

    // Update last user ID
    localStorage.setItem(STORAGE_KEYS.LAST_USER_ID, toUserId);
  } catch (e) {
    console.warn("Failed to migrate user data:", e);
  }
};

/**
 * Set the current active user
 */
export const setCurrentUser = (userId: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_USER_ID, userId);
  } catch (e) {
    console.warn("Failed to set current user:", e);
  }
};

/**
 * Clear all data for a user (useful for logout)
 */
export const clearUserData = (userId: string) => {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.PROFILE_DATA}_${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.AVATAR_URL}_${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.CHUM_WARDROBE}_${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.TASKS}_${userId}`);
  } catch (e) {
    console.warn("Failed to clear user data:", e);
  }
};
