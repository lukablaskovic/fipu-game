<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { aiTrainFrames, aiTrainLabels } from "./data/aiTrainImages";
import { submitInterestEmail } from "./services/leads";
import { sendOutroEmail } from "./services/email";
import {
  fetchTopScoresByDifficulty,
  getOrCreateLocalUserId,
  submitScore,
} from "./services/leaderboard";
import { generateRandomNickname } from "./utils/randomNickname";
import NicknameModal from "./components/modals/NicknameModal.vue";
import AiIntroPage from "./components/pages/AiIntroPage.vue";
import AiOutroPage from "./components/pages/AiOutroPage.vue";
import AiPlayingPage from "./components/pages/AiPlayingPage.vue";
import AiInterestPage from "./components/pages/AiInterestPage.vue";
import ComingSoonPage from "./components/pages/ComingSoonPage.vue";
import HomePage from "./components/pages/HomePage.vue";
import LeaderboardPage from "./components/pages/LeaderboardPage.vue";

const gameTypes = [
  {
    id: "ai",
    title: "Treniranje AI-a",
    description:
      "Pogledaj kako je to trenirati AI model da raspoznaje slike. Hoćeš li ga uspjeti natrenirati na 100% točnosti?",
  },
];

const gameCardGifs = {
  ai: "/ai-train-robot-gif.gif",
};

const difficultyOptions = [
  { id: "easy", label: "Easy (60s)" },
  { id: "hard", label: "Hard (40s)" },
];

const aiConfigs = {
  easy: {
    totalRounds: 20,
    roundDurationMs: 3000,
    sessionDurationMs: 60000,
    optionCount: 4,
    feedbackMs: 0,
    label: "Easy",
  },
  hard: {
    totalRounds: 20,
    roundDurationMs: 1500,
    sessionDurationMs: 40000,
    optionCount: 4,
    feedbackMs: 0,
    label: "Hard",
  },
};
const aiQuizSampleSize = 20;

const NICKNAME_STORAGE_KEY = "fipu-nickname";
const route = useRoute();
const router = useRouter();

const getStoredNickname = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NICKNAME_STORAGE_KEY) ?? "";
};

const persistNickname = (value) => {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(NICKNAME_STORAGE_KEY, value);
    return;
  }

  window.localStorage.removeItem(NICKNAME_STORAGE_KEY);
};

const phase = ref("home");
const selectedGameType = ref("ai");
const selectedDifficulty = ref("easy");
const activeDifficulty = ref("easy");
const nickname = ref(getStoredNickname());
const nicknameDraft = ref("");
const isNicknameModalOpen = ref(false);
const isAutoNameRevealVisible = ref(false);
const autoNameRevealName = ref("");
const autoNameRevealShowName = ref(false);

const leaderboard = ref([]);
const leaderboardLoading = ref(false);
const leaderboardMode = ref("local");
const leaderboardDifficulty = ref("easy");
const saveStatus = ref("idle");
const localUserId = ref(getOrCreateLocalUserId());

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
const sessionTimeLeftMs = ref(aiConfigs.easy.sessionDurationMs);
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
const outroFullName = ref("");
const outroEmail = ref("");
const outroEmailStatus = ref("idle");
const shouldShowAiInterestToast = ref(false);
const isStartCountdownVisible = ref(false);
const startCountdownText = ref("");
const isGameOverCelebrationVisible = ref(false);
const gameOverCelebrationToken = ref(0);
const isFirstAiTrainingGameCompleted = ref(false);

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
  const sessionLimitMs = activeAiConfig.value.sessionDurationMs;
  const elapsed = sessionLimitMs - sessionTimeLeftMs.value;
  const ratio = elapsed / sessionLimitMs;
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

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);

