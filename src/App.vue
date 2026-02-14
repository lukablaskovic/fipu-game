<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { aiTrainFrames, aiTrainLabels } from "./data/aiTrainImages";
import { fetchTopScores, submitScore } from "./services/leaderboard";
import { submitInterestEmail } from "./services/leads";
import { generateRandomNickname } from "./utils/randomNickname";

const gameTypes = [
  {
    id: "ai",
    title: "Treniranje AI-a",
    description:
      "Pogledaj kako je to trenirati AI model da raspoznaje slike. Hoćeš li ga uspjeti natrenirati na 100% točnosti?",
  },
  {
    id: "it",
    title: "IT kviz",
    description: "IT kviz opće kulture. Bez ovoga ne dodjeljujemo diplomu 😀",
  },
];

const gameCardGifs = {
  ai: "/ai-train-robot-gif.gif",
  it: "/ai-quiz-robot-gif.gif",
};

const difficultyOptions = [
  { id: "easy", label: "Easy" },
  { id: "hard", label: "Hard" },
];

const aiConfigs = {
  easy: {
    totalRounds: 20,
    roundDurationMs: 3000,
    optionCount: 4,
    feedbackMs: 520,
    label: "Easy",
  },
  hard: {
    totalRounds: 20,
    roundDurationMs: 1500,
    optionCount: 4,
    feedbackMs: 420,
    label: "Hard",
  },
};
const aiQuizSampleSize = 20;
const aiQuizDurationMs = 45000;

const phase = ref("home");
const selectedGameType = ref("ai");
const selectedDifficulty = ref("easy");
const activeDifficulty = ref("easy");
const nickname = ref("");
const nicknameDraft = ref("");
const isNicknameModalOpen = ref(false);
const isAutoNameRevealVisible = ref(false);
const autoNameRevealName = ref("");
const autoNameRevealShowName = ref(false);

const leaderboard = ref([]);
const leaderboardLoading = ref(false);
const leaderboardMode = ref("local");
const saveStatus = ref("idle");

const roundNumber = ref(0);
const samplesSeen = ref(0);
const correctCount = ref(0);
const streak = ref(0);
const bestStreak = ref(0);
const currentFrame = ref(null);
const currentOptions = ref([]);
const selectedOption = ref("");
const feedback = ref("");
const frameTimeLeftMs = ref(0);
const flashToken = ref(0);
const hitEffect = ref("");
const hitEffectToken = ref(0);
const sessionDurationMs = ref(0);
const sessionStartMs = ref(0);
const sessionTimeLeftMs = ref(aiQuizDurationMs);
const remainingFrames = ref([]);
const selectedSessionFrames = ref([]);
const aiIntroPage = ref(0);
const aiIntroTouchStartX = ref(0);
const aiIntroTouchDeltaX = ref(0);
const aiIntroTotalPages = 4;
const aiOutroPage = ref(0);
const aiOutroTouchStartX = ref(0);
const aiOutroTouchDeltaX = ref(0);
const aiOutroTotalPages = 4;
const outroEmail = ref("");
const outroEmailStatus = ref("idle");
const isStartCountdownVisible = ref(false);
const startCountdownText = ref("");
const isGameOverCelebrationVisible = ref(false);
const gameOverCelebrationToken = ref(0);

const activeAiConfig = computed(() => aiConfigs[activeDifficulty.value]);
const selectedAiConfig = computed(() => aiConfigs[selectedDifficulty.value]);

const modelAccuracy = computed(() => {
  if (!samplesSeen.value) return 0;
  return Math.round((correctCount.value / samplesSeen.value) * 100);
});

const totalRounds = computed(
  () =>
    selectedSessionFrames.value.length ||
    Math.min(aiQuizSampleSize, aiTrainFrames.length),
);

const sessionTimerPercent = computed(() => {
  const elapsed = aiQuizDurationMs - sessionTimeLeftMs.value;
  const ratio = elapsed / aiQuizDurationMs;
  return Math.max(0, Math.min(100, ratio * 100));
});

const sessionSecondsLeft = computed(() =>
  Math.max(0, Math.ceil(sessionTimeLeftMs.value / 1000)),
);

const frameTimerPercent = computed(() => {
  const roundDurationMs = activeAiConfig.value.roundDurationMs;
  if (!roundDurationMs) return 0;
  const ratio = frameTimeLeftMs.value / roundDurationMs;
  return Math.max(0, Math.min(100, ratio * 100));
});

const frameTimerColorClass = computed(() => {
  if (frameTimerPercent.value > 66) return "bg-emerald-500";
  if (frameTimerPercent.value > 33) return "bg-orange-400";
  return "bg-rose-500";
});

const areOptionButtonsDisabled = computed(
  () =>
    phase.value !== "ai-playing" ||
    frameTimeLeftMs.value <= 0 ||
    Boolean(feedback.value),
);
const isGameRunning = computed(() =>
  ["ai-playing", "it-playing", "quiz-playing"].includes(phase.value),
);

const currentPlayerName = computed(() => {
  const cleaned = nickname.value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 24) : "Gost";
});

const selectedDifficultyLabel = computed(() => selectedAiConfig.value.label);
const revealedNameClass = computed(() => {
  const length = autoNameRevealName.value.length;

  if (length > 26) {
    return "text-[clamp(0.95rem,4.8vw,1.55rem)] tracking-[0.05em]";
  }

  if (length > 20) {
    return "text-[clamp(1.1rem,5.6vw,1.8rem)] tracking-[0.06em]";
  }

  return "text-[clamp(1.3rem,6.2vw,2.15rem)] tracking-[0.08em]";
});

const finalLine = computed(
  () =>
    `Your data trained the AI to ${modelAccuracy.value}%. Imagine building real AI here.`,
);
const outroEmailStatusText = computed(() => {
  if (outroEmailStatus.value === "saving") return "Spremam email...";
  if (outroEmailStatus.value === "saved")
    return "Hvala! Poslat ćemo ti više detalja.";
  if (outroEmailStatus.value === "invalid")
    return "Upiši ispravnu email adresu ili stisni Zatvori.";
  if (outroEmailStatus.value === "error")
    return "Spremanje nije uspjelo. Pokušaj ponovno.";
  return "";
});

