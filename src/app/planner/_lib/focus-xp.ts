export type FocusXpBreakdown = {
  completionBonus: number;
  streakBonus: number;
  totalXp: number;
};

export function calculateFocusSessionXp(
  focusMinutes: number,
  currentStreak: number,
): FocusXpBreakdown {
  const normalizedMinutes = Number.isFinite(focusMinutes)
    ? Math.max(0, focusMinutes)
    : 0;
  const normalizedStreak = Number.isFinite(currentStreak)
    ? Math.max(0, currentStreak)
    : 0;

  const completionBonus = Math.round(normalizedMinutes * 2);
  const streakBonus = Math.min(Math.round(normalizedStreak * 3), 30);

  return {
    completionBonus,
    streakBonus,
    totalXp: completionBonus + streakBonus,
  };
}

