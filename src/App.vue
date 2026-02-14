<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { aiTrainFrames, aiTrainLabels } from "./data/aiTrainImages";
import { fetchTopScores, submitScore } from "./services/leaderboard";
import { generateRandomNickname } from "./utils/randomNickname";

const gameTypes = [
  {
    id: "ai",
    title: "Treniranje AI-a",
    description: "Interaktivno treniraj AI model koji prepoznaje slike.",
  },
  {
    id: "it",
    title: "IT kviz",
    description: "IT kviz opće kulture. Bez ovoga nema diplome!",
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
    totalRounds: 14,
    roundDurationMs: 2600,
    optionCount: 3,
    feedbackMs: 420,
    label: "Easy",
  },
  hard: {
    totalRounds: 20,
    roundDurationMs: 1500,
    optionCount: 4,
    feedbackMs: 320,
    label: "Hard",
  },
};

const phase = ref("home");
const selectedGameType = ref("ai");
const selectedDifficulty = ref("easy");
const activeDifficulty = ref("easy");
const nickname = ref("");
const nicknameDraft = ref("");
const isNicknameModalOpen = ref(false);

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
const feedback = ref("");
const frameTimeLeftMs = ref(0);
const flashToken = ref(0);
const sessionDurationMs = ref(0);
const sessionStartMs = ref(0);
const aiIntroPage = ref(0);
const aiIntroTouchStartX = ref(0);
const aiIntroTouchDeltaX = ref(0);
const aiIntroTotalPages = 4;

const activeAiConfig = computed(() => aiConfigs[activeDifficulty.value]);
const selectedAiConfig = computed(() => aiConfigs[selectedDifficulty.value]);

const modelAccuracy = computed(() => {
  if (!samplesSeen.value) return 0;
  return Math.round((correctCount.value / samplesSeen.value) * 100);
});

const progressPercent = computed(() => {
  const rounds = activeAiConfig.value.totalRounds;
  return Math.round((samplesSeen.value / rounds) * 100);
});

const frameTimerPercent = computed(() => {
  const roundDurationMs = activeAiConfig.value.roundDurationMs;
  if (!roundDurationMs) return 0;
  const ratio = frameTimeLeftMs.value / roundDurationMs;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
});

const currentPlayerName = computed(() => {
  const cleaned = nickname.value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 24) : "Gost";
});

const selectedDifficultyLabel = computed(() => selectedAiConfig.value.label);

const finalLine = computed(
  () =>
    `Your data trained the AI to ${modelAccuracy.value}%. Imagine building real AI here.`,
);

let roundTimeoutId = 0;
let frameTickId = 0;
let feedbackTimeoutId = 0;
let roundDeadlineMs = 0;

const clearTimers = () => {
  window.clearTimeout(roundTimeoutId);
  window.clearInterval(frameTickId);
  window.clearTimeout(feedbackTimeoutId);

  roundTimeoutId = 0;
  frameTickId = 0;
  feedbackTimeoutId = 0;
};

const randomItem = (array) => array[Math.floor(Math.random() * array.length)];

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

const resetAiSession = () => {
  clearTimers();

  roundNumber.value = 0;
  samplesSeen.value = 0;
  correctCount.value = 0;
  streak.value = 0;
  bestStreak.value = 0;
  currentFrame.value = null;
  currentOptions.value = [];
  feedback.value = "";
  flashToken.value = 0;
  saveStatus.value = "idle";

  frameTimeLeftMs.value = activeAiConfig.value.roundDurationMs;
  sessionDurationMs.value = 0;
};

const finishAiTraining = async () => {
  clearTimers();
  phase.value = "ai-finished";
  sessionDurationMs.value = Math.max(0, Date.now() - sessionStartMs.value);
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
  feedbackTimeoutId = window.setTimeout(() => {
    if (samplesSeen.value >= activeAiConfig.value.totalRounds) {
      void finishAiTraining();
      return;
    }

    startRound();
  }, activeAiConfig.value.feedbackMs);
};

