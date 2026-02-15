import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = String(import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim()
const EMAILJS_TEMPLATE_ID = String(import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '').trim()
const EMAILJS_PUBLIC_KEY = String(import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim()

export const isEmailJsConfigured =
  Boolean(EMAILJS_SERVICE_ID) &&
  Boolean(EMAILJS_TEMPLATE_ID) &&
  Boolean(EMAILJS_PUBLIC_KEY)

const normalizeValue = (value) => String(value ?? '').trim()

export const sendOutroEmail = async ({
  toEmail,
  fullName,
}) => {
  if (!isEmailJsConfigured) {
    return { mode: 'skipped' }
  }

  const email = normalizeValue(toEmail).toLowerCase()

  if (!email) {
    throw new Error('invalid-email')
  }

  const templateParams = {
    toEmail: email,
    full_name: normalizeValue(fullName) || email,
  }

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    { publicKey: EMAILJS_PUBLIC_KEY },
  )

  return { mode: 'sent' }
}
