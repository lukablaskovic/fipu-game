<script setup>
defineProps({
  phase: { type: String, required: true },
  selectedDifficultyLabel: { type: String, required: true },
});

const emit = defineEmits(["open-home"]);
</script>

<template>
  <section class="mx-auto w-full max-w-3xl">
    <article
      class="rounded-3xl border border-cyan-200/70 bg-white/90 p-6 text-center shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur">
      <p class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
        Uskoro
      </p>
      <h2 class="mt-4 font-title text-2xl font-bold text-slate-900 md:text-3xl">
        {{ phase === "it-soon" ? "IT kviz" : "Leaderboard" }}
      </h2>
      <p class="mt-3 text-sm text-slate-700 md:text-base">
        Odabrana težina:
        <span class="font-semibold text-cyan-900">{{ selectedDifficultyLabel }}</span>
      </p>
      <p class="mt-2 text-sm text-slate-700 md:text-base">Ovaj dio implementiramo u sljedećem koraku.</p>

      <button
        type="button"
        class="cursor-pointer mt-6 rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
        @click="emit('open-home')">
        Natrag na odabir
      </button>
    </article>
  </section>
</template>
