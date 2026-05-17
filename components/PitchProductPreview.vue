<script setup lang="ts"></script>

<template>
  <div class="pitch-preview">
    <div class="pitch-preview__glow" aria-hidden="true" />

    <div class="pitch-preview__card">
      <div class="pitch-preview__bar" aria-hidden="true">
        <span class="pitch-preview__dot pitch-preview__dot--r" />
        <span class="pitch-preview__dot pitch-preview__dot--y" />
        <span class="pitch-preview__dot pitch-preview__dot--g" />
        <span class="pitch-preview__bar-title">slash.cash · local</span>
      </div>

      <div class="pitch-preview__body">
        <div class="pitch-preview__status">
          <span class="pitch-preview__pulse" aria-hidden="true">
            <span />
          </span>
          <span class="pitch-preview__status-text">6 agents running on this device</span>
        </div>

        <div class="pitch-preview__agents">
          <div class="pitch-preview__agent">
            <span class="pitch-preview__check" aria-hidden="true">✓</span>
            <span class="pitch-preview__agent-name">Spend Agent</span>
            <span class="pitch-preview__agent-meta">182 txns</span>
          </div>
          <div class="pitch-preview__agent">
            <span class="pitch-preview__check" aria-hidden="true">✓</span>
            <span class="pitch-preview__agent-name">Leak Agent</span>
            <span class="pitch-preview__agent-meta">3 leaks</span>
          </div>
          <div class="pitch-preview__agent">
            <span class="pitch-preview__check" aria-hidden="true">✓</span>
            <span class="pitch-preview__agent-name">Score Agent</span>
            <span class="pitch-preview__agent-meta">updated</span>
          </div>
        </div>

        <div class="pitch-preview__score">
          <div class="pitch-preview__score-head">
            <span class="pitch-preview__score-label">Personal Finance Score</span>
            <span class="pitch-preview__score-delta">+4 this month</span>
          </div>
          <div class="pitch-preview__score-num">72<span>/100</span></div>
          <div class="pitch-preview__score-bar" aria-hidden="true">
            <span class="pitch-preview__score-fill" />
          </div>
        </div>

        <div class="pitch-preview__footer">
          <span class="pitch-preview__lock" aria-hidden="true">●</span>
          <span>No data leaves this laptop</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitch-preview {
  position: relative;
  width: 100%;
  max-width: 26rem;
  margin-left: auto;
}

.pitch-preview__glow {
  position: absolute;
  inset: -15% -10% -10% -10%;
  background:
    radial-gradient(circle at 75% 20%, rgba(91, 91, 255, 0.22), transparent 55%),
    radial-gradient(circle at 20% 90%, rgba(91, 91, 255, 0.1), transparent 55%);
  filter: blur(6px);
  z-index: 0;
  pointer-events: none;
}

.pitch-preview__card {
  position: relative;
  z-index: 1;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f8fc 100%);
  border: 1px solid var(--pitch-border);
  box-shadow:
    0 1px 2px rgba(10, 31, 59, 0.04),
    0 40px 80px -32px rgba(10, 31, 59, 0.25),
    0 12px 24px -16px rgba(91, 91, 255, 0.15);
  overflow: hidden;
}

.pitch-preview__bar {
  display: flex;
  align-items: center;
  gap: 0.32rem;
  padding: 0.55rem 0.85rem;
  background: var(--pitch-bg-tint);
  border-bottom: 1px solid var(--pitch-border-soft);
}

.pitch-preview__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  display: inline-block;
}

.pitch-preview__dot--r {
  background: #ff5f57;
}
.pitch-preview__dot--y {
  background: #febc2e;
}
.pitch-preview__dot--g {
  background: #28c840;
}

.pitch-preview__bar-title {
  margin-left: auto;
  font-family: var(--pitch-font-mono);
  font-size: 0.6rem;
  font-weight: 550;
  color: var(--pitch-caption);
  letter-spacing: 0.04em;
}

.pitch-preview__body {
  padding: 0.95rem 1.05rem 1.05rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pitch-preview__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--pitch-font-mono);
  font-size: 0.68rem;
  font-weight: 550;
  color: var(--pitch-slate);
}

.pitch-preview__pulse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.6rem;
  height: 0.6rem;
  position: relative;
}

.pitch-preview__pulse span {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--pitch-positive);
  box-shadow: 0 0 0 3px var(--pitch-positive-soft);
  animation: pitch-pulse 2s ease-in-out infinite;
}

@keyframes pitch-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px var(--pitch-positive-soft);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(13, 146, 104, 0.05);
  }
}

.pitch-preview__agents {
  display: flex;
  flex-direction: column;
  gap: 0.36rem;
}

.pitch-preview__agent {
  display: grid;
  grid-template-columns: 0.95rem 1fr auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: var(--pitch-bg-tint);
  border: 1px solid var(--pitch-border-soft);
  font-size: 0.78rem;
}

.pitch-preview__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  background: var(--pitch-positive-soft);
  color: var(--pitch-positive);
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1;
}

.pitch-preview__agent-name {
  font-family: var(--pitch-font-display);
  font-weight: 600;
  color: var(--pitch-ink);
  font-size: 0.78rem;
  letter-spacing: -0.015em;
}

.pitch-preview__agent-meta {
  font-family: var(--pitch-font-mono);
  font-size: 0.66rem;
  color: var(--pitch-caption);
  font-weight: 500;
}

.pitch-preview__score {
  padding: 0.85rem 0.9rem 0.9rem;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(91, 91, 255, 0.04), transparent),
    var(--pitch-bg-elevated);
  border: 1px solid var(--pitch-accent-soft);
}

.pitch-preview__score-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--pitch-font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--pitch-caption);
  font-weight: 600;
}

.pitch-preview__score-delta {
  color: var(--pitch-positive);
  background: var(--pitch-positive-soft);
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  letter-spacing: 0.04em;
  font-size: 0.55rem;
}

.pitch-preview__score-num {
  margin-top: 0.32rem;
  font-family: var(--pitch-font-display);
  font-size: 2.1rem;
  font-weight: 720;
  letter-spacing: -0.045em;
  line-height: 1;
  color: var(--pitch-ink);
  font-variant-numeric: tabular-nums;
}

.pitch-preview__score-num span {
  font-size: 0.78rem;
  font-weight: 550;
  color: var(--pitch-faint);
  letter-spacing: -0.02em;
  margin-left: 0.18rem;
}

.pitch-preview__score-bar {
  margin-top: 0.55rem;
  height: 6px;
  border-radius: 999px;
  background: var(--pitch-accent-tint);
  overflow: hidden;
}

.pitch-preview__score-fill {
  display: block;
  height: 100%;
  width: 72%;
  background: linear-gradient(90deg, var(--pitch-accent), var(--pitch-accent-deep));
  border-radius: 999px;
}

.pitch-preview__footer {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--pitch-border-soft);
  font-family: var(--pitch-font-mono);
  font-size: 0.62rem;
  font-weight: 550;
  color: var(--pitch-caption);
  letter-spacing: 0.04em;
}

.pitch-preview__lock {
  color: var(--pitch-positive);
  font-size: 0.55rem;
}
</style>
