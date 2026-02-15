import { get, ref, runTransaction, serverTimestamp } from 'firebase/database'
import { httpsCallable } from 'firebase/functions'
import { database, functions, hasFirebaseConfig } from '../firebase/client'

const LOCAL_STORAGE_KEY = 'fipu-signal-sprint-leaderboard'
const LOCAL_USER_ID_KEY = 'fipu-signal-sprint-user-id'
const MAX_SCORE = 5000
const MAX_DURATION_MS = 180000
const USE_CALLABLE = import.meta.env.VITE_USE_FUNCTIONS === 'true'
const ALLOWED_DIFFICULTIES = ['easy', 'hard']

const normalizeName = (name) => {
  const cleanName = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!cleanName) return 'Guest'
  return cleanName.slice(0, 24)
}

const normalizeScore = (score) => {
  const parsed = Number(score)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(MAX_SCORE, Math.round(parsed)))
}

const normalizeDuration = (durationMs) => {
  const parsed = Number(durationMs)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(MAX_DURATION_MS, Math.round(parsed)))
}

const normalizeEntry = (entry) => ({
  name: normalizeName(entry.name),
  score: normalizeScore(entry.score),
  durationMs: normalizeDuration(entry.durationMs),
  streak: Math.max(0, Math.min(99, Math.round(Number(entry.streak) || 0))),
  userId: String(entry.userId ?? '').trim().slice(0, 64) || 'legacy-user',
  difficulty: ALLOWED_DIFFICULTIES.includes(entry.difficulty) ? entry.difficulty : 'easy',
  createdAt: Number(entry.createdAt) || Date.now(),
})

const isBetterEntry = (nextEntry, currentEntry) => {
  if (!currentEntry) return true
  if (nextEntry.score !== currentEntry.score) return nextEntry.score > currentEntry.score
  if (nextEntry.durationMs !== currentEntry.durationMs) return nextEntry.durationMs < currentEntry.durationMs
  if (nextEntry.streak !== currentEntry.streak) return nextEntry.streak > currentEntry.streak
  return nextEntry.createdAt < currentEntry.createdAt
}

const sanitizeUserId = (value) => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)

const createUserId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return sanitizeUserId(crypto.randomUUID())
  }

  return sanitizeUserId(`${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

export const getOrCreateLocalUserId = () => {
  try {
    const existing = sanitizeUserId(localStorage.getItem(LOCAL_USER_ID_KEY))
    if (existing) return existing
    const next = createUserId()
    localStorage.setItem(LOCAL_USER_ID_KEY, next)
    return next
  } catch {
    return createUserId()
  }
}

const sortScores = (entries) =>
  [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs
    if (b.streak !== a.streak) return b.streak - a.streak
    return a.createdAt - b.createdAt
  })

const saveLocalEntry = (entry) => {
  const allEntries = readLocalEntries()
  const key = `${entry.userId}_${entry.difficulty}`
  const nextEntries = allEntries.filter((item) => `${item.userId}_${item.difficulty}` !== key)
  const previous = allEntries.find((item) => `${item.userId}_${item.difficulty}` === key)

  if (!isBetterEntry(entry, previous)) {
    return
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([entry, ...nextEntries]))
}

const readLocalEntries = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeEntry)
  } catch {
    return []
  }
}

const makeEntryId = (entry) => `${entry.userId}_${entry.difficulty}`

const writeRealtime = async (entry) => {
  const entryRef = ref(database, `leaderboard/${makeEntryId(entry)}`)

  await runTransaction(entryRef, (currentRaw) => {
    const current = currentRaw ? normalizeEntry(currentRaw) : null

    if (current && !isBetterEntry(entry, current)) {
      return currentRaw
    }

    return {
      ...entry,
      createdAt: serverTimestamp(),
    }
  })
}

const callSubmitScore = async (entry) => {
  const callable = httpsCallable(functions, 'submitScore')
  await callable(entry)
}

const readRealtime = async ({ limit = 10, difficulty = 'easy' } = {}) => {
  const snapshot = await get(ref(database, 'leaderboard'))

  if (!snapshot.exists()) {
    return []
  }

  const raw = snapshot.val()
  return sortScores(
    Object.values(raw)
      .map(normalizeEntry)
      .filter((entry) => entry.difficulty === difficulty),
  ).slice(0, limit)
}

export const submitScore = async ({ name, score, durationMs, streak, difficulty, userId }) => {
  const entry = normalizeEntry({
    name,
    score,
    durationMs,
    streak,
    difficulty,
    userId: userId || getOrCreateLocalUserId(),
    createdAt: Date.now(),
  })

  if (hasFirebaseConfig && database) {
    try {
      if (USE_CALLABLE && functions) {
        await callSubmitScore(entry)
      } else {
        await writeRealtime(entry)
      }
      return { mode: 'cloud', entry }
    } catch {
      saveLocalEntry(entry)
      return { mode: 'local', entry }
    }
  }

  saveLocalEntry(entry)
  return { mode: 'local', entry }
}

export const fetchTopScores = async (limit = 10) => {
  return fetchTopScoresByDifficulty({ limit, difficulty: 'easy' })
}

export const fetchTopScoresByDifficulty = async ({ limit = 10, difficulty = 'easy' } = {}) => {
  const normalizedDifficulty = ALLOWED_DIFFICULTIES.includes(difficulty) ? difficulty : 'easy'

  if (hasFirebaseConfig && database) {
    try {
      const scores = await readRealtime({ limit, difficulty: normalizedDifficulty })
      return { mode: 'cloud', scores }
    } catch {
      return {
        mode: 'local',
        scores: sortScores(readLocalEntries())
          .filter((entry) => entry.difficulty === normalizedDifficulty)
          .slice(0, limit),
      }
    }
  }

  return {
    mode: 'local',
    scores: sortScores(readLocalEntries())
      .filter((entry) => entry.difficulty === normalizedDifficulty)
      .slice(0, limit),
  }
}
