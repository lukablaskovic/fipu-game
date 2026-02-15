<script setup>
defineProps({
  isAutoNameRevealVisible: { type: Boolean, required: true },
  autoNameRevealShowName: { type: Boolean, required: true },
  autoNameRevealName: { type: String, required: true },
  revealedNameClass: { type: String, required: true },
  nicknameDraft: { type: String, required: true },
});

const emit = defineEmits([
  "update:nickname-draft",
  "confirm-nickname-and-start-game",
  "go-back-from-nickname-modal",
]);
</script>

<template>
  <section
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
          class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800"
          >Nadimak (opcionalno)</label
        >
        <input
          id="nickname-modal"
          :value="nicknameDraft"
          type="text"
          maxlength="24"
          placeholder="Npr. Porečanka123"
          class="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300/45 md:text-sm"
          @input="emit('update:nickname-draft', $event.target.value)"
          @keyup.enter="emit('confirm-nickname-and-start-game')" />

        <div class="mt-5 flex gap-2">
          <button
            type="button"
            class="cursor-pointer flex-1 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-cyan-800 transition hover:bg-cyan-100"
            @click="emit('go-back-from-nickname-modal')">
            Natrag
          </button>
          <button
            type="button"
            class="cursor-pointer flex-1 rounded-xl bg-[#50d2fe] px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-950 transition hover:bg-cyan-200"
            @click="emit('confirm-nickname-and-start-game')">
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
</template>