let roundTimeoutId = 0;
let frameTickId = 0;
let feedbackTimeoutId = 0;
let roundDeadlineMs = 0;
let sessionTickId = 0;
let sessionTimeoutId = 0;
let sessionDeadlineMs = 0;
let startCountdownIntervalId = 0;
let startCountdownFinishId = 0;
let hitEffectTimeoutId = 0;
let autoNameRevealPauseId = 0;
let autoNameRevealFinishId = 0;
let gameOverCelebrationTimeoutId = 0;
let roundResolved = false;

const syncFrameTimeLeft = () => {
  frameTimeLeftMs.value = Math.max(0, roundDeadlineMs - Date.now());
};

const syncSessionTimeLeft = () => {
  sessionTimeLeftMs.value = Math.max(0, sessionDeadlineMs - Date.now());
};

const startSessionTimer = () => {
  window.clearInterval(sessionTickId);
  window.clearTimeout(sessionTimeoutId);

  sessionDeadlineMs = Date.now() + aiQuizDurationMs;
  syncSessionTimeLeft();

  sessionTickId = window.setInterval(() => {
    syncSessionTimeLeft();
  }, 30);

  sessionTimeoutId = window.setTimeout(() => {
    sessionTimeLeftMs.value = 0;
    if (phase.value === "ai-playing") {
      void finishAiTraining();
    }
  }, aiQuizDurationMs);
};

const clearTimers = () => {
  window.clearTimeout(roundTimeoutId);
  window.clearInterval(frameTickId);
  window.clearTimeout(feedbackTimeoutId);
  window.clearInterval(sessionTickId);
  window.clearTimeout(sessionTimeoutId);
  window.clearInterval(startCountdownIntervalId);
  window.clearTimeout(startCountdownFinishId);
  window.clearTimeout(hitEffectTimeoutId);
  window.clearTimeout(autoNameRevealPauseId);
  window.clearTimeout(autoNameRevealFinishId);
  window.clearTimeout(gameOverCelebrationTimeoutId);

  roundTimeoutId = 0;
  frameTickId = 0;
  feedbackTimeoutId = 0;
  sessionTickId = 0;
  sessionTimeoutId = 0;
  startCountdownIntervalId = 0;
  startCountdownFinishId = 0;
  hitEffectTimeoutId = 0;
  autoNameRevealPauseId = 0;
  autoNameRevealFinishId = 0;
  gameOverCelebrationTimeoutId = 0;
  roundDeadlineMs = 0;
  sessionDeadlineMs = 0;
  isStartCountdownVisible.value = false;
  startCountdownText.value = "";
  hitEffect.value = "";
  isGameOverCelebrationVisible.value = false;
  isAutoNameRevealVisible.value = false;
  autoNameRevealShowName.value = false;
  autoNameRevealName.value = "";
};

const shuffle = (array) => {
  const copied = [...array];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const tmp = copied[index];
    copied[index] = copied[swapIndex];
    copied[swapIndex] = tmp;
  }

  return copied;
};

const refreshLeaderboard = async () => {
  leaderboardLoading.value = true;

  try {
    const { mode, scores } = await fetchTopScores(8);
    leaderboardMode.value = mode;
    leaderboard.value = scores;
  } finally {
    leaderboardLoading.value = false;
  }
};

const pickOptions = (correctLabel) => {
  const optionCount = activeAiConfig.value.optionCount;
  const distractors = shuffle(
    aiTrainLabels.filter((label) => label !== correctLabel),
  );
  return shuffle([correctLabel, ...distractors.slice(0, optionCount - 1)]);
};

const refillRemainingFrames = (excludeFrameId = "") => {
  const sourceFrames = selectedSessionFrames.value.length
    ? selectedSessionFrames.value
    : aiTrainFrames;
  remainingFrames.value = shuffle(sourceFrames);

  if (
    excludeFrameId &&
    remainingFrames.value.length > 1 &&
    remainingFrames.value[remainingFrames.value.length - 1].id ===
      excludeFrameId
  ) {
    const replacementIndex = Math.floor(
      Math.random() * (remainingFrames.value.length - 1),
    );
    const lastIndex = remainingFrames.value.length - 1;
    const tmp = remainingFrames.value[lastIndex];
    remainingFrames.value[lastIndex] = remainingFrames.value[replacementIndex];
    remainingFrames.value[replacementIndex] = tmp;
  }
};

const drawNextFrame = () => {
  const previousFrameId = currentFrame.value?.id ?? "";

  if (!remainingFrames.value.length) {
    refillRemainingFrames(previousFrameId);
  }

  return (
    remainingFrames.value.pop() ??
    selectedSessionFrames.value[0] ??
    aiTrainFrames[0]
  );
};

const prepareSessionFrames = () => {
  selectedSessionFrames.value = shuffle(aiTrainFrames).slice(
    0,
    Math.min(aiQuizSampleSize, aiTrainFrames.length),
  );
};

const resetAiSession = () => {
  clearTimers();

  roundNumber.value = 0;
  samplesSeen.value = 0;
  correctCount.value = 0;
  streak.value = 0;
  bestStreak.value = 0;
  currentFrame.value = null;
  currentOptions.value = [];
  selectedOption.value = "";
  feedback.value = "";
  flashToken.value = 0;
  saveStatus.value = "idle";
  refillRemainingFrames();

  frameTimeLeftMs.value = activeAiConfig.value.roundDurationMs;
  sessionTimeLeftMs.value = aiQuizDurationMs;
  sessionDurationMs.value = 0;
};

