import '@fontsource-variable/inter'
import '@fontsource/playfair-display/700.css'
import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from '@renderer/router'

createApp(App).use(createPinia()).use(router).mount('#app')
