import { useStudyStore } from "../store";

/**
 * Term Dictionary - Gamified vs Simple
 * Adjust the mappings as needed. This is the source of truth for all terminology.
 */
export const TERMS = {
  // Dashboard
  focusScore: {
    gamified: "Focus Score",
    simple: "Focus Score",
  },
  sessions: {
    gamified: "Sessions",
    simple: "Sessions",
  },
  brainReset: {
    gamified: "Brain Reset",
    simple: "Brain Reset",
  },
  sparksFeed: {
    gamified: "Sparks Feed",
    simple: "Sparks Feed",
  },

  // XP & Leveling
  xp: {
    gamified: "XP",
    simple: "XP",
  },
  level: {
    gamified: "Level",
    simple: "Level",
  },
  title: {
    gamified: "Title",
    simple: "Title",
  },
  ascendedScholar: {
    gamified: "Ascended Scholar",
    simple: "Ascended Scholar",
  },

  // Gamified Mechanics
  questProgress: {
    gamified: "Quest Progress",
    simple: "Quest Progress",
  },
  dailyQuest: {
    gamified: "Daily Quest",
    simple: "Daily Quest",
  },
  flawlessStreak: {
    gamified: "Flawless Streak",
    simple: "Flawless Streak",
  },
  dayStreak: {
    gamified: "Day Streak",
    simple: "Day Streak",
  },

  // Lantern Network
  lanternNetwork: {
    gamified: "Lantern Network",
    simple: "Lantern Network",
  },

  // Crystal & Garden
  crystalGarden: {
    gamified: "Crystal Garden",
    simple: "Crystal Garden",
  },
  crystals: {
    gamified: "Crystals",
    simple: "Crystals",
  },
  collectCrystal: {
    gamified: "Collect Crystal",
    simple: "Collect Crystal",
  },
  activateCrystal: {
    gamified: "Activate Crystal",
    simple: "Activate Crystal",
  },
  crystalTheme: {
    gamified: "Crystal Theme",
    simple: "Crystal Theme",
  },
  crystalVault: {
    gamified: "Crystal Vault",
    simple: "Crystal Vault",
  },

  // Tasks & Load
  taskLoad: {
    gamified: "Task Load",
    simple: "Task Load",
  },
  heavyLoad: {
    gamified: "Heavy Load",
    simple: "Heavy Load",
  },
  mediumLoad: {
    gamified: "Medium Load",
    simple: "Medium Load",
  },
  lightLoad: {
    gamified: "Light Load",
    simple: "Light Load",
  },

  // Concepts
  eisenhowerQuadrant: {
    gamified: "Eisenhower Quadrant",
    simple: "Eisenhower Quadrant",
  },
  ivyRank: {
    gamified: "Ivy Rank",
    simple: "Ivy Rank",
  },
  fowlThreshold: {
    gamified: "Fowl Threshold",
    simple: "Fowl Threshold",
  },
  frogTask: {
    gamified: "Frog Task",
    simple: "Frog Task",
  },
  urgency: {
    gamified: "Urgency",
    simple: "Due Date",
  },
  importance: {
    gamified: "Importance",
    simple: "Priority",
  },

  // Tutor & Learning
  shards: {
    gamified: "Mastered Shards",
    simple: "Mastered Modules",
  },
  shard: {
    gamified: "Shard",
    simple: "Modules",
  },
  forgeShard: {
    gamified: "Extract Shards",
    simple: "Create Module",
  },
  neurallinkAscended: {
    gamified: "Neural Link Ascended",
    simple: "Module Mastered",
  },
  mastery: {
    gamified: "Mastery",
    simple: "Progress",
  },
  masteryGained: {
    gamified: "Mastery Gained",
    simple: "Progress",
  },
  tutorMode: {
    gamified: "Tutor Mode",
    simple: "Learning Mode",
  },

  // Calendar & Planning
  questForecast: {
    gamified: "Quest Forecast",
    simple: "Calendar",
  },
  plannedDate: {
    gamified: "Due Date",
    simple: "Due Date",
  },
  framework: {
    gamified: "Framework",
    simple: "Method",
  },
  stash: {
    gamified: "Seed Bank",
    simple: "Stash",
  },

  // Focus & Study
  focusModal: {
    gamified: "Focus Modal",
    simple: "Study Session",
  },
  flowState: {
    gamified: "Flow State",
    simple: "Deep Focus",
  },
  studyCafe: {
    gamified: "Study Café",
    simple: "Focus Mode",
  },
  pomodoro: {
    gamified: "Pomodoro",
    simple: "Pomodoro",
  },
  pomodoroSession: {
    gamified: "Pomodoro Session",
    simple: "Pomodoro Session",
  },
  stressLevel: {
    gamified: "Stress Level",
    simple: "Stress Level",
  },
  burnout: {
    gamified: "Burnout",
    simple: "Burnout",
  },

  // Status
  incomplete: {
    gamified: "Active",
    simple: "Active",
  },
  completed: {
    gamified: "Completed",
    simple: "Completed",
  },
  inProgress: {
    gamified: "In Progress",
    simple: "In Progress",
  },

  // UI Elements
  dashboard: {
    gamified: "Dashboard",
    simple: "Dashboard",
  },
  canvas: {
    gamified: "Zen Canvas",
    simple: "Canvas",
  },
  wardrobe: {
    gamified: "Wardrobe",
    simple: "Wardrobe",
  },
  archive: {
    gamified: "The Crystal Conservatory",
    simple: "Completed Tasks",
  },
  insights: {
    gamified: "Performance Insights",
    simple: "Performance Insights",
  },
  insightsPrem: {
    gamified: "Premium Insights",
    simple: "Premium Insights",
  },

  // AI & Chum
  chum: {
    gamified: "Chum",
    simple: "Chum",
  },
  chumInsight: {
    gamified: "Chum's Insight",
    simple: "Chum's Insight",
  },
  chumToast: {
    gamified: "Chum Toast",
    simple: "Notification",
  },

  // Settings & Config
  neuralProtocols: {
    gamified: "Config",
    simple: "Settings",
  },
  performance: {
    gamified: "Performance",
    simple: "Performance",
  },
  accessibility: {
    gamified: "Accessibility",
    simple: "Accessibility",
  },

  // Misc
  streak: {
    gamified: "Streak",
    simple: "Streak",
  },
  bonus: {
    gamified: "Bonus",
    simple: "Bonus",
  },
  reward: {
    gamified: "Achievement",
    simple: "Achievement",
  },
  upgrade: {
    gamified: "Upgrade",
    simple: "Unlock",
  },
  premium: {
    gamified: "Premium",
    simple: "Pro",
  },
} as const;

/**
 * Custom Hook: useTerms
 * Returns appropriate terminology based on user's UI preference
 */
export function useTerms() {
  const { useThematicUI } = useStudyStore();

  /**
   * Get all terms at once
   * Returns an object with all terms in the appropriate language
   */
  const getAllTerms = () => {
    const result: Record<string, string> = {};
    Object.keys(TERMS).forEach((key) => {
      const k = key as keyof typeof TERMS;
      result[k] = useThematicUI ? TERMS[k].gamified : TERMS[k].simple;
    });
    return result as Record<keyof typeof TERMS, string>;
  };

  const terms = getAllTerms();

  return {
    terms,
    isGamified: useThematicUI,
  };
}
