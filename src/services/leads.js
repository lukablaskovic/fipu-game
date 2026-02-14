import { push, ref, serverTimestamp, set } from 'firebase/database'
import { database, hasFirebaseConfig } from '../firebase/client'

const LOCAL_STORAGE_KEY = 'fipu-interest-emails'

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase()

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)

const saveLocalLead = (lead) => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const next = Array.isArray(parsed) ? parsed : []
    next.unshift(lead)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next.slice(0, 200)))
  } catch {
    // Intentionally ignore local storage failures.
  }
}

export const submitInterestEmail = async ({ email, source = 'ai-outro' }) => {
  const normalizedEmail = normalizeEmail(email)

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('invalid-email')
  }

  const lead = {
    email: normalizedEmail,
    source,
    createdAt: Date.now(),
  }

  if (hasFirebaseConfig && database) {
    try {
      const leadsRef = ref(database, 'interestEmails')
      await set(push(leadsRef), {
        email: normalizedEmail,
        source,
        createdAt: serverTimestamp(),
      })
      return { mode: 'cloud' }
    } catch {
      saveLocalLead(lead)
      return { mode: 'local' }
    }
  }

  saveLocalLead(lead)
  return { mode: 'local' }
}
