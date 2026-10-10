import type { Component } from 'vue'
import { BookOpen, Globe, Settings } from '@lucide/vue'

export interface AppNavItem {
  label: string
  icon: Component
  routeName?: string
}

export const mainNavigation: AppNavItem[] = [
  { label: 'Mundos', icon: Globe, routeName: 'worlds' },
  { label: 'Campanhas', icon: BookOpen }
]

export const footerNavigation: AppNavItem[] = [{ label: 'Configurações', icon: Settings }]
