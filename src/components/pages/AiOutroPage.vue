<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

defineProps({
  aiOutroPage: { type: Number, required: true },
  aiOutroTotalPages: { type: Number, required: true },
  totalRounds: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  modelAccuracy: { type: Number, required: true },
  outroFullName: { type: String, required: true },
  outroEmail: { type: String, required: true },
  outroEmailStatus: { type: String, required: true },
  outroEmailStatusText: { type: String, required: true },
});

const emit = defineEmits([
  "next-page",
  "prev-page",
  "set-page",
  "touch-start",
  "touch-move",
  "touch-end",
  "update:outro-full-name",
  "update:outro-email",
  "submit-outro-email",
  "close-ai-outro",
]);

const diplomaVideo = ref(null);
let diplomaVideoObserver = null;

const playDiplomaVideo = async () => {
  const videoElement = diplomaVideo.value;
  if (!videoElement) return;

  videoElement.muted = true;
  videoElement.defaultMuted = true;
  videoElement.playsInline = true;
  videoElement.setAttribute("playsinline", "");
  videoElement.setAttribute("webkit-playsinline", "true");

  try {
    await videoElement.play();
  } catch {
    // Some mobile browsers still block autoplay in specific battery/data modes.
  }
};

const pauseDiplomaVideo = () => {
  const videoElement = diplomaVideo.value;
  if (!videoElement) return;
  videoElement.pause();
};

const handleDocumentVisibility = () => {
  if (document.hidden) {
    pauseDiplomaVideo();
    return;
  }
  playDiplomaVideo();
};

onMounted(async () => {
  await nextTick();

  const videoElement = diplomaVideo.value;
  if (!videoElement) return;

  if ("IntersectionObserver" in window) {
    diplomaVideoObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          playDiplomaVideo();
          return;
        }

        pauseDiplomaVideo();
      },
      {
        threshold: [0, 0.35, 0.7],
      }
    );

    diplomaVideoObserver.observe(videoElement);
  } else {
    playDiplomaVideo();
  }

  document.addEventListener("visibilitychange", handleDocumentVisibility, {
    passive: true,
  });
});