const finishAiTraining = async () => {
  if (phase.value === "ai-finished") {
    return;
  }

  clearTimers();
  aiOutroPage.value = 0;
  outroEmail.value = "";
  outroEmailStatus.value = "idle";
  phase.value = "ai-finished";
  sessionDurationMs.value = Math.max(0, Date.now() - sessionStartMs.value);
  isGameOverCelebrationVisible.value = true;
  gameOverCelebrationToken.value += 1;
  gameOverCelebrationTimeoutId = window.setTimeout(() => {
    isGameOverCelebrationVisible.value = false;
    gameOverCelebrationTimeoutId = 0;
  }, 2000);
  saveStatus.value = "saving";

  try {
    const { mode } = await submitScore({
      name: currentPlayerName.value,
      score: modelAccuracy.value,
      durationMs: sessionDurationMs.value,
      streak: bestStreak.value,
    });

    leaderboardMode.value = mode;
    saveStatus.value = "saved";
  } catch {
    saveStatus.value = "error";
  }

  await refreshLeaderboard();
};

const scheduleNextRound = () => {
  window.clearTimeout(feedbackTimeoutId);
  feedbackTimeoutId = window.setTimeout(() => {
    feedbackTimeoutId = 0;

    if (phase.value !== "ai-playing") {
      return;
    }

    if (samplesSeen.value >= totalRounds.value || sessionTimeLeftMs.value <= 0) {
      void finishAiTraining();
      return;
    }

    startRound();
  }, activeAiConfig.value.feedbackMs);
};

const confettiPieces = Array.from({ length: 32 }, (_, index) => index);
const confettiPalette = [
  "#50d2fe",
  "#22c55e",
  "#facc15",
  "#fb7185",
  "#a78bfa",
  "#f97316",
  "#ffffff",
];

const confettiPieceStyle = (index) => {
  const left = 2 + ((index * 29) % 96);
  const duration = 780 + (index % 7) * 90;
  const delay = (index % 6) * 30;
  const drift = (index % 2 === 0 ? 1 : -1) * (16 + (index % 5) * 10);

  return {
    left: `${left}%`,
    backgroundColor: confettiPalette[index % confettiPalette.length],
    animationDuration: `${duration}ms`,
    animationDelay: `${delay}ms`,
    "--confetti-drift": `${drift}px`,
  };
};

const triggerHitEffect = (type) => {
  window.clearTimeout(hitEffectTimeoutId);
  hitEffect.value = type;
  hitEffectToken.value += 1;

  hitEffectTimeoutId = window.setTimeout(() => {
    hitEffect.value = "";
    hitEffectTimeoutId = 0;
  }, 950);
};

const resolveRound = (selectedLabel) => {
  if (phase.value !== "ai-playing" || !currentFrame.value || roundResolved) {
    return;
  }
  roundResolved = true;

  syncFrameTimeLeft();
  window.clearTimeout(roundTimeoutId);
  window.clearInterval(frameTickId);

  samplesSeen.value += 1;
  selectedOption.value = selectedLabel ?? "";
  const isCorrect = selectedLabel === currentFrame.value.label;

  if (isCorrect) {
    correctCount.value += 1;
    streak.value += 1;
    bestStreak.value = Math.max(bestStreak.value, streak.value);
    feedback.value = "correct";
    triggerHitEffect("correct");
  } else {
    streak.value = 0;
    feedback.value = selectedLabel ? "wrong" : "timeout";
    if (selectedLabel) triggerHitEffect("wrong");
  }

  scheduleNextRound();
};

const selectLabel = (label) => {
  resolveRound(label);
};

const startRound = () => {
  if (samplesSeen.value >= totalRounds.value || sessionTimeLeftMs.value <= 0) {
    void finishAiTraining();
    return;
  }

  roundResolved = false;
  window.clearTimeout(feedbackTimeoutId);
  feedbackTimeoutId = 0;
  window.clearTimeout(roundTimeoutId);
  window.clearInterval(frameTickId);

  roundNumber.value += 1;
  const frame = drawNextFrame();

  currentFrame.value = frame;
  currentOptions.value = pickOptions(frame.label);
  selectedOption.value = "";
  feedback.value = "";
  flashToken.value += 1;

  roundDeadlineMs = Date.now() + activeAiConfig.value.roundDurationMs;
  syncFrameTimeLeft();

  frameTickId = window.setInterval(() => {
    syncFrameTimeLeft();
  }, 30);

  roundTimeoutId = window.setTimeout(() => {
    frameTimeLeftMs.value = 0;
    resolveRound(null);
  }, activeAiConfig.value.roundDurationMs);
};

const openHome = () => {
  clearTimers();
  phase.value = "home";
};

const openLeaderboard = async () => {
  phase.value = "leaderboard";
  await refreshLeaderboard();
};

const openAiIntro = () => {
  aiIntroPage.value = 0;
  phase.value = "ai-intro";
  window.requestAnimationFrame(scrollPageToTop);
};

const scrollPageToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  const scrollingRoot = document.scrollingElement;
  if (scrollingRoot) {
    scrollingRoot.scrollTop = 0;
    scrollingRoot.scrollLeft = 0;
  }

  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;
};

const continueStartingSelectedGame = () => {
  if (selectedGameType.value === "ai") {
    openAiIntro();
    return;
  }

  if (selectedGameType.value === "it") {
    phase.value = "it-soon";
    return;
  }

  phase.value = "leaderboard-soon";
};

const revealGeneratedNameAndContinue = () => {
  window.clearTimeout(autoNameRevealPauseId);
  window.clearTimeout(autoNameRevealFinishId);

  isAutoNameRevealVisible.value = true;
  autoNameRevealShowName.value = false;
  autoNameRevealName.value = nickname.value;

  autoNameRevealPauseId = window.setTimeout(() => {
    autoNameRevealShowName.value = true;
    autoNameRevealPauseId = 0;
  }, 1000);

  autoNameRevealFinishId = window.setTimeout(() => {
    isAutoNameRevealVisible.value = false;
    autoNameRevealShowName.value = false;
    autoNameRevealName.value = "";
    autoNameRevealFinishId = 0;
    isNicknameModalOpen.value = false;
    continueStartingSelectedGame();
  }, 4000);
};

const confirmNicknameAndStartGame = () => {
  const cleaned = nicknameDraft.value.trim().replace(/\s+/g, " ");
  if (cleaned) {
    nickname.value = cleaned.slice(0, 24);
    isNicknameModalOpen.value = false;
    continueStartingSelectedGame();
    return;
  }

  nickname.value = generateRandomNickname();
  revealGeneratedNameAndContinue();
};

