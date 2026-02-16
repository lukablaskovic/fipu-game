<script setup>
defineProps({
  aiIntroPage: { type: Number, required: true },
  aiIntroTotalPages: { type: Number, required: true },
});

const emit = defineEmits([
  "next-page",
  "set-page",
  "open-home",
  "begin-ai-training",
  "touch-start",
  "touch-move",
  "touch-end",
]);
</script>

<template>
  <section class="mx-auto w-full max-w-md">
    <article
      class="overflow-hidden rounded-3xl border border-cyan-200/70 bg-white/90 shadow-[0_18px_50px_rgba(80,210,254,0.18)] backdrop-blur">
      <div
        class="overflow-hidden"
        @touchstart="emit('touch-start', $event)"
        @touchmove="emit('touch-move', $event)"
        @touchend="emit('touch-end')">
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
                Umjetna inteligencija, odnosno AI, tema je o kojoj danas svi
                pričaju. Pomaže nam u učenju, pisanju zadaća, stvaranju slika,
                glazbe i videozapisa, pa čak i u mnogo kompleksnijim stvarima,
                poput razvoja novih lijekova.
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="emit('next-page')">
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
                Što je ustvari umjetna inteligencija?
              </h3>
              <p class="mt-2">
                Pojednostavljeno rečeno, umjetnu inteligenciju možemo zamisliti
                kao složeni matematički model koji, oslanjajući se na veliku
                količinu podataka koje je „vidio” te snažnu računalnu obradu,
                nastoji predvidjeti najbolji mogući rezultat za neki problem.
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="emit('next-page')">
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
                Zamislimo da je AI naša mala beba-robot koja uči hodati. Moramo
                mu na stotine puta pokazati kako se hoda, koja je noga lijeva, a
                koja desna, što znači korak unaprijed, a što korak unazad. Na
                taj način treniramo AI ispravnim podacima kako bismo ga
                "osamostalili".
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="emit('next-page')">
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
                govoriti. Priznaj, barem jednom si popričao s ChatGPT-em!
              </p>
              <p class="mt-2">
                Cilj ove igre je što brže odabrati točnu oznaku za svaku sliku.
                Na ovaj način možete vidjeti kako umjetna inteligencija uči
                prepoznavati slike: treba joj puno ponavljanja i mnogo sličnih
                primjera!
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer mt-4 w-full rounded-2xl border border-cyan-400/70 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-100/75"
              @click="emit('begin-ai-training')">
              ZAPOČNI AI TRENING 🏋️‍♀️
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
            @click="emit('set-page', dotIndex - 1)" />
        </div>
        <button
          type="button"
          class="cursor-pointer mt-3 block mx-auto text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 underline decoration-cyan-400 underline-offset-4"
          @click="emit('open-home')">
          Natrag
        </button>
      </div>
    </article>
  </section>
</template>
