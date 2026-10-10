import { createRouter, createWebHashHistory } from 'vue-router'
import WorldsPage from '@renderer/page/WorldsPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', name: 'worlds', component: WorldsPage }]
})
