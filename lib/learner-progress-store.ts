import type { AsterProfile, AsterSession } from "@/lib/aster-companion";
import type { FoundationalRapidRoundOutcome } from "@/types/practice";

export const LOCAL_DEMO_USER_ID = "local-demo-user";

export type LearnerPreferences = {
  questionBreadth?: "primary" | "expanded" | "comprehensive";
  practiceSkin?: string;
  [key: string]: unknown;
};

export type LearnerProfile = {
  userId: string;
  createdAt: string;
  updatedAt: string;
  activeShelf: string;
  activeMode: string;
  totalQuestionsCompleted: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
  preferences: LearnerPreferences;
};

export type QuestionItemState = {
  userId: string;
  questionItemId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  exposureCount: number;
  taughtOnce: boolean;
  answeredCorrectlyOnce: boolean;
  needsLearning: boolean;
  dueAt?: string;
  lastAnswer?: string;
  lastOutcome?: FoundationalRapidRoundOutcome;
};

export type XpEvent = {
  userId: string;
  eventId: string;
  sessionId: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type LearnerProgressExport = {
  version: 1;
  exportedAt: string;
  userId: string;
  profile: LearnerProfile | null;
  questionStates: QuestionItemState[];
  asterProfile: AsterProfile | null;
  asterSessions: AsterSession[];
  xpEvents: XpEvent[];
};

export type LearnerProgressStore = {
  getProfile(userId: string): Promise<LearnerProfile | null>;
  updateProfile(userId: string, patch: Partial<Omit<LearnerProfile, "userId" | "createdAt">>): Promise<LearnerProfile>;
  getQuestionState(userId: string, questionItemId: string): Promise<QuestionItemState | null>;
  updateQuestionState(userId: string, questionItemId: string, patch: Partial<Omit<QuestionItemState, "userId" | "questionItemId">>): Promise<QuestionItemState>;
  getAsterProfile(userId: string): Promise<AsterProfile | null>;
  updateAsterProfile(userId: string, patch: Partial<Omit<AsterProfile, "userId">>): Promise<AsterProfile>;
  createAsterSession(userId: string, session: AsterSession): Promise<AsterSession>;
  updateAsterSession(userId: string, sessionId: string, patch: Partial<Omit<AsterSession, "userId" | "sessionId">>): Promise<AsterSession>;
  recordXpEvent(userId: string, event: Omit<XpEvent, "userId">): Promise<XpEvent>;
  exportProgress(userId: string): Promise<LearnerProgressExport>;
  importProgress(userId: string, json: LearnerProgressExport | string): Promise<LearnerProgressExport>;
};

type StoredQuestionItemState = QuestionItemState & { key: string };
type StoredAsterSession = AsterSession & { key: string };
type StoredXpEvent = XpEvent & { key: string };

const DB_NAME = "rapidrounds-learner-progress";
const DB_VERSION = 1;
const PROFILE_STORE = "profiles";
const QUESTION_STORE = "questionStates";
const ASTER_PROFILE_STORE = "asterProfiles";
const ASTER_SESSION_STORE = "asterSessions";
const XP_EVENT_STORE = "xpEvents";

function nowIso(now = new Date()) {
  return now.toISOString();
}

function recordKey(userId: string, recordId: string) {
  return `${userId}::${recordId}`;
}

export function createDefaultLearnerProfile(userId: string, now = new Date()): LearnerProfile {
  const timestamp = nowIso(now);
  return {
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    activeShelf: "OB/GYN",
    activeMode: "adaptive",
    totalQuestionsCompleted: 0,
    totalCorrect: 0,
    currentStreak: 0,
    longestStreak: 0,
    preferences: {
      questionBreadth: "primary"
    }
  };
}

function defaultQuestionState(userId: string, questionItemId: string): QuestionItemState {
  const timestamp = nowIso();
  return {
    userId,
    questionItemId,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    exposureCount: 0,
    taughtOnce: false,
    answeredCorrectlyOnce: false,
    needsLearning: false
  };
}

function getObjectStore(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode
) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

async function readRecord<T>(db: IDBDatabase, storeName: string, key: IDBValidKey) {
  return (await idbRequest<T | undefined>(getObjectStore(db, storeName, "readonly").get(key))) ?? null;
}

async function putRecord<T>(db: IDBDatabase, storeName: string, value: T) {
  await idbRequest(getObjectStore(db, storeName, "readwrite").put(value));
}

function idbRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbTransactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

let indexedDbPromise: Promise<IDBDatabase> | null = null;

function openIndexedDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (indexedDbPromise) {
    return indexedDbPromise;
  }

  indexedDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains(QUESTION_STORE)) {
        const store = db.createObjectStore(QUESTION_STORE, { keyPath: "key" });
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!db.objectStoreNames.contains(ASTER_PROFILE_STORE)) {
        db.createObjectStore(ASTER_PROFILE_STORE, { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains(ASTER_SESSION_STORE)) {
        const store = db.createObjectStore(ASTER_SESSION_STORE, { keyPath: "key" });
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!db.objectStoreNames.contains(XP_EVENT_STORE)) {
        const store = db.createObjectStore(XP_EVENT_STORE, { keyPath: "key" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
  });

  return indexedDbPromise;
}

async function getAllByUser<T extends { userId: string }>(db: IDBDatabase, storeName: string, userId: string) {
  const store = getObjectStore(db, storeName, "readonly");
  const index = store.index("userId");
  return idbRequest(index.getAll(userId) as IDBRequest<T[]>);
}

export function createIndexedDbLearnerProgressStore(): LearnerProgressStore {
  return {
    async getProfile(userId) {
      const db = await openIndexedDb();
      return readRecord<LearnerProfile>(db, PROFILE_STORE, userId);
    },

    async updateProfile(userId, patch) {
      const db = await openIndexedDb();
      const existing = (await readRecord<LearnerProfile>(db, PROFILE_STORE, userId)) ?? createDefaultLearnerProfile(userId);
      const profile: LearnerProfile = {
        ...existing,
        ...patch,
        userId,
        createdAt: existing.createdAt,
        preferences: {
          ...existing.preferences,
          ...(patch.preferences ?? {})
        },
        updatedAt: nowIso()
      };
      await putRecord(db, PROFILE_STORE, profile);
      return profile;
    },

    async getQuestionState(userId, questionItemId) {
      const db = await openIndexedDb();
      const stored = await readRecord<StoredQuestionItemState>(db, QUESTION_STORE, recordKey(userId, questionItemId));
      if (!stored) return null;
      const { key: _key, ...state } = stored;
      return state;
    },

    async updateQuestionState(userId, questionItemId, patch) {
      const db = await openIndexedDb();
      const key = recordKey(userId, questionItemId);
      const existingStored = await readRecord<StoredQuestionItemState>(db, QUESTION_STORE, key);
      const existing = existingStored ? stripKey(existingStored) : defaultQuestionState(userId, questionItemId);
      const next: QuestionItemState = {
        ...existing,
        ...patch,
        userId,
        questionItemId,
        firstSeenAt: existing.firstSeenAt,
        lastSeenAt: patch.lastSeenAt ?? nowIso()
      };
      await putRecord(db, QUESTION_STORE, { ...next, key });
      return next;
    },

    async getAsterProfile(userId) {
      const db = await openIndexedDb();
      return readRecord<AsterProfile>(db, ASTER_PROFILE_STORE, userId);
    },

    async updateAsterProfile(userId, patch) {
      const db = await openIndexedDb();
      const existing = (await readRecord<AsterProfile>(db, ASTER_PROFILE_STORE, userId)) ?? defaultAsterProfile(userId);
      const next: AsterProfile = {
        ...existing,
        ...patch,
        userId,
        unlockedVariants: patch.unlockedVariants ?? existing.unlockedVariants,
        unlockedItems: patch.unlockedItems ?? existing.unlockedItems,
        equippedItems: patch.equippedItems ?? existing.equippedItems
      };
      await putRecord(db, ASTER_PROFILE_STORE, next);
      return next;
    },

    async createAsterSession(userId, session) {
      const db = await openIndexedDb();
      const next = { ...session, userId };
      await putRecord(db, ASTER_SESSION_STORE, { ...next, key: recordKey(userId, next.sessionId) });
      return next;
    },

    async updateAsterSession(userId, sessionId, patch) {
      const db = await openIndexedDb();
      const key = recordKey(userId, sessionId);
      const existingStored = await readRecord<StoredAsterSession>(db, ASTER_SESSION_STORE, key);
      const existing = existingStored ? stripKey(existingStored) : undefined;
      if (!existing) {
        throw new Error(`Aster session not found: ${sessionId}`);
      }
      const next: AsterSession = { ...existing, ...patch, userId, sessionId };
      await putRecord(db, ASTER_SESSION_STORE, { ...next, key });
      return next;
    },

    async recordXpEvent(userId, event) {
      const db = await openIndexedDb();
      const next: XpEvent = { ...event, userId };
      await putRecord(db, XP_EVENT_STORE, { ...next, key: recordKey(userId, next.eventId) });
      return next;
    },

    async exportProgress(userId) {
      const db = await openIndexedDb();
      return {
        version: 1,
        exportedAt: nowIso(),
        userId,
        profile: (await this.getProfile(userId)) ?? null,
        questionStates: (await getAllByUser<StoredQuestionItemState>(db, QUESTION_STORE, userId)).map(stripKey),
        asterProfile: (await this.getAsterProfile(userId)) ?? null,
        asterSessions: (await getAllByUser<StoredAsterSession>(db, ASTER_SESSION_STORE, userId)).map(stripKey),
        xpEvents: (await getAllByUser<StoredXpEvent>(db, XP_EVENT_STORE, userId)).map(stripKey)
      };
    },

    async importProgress(userId, json) {
      const imported = typeof json === "string" ? JSON.parse(json) as LearnerProgressExport : json;
      const normalized: LearnerProgressExport = {
        version: 1,
        exportedAt: nowIso(),
        userId,
        profile: imported.profile ? { ...imported.profile, userId, updatedAt: nowIso() } : null,
        questionStates: imported.questionStates.map((state) => ({ ...state, userId })),
        asterProfile: imported.asterProfile ? { ...imported.asterProfile, userId } : null,
        asterSessions: imported.asterSessions.map((session) => ({ ...session, userId })),
        xpEvents: imported.xpEvents.map((event) => ({ ...event, userId }))
      };

      const db = await openIndexedDb();
      const transaction = db.transaction(
        [PROFILE_STORE, QUESTION_STORE, ASTER_PROFILE_STORE, ASTER_SESSION_STORE, XP_EVENT_STORE],
        "readwrite"
      );
      if (normalized.profile) transaction.objectStore(PROFILE_STORE).put(normalized.profile);
      for (const state of normalized.questionStates) {
        transaction.objectStore(QUESTION_STORE).put({ ...state, key: recordKey(userId, state.questionItemId) });
      }
      if (normalized.asterProfile) transaction.objectStore(ASTER_PROFILE_STORE).put(normalized.asterProfile);
      for (const session of normalized.asterSessions) {
        transaction.objectStore(ASTER_SESSION_STORE).put({ ...session, key: recordKey(userId, session.sessionId) });
      }
      for (const event of normalized.xpEvents) {
        transaction.objectStore(XP_EVENT_STORE).put({ ...event, key: recordKey(userId, event.eventId) });
      }
      await idbTransactionDone(transaction);
      return normalized;
    }
  };
}

function stripKey<T extends { key: string }>(value: T): Omit<T, "key"> {
  const { key: _key, ...rest } = value;
  return rest;
}

function defaultAsterProfile(userId: string): AsterProfile {
  return {
    userId,
    level: 1,
    totalXp: 0,
    prestigeLevel: 0,
    unlockedVariants: [],
    unlockedItems: [],
    equippedVariant: "classic",
    equippedItems: []
  };
}

export function createMemoryLearnerProgressStore(): LearnerProgressStore {
  const profiles = new Map<string, LearnerProfile>();
  const questionStates = new Map<string, QuestionItemState>();
  const asterProfiles = new Map<string, AsterProfile>();
  const asterSessions = new Map<string, AsterSession>();
  const xpEvents = new Map<string, XpEvent>();

  return {
    async getProfile(userId) {
      return profiles.get(userId) ?? null;
    },
    async updateProfile(userId, patch) {
      const existing = profiles.get(userId) ?? createDefaultLearnerProfile(userId);
      const next = {
        ...existing,
        ...patch,
        userId,
        createdAt: existing.createdAt,
        preferences: { ...existing.preferences, ...(patch.preferences ?? {}) },
        updatedAt: nowIso()
      };
      profiles.set(userId, next);
      return next;
    },
    async getQuestionState(userId, questionItemId) {
      return questionStates.get(recordKey(userId, questionItemId)) ?? null;
    },
    async updateQuestionState(userId, questionItemId, patch) {
      const key = recordKey(userId, questionItemId);
      const existing = questionStates.get(key) ?? defaultQuestionState(userId, questionItemId);
      const next = {
        ...existing,
        ...patch,
        userId,
        questionItemId,
        firstSeenAt: existing.firstSeenAt,
        lastSeenAt: patch.lastSeenAt ?? nowIso()
      };
      questionStates.set(key, next);
      return next;
    },
    async getAsterProfile(userId) {
      return asterProfiles.get(userId) ?? null;
    },
    async updateAsterProfile(userId, patch) {
      const existing = asterProfiles.get(userId) ?? defaultAsterProfile(userId);
      const next = { ...existing, ...patch, userId };
      asterProfiles.set(userId, next);
      return next;
    },
    async createAsterSession(userId, session) {
      const next = { ...session, userId };
      asterSessions.set(recordKey(userId, next.sessionId), next);
      return next;
    },
    async updateAsterSession(userId, sessionId, patch) {
      const key = recordKey(userId, sessionId);
      const existing = asterSessions.get(key);
      if (!existing) throw new Error(`Aster session not found: ${sessionId}`);
      const next = { ...existing, ...patch, userId, sessionId };
      asterSessions.set(key, next);
      return next;
    },
    async recordXpEvent(userId, event) {
      const next = { ...event, userId };
      xpEvents.set(recordKey(userId, next.eventId), next);
      return next;
    },
    async exportProgress(userId) {
      return {
        version: 1,
        exportedAt: nowIso(),
        userId,
        profile: profiles.get(userId) ?? null,
        questionStates: [...questionStates.values()].filter((state) => state.userId === userId),
        asterProfile: asterProfiles.get(userId) ?? null,
        asterSessions: [...asterSessions.values()].filter((session) => session.userId === userId),
        xpEvents: [...xpEvents.values()].filter((event) => event.userId === userId)
      };
    },
    async importProgress(userId, json) {
      const imported = typeof json === "string" ? JSON.parse(json) as LearnerProgressExport : json;
      const normalized: LearnerProgressExport = {
        version: 1,
        exportedAt: nowIso(),
        userId,
        profile: imported.profile ? { ...imported.profile, userId, updatedAt: nowIso() } : null,
        questionStates: imported.questionStates.map((state) => ({ ...state, userId })),
        asterProfile: imported.asterProfile ? { ...imported.asterProfile, userId } : null,
        asterSessions: imported.asterSessions.map((session) => ({ ...session, userId })),
        xpEvents: imported.xpEvents.map((event) => ({ ...event, userId }))
      };
      if (normalized.profile) profiles.set(userId, normalized.profile);
      for (const state of normalized.questionStates) questionStates.set(recordKey(userId, state.questionItemId), state);
      if (normalized.asterProfile) asterProfiles.set(userId, normalized.asterProfile);
      for (const session of normalized.asterSessions) asterSessions.set(recordKey(userId, session.sessionId), session);
      for (const event of normalized.xpEvents) xpEvents.set(recordKey(userId, event.eventId), event);
      return normalized;
    }
  };
}

let browserStore: LearnerProgressStore | null = null;
let memoryFallbackStore: LearnerProgressStore | null = null;

export function getLearnerProgressStore() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    memoryFallbackStore ??= createMemoryLearnerProgressStore();
    return memoryFallbackStore;
  }

  browserStore ??= createIndexedDbLearnerProgressStore();
  return browserStore;
}