const outroEmailStatusText = computed(() => {
  if (outroEmailStatus.value === "saving") return "Pripremam slanje...";
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
let scrollResetTimeoutId = 0;

const handleBeforeUnload = (event) => {
  const isFirstAiGameInProgress =
    phase.value === "ai-playing" && !isFirstAiTrainingGameCompleted.value;

  if (!isFirstAiGameInProgress) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
};

const syncFrameTimeLeft = () => {
  frameTimeLeftMs.value = Math.max(0, roundDeadlineMs - Date.now());
};

const syncSessionTimeLeft = () => {
  sessionTimeLeftMs.value = Math.max(0, sessionDeadlineMs - Date.now());
};

const startSessionTimer = () => {
  const sessionLimitMs = activeAiConfig.value.sessionDurationMs;
  window.clearInterval(sessionTickId);
  window.clearTimeout(sessionTimeoutId);

  sessionDeadlineMs = Date.now() + sessionLimitMs;
  syncSessionTimeLeft();

  sessionTickId = window.setInterval(() => {
    syncSessionTimeLeft();
  }, 30);

  sessionTimeoutId = window.setTimeout(() => {
    sessionTimeLeftMs.value = 0;
    if (phase.value === "ai-playing") {
      void finishAiTraining();
    }
  }, sessionLimitMs);
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
  window.clearTimeout(scrollResetTimeoutId);

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
  scrollResetTimeoutId = 0;
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
    const { mode, scores } = await fetchTopScoresByDifficulty({
      limit: 8,
      difficulty: leaderboardDifficulty.value,
    });
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
  sessionTimeLeftMs.value = activeAiConfig.value.sessionDurationMs;
  sessionDurationMs.value = 0;
};

const finishAiTraining = async () => {
  if (phase.value === "ai-finished") {
    return;
  }

  clearTimers();
  aiOutroPage.value = 0;
  isFirstAiTrainingGameCompleted.value = true;
  outroEmail.value = "";
  outroFullName.value = "";
  outroEmailStatus.value = "idle";
  shouldShowAiInterestToast.value = false;
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
      difficulty: activeDifficulty.value,
      userId: localUserId.value,
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

    if (
      samplesSeen.value >= totalRounds.value ||
      sessionTimeLeftMs.value <= 0
    ) {
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
  if (route.path !== "/") {
    void router.push("/");
    return;
  }

  phase.value = "home";
};

const openLeaderboard = async () => {
  if (route.path !== "/leaderboard") {
    await router.push("/leaderboard");
    return;
  }

  phase.value = "leaderboard";
  await refreshLeaderboard();
};

const setLeaderboardDifficulty = async (difficulty) => {
  leaderboardDifficulty.value = difficulty === "hard" ? "hard" : "easy";
  await refreshLeaderboard();
};

const openAiIntro = () => {
  if (route.path !== "/ai-intro") {
    void router.push("/ai-intro");
    return;
  }

  aiIntroPage.value = 0;
  phase.value = "ai-intro";
  window.requestAnimationFrame(scrollPageToTop);
};

const scrollDocumentToTop = () => {
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

const scrollPageToTop = () => {
  scrollDocumentToTop();
  window.clearTimeout(scrollResetTimeoutId);
  scrollResetTimeoutId = window.setTimeout(scrollDocumentToTop, 120);
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
    persistNickname(nickname.value);
    isNicknameModalOpen.value = false;
    continueStartingSelectedGame();
    return;
  }

  nickname.value = generateRandomNickname();
  persistNickname(nickname.value);
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
  const normalizedFullName = outroFullName.value.trim().replace(/\s+/g, " ");
  const hasEmail = Boolean(normalizedEmail);

  if (hasEmail && !isValidEmail(normalizedEmail)) {
    outroEmailStatus.value = "invalid";
    return;
  }

  shouldShowAiInterestToast.value = false;

  if (!hasEmail) {
    outroEmailStatus.value = "idle";
    if (route.path !== "/ai-interest") {
      await router.push("/ai-interest");
    } else {
      phase.value = "ai-interest";
    }
    window.requestAnimationFrame(scrollPageToTop);
    return;
  }

  outroEmailStatus.value = "saving";

  try {
    await submitInterestEmail({
      email: normalizedEmail,
      source: "ai-quiz-outro",
    });
    await sendOutroEmail({
      toEmail: normalizedEmail,
      fullName: normalizedFullName,
    });
    outroEmailStatus.value = "saved";
    shouldShowAiInterestToast.value = true;
    outroEmail.value = "";
    outroFullName.value = "";
    if (route.path !== "/ai-interest") {
      await router.push("/ai-interest");
    } else {
      phase.value = "ai-interest";
    }
    window.requestAnimationFrame(scrollPageToTop);
  } catch {
    outroEmailStatus.value = "error";
  }
};

const closeAiInterestPage = () => {
  shouldShowAiInterestToast.value = false;
  closeAiOutro();
};

const closeAiOutro = () => {
  outroEmail.value = "";
  outroFullName.value = "";
  outroEmailStatus.value = "idle";
  shouldShowAiInterestToast.value = false;
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
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  clearTimers();
});

watch(
  () => route.path,
  async (path) => {
    if (path === "/") {
      clearTimers();
      phase.value = "home";
      return;
    }

    if (path === "/leaderboard") {
      phase.value = "leaderboard";
      await refreshLeaderboard();
      return;
    }

    if (path === "/ai-intro") {
      aiIntroPage.value = 0;
      phase.value = "ai-intro";
      window.requestAnimationFrame(scrollPageToTop);
      return;
    }

    if (path === "/ai-interest") {
      phase.value = "ai-interest";
      window.requestAnimationFrame(scrollPageToTop);
      return;
    }

    await router.replace("/");
  },
  { immediate: true },
);
</script>

<template>
  <main
    class="relative min-h-screen overflow-hidden text-slate-900"
    :class="phase === 'ai-interest' ? 'bg-slate-950' : 'bg-sky-100'">
    <div
      v-if="phase !== 'ai-interest'"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(14,165,233,0.24)_1.2px,transparent_1.2px),linear-gradient(180deg,#e6f6ff_0%,#d4eeff_100%)] [background-size:18px_18px,100%_100%]" />
    <div
      v-if="phase !== 'ai-interest'"
      class="pointer-events-none absolute -left-28 top-4 hidden h-80 w-80 rounded-full bg-cyan-300/45 blur-3xl animate-orbital md:block" />
    <div
      v-if="phase !== 'ai-interest'"
      class="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl animate-orbital-delayed" />

    <section
      class="relative z-10 flex min-h-screen w-full flex-col"
      :class="
        phase === 'ai-interest'
          ? 'p-0'
          : 'mx-auto max-w-6xl px-4 pb-0 pt-5 md:px-8 md:pb-8'
      ">
      <header
        v-if="phase !== 'ai-playing' && phase !== 'ai-interest'"
        class="mb-4 flex h-32 flex-col items-center justify-center p-0 md:mb-3 md:mx-auto md:h-36 md:w-[88%] lg:h-40 lg:w-[82%]">
        <img
          src="/fipu-games-logo.png"
          alt="FIPU Games logo"
          class="h-full w-full object-contain" />
      </header>

      <Transition name="page-swap" mode="out-in">
        <HomePage
          v-if="phase === 'home'"
          key="home"
          :game-types="gameTypes"
          :game-card-gifs="gameCardGifs"
          :difficulty-options="difficultyOptions"
          :selected-game-type="selectedGameType"
          :selected-difficulty="selectedDifficulty"
          @select-game-type="selectedGameType = $event"
          @select-difficulty="selectedDifficulty = $event"
          @start-selected-game="startSelectedGame"
          @open-leaderboard="openLeaderboard" />

        <LeaderboardPage
          v-else-if="phase === 'leaderboard'"
          key="leaderboard"
          :leaderboard="leaderboard"
          :difficulty="leaderboardDifficulty"
          :leaderboard-loading="leaderboardLoading"
          @set-difficulty="setLeaderboardDifficulty"
          @open-home="openHome" />

        <AiIntroPage
          v-else-if="phase === 'ai-intro'"
          key="ai-intro"
          class="mb-6 md:mb-10"
          :ai-intro-page="aiIntroPage"
          :ai-intro-total-pages="aiIntroTotalPages"
          @next-page="nextAiIntroPage"
          @set-page="setAiIntroPage"
          @open-home="openHome"
          @begin-ai-training="beginAiTraining"
          @touch-start="onAiIntroTouchStart"
          @touch-move="onAiIntroTouchMove"
          @touch-end="onAiIntroTouchEnd" />

        <AiPlayingPage
          v-else-if="phase === 'ai-playing'"
          key="ai-playing"
          :model-accuracy="modelAccuracy"
          :samples-seen="samplesSeen"
          :total-rounds="totalRounds"
          :streak="streak"
          :active-ai-label="activeAiConfig.label"
          :hit-effect="hitEffect"
          :frame-timer-color-class="frameTimerColorClass"
          :frame-timer-percent="frameTimerPercent"
          :session-seconds-left="sessionSecondsLeft"
          :session-timer-percent="sessionTimerPercent"
          :flash-token="flashToken"
          :current-frame="currentFrame"
          :current-options="currentOptions"
          :round-number="roundNumber"
          :are-option-buttons-disabled="areOptionButtonsDisabled"
          :hit-effect-token="hitEffectToken"
          :confetti-pieces="confettiPieces"
          :option-button-class="optionButtonClass"
          :confetti-piece-style="confettiPieceStyle"
          @select-label="selectLabel" />

        <AiOutroPage
          v-else-if="phase === 'ai-finished' && !isGameOverCelebrationVisible"
          key="ai-finished"
          class="mb-6 md:mb-10"
          :ai-outro-page="aiOutroPage"
          :ai-outro-total-pages="aiOutroTotalPages"
          :total-rounds="totalRounds"
          :correct-count="correctCount"
          :model-accuracy="modelAccuracy"
          :outro-full-name="outroFullName"
          :outro-email="outroEmail"
          :outro-email-status="outroEmailStatus"
          :outro-email-status-text="outroEmailStatusText"
          @next-page="nextAiOutroPage"
          @prev-page="prevAiOutroPage"
          @set-page="setAiOutroPage"
          @touch-start="onAiOutroTouchStart"
          @touch-move="onAiOutroTouchMove"
          @touch-end="onAiOutroTouchEnd"
          @update:outro-full-name="outroFullName = $event"
          @update:outro-email="outroEmail = $event"
          @submit-outro-email="submitOutroEmail"
          @close-ai-outro="closeAiOutro" />

        <AiInterestPage
          v-else-if="phase === 'ai-interest'"
          key="ai-interest"
          :show-success-toast="shouldShowAiInterestToast"
          @open-home="closeAiInterestPage" />

        <ComingSoonPage
          v-else
          key="coming-soon"
          :phase="phase"
          :selected-difficulty-label="selectedDifficultyLabel"
          @open-home="openHome" />
      </Transition>

      <NicknameModal
        v-if="isNicknameModalOpen"
        :is-auto-name-reveal-visible="isAutoNameRevealVisible"
        :auto-name-reveal-show-name="autoNameRevealShowName"
        :auto-name-reveal-name="autoNameRevealName"
        :revealed-name-class="revealedNameClass"
        :nickname-draft="nicknameDraft"
        @update:nickname-draft="nicknameDraft = $event"
        @confirm-nickname-and-start-game="confirmNicknameAndStartGame"
        @go-back-from-nickname-modal="goBackFromNicknameModal" />

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
        v-if="!isGameRunning && phase !== 'ai-interest'"
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
