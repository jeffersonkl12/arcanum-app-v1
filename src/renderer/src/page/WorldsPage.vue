<script setup lang="ts">
import { ActiveCampaignView, WorldHeaderView, WorldListView } from '@renderer/view/worlds'
</script>

<template>
  <div class="flex flex-col gap-10">
    <WorldHeaderView />
    <ActiveCampaignView />
    <WorldListView />
  </div>
</template>
