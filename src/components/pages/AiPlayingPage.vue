<script setup>
defineProps({
  modelAccuracy: { type: Number, required: true },
  samplesSeen: { type: Number, required: true },
  totalRounds: { type: Number, required: true },
  streak: { type: Number, required: true },
  activeAiLabel: { type: String, required: true },
  hitEffect: { type: String, required: true },
  frameTimerColorClass: { type: String, required: true },
  frameTimerPercent: { type: Number, required: true },
  sessionSecondsLeft: { type: Number, required: true },
  sessionTimerPercent: { type: Number, required: true },
  flashToken: { type: Number, required: true },
  currentFrame: { type: Object, default: null },
  currentOptions: { type: Array, required: true },
  roundNumber: { type: Number, required: true },
  areOptionButtonsDisabled: { type: Boolean, required: true },
  hitEffectToken: { type: Number, required: true },
  confettiPieces: { type: Array, required: true },
  optionButtonClass: { type: Function, required: true },
  confettiPieceStyle: { type: Function, required: true },
});

const emit = defineEmits(["select-label"]);
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <div class="mb-2 grid grid-cols-2 gap-2 md:mb-3 md:grid-cols-4">
      <div class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">Točnost modela</p>
        <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">{{ modelAccuracy }}%</p>
      </div>
      <div class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">Uzorci</p>
        <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">{{ samplesSeen }}/{{ totalRounds }}</p>
      </div>
      <div class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">Streak</p>
        <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">{{ streak }}</p>
      </div>
      <div class="rounded-2xl border border-cyan-200/70 bg-white/90 px-2.5 py-1.5 md:px-3 md:py-2">
        <p class="text-[10px] uppercase tracking-[0.12em] text-cyan-800 md:text-[11px] md:tracking-[0.14em]">Težina</p>
        <p class="font-title text-xl font-bold text-cyan-900 md:text-2xl">{{ activeAiLabel }}</p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-3xl border border-cyan-300/80 bg-white/90 shadow-[0_22px_58px_rgba(80,210,254,0.18)] backdrop-blur" :class="hitEffect === 'wrong' ? 'animate-impact ring-2 ring-rose-400/80' : ''">
      <div class="h-1 w-full bg-white">
        <div class="h-full" :class="frameTimerColorClass" :style="{ width: `${frameTimerPercent}%` }" />
      </div>

      <div class="p-4 md:p-5">
        <div class="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-cyan-800">
          <span>Session timer</span>
          <span>{{ sessionSecondsLeft }}s</span>
        </div>
        <div class="mb-4 h-2 w-full overflow-hidden rounded-full bg-cyan-100">
          <div class="h-full bg-emerald-400 transition-[width] duration-75 ease-linear" :style="{ width: `${sessionTimerPercent}%` }" />
        </div>

        <transition name="vision-flash" mode="out-in">
          <article :key="flashToken" class="relative mx-auto flex h-72 w-full max-w-3xl items-center justify-center overflow-hidden rounded-3xl bg-transparent p-6 md:h-80 md:p-8">
            <div class="relative h-full max-h-60 w-full max-w-60 overflow-hidden rounded-xl border border-cyan-200 md:max-h-64 md:max-w-64">
              <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(80,210,254,0.06),rgba(255,255,255,0.2)),repeating-linear-gradient(0deg,rgba(80,210,254,0.09),rgba(80,210,254,0.09)_2px,transparent_2px,transparent_10px)]" />
              <div class="pointer-events-none absolute inset-y-0 left-[-35%] w-1/2 bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent animate-scanline" />
              <img v-if="currentFrame" :src="currentFrame.path" :alt="`Slika: ${currentFrame.label}`" class="relative z-10 h-full w-full bg-transparent object-contain" />
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
            @click="emit('select-label', label)">
            {{ label }}
          </button>
        </div>
      </div>

      <section v-if="hitEffect" :key="`hit-effect-${hitEffectToken}`" class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <template v-if="hitEffect === 'correct'">
          <span v-for="piece in confettiPieces" :key="`confetti-${hitEffectToken}-${piece}`" class="confetti-piece" :style="confettiPieceStyle(piece)" />
        </template>
        <template v-else>
          <div class="wrong-flash-screen" />
          <div class="wrong-cross" />
        </template>
      </section>
    </div>
  </section>
</template>
