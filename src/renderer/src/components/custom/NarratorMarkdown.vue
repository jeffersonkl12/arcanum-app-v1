<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@renderer/util/markdown.util'

const props = defineProps<{
  /** Markdown, as the narrator wrote it. */
  source: string
}>()

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitized by renderMarkdown (allow-list, no attributes) -->
  <div class="flex flex-col gap-3 *:m-0 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc" v-html="html" />
</template>
