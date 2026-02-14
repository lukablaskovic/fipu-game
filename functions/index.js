import { initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const MAX_SCORE = 5000
const MAX_DURATION_MS = 180000

const normalizeName = (rawName) => {
  const cleanName = String(rawName ?? '').trim().replace(/\s+/g, ' ')
  return cleanName.slice(0, 24) || 'Guest'
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

  const entry = {
    name: normalizeName(payload.name),
    score: normalizeBoundedNumber(payload.score, 0, MAX_SCORE),
    durationMs: normalizeBoundedNumber(payload.durationMs, 0, MAX_DURATION_MS),
    streak: normalizeBoundedNumber(payload.streak ?? 0, 0, 99),
    createdAt: Date.now(),
  }

  await getDatabase().ref('leaderboard').push(entry)

  return {
    ok: true,
  }
})