onBeforeUnmount(() => {
  diplomaVideoObserver?.disconnect();
  document.removeEventListener("visibilitychange", handleDocumentVisibility);
});
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
          :style="{ transform: `translateX(-${aiOutroPage * 100}%)` }">
          <section
            class="h-[32rem] w-full shrink-0 overflow-y-auto p-4 sm:h-[34rem] sm:p-5">
            <h3 class="text-center font-title text-xl font-bold text-cyan-900">
              Problem klasifikacije
            </h3>
            <img
              src="/classify.png"
              alt="Klasifikacija"
              class="mx-auto mt-3 h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
            <div
              class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
              <p>
                U svijetu umjetne inteligencije i strojnog učenja ovaj zadatak
                zove se <b>klasifikacija</b>: prepoznavanje objekta i dodjela
                točne oznake slici.
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="emit('next-page')">
              Dalje
            </button>
          </section>

          <section
            class="h-[32rem] w-full shrink-0 overflow-y-auto p-4 sm:h-[34rem] sm:p-5">
            <img
              src="/robot-wave-gif.gif"
              alt="Robot"
              class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
            <div
              class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
              <p>
                Ti si klasificirao/la {{ totalRounds }} slika, a točno
                <span class="font-semibold text-cyan-900">{{
                  correctCount
                }}</span
                >. Točnost je
                <span class="font-semibold text-cyan-900"
                  >{{ modelAccuracy }}%</span>.
                Ljudi to rade brzo jer prepoznaju uzorke iz prethodnog
                iskustva.
              </p>
            </div>
            <button
              type="button"
              class="cursor-pointer mt-4 w-full rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              @click="emit('next-page')">
              Dalje
            </button>
          </section>

          <section
            class="h-[32rem] w-full shrink-0 overflow-y-auto p-4 sm:h-[34rem] sm:p-5">
            <img
              src="/ai-learn-gif.gif"
              alt="AI učenje"
              class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56" />
            <div
              class="mt-4 min-h-28 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-3 text-sm leading-relaxed text-slate-700">
              <p>
                AI-u treba puno više primjera nego ljudima. Umjesto desetaka,
                često treba stotine tisuća ili milijune primjera da bi naučio
                stabilno prepoznavati slike.
              </p>
              <p class="mt-2">
                Zato treniranje može biti skupo, ali moderni modeli danas
                postižu i do <b>99%</b> točnosti.
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
            <video
              ref="diplomaVideo"
              class="mx-auto h-52 w-full max-w-xs rounded-2xl object-contain sm:h-56"
              autoplay
              loop
              muted
              playsinline
              webkit-playsinline="true"
              preload="auto"
              poster="/fipu_student_success.png"
              disablepictureinpicture
              disableremoteplayback
              aria-label="FIPU student diploma">
              <source src="/fipu_student_diploma.mp4" type="video/mp4" />
            </video>
            <div
              class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/75 p-4 text-sm leading-relaxed text-slate-700">
              <h3 class="font-title text-xl font-bold text-cyan-900">
                Studiraj na FIPU
              </h3>
              <p class="mt-2">
                Želiš naučiti više? Zanima te AI? Sviđa ti se ova interaktivna
                igrica?
              </p>
              <p class="mt-2">
                Naši studenti završetkom studija samostalno izrađuju ovakve
                aplikacije, treniraju svoje AI modele, uspješno rade
                interaktivne video igrice, bave se robotikom, blockchain
                tehnologijom, mobilnim aplikacijama i još mnogo toga drugoga!
              </p>
              <p class="mt-2">
                Ako želiš saznati više,
                <b
                  >ostavi nam ispod tvoju e-mail adresu i poslat ćemo ti mail s
                  više detalja o FIPU</b
                >. Bez brige, nećemo te spammati!
              </p>
            </div>

            <label
              for="outro-full-name"
              class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800"
              >Ime i prezime (opcionalno)</label
            >
            <input
              id="outro-full-name"
              :value="outroFullName"
              type="text"
              autocomplete="name"
              placeholder="npr. Ime Prezime"
              class="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300/45 md:text-sm"
              @input="emit('update:outro-full-name', $event.target.value)"
              @keyup.enter="emit('submit-outro-email')" />

            <label
              for="outro-email"
              class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800"
              >Email (opcionalno)</label
            >
            <input
              id="outro-email"
              :value="outroEmail"
              type="email"
              inputmode="email"
              autocomplete="email"
              placeholder="npr. ime.prezime@gmail.com"
              class="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-300/45 md:text-sm"
              @input="emit('update:outro-email', $event.target.value)"
              @keyup.enter="emit('submit-outro-email')" />

            <p v-if="outroEmailStatusText" class="mt-2 text-sm text-cyan-900">
              {{ outroEmailStatusText }}
            </p>

            <div class="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                class="cursor-pointer flex-1 rounded-2xl bg-[#50d2fe] px-5 py-3 font-title text-base font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-75"
                :disabled="outroEmailStatus === 'saving'"
                @click="emit('submit-outro-email')">
                <span
                  v-if="outroEmailStatus === 'saving'"
                  class="inline-flex items-center gap-2">
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                  Šaljem...
                </span>
                <span v-else>Zanima me više!</span>
              </button>
              <button
                type="button"
                class="cursor-pointer flex-1 rounded-2xl border border-cyan-400/70 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-800 transition hover:bg-cyan-100/75"
                @click="emit('close-ai-outro')">
                Zatvori
              </button>
            </div>
          </section>
        </div>
      </div>

      <div class="pb-4">
        <div class="flex items-center justify-center gap-2">
          <button
            v-for="dotIndex in aiOutroTotalPages"
            :key="`ai-outro-dot-${dotIndex}`"
            type="button"
            class="cursor-pointer h-2.5 w-2.5 rounded-full transition"
            :class="
              aiOutroPage === dotIndex - 1
                ? 'bg-cyan-700 scale-110'
                : 'bg-cyan-200 hover:bg-cyan-300'
            "
            :aria-label="`Idi na stranicu ${dotIndex}`"
            @click="emit('set-page', dotIndex - 1)" />
        </div>
        <button
          v-if="aiOutroPage > 0"
          type="button"
          class="cursor-pointer mt-3 block mx-auto text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 underline decoration-cyan-400 underline-offset-4"
          @click="emit('prev-page')">
          Natrag
        </button>
      </div>
    </article>
  </section>
</template>