const resolveRound = (selectedLabel) => {
  if (phase.value !== "ai-playing" || !currentFrame.value) return;

  window.clearTimeout(roundTimeoutId);
  window.clearInterval(frameTickId);

  samplesSeen.value += 1;
  const isCorrect = selectedLabel === currentFrame.value.label;

  if (isCorrect) {
    correctCount.value += 1;
    streak.value += 1;
    bestStreak.value = Math.max(bestStreak.value, streak.value);
    feedback.value = "correct";
  } else {
    streak.value = 0;
    feedback.value = selectedLabel ? "wrong" : "timeout";
  }

  scheduleNextRound();
};

const selectLabel = (label) => {
  resolveRound(label);
};

const startRound = () => {
  roundNumber.value += 1;
  const frame = randomItem(aiTrainFrames);

  currentFrame.value = frame;
  currentOptions.value = pickOptions(frame.label);
  feedback.value = "";
  flashToken.value += 1;

  roundDeadlineMs = Date.now() + activeAiConfig.value.roundDurationMs;
  frameTimeLeftMs.value = activeAiConfig.value.roundDurationMs;

  frameTickId = window.setInterval(() => {
    frameTimeLeftMs.value = Math.max(0, roundDeadlineMs - Date.now());
  }, 30);

  roundTimeoutId = window.setTimeout(() => {
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

const confirmNicknameAndStartGame = () => {
  const cleaned = nicknameDraft.value.trim().replace(/\s+/g, " ");
  nickname.value = cleaned ? cleaned.slice(0, 24) : generateRandomNickname();
  isNicknameModalOpen.value = false;
  continueStartingSelectedGame();
};

const skipNicknameAndStartGame = () => {
  nickname.value = generateRandomNickname();
  isNicknameModalOpen.value = false;
  continueStartingSelectedGame();
};

const beginAiTraining = () => {
  activeDifficulty.value = selectedDifficulty.value;
  resetAiSession();
  sessionStartMs.value = Date.now();
  phase.value = "ai-playing";
  startRound();
};

const nextAiIntroPage = () => {
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

const startSelectedGame = () => {
  nicknameDraft.value = nickname.value;
  isNicknameModalOpen.value = true;
};

onMounted(async () => {
  await refreshLeaderboard();
});

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-sky-50 text-slate-900">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_70%,rgba(80,210,254,0.24),transparent_36%),radial-gradient(circle_at_82%_78%,rgba(191,241,255,0.55),transparent_40%),linear-gradient(180deg,#ffffff_0%,#ffffff_50%,#eefbff_68%,#d7f5ff_100%)]" />
    <div
      class="pointer-events-none absolute -left-28 top-4 hidden h-80 w-80 rounded-full bg-cyan-300/45 blur-3xl animate-orbital md:block" />
    <div
      class="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl animate-orbital-delayed" />

    <section
      class="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-0 pt-5 md:px-8 md:pb-8">
      <header
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
            <h2 class="font-title text-3xl font-bold text-cyan-900 md:text-4xl">
              Bok!
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-800 md:text-base">
              Hvala ti što si skenirao ovaj QR kod. Želimo ti predstaviti
              Fakultet informatike u Puli — tko smo, čime se bavimo i što možeš
              očekivati tijekom studija.
            </p>
            <p class="mt-3 text-sm leading-relaxed text-slate-800 md:text-base">
              Odaberi jednu od dvije interaktivne igrice u nastavku. Usput ćeš
              saznati nešto novo o nama, a ako uspješno prijeđeš Hard razinu
              jedne igrice, čeka te i mali poklon!
            </p>
          </div>

          <p
            class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            Odaberi igru
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
                  <p class="mt-1 text-sm text-slate-700">{{ game.description }}</p>
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
          <p v-else-if="leaderboard.length === 0" class="mt-4 text-sm text-cyan-800">
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
                  Danas svi pričaju o umjetnoj inteligenciji, odnosno AI-u. Ona
                  nam već pomaže u učenju i pisanju zadaća, stvaranju slika,
                  glazbe i videa, pa čak i u razvoju video igara.
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
                    Što je AI ustvari?
                  </h3>
                  <p class="mt-2">
                  Umjetna inteligencija zapravo je napredan matematički model
                  koji, oslanjajući se na veliku količinu podataka koje je
                  „vidio” te snažnu računalnu obradu, pokušava odrediti najbolji
                  mogući rezultat.
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
                  Zamislimo da je AI naša mala beba-robot koji uči hodati.
                  Moramo mu na stotine puta pokazati kako se hoda, koja je noga
                  lijeva, a koja desna, što znači korak unaprijed, a što korak
                  unazad. Na taj način treniramo AI ispravnim podacima kako
                  bismo ga osamostalili.
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
                  govoriti. Vaš je zadatak naučiti ga prepoznati što se nalazi na
                  slici, kako biste ga osposobili da to samostalno čini. Za sada
                  je to dovoljno, a više možete naučiti na FIPU. Krenimo!
                  </p>
                </div>
                <button
                  type="button"
                  class="cursor-pointer mt-4 w-full rounded-2xl border border-cyan-400/70 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-100/75"
                  @click="beginAiTraining">
                  Krenimo
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
        <div class="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div
            class="rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.14em] text-cyan-800">
              Točnost modela
            </p>
            <p class="font-title text-2xl font-bold text-cyan-900">
              {{ modelAccuracy }}%
            </p>
          </div>
          <div
            class="rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.14em] text-cyan-800">
              Uzorci
            </p>
            <p class="font-title text-2xl font-bold text-cyan-900">
              {{ samplesSeen }}/{{ activeAiConfig.totalRounds }}
            </p>
          </div>
          <div
            class="rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.14em] text-cyan-800">
              Streak
            </p>
            <p class="font-title text-2xl font-bold text-cyan-900">
              {{ streak }}
            </p>
          </div>
          <div
            class="rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2">
            <p class="text-[11px] uppercase tracking-[0.14em] text-cyan-800">
              Težina
            </p>
            <p class="font-title text-2xl font-bold text-cyan-900">
              {{ activeAiConfig.label }}
            </p>
          </div>
        </div>

        <div
          class="overflow-hidden rounded-3xl border border-cyan-300/80 bg-white/90 shadow-[0_22px_58px_rgba(80,210,254,0.18)] backdrop-blur">
          <div class="h-1 w-full bg-cyan-100">
            <div
              class="h-full bg-[#50d2fe] transition-[width] duration-150"
              :style="{ width: `${frameTimerPercent}%` }" />
          </div>

          <div class="p-4 md:p-5">
            <div
              class="mb-4 h-2 w-full overflow-hidden rounded-full bg-cyan-100">
              <div
                class="h-full bg-cyan-300 transition-[width] duration-200"
                :style="{ width: `${progressPercent}%` }" />
            </div>

            <transition name="vision-flash" mode="out-in">
              <article
                :key="flashToken"
                class="relative mx-auto flex h-72 w-full max-w-3xl items-center justify-center overflow-hidden rounded-3xl border border-cyan-200 bg-white p-6 md:h-80 md:p-8">
                <div
                  class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(80,210,254,0.06),rgba(255,255,255,0.2)),repeating-linear-gradient(0deg,rgba(80,210,254,0.09),rgba(80,210,254,0.09)_2px,transparent_2px,transparent_10px)]" />
                <div
                  class="pointer-events-none absolute inset-y-0 left-[-35%] w-1/2 bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent animate-scanline" />

                <img
                  v-if="currentFrame"
                  :src="currentFrame.path"
                  :alt="`Slika: ${currentFrame.label}`"
                  class="relative z-10 h-full max-h-60 w-full max-w-60 object-contain p-3 md:max-h-64 md:max-w-64" />
              </article>
            </transition>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                v-for="label in currentOptions"
                :key="`option-${roundNumber}-${label}`"
                type="button"
                class="cursor-pointer rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-left font-title text-lg font-bold uppercase tracking-[0.14em] text-cyan-900 transition hover:-translate-y-0.5 hover:border-cyan-500 hover:bg-cyan-100"
                @click="selectLabel(label)">
                {{ label }}
              </button>
            </div>

            <p
              v-if="feedback"
              class="mt-4 text-sm font-semibold uppercase tracking-[0.16em]"
              :class="
                feedback === 'correct'
                  ? 'text-emerald-600'
                  : feedback === 'timeout'
                    ? 'text-amber-600'
                    : 'text-rose-600'
              ">
              {{
                feedback === "correct"
                  ? "Točno označeno."
                  : feedback === "timeout"
                    ? "Prekasno. Preskočeno."
                    : "Netočno označeno."
              }}
            </p>
          </div>
        </div>
        </section>

        <section
          v-else-if="phase === 'ai-finished'"
          key="ai-finished"
          class="mx-auto w-full max-w-5xl">
        <article
          class="rounded-3xl border border-cyan-200/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur">
          <p
            class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            Treniranje gotovo
          </p>
          <h2
            class="mt-4 font-title text-2xl font-bold text-slate-900 md:text-3xl">
            {{ currentPlayerName }}, odlično.
          </h2>

          <p
            class="mt-4 rounded-2xl border border-cyan-300 bg-cyan-100 p-4 font-title text-xl font-bold leading-tight text-cyan-900">
            {{ finalLine }}
          </p>

          <dl class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
              <dt class="text-xs uppercase tracking-[0.14em] text-cyan-800">
                Točnost
              </dt>
              <dd class="font-title text-2xl font-bold text-cyan-900">
                {{ modelAccuracy }}%
              </dd>
            </div>
            <div class="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
              <dt class="text-xs uppercase tracking-[0.14em] text-cyan-800">
                Točni odgovori
              </dt>
              <dd class="font-title text-2xl font-bold text-cyan-900">
                {{ correctCount }}/{{ activeAiConfig.totalRounds }}
              </dd>
            </div>
            <div class="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
              <dt class="text-xs uppercase tracking-[0.14em] text-cyan-800">
                Najbolji streak
              </dt>
              <dd class="font-title text-2xl font-bold text-cyan-900">
                {{ bestStreak }}
              </dd>
            </div>
          </dl>

          <p class="mt-4 text-sm text-cyan-900">
            {{
              saveStatus === "saving"
                ? "Spremam rezultat..."
                : saveStatus === "saved"
                  ? "Rezultat spremljen."
                  : saveStatus === "error"
                    ? "Cloud spremanje nije uspjelo. Local fallback radi."
                    : ""
            }}
          </p>
          <p class="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-700">
            Trajanje: {{ Math.round(sessionDurationMs / 1000) }}s
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              class="cursor-pointer rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="startSelectedGame">
              Treniraj ponovno
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-2xl border border-cyan-400/70 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-100/75"
              @click="openHome">
              Natrag na odabir
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
          <h2 class="font-title text-2xl font-bold text-cyan-900">
            Nadimak
          </h2>
          <p class="mt-2 text-sm text-slate-700">
            Unesi nadimak za leaderboard. Ako preskočiš, dobit ćeš nasumični.
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
            class="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300/45"
            @keyup.enter="confirmNicknameAndStartGame" />

          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="cursor-pointer flex-1 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-cyan-800 transition hover:bg-cyan-100"
              @click="skipNicknameAndStartGame">
              Preskoči
            </button>
            <button
              type="button"
              class="cursor-pointer flex-1 rounded-xl bg-[#50d2fe] px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-950 transition hover:bg-cyan-200"
              @click="confirmNicknameAndStartGame">
              Nastavi
            </button>
          </div>
        </article>
      </section>

      <footer
        class="relative left-1/2 mt-auto w-screen -translate-x-1/2 bg-white pt-6 pb-4 md:pt-2 md:pb-2">
        <div
          class="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-white" />
        <img
          src="/fipu-unipu-logo.png"
          alt="FIPU UNIPU logo"
          class="mx-auto h-auto w-full max-w-5xl object-contain px-4 md:w-auto md:max-w-md md:max-h-16 md:px-0" />
        <div class="mt-3 flex flex-col items-center justify-center gap-1 px-4 md:mt-2">
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