const goBackFromNicknameModal = () => {
  window.clearTimeout(autoNameRevealPauseId);
  window.clearTimeout(autoNameRevealFinishId);
  autoNameRevealPauseId = 0;
  autoNameRevealFinishId = 0;
  isAutoNameRevealVisible.value = false;
  autoNameRevealShowName.value = false;
  autoNameRevealName.value = "";
  isNicknameModalOpen.value = false;
};

const beginAiTraining = () => {
  clearTimers();
  const countdownSteps = ["3", "2", "1", "GO!"];
  let countdownIndex = 0;

  isStartCountdownVisible.value = true;
  startCountdownText.value = countdownSteps[countdownIndex];

  startCountdownIntervalId = window.setInterval(() => {
    countdownIndex += 1;
    startCountdownText.value = countdownSteps[countdownIndex] ?? "GO!";

    if (countdownIndex < countdownSteps.length - 1) return;

    window.clearInterval(startCountdownIntervalId);
    startCountdownIntervalId = 0;

    startCountdownFinishId = window.setTimeout(() => {
      isStartCountdownVisible.value = false;
      startCountdownText.value = "";
      startCountdownFinishId = 0;

      activeDifficulty.value = selectedDifficulty.value;
      prepareSessionFrames();
      resetAiSession();
      sessionStartMs.value = Date.now();
      startSessionTimer();
      phase.value = "ai-playing";
      startRound();
    }, 700);
  }, 900);
};

const nextAiIntroPage = () => {
  scrollPageToTop();
  aiIntroPage.value = Math.min(aiIntroPage.value + 1, aiIntroTotalPages - 1);
};

const prevAiIntroPage = () => {
  aiIntroPage.value = Math.max(aiIntroPage.value - 1, 0);
};

const setAiIntroPage = (index) => {
  aiIntroPage.value = Math.max(0, Math.min(index, aiIntroTotalPages - 1));
};

const onAiIntroTouchStart = (event) => {
  aiIntroTouchStartX.value = event.changedTouches[0]?.clientX ?? 0;
  aiIntroTouchDeltaX.value = 0;
};

const onAiIntroTouchMove = (event) => {
  const currentX = event.changedTouches[0]?.clientX ?? aiIntroTouchStartX.value;
  aiIntroTouchDeltaX.value = currentX - aiIntroTouchStartX.value;
};

const onAiIntroTouchEnd = () => {
  const threshold = 55;
  if (aiIntroTouchDeltaX.value <= -threshold) nextAiIntroPage();
  if (aiIntroTouchDeltaX.value >= threshold) prevAiIntroPage();
  aiIntroTouchStartX.value = 0;
  aiIntroTouchDeltaX.value = 0;
};

const nextAiOutroPage = () => {
  scrollPageToTop();
  aiOutroPage.value = Math.min(aiOutroPage.value + 1, aiOutroTotalPages - 1);
};

const prevAiOutroPage = () => {
  aiOutroPage.value = Math.max(aiOutroPage.value - 1, 0);
};

const setAiOutroPage = (index) => {
  aiOutroPage.value = Math.max(0, Math.min(index, aiOutroTotalPages - 1));
};

const onAiOutroTouchStart = (event) => {
  aiOutroTouchStartX.value = event.changedTouches[0]?.clientX ?? 0;
  aiOutroTouchDeltaX.value = 0;
};

const onAiOutroTouchMove = (event) => {
  const currentX = event.changedTouches[0]?.clientX ?? aiOutroTouchStartX.value;
  aiOutroTouchDeltaX.value = currentX - aiOutroTouchStartX.value;
};

const onAiOutroTouchEnd = () => {
  const threshold = 55;
  if (aiOutroTouchDeltaX.value <= -threshold) nextAiOutroPage();
  if (aiOutroTouchDeltaX.value >= threshold) prevAiOutroPage();
  aiOutroTouchStartX.value = 0;
  aiOutroTouchDeltaX.value = 0;
};

const submitOutroEmail = async () => {
  const normalizedEmail = outroEmail.value.trim().toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizedEmail);

  if (!isValid) {
    outroEmailStatus.value = "invalid";
    return;
  }

  outroEmailStatus.value = "saving";

  try {
    await submitInterestEmail({
      email: normalizedEmail,
      source: "ai-quiz-outro",
    });
    outroEmailStatus.value = "saved";
    outroEmail.value = "";
  } catch {
    outroEmailStatus.value = "error";
  }
};

const closeAiOutro = () => {
  outroEmail.value = "";
  outroEmailStatus.value = "idle";
  openHome();
};

const startSelectedGame = () => {
  nicknameDraft.value = nickname.value;
  isNicknameModalOpen.value = true;
};

const optionButtonClass = (label) => {
  if (!selectedOption.value || selectedOption.value !== label) {
    return "";
  }

  return feedback.value === "correct"
    ? "animate-option-correct border-emerald-500"
    : feedback.value === "wrong"
      ? "animate-option-wrong border-rose-500"
      : "";
};

