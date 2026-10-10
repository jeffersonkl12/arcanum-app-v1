<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import type { RenderNodeResult } from '@openuidev/vue-lang'

// What <Renderer> hands to a component of the library: its parsed props and how to draw a child.
const props = defineProps<{
  props: { children?: unknown[] }
  renderNode: (value: unknown) => RenderNodeResult
}>()

const Child: FunctionalComponent<{ value: unknown }> = (childProps) =>
  props.renderNode(childProps.value)
</script>

<template>
  <div class="flex flex-col gap-3">
    <Child v-for="(child, index) in props.props.children ?? []" :key="index" :value="child" />
  </div>
</template>
