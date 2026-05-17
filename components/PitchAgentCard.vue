<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  description: string;
  wide?: boolean;
  glyph?: string;
}>();

const initial = computed(() => props.glyph ?? props.title.charAt(0).toUpperCase());
</script>

<template>
  <div class="pitch-agent-card" :class="{ 'pitch-agent-card--wide': wide }">
    <div class="pitch-agent-card__head">
      <span class="pitch-agent-card__glyph" aria-hidden="true">{{ initial }}</span>
      <div class="pitch-agent-card__title">{{ title }}</div>
    </div>
    <div class="pitch-agent-card__desc">{{ description }}</div>
  </div>
</template>

<style scoped>
.pitch-agent-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.7rem 0.8rem;
  border-radius: var(--pitch-radius-md);
  background: var(--pitch-bg-elevated);
  border: 1px solid var(--pitch-border-soft);
  box-shadow: var(--pitch-shadow-sm);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.pitch-agent-card:hover {
  border-color: var(--pitch-accent-ring);
  box-shadow: var(--pitch-shadow-md);
  transform: translateY(-1px);
}

.pitch-agent-card--wide {
  grid-column: span 3;
  flex-direction: row;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: linear-gradient(90deg, var(--pitch-accent-tint), transparent 70%);
  border-color: var(--pitch-accent-soft);
}

.pitch-agent-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pitch-agent-card--wide .pitch-agent-card__head {
  min-width: 11rem;
}

.pitch-agent-card__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 6px;
  font-family: var(--pitch-font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pitch-accent-deep);
  background: var(--pitch-accent-tint);
  border: 1px solid var(--pitch-accent-soft);
  letter-spacing: 0;
  flex-shrink: 0;
}

.pitch-agent-card--wide .pitch-agent-card__glyph {
  background: linear-gradient(180deg, var(--pitch-accent), var(--pitch-accent-deep));
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 1px 2px rgba(91, 91, 255, 0.3);
}

.pitch-agent-card__title {
  font-family: var(--pitch-font-display);
  font-weight: 670;
  letter-spacing: -0.022em;
  font-size: 0.88rem;
  color: var(--pitch-ink);
  line-height: 1.18;
}

.pitch-agent-card__desc {
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--pitch-slate);
}

.pitch-agent-card--wide .pitch-agent-card__desc {
  flex: 1;
  font-size: 0.78rem;
}
</style>
