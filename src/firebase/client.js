import { getApp, getApps, initializeApp } from 'firebase/app'
import { isSupported, getAnalytics } from 'firebase/analytics'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const isValidRealtimeDatabaseUrl = (value) => {
  if (!value) return false

  try {
    const parsedUrl = new URL(value)
    const hasSupportedHost =
      parsedUrl.hostname.endsWith('.firebaseio.com') || parsedUrl.hostname.endsWith('.firebasedatabase.app')

    return parsedUrl.protocol === 'https:' && hasSupportedHost
  } catch {
    return false
  }
}

const hasCoreFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean)

const hasRealtimeDatabaseUrl = isValidRealtimeDatabaseUrl(firebaseConfig.databaseURL)

if (firebaseConfig.databaseURL && !hasRealtimeDatabaseUrl) {
  console.warn(
    'VITE_FIREBASE_DATABASE_URL must be a full HTTPS URL, for example: https://<project>-default-rtdb.<region>.firebasedatabase.app',
  )
}

const firebaseApp = hasCoreFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

const database = firebaseApp && hasRealtimeDatabaseUrl ? getDatabase(firebaseApp) : null
const functions = firebaseApp ? getFunctions(firebaseApp) : null
const hasFirebaseConfig = Boolean(firebaseApp && database)

const analyticsPromise = firebaseApp
  ? isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null)
  : Promise.resolve(null)

export { analyticsPromise, database, firebaseApp, functions, hasFirebaseConfig }
