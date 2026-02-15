<script setup>
defineProps({
  quizScore: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
});

const emit = defineEmits(["restart-quiz", "open-home"]);
</script>

<template>
  <section class="mx-auto w-full max-w-2xl">
    <article class="rounded-3xl border border-cyan-200/70 bg-white/90 p-5 text-center shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur md:p-6">
      <h2 class="font-title text-4xl font-bold text-cyan-900 md:text-5xl">
        Quiz završen
      </h2>
      <p class="mt-4 text-lg text-slate-800">
        Rezultat: <b>{{ quizScore }} / {{ totalQuestions }}</b>
      </p>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="cursor-pointer rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
          @click="emit('restart-quiz')">
          Ponovi quiz
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-2xl border border-cyan-500 bg-white px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-cyan-900 transition hover:bg-cyan-50"
          @click="emit('open-home')">
          Početna
        </button>
      </div>
    </article>
  </section>
</template>
