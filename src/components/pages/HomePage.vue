<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  gameTypes: { type: Array, required: true },
  gameCardGifs: { type: Object, required: true },
  difficultyOptions: { type: Array, required: true },
  selectedGameType: { type: String, required: true },
  selectedDifficulty: { type: String, required: true },
});

const emit = defineEmits([
  "select-game-type",
  "select-difficulty",
  "start-selected-game",
  "open-leaderboard",
  "open-fipu-info",
]);
</script>

<template>
  <section class="mx-auto mb-6 w-full max-w-3xl md:mb-8">
    <article
      class="rounded-3xl border border-cyan-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur md:p-6">
      <div class="mb-5 rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-4">
        <h2 class="font-title text-3xl font-bold text-[#50d2fe] md:text-4xl">
          Bok!
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-800 md:text-base">
          Hvala ti što si skenirao ovaj QR kod. Želimo ti predstaviti
          <a
            href="https://fipu.unipu.hr/"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-[#50d2fe] hover:text-cyan-300">
            Fakultet informatike u Puli
          </a>
          — tko smo, čime se bavimo i što možeš očekivati tijekom studija.
        </p>
        <p class="mt-3 text-sm leading-relaxed text-slate-800 md:text-base">
          Smatramo da je interaktivni pristup, posebno kroz igru, najbolji
          pristup učenju. Iz tog razloga smo pripremili igricu "Treniranje AI-a"
          koja će ti pomoći da na zabavan način saznaš više o našem fakultetu,
          umjetnoj inteligenciji i IT-u općenito. Osim toga, čeka te i kviz
          kojim možeš provjeriti svoje opće IT znanje.
        </p>
        <div class="mt-3 rounded-xl border border-cyan-200/70 bg-white/70 p-3">
          <p
            class="text-center text-sm leading-relaxed text-slate-800 md:text-base mb-4">
            To nije sve. Ako ostvariš jedan od sljedećih rezultata, čeka te mala
            nagrada na našem štandu!
          </p>
          <div class="mt-2 space-y-2">
            <p
              class="flex items-start gap-2 text-sm leading-relaxed text-slate-800 md:text-base">
              <Icon
                icon="mdi:gift-outline"
                class="mt-0.5 h-5 w-5 shrink-0 text-[#50d2fe]" />
              <span>
                Uspješno prijeđi Hard razinu "Treniranje AI" s barem 80%
                točnosti.
              </span>
            </p>
            <p
              class="text-center text-sm font-semibold uppercase text-slate-900">
              ili
            </p>
            <p
              class="flex items-start gap-2 text-sm leading-relaxed text-slate-800 md:text-base">
              <Icon
                icon="mdi:gift-outline"
                class="mt-0.5 h-5 w-5 shrink-0 text-[#50d2fe]" />
              <span> Riješi kviz s barem 7 od 10 točnih odgovora. </span>
            </p>
          </div>
        </div>
      </div>

      <p
        class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#50d2fe]">
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
          @click="emit('select-game-type', game.id)">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="font-title text-lg font-bold text-[#50d2fe]">
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
        v-if="selectedGameType === 'ai'"
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
                  : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
                : selectedDifficulty === difficulty.id
                  ? 'border-rose-600 bg-rose-200 text-rose-900'
                  : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
            "
            @click="emit('select-difficulty', difficulty.id)">
            {{ difficulty.label }}
          </button>
        </div>
      </div>

      <button
        type="button"
        class="cursor-pointer mt-5 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 text-center font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
        @click="emit('start-selected-game')">
        Započni igru
      </button>

      <button
        type="button"
        class="cursor-pointer mt-3 mb-5 w-full rounded-2xl border border-cyan-500 bg-white px-5 py-3 text-center font-title text-base font-bold uppercase tracking-[0.12em] text-[#50d2fe] transition hover:bg-cyan-50"
        @click="emit('open-leaderboard')">
        Rang-lista
      </button>

      <p class="mb-3 text-center text-sm font-semibold uppercase text-slate-900">
        ILI
      </p>

      <button
        type="button"
        class="cursor-pointer mt-2 w-full rounded-2xl border border-[#50d2fe] bg-[#50d2fe]/10 px-5 py-3 text-center font-title text-base font-bold uppercase tracking-[0.08em] text-[#50d2fe] transition hover:bg-[#50d2fe]/20"
        @click="emit('open-fipu-info')">
        Saznaj više o FIPU
      </button>
    </article>
  </section>
</template>