onMounted(async () => {
  await refreshLeaderboard();
});

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-sky-100 text-slate-900">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(14,165,233,0.24)_1.2px,transparent_1.2px),linear-gradient(180deg,#e6f6ff_0%,#d4eeff_100%)] [background-size:18px_18px,100%_100%]" />
    <div
      class="pointer-events-none absolute -left-28 top-4 hidden h-80 w-80 rounded-full bg-cyan-300/45 blur-3xl animate-orbital md:block" />
    <div
      class="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl animate-orbital-delayed" />

    <section
      class="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-0 pt-5 md:px-8 md:pb-8">
      <header
        v-if="phase !== 'ai-playing'"
        class="mb-4 flex h-32 flex-col items-center justify-center p-0 md:mb-3 md:mx-auto md:h-36 md:w-[88%] lg:h-40 lg:w-[82%]">
        <img
          src="/fipu-games-logo.png"
          alt="FIPU Games logo"
          class="h-full w-full object-contain" />
      </header>

      <Transition name="page-swap" mode="out-in">
        <section
          v-if="phase === 'home'"
          key="home"
          class="mx-auto mb-6 w-full max-w-3xl md:mb-8">
          <article
            class="rounded-3xl border border-cyan-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur md:p-6">
            <div
              class="mb-5 rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-4">
              <h2
                class="font-title text-3xl font-bold text-cyan-900 md:text-4xl">
                Bok!
              </h2>
              <p
                class="mt-2 text-sm leading-relaxed text-slate-800 md:text-base">
                Hvala ti što si skenirao ovaj QR kod. Želimo ti predstaviti
                <b>Fakultet informatike u Puli</b> — tko smo, čime se bavimo i
                što možeš očekivati tijekom studija.
              </p>
              <p
                class="mt-3 text-sm leading-relaxed text-slate-800 md:text-base">
                Odaberi jednu od dvije igrice u nastavku. Usput ćeš saznati
                nešto o našem fakultetu, umjetnoj inteligenciji, i IT-u
                općenito, a ako uspješno prijeđeš <i>Hard razinu</i> jedne
                igrice, čeka te i mali poklon!
              </p>
            </div>

            <p
              class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
              Odaberi igru i saznaj više o FIPU
            </p>

            <div class="mt-4 grid gap-3">
              <button
                v-for="game in gameTypes"
                :key="game.id"
                type="button"
                class="cursor-pointer rounded-2xl border px-4 py-3 text-left transition"
                :class="
                  selectedGameType === game.id
                    ? 'border-cyan-500 bg-cyan-100/80'
                    : 'border-cyan-200 bg-white hover:bg-cyan-50'
                "
                @click="selectedGameType = game.id">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="font-title text-lg font-bold text-cyan-900">
                      {{ game.title }}
                    </p>
                    <p class="mt-1 text-sm text-slate-700">
                      {{ game.description }}
                    </p>
                  </div>
                  <img
                    v-if="gameCardGifs[game.id]"
                    :src="gameCardGifs[game.id]"
                    :alt="`${game.title} gif`"
                    class="h-16 w-16 shrink-0 rounded-xl object-contain" />
                </div>
              </button>
            </div>

            <div
              class="mt-5 rounded-2xl border border-cyan-200/70 bg-cyan-50/75 p-4">
              <div class="flex gap-2">
                <button
                  v-for="difficulty in difficultyOptions"
                  :key="difficulty.id"
                  type="button"
                  class="cursor-pointer flex-1 rounded-xl border px-4 py-2 text-center text-sm font-semibold uppercase tracking-[0.08em] transition"
                  :class="
                    difficulty.id === 'easy'
                      ? selectedDifficulty === difficulty.id
                        ? 'border-emerald-600 bg-emerald-200 text-emerald-900'
                        : 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100'
                      : selectedDifficulty === difficulty.id
                        ? 'border-rose-600 bg-rose-200 text-rose-900'
                        : 'border-rose-300 bg-white text-rose-800 hover:bg-rose-100'
                  "
                  @click="selectedDifficulty = difficulty.id">
                  {{ difficulty.label }}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="cursor-pointer mt-5 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 text-center font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="startSelectedGame">
              Započni igru
            </button>

            <button
              type="button"
              class="cursor-pointer mt-3 mb-5 w-full rounded-2xl border border-cyan-500 bg-white px-5 py-3 text-center font-title text-base font-bold uppercase tracking-[0.12em] text-cyan-900 transition hover:bg-cyan-50"
              @click="openLeaderboard">
              Leaderboard
            </button>
          </article>
        </section>

        <section
          v-else-if="phase === 'leaderboard'"
          key="leaderboard"
          class="mx-auto w-full max-w-3xl">
          <article
            class="rounded-3xl border border-cyan-200/70 bg-white/90 p-4 shadow-[0_14px_40px_rgba(80,210,254,0.16)] md:p-5">
            <div class="flex items-center justify-between">
              <h2 class="font-title text-xl font-bold text-cyan-900">
                Leaderboard
              </h2>
              <span class="text-xs uppercase tracking-[0.14em] text-cyan-700"
                >{{ leaderboard.length }} listed</span
              >
            </div>

            <p v-if="leaderboardLoading" class="mt-4 text-sm text-cyan-800">
              Loading models...
            </p>
            <p
              v-else-if="leaderboard.length === 0"
              class="mt-4 text-sm text-cyan-800">
              Još nema rezultata.
            </p>

            <ol v-else class="mt-4 space-y-2">
              <li
                v-for="(entry, index) in leaderboard"
                :key="`${entry.name}-${entry.createdAt}-${index}`"
                class="flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50/80 px-3 py-2">
                <span class="text-sm font-semibold text-slate-800"
                  >{{ index + 1 }}. {{ entry.name }}</span
                >
                <span class="font-title text-lg font-bold text-cyan-800"
                  >{{ entry.score }}%</span
                >
              </li>
            </ol>

            <button
              type="button"
              class="cursor-pointer mt-6 rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="openHome">
              Natrag na odabir
            </button>
          </article>
        </section>

        <section
          v-else-if="phase === 'ai-intro'"
          key="ai-intro"
          class="mx-auto w-full max-w-md">
          <article
            class="overflow-hidden rounded-3xl border border-cyan-200/70 bg-white/90 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur">
            <div
              class="overflow-hidden"
              @touchstart="onAiIntroTouchStart"
              @touchmove="onAiIntroTouchMove"
              @touchend="onAiIntroTouchEnd">
              <div
                class="flex transition-transform duration-300 ease-out"
                :style="{ transform: `translateX(-${aiIntroPage * 100}%)` }">
                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/robot-wave-gif.gif"
                    alt="AI robot"
                    class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
                  <div
                    class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
                    <h3 class="font-title text-xl font-bold text-cyan-900">
                      Umjetna inteligencija
                    </h3>
                    <p class="mt-2">
                      Umjetna inteligencija, odnosno AI, tema je o kojoj danas
                      svi pričaju. Pomaže nam u učenju, pisanju zadaća,
                      stvaranju slika, glazbe i videozapisa, pa čak i u mnogo
                      kompleksnijim stvarima, poput razvoja novih lijekova.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                    @click="nextAiIntroPage">
                    Dalje
                  </button>
                </section>

                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/ai-gpt-gif.gif"
                    alt="AI model"
                    class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
                  <div
                    class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
                    <h3 class="font-title text-xl font-bold text-cyan-900">
                      Što je ustvari umjetna inteligencija?
                    </h3>
                    <p class="mt-2">
                      Pojednostavljeno rečeno, umjetnu inteligenciju možemo
                      zamisliti kao složeni matematički model koji, oslanjajući
                      se na veliku količinu podataka koje je „vidio” te snažnu
                      računalnu obradu, nastoji predvidjeti najbolji mogući
                      rezultat ili odgovor na neki upit.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                    @click="nextAiIntroPage">
                    Dalje
                  </button>
                </section>

                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/ai-walk-gif.gif"
                    alt="AI uči hodati"
                    class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
                  <div
                    class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
                    <h3 class="font-title text-xl font-bold text-cyan-900">
                      Treniranje AI-a
                    </h3>
                    <p class="mt-2">
                      Zamislimo da je AI naša mala beba-robot koja uči hodati.
                      Moramo mu na stotine puta pokazati kako se hoda, koja je
                      noga lijeva, a koja desna, što znači korak unaprijed, a
                      što korak unazad. Na taj način treniramo AI ispravnim
                      podacima kako bismo ga osamostalili.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                    @click="nextAiIntroPage">
                    Dalje
                  </button>
                </section>

                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/ai-see-learn-gif.gif"
                    alt="AI raspoznaje slike"
                    class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
                  <div
                    class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
                    <h3 class="font-title text-xl font-bold text-cyan-900">
                      Kako AI raspoznaje slike?
                    </h3>
                    <p class="mt-2">
                      Ipak, suvremeni AI danas može i gledati, slušati, pa čak i
                      govoriti. Priznaj, barem jednom si popričao s ChatGPT-em!
                    </p>
                    <p class="mt-2">
                      Cilj ove igre je što brže odabrati točnu oznaku za svaku
                      sliku. Na ovaj način možete vidjeti kako umjetna
                      inteligencija uči prepoznavati slike: treba joj puno
                      ponavljanja i mnogo sličnih primjera!
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl border border-cyan-400/70 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-100/75"
                    @click="beginAiTraining">
                    ZAPOČNI TRENING 🏋️‍♀️
                  </button>
                </section>
              </div>
            </div>

            <div class="pb-4">
              <div class="flex items-center justify-center gap-2">
                <button
                  v-for="dotIndex in aiIntroTotalPages"
                  :key="`ai-intro-dot-${dotIndex}`"
                  type="button"
                  class="cursor-pointer h-2.5 w-2.5 rounded-full transition"
                  :class="
                    aiIntroPage === dotIndex - 1
                      ? 'bg-cyan-700 scale-110'
                      : 'bg-cyan-200 hover:bg-cyan-300'
                  "
                  :aria-label="`Idi na stranicu ${dotIndex}`"
                  @click="setAiIntroPage(dotIndex - 1)" />
              </div>
              <button
                type="button"
                class="cursor-pointer mt-3 block mx-auto text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 underline decoration-cyan-400 underline-offset-4"
                @click="openHome">
                Natrag
              </button>
            </div>
          </article>
        </section>

        <section
          v-else-if="phase === 'ai-playing'"
          key="ai-playing"
          class="mx-auto w-full max-w-5xl">
          <div class="mb-2 grid grid-cols-2 gap-2 md:mb-3 md:grid-cols-4">
            <div
              class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
              <p
                class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">
                Točnost modela
              </p>
              <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">
                {{ modelAccuracy }}%
              </p>
            </div>
            <div
              class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
              <p
                class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">
                Uzorci
              </p>
              <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">
                {{ samplesSeen }}/{{ totalRounds }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
              <p
                class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">
                Streak
              </p>
              <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">
                {{ streak }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
              <p
                class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">
                Težina
              </p>
              <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">
                {{ activeAiConfig.label }}
              </p>
            </div>
          </div>

          <div
            class="relative overflow-hidden rounded-3xl border border-cyan-300/80 bg-white/90 shadow-[0_22px_58px_rgba(80,210,254,0.18)] backdrop-blur"
            :class="
              hitEffect === 'wrong'
                ? 'animate-impact ring-2 ring-rose-400/80'
                : ''
            ">
            <div class="h-1 w-full bg-white">
              <div
                class="h-full"
                :class="frameTimerColorClass"
                :style="{ width: `${frameTimerPercent}%` }" />
            </div>

            <div class="p-4 md:p-5">
              <div
                class="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-cyan-800">
                <span>Session timer</span>
                <span>{{ sessionSecondsLeft }}s</span>
              </div>
              <div
                class="mb-4 h-2 w-full overflow-hidden rounded-full bg-cyan-100">
                <div
                  class="h-full bg-emerald-400 transition-[width] duration-75 ease-linear"
                  :style="{ width: `${sessionTimerPercent}%` }" />
              </div>

              <transition name="vision-flash" mode="out-in">
                <article
                  :key="flashToken"
                  class="relative mx-auto flex h-72 w-full max-w-3xl items-center justify-center overflow-hidden rounded-3xl bg-transparent p-6 md:h-80 md:p-8">
                  <div
                    class="relative h-full max-h-60 w-full max-w-60 overflow-hidden rounded-xl border border-cyan-200 md:max-h-64 md:max-w-64">
                    <div
                      class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(80,210,254,0.06),rgba(255,255,255,0.2)),repeating-linear-gradient(0deg,rgba(80,210,254,0.09),rgba(80,210,254,0.09)_2px,transparent_2px,transparent_10px)]" />
                    <div
                      class="pointer-events-none absolute inset-y-0 left-[-35%] w-1/2 bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent animate-scanline" />
                    <img
                      v-if="currentFrame"
                      :src="currentFrame.path"
                      :alt="`Slika: ${currentFrame.label}`"
                      class="relative z-10 h-full w-full bg-transparent object-contain" />
                  </div>
                </article>
              </transition>

              <div class="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  v-for="label in currentOptions"
                  :key="`option-${roundNumber}-${label}`"
                  type="button"
                  class="cursor-pointer rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-left font-title text-lg font-bold uppercase tracking-[0.14em] text-cyan-900 transition hover:-translate-y-0.5 hover:border-cyan-500 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-75 disabled:hover:translate-y-0 disabled:hover:border-slate-300 disabled:hover:bg-slate-100"
                  :disabled="areOptionButtonsDisabled"
                  :class="optionButtonClass(label)"
                  @click="selectLabel(label)">
                  {{ label }}
                </button>
              </div>
            </div>

            <section
              v-if="hitEffect"
              :key="`hit-effect-${hitEffectToken}`"
              class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              <template v-if="hitEffect === 'correct'">
                <span
                  v-for="piece in confettiPieces"
                  :key="`confetti-${hitEffectToken}-${piece}`"
                  class="confetti-piece"
                  :style="confettiPieceStyle(piece)" />
              </template>
              <template v-else>
                <div class="wrong-flash-screen" />
                <div class="wrong-cross" />
              </template>
            </section>
          </div>
        </section>

        <section
          v-else-if="phase === 'ai-finished' && !isGameOverCelebrationVisible"
          key="ai-finished"
          class="mx-auto w-full max-w-md">
          <article
            class="overflow-hidden rounded-3xl border border-cyan-200/70 bg-white/90 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur">
            <div
              class="overflow-hidden"
              @touchstart="onAiOutroTouchStart"
              @touchmove="onAiOutroTouchMove"
              @touchend="onAiOutroTouchEnd">
              <div
                class="flex transition-transform duration-300 ease-out"
                :style="{ transform: `translateX(-${aiOutroPage * 100}%)` }">
                <section class="w-full shrink-0 p-4 sm:p-5">
                  <h3
                    class="text-center font-title text-xl font-bold text-cyan-900">
                    Problem klasifikacije
                  </h3>
                  <img
                    src="/classify.png"
                    alt="Klasifikacija"
                    class="mx-auto mt-3 h-36 w-full max-w-xs rounded-2xl object-contain sm:h-40" />
                  <div
                    class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      Ovaj problem u svijetu umjetne inteligencije zove se
                      problem klasifikacije - dodjeljivanje ispravne labele
                      (naziva) određenoj slici.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                    @click="nextAiOutroPage">
                    Dalje
                  </button>
                </section>

                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/robot-wave-gif.gif"
                    alt="Robot"
                    class="mx-auto h-44 w-full max-w-xs rounded-2xl object-contain sm:h-48" />
                  <div
                    class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      Ti si sada klasificirao/la ukupno {{ totalRounds }} slika,
                      od toga uspješno
                      <span class="font-semibold text-cyan-900">{{
                        correctCount
                      }}</span
                      >. Dakle točnost klasifikacije je
                      <span class="font-semibold text-cyan-900"
                        >{{ modelAccuracy }}%</span
                      >. Na slikama su bili opće-poznati objekti, i ne bismo
                      imali problema klasificirati sličan objekt. Npr. kada
                      bismo vidjeli još jednu automobila, znali bismo da je to
                      automobil bez puno razmišljanja.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                    @click="nextAiOutroPage">
                    Dalje
                  </button>
                </section>

                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/ai-learn-gif.gif"
                    alt="AI učenje"
                    class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
                  <div
                    class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-4 text-sm leading-relaxed text-slate-700">
                    <p>
                      Ipak, umjetnoj inteligenciji treba malo više primjera.
                      Njoj nije dovoljno da vidi 10tak auti, niti 20... Već na
                      stotine tisuća ili milijuna primjera. Iz tog razloga,
                      treniranje umjetne inteligencije je skupo i zahtjeva
                      značajne računalne resurse - i to samo za jednostavni
                      primjer klasifikacije slika!
                    </p>
                  </div>
                  <button
                    type="button"
                    class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                    @click="nextAiOutroPage">
                    Dalje
                  </button>
                </section>

                <section class="w-full shrink-0 p-4 sm:p-5">
                  <img
                    src="/fipu_student_diploma.gif"
                    alt="FIPU student diploma"
                    class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
                  <div
                    class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-4 text-sm leading-relaxed text-slate-700">
                    <h3 class="font-title text-xl font-bold text-cyan-900">
                      Studiraj na FIPU
                    </h3>
                    <p class="mt-2">
                      Želiš naučiti više? Zanima te AI? Sviđa ti se ova
                      interaktivna igrica?
                    </p>
                    <p class="mt-2">
                      Naši studenti završetkom studija samostalno izrađuju
                      ovakve aplikacije, treniraju svoje AI modele, uspješno
                      rade interaktivne video igrice, modernim Blockchain
                      tehnologijama i mnogo toga drugog.
                    </p>
                    <p class="mt-2">
                      Ako želiš saznati više, ostavi nam ispod tvoju e-mail
                      adresu i poslat ćemo ti mail s više detalja. Bez brige,
                      nećemo spammati!
                    </p>
                  </div>

                  <label
                    for="outro-email"
                    class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800">
                    Email (opcionalno)
                  </label>
                  <input
                    id="outro-email"
                    v-model="outroEmail"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    placeholder="npr. ime.prezime@gmail.com"
                    class="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300/45 md:text-sm"
                    @keyup.enter="submitOutroEmail" />

                  <p
                    v-if="outroEmailStatusText"
                    class="mt-2 text-sm text-cyan-900">
                    {{ outroEmailStatusText }}
                  </p>

                  <div class="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      class="cursor-pointer flex-1 rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-75"
                      :disabled="outroEmailStatus === 'saving'"
                      @click="submitOutroEmail">
                      Pošalji email
                    </button>
                    <button
                      type="button"
                      class="cursor-pointer flex-1 rounded-2xl border border-cyan-400/70 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-100/75"
                      @click="closeAiOutro">
                      Zatvori
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <div class="pb-4">
              <div class="flex items-center justify-center gap-2">
                <button
                  v-for="dotIndex in aiOutroTotalPages"
                  :key="`ai-outro-dot-${dotIndex}`"
                  type="button"
                  class="cursor-pointer h-2.5 w-2.5 rounded-full transition"
                  :class="
                    aiOutroPage === dotIndex - 1
                      ? 'bg-cyan-700 scale-110'
                      : 'bg-cyan-200 hover:bg-cyan-300'
                  "
                  :aria-label="`Idi na stranicu ${dotIndex}`"
                  @click="setAiOutroPage(dotIndex - 1)" />
              </div>
              <button
                v-if="aiOutroPage > 0"
                type="button"
                class="cursor-pointer mt-3 block mx-auto text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 underline decoration-cyan-400 underline-offset-4"
                @click="prevAiOutroPage">
                Natrag
              </button>
            </div>
          </article>
        </section>

        <section v-else key="coming-soon" class="mx-auto w-full max-w-3xl">
          <article
            class="rounded-3xl border border-cyan-200/70 bg-white/90 p-6 text-center shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur">
            <p
              class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
              Uskoro
            </p>
            <h2
              class="mt-4 font-title text-2xl font-bold text-slate-900 md:text-3xl">
              {{ phase === "it-soon" ? "IT kviz" : "Leaderboard" }}
            </h2>
            <p class="mt-3 text-sm text-slate-700 md:text-base">
              Odabrana težina:
              <span class="font-semibold text-cyan-900">{{
                selectedDifficultyLabel
              }}</span>
            </p>
            <p class="mt-2 text-sm text-slate-700 md:text-base">
              Ovaj dio implementiramo u sljedećem koraku.
            </p>

            <button
              type="button"
              class="cursor-pointer mt-6 rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="openHome">
              Natrag na odabir
            </button>
          </article>
        </section>
      </Transition>

      <section
        v-if="isNicknameModalOpen"
        class="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
        <article
          class="w-full max-w-md rounded-3xl border border-cyan-200/70 bg-white p-5 shadow-[0_18px_50px_rgba(80,210,254,0.24)]">
          <template v-if="!isAutoNameRevealVisible">
            <h2 class="font-title text-2xl font-bold text-cyan-900">Nadimak</h2>
            <p class="mt-2 text-sm text-slate-700">
              Unesi nadimak za leaderboard. Ako nastaviš bez imena, dobit ćeš
              nasumični.
            </p>

            <label
              for="nickname-modal"
              class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800">
              Nadimak (opcionalno)
            </label>
            <input
              id="nickname-modal"
              v-model="nicknameDraft"
              type="text"
              maxlength="24"
              placeholder="Npr. Luka"
              class="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300/45 md:text-sm"
              @keyup.enter="confirmNicknameAndStartGame" />

            <div class="mt-5 flex gap-2">
              <button
                type="button"
                class="cursor-pointer flex-1 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-cyan-800 transition hover:bg-cyan-100"
                @click="goBackFromNicknameModal">
                Natrag
              </button>
              <button
                type="button"
                class="cursor-pointer flex-1 rounded-xl bg-[#50d2fe] px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-950 transition hover:bg-cyan-200"
                @click="confirmNicknameAndStartGame">
                Nastavi
              </button>
            </div>
          </template>

          <template v-else>
            <p
              class="text-center font-title text-xl font-bold uppercase tracking-[0.1em] text-cyan-900 sm:text-2xl">
              Nazvat ću te...
            </p>
            <p
              v-if="autoNameRevealShowName"
              class="mt-4 max-w-full text-center font-bold uppercase leading-tight text-cyan-900 animate-name-reveal [overflow-wrap:anywhere]"
              :class="revealedNameClass">
              {{ autoNameRevealName }}!
            </p>
          </template>
        </article>
      </section>

      <section
        v-if="isStartCountdownVisible"
        class="fixed inset-0 z-40 flex items-center justify-center bg-cyan-950/80 backdrop-blur-sm">
        <p
          class="font-title text-7xl font-bold uppercase tracking-[0.16em] text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.45)] sm:text-8xl md:text-9xl">
          {{ startCountdownText }}
        </p>
      </section>

      <Teleport to="body">
        <section
          v-if="phase === 'ai-finished' && isGameOverCelebrationVisible"
          :key="`game-over-celebration-${gameOverCelebrationToken}`"
          class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-cyan-950/60 backdrop-blur-sm">
          <img
            src="/success.gif"
            alt="Uspjeh"
            class="h-64 w-64 max-w-[80vw] rounded-3xl object-contain sm:h-72 sm:w-72" />
          <span
            v-for="piece in confettiPieces"
            :key="`game-over-confetti-${gameOverCelebrationToken}-${piece}`"
            class="confetti-piece"
            :style="confettiPieceStyle(piece)" />
        </section>

      </Teleport>

      <footer
        v-if="!isGameRunning"
        class="relative left-1/2 mt-auto w-screen -translate-x-1/2 bg-white pt-6 pb-4 md:pt-2 md:pb-2">
        <div
          class="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-white" />
        <img
          src="/fipu-unipu-logo.png"
          alt="FIPU UNIPU logo"
          class="mx-auto h-auto w-full max-w-5xl object-contain px-4 md:w-auto md:max-w-md md:max-h-16 md:px-0" />
        <div
          class="mt-3 flex flex-col items-center justify-center gap-1 px-4 md:mt-2">
          <a
            href="https://www.unipu.hr/"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer text-center text-base font-medium text-cyan-900 underline decoration-cyan-500 underline-offset-4 hover:text-cyan-700 md:text-base">
            Sveučilište Jurja Dobrile u Puli
          </a>
          <a
            href="https://fipu.unipu.hr/"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer text-center text-base font-medium text-cyan-900 underline decoration-cyan-500 underline-offset-4 hover:text-cyan-700 md:text-base">
            Fakultet informatike u Puli
          </a>
        </div>
      </footer>
    </section>
  </main>
</template>
