<script setup lang="ts">
defineProps<{
  value: string;
  label: string;
  caption?: string;
}>();
</script>

<template>
  <div class="pitch-stat">
    <div class="pitch-stat__value">{{ value }}</div>
    <div class="pitch-stat__label">{{ label }}</div>
    <div v-if="caption" class="pitch-stat__caption">{{ caption }}</div>
  </div>
</template>

<style scoped>
.pitch-stat {
  position: relative;
  padding: 0.85rem 0.95rem 0.9rem;
  border-radius: var(--pitch-radius-md);
  background: var(--pitch-bg-elevated);
  border: 1px solid var(--pitch-border-soft);
  text-align: left;
  box-shadow: var(--pitch-shadow-sm);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
  overflow: hidden;
}

.pitch-stat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 32%;
  height: 2px;
  background: linear-gradient(90deg, var(--pitch-accent), transparent);
}

.pitch-stat:hover {
  border-color: var(--pitch-accent-ring);
  box-shadow: var(--pitch-shadow-md);
}

.pitch-stat__value {
  font-family: var(--pitch-font-display);
  font-size: 1.65rem;
  font-weight: 720;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--pitch-ink);
  font-variant-numeric: tabular-nums;
}

.pitch-stat__label {
  margin-top: 0.4rem;
  font-size: 0.7rem;
  line-height: 1.32;
  color: var(--pitch-slate);
  font-weight: 500;
}

.pitch-stat__caption {
  margin-top: 0.25rem;
  font-family: var(--pitch-font-mono);
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--pitch-faint);
}
</style>
