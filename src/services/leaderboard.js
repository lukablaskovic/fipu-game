import { get, limitToLast, orderByChild, push, query, ref, serverTimestamp, set } from 'firebase/database'
import { httpsCallable } from 'firebase/functions'
import { database, functions, hasFirebaseConfig } from '../firebase/client'

const LOCAL_STORAGE_KEY = 'fipu-signal-sprint-leaderboard'
const MAX_SCORE = 5000
const MAX_DURATION_MS = 180000
const USE_CALLABLE = import.meta.env.VITE_USE_FUNCTIONS === 'true'

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
  createdAt: Number(entry.createdAt) || Date.now(),
})

const sortScores = (entries) =>
  [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.createdAt - b.createdAt
  })

const saveLocalEntry = (entry) => {
  const top = sortScores([entry, ...readLocalEntries()]).slice(0, 20)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(top))
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

const writeRealtime = async (entry) => {
  const leaderboardRef = ref(database, 'leaderboard')
  await set(push(leaderboardRef), {
    ...entry,
    createdAt: serverTimestamp(),
  })
}

const callSubmitScore = async (entry) => {
  const callable = httpsCallable(functions, 'submitScore')
  await callable(entry)
}

const readRealtime = async (limit = 10) => {
  const leaderboardQuery = query(ref(database, 'leaderboard'), orderByChild('score'), limitToLast(limit))
  const snapshot = await get(leaderboardQuery)

  if (!snapshot.exists()) {
    return []
  }

  const raw = snapshot.val()
  return sortScores(Object.values(raw).map(normalizeEntry)).slice(0, limit)
}

export const submitScore = async ({ name, score, durationMs, streak }) => {
  const entry = normalizeEntry({ name, score, durationMs, streak, createdAt: Date.now() })

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
  if (hasFirebaseConfig && database) {
    try {
      const scores = await readRealtime(limit)
      return { mode: 'cloud', scores }
    } catch {
      return { mode: 'local', scores: sortScores(readLocalEntries()).slice(0, limit) }
    }
  }

  return { mode: 'local', scores: sortScores(readLocalEntries()).slice(0, limit) }
}
