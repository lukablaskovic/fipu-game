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
  playerName,
  modelAccuracy,
  correctCount,
  totalRounds,
  difficulty,
}) => {
  if (!isEmailJsConfigured) {
    return { mode: 'skipped' }
  }

  const email = normalizeValue(toEmail).toLowerCase()

  if (!email) {
    throw new Error('invalid-email')
  }

  const templateParams = {
    to_email: email,
    player_name: normalizeValue(playerName) || 'Gost',
    model_accuracy: `${Number(modelAccuracy) || 0}%`,
    correct_count: String(Number(correctCount) || 0),
    total_rounds: String(Number(totalRounds) || 0),
    difficulty: normalizeValue(difficulty) || 'Easy',
    logo_image_url:
      typeof window !== 'undefined'
        ? `${window.location.origin}/fipu-unipu-logo.png`
        : '',
    study_photo_01_url:
      typeof window !== 'undefined'
        ? `${window.location.origin}/email-photos/01.webp`
        : '',
    study_photo_02_url:
      typeof window !== 'undefined'
        ? `${window.location.origin}/email-photos/02.jpeg`
        : '',
    study_photo_03_url:
      typeof window !== 'undefined'
        ? `${window.location.origin}/email-photos/03.jpeg`
        : '',
    study_photo_04_url:
      typeof window !== 'undefined'
        ? `${window.location.origin}/email-photos/04.HEIC`
        : '',
  }

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    { publicKey: EMAILJS_PUBLIC_KEY },
  )

  return { mode: 'sent' }
}
