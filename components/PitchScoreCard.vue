<script setup lang="ts">
type Direction = 'up' | 'down' | 'flat';

interface Row {
  label: string;
  delta: string;
  direction: Direction;
  /** semantic meaning of the delta: 'positive' = good outcome, 'negative' = bad */
  tone: 'positive' | 'negative';
}

const rows: Row[] = [
  { label: 'Savings rate', delta: '−8%', direction: 'down', tone: 'negative' },
  { label: 'Food delivery spend', delta: '+38%', direction: 'up', tone: 'negative' },
  { label: 'Unused subscriptions', delta: '3', direction: 'flat', tone: 'negative' },
  { label: 'Credit card bill', delta: '+18%', direction: 'up', tone: 'negative' },
];
</script>

<template>
  <div class="pitch-score">
    <div class="pitch-score__head">
      <div class="pitch-score__head-row">
        <span class="pitch-score__label">Example user</span>
        <span class="pitch-score__chip">behavior score</span>
      </div>
      <div class="pitch-score__numline">
        <span class="pitch-score__num">72</span>
        <span class="pitch-score__den">/ 100</span>
        <span class="pitch-score__trend" aria-hidden="true">
          <svg viewBox="0 0 56 16" width="56" height="16">
            <polyline
              points="0,11 8,9 14,12 22,7 30,9 36,4 44,6 56,2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
      <div class="pitch-score__bar" aria-hidden="true">
        <span class="pitch-score__fill" />
      </div>
    </div>

    <div class="pitch-score__rows">
      <div
        v-for="row in rows"
        :key="row.label"
        class="pitch-score__row"
        :data-tone="row.tone"
      >
        <span class="pitch-score__row-label">{{ row.label }}</span>
        <span class="pitch-score__row-delta" :data-dir="row.direction">
          <svg
            v-if="row.direction === 'up'"
            viewBox="0 0 10 10"
            width="10"
            height="10"
            aria-hidden="true"
          >
            <path d="M5 2 L9 7 L1 7 Z" fill="currentColor" />
          </svg>
          <svg
            v-else-if="row.direction === 'down'"
            viewBox="0 0 10 10"
            width="10"
            height="10"
            aria-hidden="true"
          >
            <path d="M5 8 L1 3 L9 3 Z" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <rect x="1" y="4" width="8" height="2" fill="currentColor" rx="1" />
          </svg>
          {{ row.delta }}
        </span>
      </div>
    </div>

    <div class="pitch-score__action">
      <div class="pitch-score__action-tag">Suggested this week</div>
      <div class="pitch-score__action-body">
        Reduce <strong>₹8,000</strong> spend · move <strong>₹10,000</strong> to SIP
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitch-score {
  padding: 1.1rem 1.2rem 1.15rem;
  border-radius: var(--pitch-radius-lg);
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  border: 1px solid var(--pitch-border-soft);
  box-shadow: var(--pitch-shadow-lg);
}

.pitch-score__head {
  padding-bottom: 0.9rem;
  border-bottom: 1px dashed var(--pitch-border-soft);
}

.pitch-score__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.pitch-score__label {
  font-family: var(--pitch-font-mono);
  font-size: 0.6rem;
  font-weight: 650;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pitch-caption);
}

.pitch-score__chip {
  font-family: var(--pitch-font-mono);
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pitch-accent-deep);
  background: var(--pitch-accent-tint);
  border: 1px solid var(--pitch-accent-soft);
  padding: 0.18rem 0.4rem;
  border-radius: 999px;
}

.pitch-score__numline {
  margin-top: 0.32rem;
  display: flex;
  align-items: baseline;
  gap: 0.42rem;
}

.pitch-score__num {
  font-family: var(--pitch-font-display);
  font-size: 2.85rem;
  font-weight: 740;
  letter-spacing: -0.05em;
  line-height: 1;
  color: var(--pitch-ink);
  font-variant-numeric: tabular-nums;
}

.pitch-score__den {
  font-family: var(--pitch-font-display);
  font-size: 1.05rem;
  font-weight: 540;
  color: var(--pitch-faint);
  letter-spacing: -0.02em;
}

.pitch-score__trend {
  margin-left: auto;
  color: var(--pitch-accent);
  display: inline-flex;
}

.pitch-score__bar {
  margin-top: 0.6rem;
  height: 6px;
  border-radius: 999px;
  background: var(--pitch-accent-tint);
  overflow: hidden;
}

.pitch-score__fill {
  display: block;
  height: 100%;
  width: 72%;
  background: linear-gradient(90deg, var(--pitch-accent), var(--pitch-accent-deep));
  border-radius: 999px;
}

.pitch-score__rows {
  margin-top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.pitch-score__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.42rem 0.6rem;
  border-radius: 8px;
  background: var(--pitch-bg-tint);
  border: 1px solid var(--pitch-border-soft);
  font-size: 0.8rem;
}

.pitch-score__row-label {
  color: var(--pitch-slate);
  font-weight: 500;
}

.pitch-score__row-delta {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  font-family: var(--pitch-font-mono);
  font-size: 0.74rem;
  font-weight: 650;
  padding: 0.14rem 0.42rem;
  border-radius: 999px;
  letter-spacing: -0.01em;
}

.pitch-score__row[data-tone='negative'] .pitch-score__row-delta {
  color: var(--pitch-negative);
  background: var(--pitch-negative-soft);
}

.pitch-score__row[data-tone='positive'] .pitch-score__row-delta {
  color: var(--pitch-positive);
  background: var(--pitch-positive-soft);
}

.pitch-score__action {
  margin-top: 0.85rem;
  padding: 0.72rem 0.85rem;
  border-radius: 10px;
  background: var(--pitch-accent-tint);
  border: 1px solid var(--pitch-accent-soft);
}

.pitch-score__action-tag {
  font-family: var(--pitch-font-mono);
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pitch-accent-deep);
}

.pitch-score__action-body {
  margin-top: 0.2rem;
  font-size: 0.84rem;
  font-weight: 550;
  line-height: 1.35;
  color: var(--pitch-ink);
  font-family: var(--pitch-font-display);
  letter-spacing: -0.015em;
}

.pitch-score__action-body strong {
  font-weight: 700;
  color: var(--pitch-accent-deep);
}
</style>
