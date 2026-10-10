import { createRouter, createWebHashHistory } from 'vue-router'
import CampaignsPage from '@renderer/page/CampaignsPage.vue'
import SettingsPage from '@renderer/page/SettingsPage.vue'
import WorldDetailPage from '@renderer/page/WorldDetailPage.vue'
import WorldsPage from '@renderer/page/WorldsPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'worlds', component: WorldsPage },
    { path: '/worlds/:worldId', name: 'world-detail', component: WorldDetailPage },
    { path: '/campaigns', name: 'campaigns', component: CampaignsPage },
    { path: '/settings', name: 'settings', component: SettingsPage }
  ]
})
