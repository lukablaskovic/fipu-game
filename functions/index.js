import { initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const MAX_SCORE = 5000
const MAX_DURATION_MS = 180000
const ALLOWED_DIFFICULTIES = ['easy', 'hard']
const ALLOWED_GAME_TYPES = ['ai', 'quiz']

const normalizeName = (rawName) => {
  const cleanName = String(rawName ?? '').trim().replace(/\s+/g, ' ')
  return cleanName.slice(0, 24) || 'Guest'
}

const normalizeUserId = (rawUserId) => {
  const cleanUserId = String(rawUserId ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  if (!cleanUserId) {
    throw new HttpsError('invalid-argument', 'Score payload contains invalid userId.')
  }
  return cleanUserId
}

const normalizeDifficulty = (rawDifficulty) => {
  const difficulty = String(rawDifficulty ?? '').toLowerCase()
  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    throw new HttpsError('invalid-argument', 'Score payload contains invalid difficulty.')
  }
  return difficulty
}

const normalizeGameType = (rawGameType) => {
  const gameType = String(rawGameType ?? '').toLowerCase()
  if (!ALLOWED_GAME_TYPES.includes(gameType)) {
    throw new HttpsError('invalid-argument', 'Score payload contains invalid gameType.')
  }
  return gameType
}

const isBetterEntry = (nextEntry, currentEntry) => {
  if (!currentEntry) return true
  if (nextEntry.score !== currentEntry.score) return nextEntry.score > currentEntry.score
  if (nextEntry.durationMs !== currentEntry.durationMs) return nextEntry.durationMs < currentEntry.durationMs
  if (nextEntry.streak !== currentEntry.streak) return nextEntry.streak > currentEntry.streak
  return nextEntry.createdAt < currentEntry.createdAt
}

const normalizeBoundedNumber = (rawValue, min, max) => {
  const value = Number(rawValue)
  if (!Number.isFinite(value)) {
    throw new HttpsError('invalid-argument', 'Score payload contains invalid numbers.')
  }
  const bounded = Math.round(value)
  if (bounded < min || bounded > max) {
    throw new HttpsError('invalid-argument', 'Score payload is outside allowed range.')
  }
  return bounded
}

export const submitScore = onCall({ cors: true }, async (request) => {
  const payload = request.data ?? {}
  const gameType = normalizeGameType(payload.gameType ?? 'ai')

  const entry = {
    name: normalizeName(payload.name),
    score: normalizeBoundedNumber(payload.score, 0, MAX_SCORE),
    durationMs: normalizeBoundedNumber(payload.durationMs, 0, MAX_DURATION_MS),
    streak: normalizeBoundedNumber(payload.streak ?? 0, 0, 99),
    userId: normalizeUserId(payload.userId),
    difficulty: gameType === 'ai' ? normalizeDifficulty(payload.difficulty) : 'easy',
    gameType,
    createdAt: Date.now(),
  }

  const difficultyKey = entry.gameType === 'ai' ? entry.difficulty : 'all'
  const entryRef = getDatabase().ref(`leaderboard/${entry.userId}_${entry.gameType}_${difficultyKey}`)

  await entryRef.transaction((currentValue) => {
    const currentEntry = currentValue ? currentValue : null
    if (!isBetterEntry(entry, currentEntry)) {
      return currentValue
    }
    return entry
  })

  return {
    ok: true,
  }
})
