import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", name: "home" },
  { path: "/leaderboard", name: "leaderboard" },
  { path: "/ai-intro", name: "ai-intro" },
  { path: "/ai-interest", name: "ai-interest" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
