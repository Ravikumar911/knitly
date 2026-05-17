<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <div class="pitch-eyebrow" aria-hidden="true">
    <span class="pitch-eyebrow__dot" />
    <span>{{ label }}</span>
  </div>
</template>
