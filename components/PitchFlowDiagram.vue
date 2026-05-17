<script setup lang="ts">
interface Step {
  title: string;
  detail: string;
  glyph: string;
}

const sources: Step = {
  title: 'Sources',
  detail: 'SMS · UPI · cards · email · PDF · CSV',
  glyph: '⌗',
};

const pipeline: Step[] = [
  { title: 'Local agents', detail: 'on the user’s laptop', glyph: '◆' },
  { title: 'Finance score', detail: 'money health', glyph: '★' },
  { title: 'Alerts', detail: 'before overspend', glyph: '!' },
  { title: 'Actions', detail: 'cut · save · invest', glyph: '→' },
];
</script>

<template>
  <div class="pitch-flow">
    <div class="pitch-flow__source">
      <div class="pitch-flow__source-tag">Input</div>
      <div class="pitch-flow__source-title">{{ sources.title }}</div>
      <div class="pitch-flow__source-detail">{{ sources.detail }}</div>
    </div>

    <div class="pitch-flow__pipe" aria-hidden="true">
      <svg viewBox="0 0 40 60" width="40" height="60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pitch-flow-arrow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#5b5bff" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#5b5bff" stop-opacity="1" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1="30"
          x2="32"
          y2="30"
          stroke="url(#pitch-flow-arrow)"
          stroke-width="1.6"
          stroke-linecap="round"
        />
        <path d="M28 24 L36 30 L28 36" fill="none" stroke="#5b5bff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div class="pitch-flow__steps">
      <template v-for="(step, idx) in pipeline" :key="step.title">
        <div class="pitch-flow__step">
          <div class="pitch-flow__step-glyph" aria-hidden="true">{{ step.glyph }}</div>
          <div class="pitch-flow__step-title">{{ step.title }}</div>
          <div class="pitch-flow__step-detail">{{ step.detail }}</div>
        </div>
        <div
          v-if="idx < pipeline.length - 1"
          class="pitch-flow__connector"
          aria-hidden="true"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.pitch-flow {
  display: grid;
  grid-template-columns: minmax(11rem, 12rem) auto 1fr;
  align-items: stretch;
  gap: 0.55rem;
  margin-top: 0.85rem;
  padding: 1.1rem 1.15rem;
  border-radius: var(--pitch-radius-lg);
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  border: 1px solid var(--pitch-border-soft);
  box-shadow: var(--pitch-shadow-md);
}

.pitch-flow__source {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  border-radius: var(--pitch-radius-md);
  background: var(--pitch-accent-tint);
  border: 1px solid var(--pitch-accent-soft);
}

.pitch-flow__source-tag {
  font-family: var(--pitch-font-mono);
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pitch-accent-deep);
}

.pitch-flow__source-title {
  font-family: var(--pitch-font-display);
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--pitch-ink);
}

.pitch-flow__source-detail {
  font-family: var(--pitch-font-mono);
  font-size: 0.66rem;
  color: var(--pitch-slate);
  line-height: 1.4;
}

.pitch-flow__pipe {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.35rem;
}

.pitch-flow__steps {
  display: flex;
  align-items: stretch;
  gap: 0.65rem;
  min-width: 0;
}

.pitch-flow__step {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  padding: 0.78rem 0.85rem;
  border-radius: var(--pitch-radius-md);
  background: var(--pitch-bg-elevated);
  border: 1px solid var(--pitch-border-soft);
}

.pitch-flow__step:last-child {
  background: linear-gradient(180deg, #ffffff 0%, var(--pitch-accent-tint) 100%);
  border-color: var(--pitch-accent-soft);
}

.pitch-flow__step-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 6px;
  background: var(--pitch-accent-tint);
  color: var(--pitch-accent-deep);
  font-family: var(--pitch-font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
}

.pitch-flow__step:last-child .pitch-flow__step-glyph {
  background: linear-gradient(180deg, var(--pitch-accent), var(--pitch-accent-deep));
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(91, 91, 255, 0.35);
}

.pitch-flow__step-title {
  font-family: var(--pitch-font-display);
  font-size: 0.88rem;
  font-weight: 680;
  letter-spacing: -0.022em;
  color: var(--pitch-ink);
  line-height: 1.15;
}

.pitch-flow__step-detail {
  font-family: var(--pitch-font-mono);
  font-size: 0.64rem;
  color: var(--pitch-slate);
  line-height: 1.4;
}

.pitch-flow__connector {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 0.95rem;
  color: var(--pitch-faint);
}

.pitch-flow__connector::before {
  content: '';
  display: block;
  width: 0.95rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--pitch-accent-soft) 30%,
    var(--pitch-accent) 50%,
    var(--pitch-accent-soft) 70%,
    transparent
  );
}
</style>
