<script setup>
const emit = defineEmits(["close", "confirm-cancel"]);
</script>

<template>
  <section
    class="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
    <article
      class="w-full max-w-md rounded-3xl border border-cyan-200/70 bg-white p-5 shadow-[0_18px_50px_rgba(80,210,254,0.24)]">
      <h2 class="font-title text-2xl font-bold text-cyan-900">Jesi siguran?</h2>
      <p class="mt-2 text-sm text-slate-700">
        Želiš odustati od kviza? Trenutni napredak će se izgubiti.
      </p>

      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="cursor-pointer flex-1 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-cyan-800 transition hover:bg-cyan-100"
          @click="emit('close')">
          Nastavi igru
        </button>
        <button
          type="button"
          class="cursor-pointer flex-1 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-rose-800 transition hover:bg-rose-100"
          @click="emit('confirm-cancel')">
          Odustani
        </button>
      </div>
    </article>
  </section>
</template>
