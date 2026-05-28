const MFA_CHALLENGES_STORAGE_KEY = 'auth_mfa_challenges';

interface StoredMfaChallenge {
  userId: string;
  code: string;
  expiresAt: string;
  issuedAt: string;
}

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op
  }
};

const parseChallenges = (): StoredMfaChallenge[] => {
  const raw = readStorage(MFA_CHALLENGES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredMfaChallenge[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => !!entry?.userId && !!entry?.code && !!entry?.expiresAt);
  } catch {
    return [];
  }
};

const persistChallenges = (challenges: StoredMfaChallenge[]) => {
  writeStorage(MFA_CHALLENGES_STORAGE_KEY, JSON.stringify(challenges));
};

const generateSixDigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const issueMfaChallenge = (userId: string) => {
  const code = generateSixDigitCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  const existing = parseChallenges().filter((entry) => entry.userId !== userId);
  existing.push({
    userId,
    code,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  persistChallenges(existing);

  return {
    code,
    expiresAt,
  };
};

export const verifyMfaChallenge = (userId: string, code: string): boolean => {
  const now = new Date();
  const challenges = parseChallenges();
  const challenge = challenges.find((entry) => entry.userId === userId);

  if (!challenge) {
    return false;
  }

  if (new Date(challenge.expiresAt) < now) {
    return false;
  }

  return challenge.code === code.trim();
};

export const clearMfaChallengeForUser = (userId: string) => {
  const challenges = parseChallenges().filter((entry) => entry.userId !== userId);
  persistChallenges(challenges);
};

export const getLatestMfaCodeForUser = (userId: string): string | null => {
  const challenge = parseChallenges().find((entry) => entry.userId === userId);
  if (!challenge) {
    return null;
  }

  return challenge.code;
};
