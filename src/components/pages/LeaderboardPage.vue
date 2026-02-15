<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  leaderboard: { type: Array, required: true },
  difficulty: { type: String, required: true },
  leaderboardLoading: { type: Boolean, required: true },
});

const emit = defineEmits(["open-home", "set-difficulty"]);
const touchStartX = ref(0);
const touchDeltaX = ref(0);

const normalizedDifficulty = computed(() =>
  props.difficulty === "hard" ? "hard" : "easy",
);

const setDifficulty = (difficulty) => {
  const next = difficulty === "hard" ? "hard" : "easy";
  if (next === normalizedDifficulty.value) return;
  emit("set-difficulty", next);
};

const onTouchStart = (event) => {
  touchStartX.value = event.changedTouches[0]?.clientX ?? 0;
  touchDeltaX.value = 0;
};

const onTouchMove = (event) => {
  const currentX = event.changedTouches[0]?.clientX ?? touchStartX.value;
  touchDeltaX.value = currentX - touchStartX.value;
};

const onTouchEnd = () => {
  const threshold = 55;
  if (touchDeltaX.value <= -threshold) setDifficulty("hard");
  if (touchDeltaX.value >= threshold) setDifficulty("easy");
  touchStartX.value = 0;
  touchDeltaX.value = 0;
};

const rowClass = (index) => {
  if (index === 0) return "border-amber-400 bg-amber-100/90";
  if (index === 1) return "border-slate-400 bg-slate-100/90";
  if (index === 2) return "border-orange-500 bg-orange-100/90";
  return "border-cyan-200 bg-cyan-50/80";
};

const trophyForIndex = (index) => {
  if (index === 0) return "/trophy/trophy_gold.png";
  if (index === 1) return "/trophy/trophy_silver.png";
  if (index === 2) return "/trophy/trophy_bronze.png";
  return "";
};
</script>

<template>
  <section class="mx-auto w-full max-w-3xl">
    <article
      class="rounded-3xl border border-cyan-200/70 bg-white/90 p-4 shadow-[0_14px_40px_rgba(80,210,254,0.16)] md:p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-title text-xl font-bold text-cyan-900">Rang-lista</h2>
        <span class="text-xs uppercase tracking-[0.14em] text-cyan-700"
          >{{ leaderboard.length }}
          {{ leaderboard.length > 1 ? "rezultata" : "rezultat" }}</span
        >
      </div>

      <div class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-1">
        <div class="flex gap-2">
          <button
            type="button"
            class="cursor-pointer flex-1 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition sm:text-sm"
            :class="
              normalizedDifficulty === 'easy'
                ? 'border-emerald-600 bg-emerald-200 text-emerald-900'
                : 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100'
            "
            @click="setDifficulty('easy')">
            Easy
          </button>
          <button
            type="button"
            class="cursor-pointer flex-1 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition sm:text-sm"
            :class="
              normalizedDifficulty === 'hard'
                ? 'border-rose-600 bg-rose-200 text-rose-900'
                : 'border-rose-300 bg-white text-rose-800 hover:bg-rose-100'
            "
            @click="setDifficulty('hard')">
            Hard
          </button>
        </div>
      </div>

      <p v-if="leaderboardLoading" class="mt-4 text-sm text-cyan-800">
        Loading models...
      </p>
      <p
        v-else-if="leaderboard.length === 0"
        class="mt-4 text-sm text-cyan-800">
        Još nema rezultata.
      </p>

      <ol
        v-else
        class="mt-4 space-y-2"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd">
        <li
          v-for="(entry, index) in leaderboard"
          :key="`${entry.name}-${entry.createdAt}-${index}`"
          class="flex w-full items-center justify-between rounded-xl border px-3 py-2"
          :class="rowClass(index)">
          <span
            class="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
            <img
              v-if="index < 3"
              :src="trophyForIndex(index)"
              :alt="`Trophy ${index + 1}`"
              class="h-5 w-5 shrink-0 object-contain" />
            <span>{{ index + 1 }}. {{ entry.name }}</span>
          </span>
          <span class="font-title text-lg font-bold text-cyan-800"
            >{{ entry.score }}%</span
          >
        </li>
      </ol>

      <button
        type="button"
        class="cursor-pointer mx-auto mt-6 block rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
        @click="emit('open-home')">
        Natrag na početnu
      </button>
    </article>
  </section>
</template>
