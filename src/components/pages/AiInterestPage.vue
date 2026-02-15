<script setup>
import { onActivated, onBeforeUnmount, onMounted, watch, ref } from "vue";

const props = defineProps({
  showSuccessToast: { type: Boolean, default: false },
});

const emit = defineEmits(["open-home"]);

const detailsLines = [
  "FIPU nudi studijske programe prijediplomskog i diplomskog studija Informatika te nastavničkog diplomskog studija Informatika. Osim toga, tu je i online studij koji omogućuje studentima da prate nastavu i polažu ispite na daljinu.",
  "Nalazimo se u Puli, na novom kampusu Sveučilišta Jurja Dobrile. Kampus nudi nove učionice, laboratorije, studentske prostore i biblioteku, a sve je smješteno u neposrednoj blizini centra grada s dobrom prometnom povezanošću.",
];

const contactItems = [
  {
    label: "Email",
    value: "fipu-ured@unipu.hr",
    href: "mailto:fipu-ured@unipu.hr",
  },
  {
    label: "Web",
    value: "fipu.unipu.hr",
    href: "https://fipu.unipu.hr/",
  },
  {
    label: "Telefon",
    value: "052 877-438",
    href: "tel:052877438",
  },
];

const toastVisible = ref(false);
let showToastTimeoutId = 0;
let hideToastTimeoutId = 0;

const clearToastTimers = () => {
  window.clearTimeout(showToastTimeoutId);
  window.clearTimeout(hideToastTimeoutId);
  showToastTimeoutId = 0;
  hideToastTimeoutId = 0;
};

const runToastSequence = () => {
  clearToastTimers();
  toastVisible.value = false;

  if (!props.showSuccessToast) {
    return;
  }

  showToastTimeoutId = window.setTimeout(() => {
    toastVisible.value = true;
    showToastTimeoutId = 0;

    hideToastTimeoutId = window.setTimeout(() => {
      toastVisible.value = false;
      hideToastTimeoutId = 0;
    }, 4200);
  }, 1650);
};

watch(
  () => props.showSuccessToast,
  () => {
    runToastSequence();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearToastTimers();
});

const scrollPageToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  const scrollingRoot = document.scrollingElement;
  if (scrollingRoot) {
    scrollingRoot.scrollTop = 0;
    scrollingRoot.scrollLeft = 0;
  }

  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;
};

const ensurePageStartsAtTop = () => {
  scrollPageToTop();
  window.requestAnimationFrame(() => {
    scrollPageToTop();
  });
  window.setTimeout(scrollPageToTop, 120);
};

onMounted(() => {
  ensurePageStartsAtTop();
});

onActivated(() => {
  ensurePageStartsAtTop();
});
</script>

<template>
  <section
    class="relative isolate flex min-h-[100svh] w-full flex-col justify-between overflow-x-hidden overflow-y-auto px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-9 sm:px-8">
    <img
      src="/negrijeva-pixelart.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]" />
    <div class="absolute inset-0 bg-slate-950/35" />

    <div class="relative z-10">
      <h2
        class="font-title text-3xl font-bold uppercase tracking-[0.12em] text-white drop-shadow-[0_3px_10px_rgba(2,6,23,0.65)] sm:text-4xl">
        Studiraj na <span class="text-[var(--fipu-cyan)]">FIPU</span>
      </h2>

      <div class="mt-5 space-y-3 sm:mt-7 sm:space-y-4">
        <p
          v-for="(line, index) in detailsLines"
          :key="`interest-line-${index}`"
          class="interest-line rounded-2xl border border-[rgb(80_210_254_/_0.45)] bg-[rgb(6_61_95_/_0.62)] px-4 py-3 text-sm leading-relaxed text-slate-100 backdrop-blur-[2px] sm:text-base"
          :style="{ animationDelay: `${index * 5000}ms` }">
          {{ line }}
        </p>

        <div
          class="interest-line rounded-2xl border border-[rgb(80_210_254_/_0.45)] bg-[rgb(6_61_95_/_0.62)] px-4 py-3 text-sm text-slate-100 backdrop-blur-[2px] sm:text-base"
          :style="{ animationDelay: `${detailsLines.length * 5000}ms` }">
          <p class="font-semibold text-[var(--fipu-cyan)]">Kontakt:</p>
          <div class="mt-2 space-y-2">
            <a
              v-for="(contact, index) in contactItems"
              :key="`contact-${index}`"
              :href="contact.href"
              class="cursor-pointer group flex items-center gap-3 rounded-lg bg-[rgb(80_210_254_/_0.12)] px-3 py-2 transition hover:bg-[rgb(80_210_254_/_0.22)]"
              target="_blank"
              rel="noreferrer">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(80_210_254_/_0.2)] text-[var(--fipu-cyan)]">
                <svg
                  v-if="contact.label === 'Email'"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  class="h-4 w-4">
                  <path
                    d="M4 7h16v10H4V7Zm0 0 8 6 8-6"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                <svg
                  v-else-if="contact.label === 'Web'"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  class="h-4 w-4">
                  <path
                    d="M12 4a8 8 0 1 0 0 16m0-16c2.5 2.2 4 5 4 8s-1.5 5.8-4 8m0-16c-2.5 2.2-4 5-4 8s1.5 5.8 4 8m-7-8h14M5.5 8h13M5.5 16h13"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  class="h-4 w-4">
                  <path
                    d="M6.5 3.5h3L11 7l-2 2c.9 1.8 2.2 3.1 4 4l2-2 3.5 1.5v3c0 .8-.7 1.5-1.5 1.5C9.9 19 5 14.1 5 8c0-.8.7-1.5 1.5-1.5Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </span>
              <span class="min-w-0">
                <span
                  class="block text-xs uppercase tracking-[0.08em] text-cyan-100/90"
                  >{{ contact.label }}</span
                >
                <span
                  class="block truncate font-semibold text-white transition group-hover:text-[var(--fipu-cyan)]">
                  {{ contact.value }}
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="relative z-10 pt-8">
      <button
        type="button"
        class="cursor-pointer w-full rounded-2xl bg-[var(--fipu-cyan)] px-5 py-3 font-title text-sm font-bold uppercase tracking-[0.11em] text-slate-900 shadow-[0_12px_26px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5 hover:bg-cyan-300"
        @click="emit('open-home')">
        Povratak na početak
      </button>
    </div>

    <Transition name="interest-toast">
      <p
        v-if="toastVisible"
        class="pointer-events-none fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-900 shadow-[0_12px_32px_rgba(5,46,22,0.28)] sm:text-base">
        Poslali smo ti mail. Hvala i uživaj!
      </p>
    </Transition>
  </section>
</template>

<style scoped>
.interest-line {
  opacity: 0;
  transform: translateY(-16px);
  animation: interestLineIn 560ms cubic-bezier(0.22, 0.82, 0.3, 1) forwards;
}

.interest-toast-enter-active,
.interest-toast-leave-active {
  transition:
    opacity 260ms ease,
    transform 300ms ease;
}

.interest-toast-enter-from,
.interest-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 14px);
}

@keyframes interestLineIn {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
