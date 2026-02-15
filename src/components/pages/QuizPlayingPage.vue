<script setup>
defineProps({
  currentQuestion: { type: Object, required: true },
  currentQuestionNumber: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  quizScore: { type: Number, required: true },
  selectedOption: { type: String, required: true },
  quizSecondsLeft: { type: Number, required: true },
  quizTimerPercent: { type: Number, required: true },
  isLocked: { type: Boolean, required: true },
});

const emit = defineEmits(["select-option", "next-question", "request-cancel"]);
</script>

<template>
  <section class="mx-auto w-full max-w-3xl">
    <article class="rounded-3xl border border-cyan-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur md:p-6">
      <div class="mb-4">
        <div
          class="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-cyan-800">
          <span>Timer</span>
          <span>{{ quizSecondsLeft }}s</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-cyan-100">
          <div
            class="h-full bg-emerald-400 transition-[width] duration-75 ease-linear"
            :style="{ width: `${quizTimerPercent}%` }" />
        </div>
      </div>

      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-900">
          Pitanje {{ currentQuestionNumber }} / {{ totalQuestions }}
        </p>
        <p class="text-sm font-semibold uppercase tracking-[0.1em] text-cyan-900">
          Točno: {{ quizScore }}
        </p>
      </div>

      <h2 class="font-title text-2xl font-bold text-cyan-900 md:text-3xl">
        {{ currentQuestion.question }}
      </h2>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          v-for="optionKey in ['A', 'B', 'C', 'D']"
          :key="`${currentQuestion.id}-${optionKey}`"
          type="button"
          class="cursor-pointer rounded-2xl border px-4 py-3 text-left text-base font-semibold transition"
          :class="
            selectedOption === optionKey
              ? optionKey === currentQuestion.correctOption
                ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
                : 'border-rose-600 bg-rose-100 text-rose-900'
              : 'border-cyan-200 bg-white text-slate-800 hover:bg-cyan-50'
          "
          :disabled="Boolean(selectedOption) || isLocked"
          @click="emit('select-option', optionKey)">
          <span class="font-title text-lg font-bold uppercase tracking-[0.1em]">
            {{ optionKey }}
          </span>
          <span class="ml-2">{{ currentQuestion.options[optionKey] }}</span>
        </button>
      </div>

      <button
        type="button"
        class="cursor-pointer mt-5 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 text-center font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        :disabled="!selectedOption || isLocked"
        @click="emit('next-question')">
        Dalje
      </button>

      <button
        type="button"
        class="cursor-pointer mt-3 w-full rounded-2xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-rose-800 transition hover:bg-rose-50"
        @click="emit('request-cancel')">
        Odustani
      </button>
    </article>
  </section>
</template>
