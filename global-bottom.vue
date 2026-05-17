<script setup lang="ts">
import { useNav } from '@slidev/client';

const { currentSlideNo, total } = useNav();
</script>

<template>
  <div v-if="currentSlideNo > 1" class="pitch-chrome" aria-hidden="true">
    <div class="pitch-chrome__brand">
      <span class="pitch-chrome__mark">/</span>
      <span class="pitch-chrome__name">slash.cash</span>
    </div>
    <div class="pitch-chrome__meta">
      <span class="pitch-chrome__pill">Investor deck · 2026</span>
      <span class="pitch-chrome__count">
        <span class="pitch-chrome__num">{{ String(currentSlideNo).padStart(2, '0') }}</span>
        <span class="pitch-chrome__sep">/</span>
        <span class="pitch-chrome__total">{{ String(total).padStart(2, '0') }}</span>
      </span>
    </div>
  </div>
</template>

<style is:global>
  /*
   * Slash Cash — investor deck design system
   * Built for a16z / YC reading. Stripe-quality engineering aesthetic.
   *
   * Principles:
   *   - Single accent (electric indigo), single neutral ramp (ink → slate → caption)
   *   - Mono for numerics, display for headlines, body for prose
   *   - Surfaces are 1px-bordered white cards with 1 layered shadow
   *   - Every slide reads in <8s; bottom 30% reserved for insight/callout
   */
  :root {
    /* Neutrals */
    --pitch-bg: #f6f8fb;
    --pitch-bg-elevated: #ffffff;
    --pitch-bg-tint: #fafbfd;
    --pitch-ink: #0a1f3b;
    --pitch-slate: #3d4a63;
    --pitch-caption: #6b7791;
    --pitch-faint: #94a0b8;
    --pitch-rule: rgba(10, 31, 59, 0.07);
    --pitch-border: rgba(10, 31, 59, 0.1);
    --pitch-border-soft: rgba(10, 31, 59, 0.06);

    /* Accent (electric indigo, Stripe-adjacent but distinct) */
    --pitch-accent: #5b5bff;
    --pitch-accent-deep: #3f3fd9;
    --pitch-accent-soft: rgba(91, 91, 255, 0.1);
    --pitch-accent-tint: rgba(91, 91, 255, 0.04);
    --pitch-accent-ring: rgba(91, 91, 255, 0.18);

    /* Outcome accents (used sparingly — only for measurable change) */
    --pitch-positive: #0d9268;
    --pitch-positive-soft: rgba(13, 146, 104, 0.1);
    --pitch-negative: #c93b4f;
    --pitch-negative-soft: rgba(201, 59, 79, 0.08);

    /* Type system */
    --pitch-font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
    --pitch-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
    --pitch-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

    /* Shape */
    --pitch-radius-xs: 6px;
    --pitch-radius-sm: 10px;
    --pitch-radius-md: 14px;
    --pitch-radius-lg: 20px;
    --pitch-radius-xl: 28px;

    /* Shadows */
    --pitch-shadow-xs: 0 1px 0 rgba(10, 31, 59, 0.04);
    --pitch-shadow-sm:
      0 1px 2px rgba(10, 31, 59, 0.04), 0 0 0 1px rgba(10, 31, 59, 0.04);
    --pitch-shadow-md:
      0 1px 2px rgba(10, 31, 59, 0.04), 0 12px 32px -16px rgba(10, 31, 59, 0.18);
    --pitch-shadow-lg:
      0 1px 2px rgba(10, 31, 59, 0.04), 0 30px 60px -28px rgba(10, 31, 59, 0.22);

    /* Slide layout — tuned for 1280x720 canvas */
    --pitch-slide-pad-x: 3rem;
    --pitch-slide-pad-y: 2rem;
    --pitch-content-max: 56rem;
  }

  /* ─── Slide canvas ────────────────────────────────────────────────────── */
  .slidev-layout {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    height: 100%;
    font-family: var(--pitch-font-body);
    color: var(--pitch-ink);
    font-size: 17px;
    line-height: 1.52;
    letter-spacing: -0.005em;
    font-weight: 440;
    padding: var(--pitch-slide-pad-y) var(--pitch-slide-pad-x) !important;
    overflow: hidden;
    background-color: var(--pitch-bg);
    background-image:
      radial-gradient(ellipse 60% 50% at 100% -4%, rgba(91, 91, 255, 0.07), transparent 60%),
      radial-gradient(ellipse 50% 40% at -4% 110%, rgba(10, 31, 59, 0.04), transparent 55%),
      linear-gradient(180deg, #f6f8fb 0%, #f1f4f9 100%);
  }

  /* Hairline rule across the top of every inner slide — quiet structure */
  .slidev-layout:not(.pitch-cover)::before {
    content: '';
    position: absolute;
    top: 0;
    left: var(--pitch-slide-pad-x);
    right: var(--pitch-slide-pad-x);
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--pitch-rule) 20%,
      var(--pitch-rule) 80%,
      transparent 100%
    );
    z-index: 0;
  }

  .slidev-layout > * {
    position: relative;
    z-index: 1;
  }

  .slidev-vclick-target {
    transition:
      opacity 220ms cubic-bezier(0.33, 1, 0.68, 1),
      transform 220ms cubic-bezier(0.33, 1, 0.68, 1);
  }

  .slidev-vclick-hidden {
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
  }

  /* ─── Typography ──────────────────────────────────────────────────────── */
  .slidev-layout h1 {
    font-family: var(--pitch-font-display);
    font-size: 2.35rem;
    line-height: 1.08;
    letter-spacing: -0.038em;
    font-weight: 700;
    margin: 0 0 0.45rem;
    color: var(--pitch-ink);
    max-width: 30ch;
  }

  .slidev-layout h2 {
    font-family: var(--pitch-font-display);
    font-size: 1.18rem;
    line-height: 1.32;
    letter-spacing: -0.022em;
    font-weight: 520;
    color: var(--pitch-slate);
    margin: 0;
    max-width: 42ch;
  }

  .slidev-layout p {
    margin: 0.4rem 0 0;
    color: var(--pitch-slate);
  }

  .slidev-layout strong {
    color: var(--pitch-ink);
    font-weight: 640;
  }

  .slidev-layout ul,
  .slidev-layout ol {
    margin: 0.65rem 0 0;
    padding-left: 1.1rem;
  }

  .slidev-layout li {
    margin: 0.32rem 0;
    padding-left: 0.22rem;
    color: var(--pitch-slate);
    line-height: 1.5;
  }

  .slidev-layout li::marker {
    color: var(--pitch-accent);
    font-weight: 600;
  }

  .slidev-layout ol > li::marker {
    font-family: var(--pitch-font-mono);
    font-size: 0.78em;
  }

  /* Mono accent for numerics in body copy — wrap in <code> in markdown */
  .slidev-layout code {
    font-family: var(--pitch-font-mono);
    font-size: 0.88em;
    padding: 0.08em 0.32em;
    background: var(--pitch-accent-tint);
    color: var(--pitch-accent-deep);
    border-radius: 4px;
    border: 1px solid var(--pitch-accent-soft);
    font-weight: 500;
  }

  /* ─── Section eyebrow / slide head ────────────────────────────────────── */
  .pitch-slide-head {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.85rem;
    padding: 0;
    font-family: var(--pitch-font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--pitch-caption);
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }

  .pitch-slide-head::before {
    content: '';
    width: 1.6rem;
    height: 2px;
    border-radius: 2px;
    background: var(--pitch-accent);
    flex-shrink: 0;
  }

  /* ─── Cover slide ─────────────────────────────────────────────────────── */
  .pitch-cover {
    justify-content: center !important;
    align-items: stretch !important;
    padding: 2.5rem 3.25rem !important;
    background-image:
      radial-gradient(ellipse 50% 55% at 85% 0%, rgba(91, 91, 255, 0.13), transparent 60%),
      radial-gradient(ellipse 40% 40% at 0% 100%, rgba(10, 31, 59, 0.05), transparent 55%),
      linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%);
  }

  .pitch-cover .slidev-slide-content {
    display: block;
    width: 100%;
    max-width: 100%;
    flex: 1;
    min-height: 0;
  }

  .pitch-cover .slidev-slide-content > * {
    width: 100%;
    max-width: 100%;
  }

  .pitch-cover__grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    gap: 2.5rem;
    align-items: center;
    height: 100%;
  }

  .pitch-cover__copy {
    min-width: 0;
    max-width: 32rem;
  }

  .pitch-cover h1 {
    font-size: 3.2rem !important;
    line-height: 1 !important;
    margin: 0.75rem 0 0.85rem !important;
    font-weight: 740 !important;
    letter-spacing: -0.046em !important;
    color: var(--pitch-ink) !important;
    max-width: none;
  }

  .pitch-cover h2 {
    font-size: 1.15rem !important;
    font-weight: 450 !important;
    color: var(--pitch-slate) !important;
    max-width: 30rem;
    line-height: 1.45 !important;
    margin: 0 !important;
  }

  .pitch-cover__tagline {
    margin-top: 1.7rem;
    font-family: var(--pitch-font-display);
    font-size: 1.18rem;
    font-weight: 560;
    letter-spacing: -0.022em;
    color: var(--pitch-ink);
    max-width: 28rem;
    line-height: 1.35;
    padding-left: 0.95rem;
    border-left: 2px solid var(--pitch-accent);
  }

  .pitch-cover__footer {
    margin-top: 2rem;
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .pitch-cover__footer-chip {
    font-family: var(--pitch-font-mono);
    font-size: 0.65rem;
    font-weight: 550;
    color: var(--pitch-caption);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.32rem 0.65rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid var(--pitch-border-soft);
    backdrop-filter: blur(6px);
  }

  /* Legacy support: render the existing "Local-first · ... · CLI-first" string */
  .pitch-cover__footer:not(:has(.pitch-cover__footer-chip)) {
    margin-top: 1.85rem;
    font-family: var(--pitch-font-mono);
    font-size: 0.68rem;
    font-weight: 550;
    color: var(--pitch-caption);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.45rem 0.8rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid var(--pitch-border-soft);
    display: inline-flex;
    align-items: center;
    width: auto;
    max-width: max-content;
    backdrop-filter: blur(6px);
  }

  /* Cover panel container (right side) */
  .pitch-cover__panel {
    position: relative;
    height: 100%;
    min-height: 360px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ─── Eyebrow chip (used on cover) ────────────────────────────────────── */
  .pitch-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.32rem 0.7rem 0.32rem 0.55rem;
    border-radius: 999px;
    font-family: var(--pitch-font-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--pitch-ink);
    background: #ffffff;
    border: 1px solid var(--pitch-border-soft);
    box-shadow: var(--pitch-shadow-xs);
  }

  .pitch-eyebrow__dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--pitch-accent);
    box-shadow: 0 0 0 3px var(--pitch-accent-ring);
  }

  /* ─── Surfaces ────────────────────────────────────────────────────────── */
  .pitch-card {
    border-radius: var(--pitch-radius-md);
    background: var(--pitch-bg-elevated);
    border: 1px solid var(--pitch-border-soft);
    box-shadow: var(--pitch-shadow-sm);
    padding: 1rem 1.15rem;
    color: var(--pitch-slate);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .pitch-muted-block {
    margin-top: 0.85rem;
    padding: 0.8rem 1.05rem;
    border-radius: var(--pitch-radius-sm);
    background: var(--pitch-bg-elevated);
    border: 1px solid var(--pitch-border-soft);
    color: var(--pitch-slate);
    font-size: 0.88rem;
    line-height: 1.45;
    box-shadow: var(--pitch-shadow-xs);
    max-width: var(--pitch-content-max);
  }

  /* Statement callout — the "punchline" of each slide */
  .pitch-callout {
    position: relative;
    border-radius: var(--pitch-radius-md);
    background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
    border: 1px solid var(--pitch-border-soft);
    padding: 1rem 1.15rem 1rem 1.35rem;
    margin-top: 1.1rem;
    font-family: var(--pitch-font-display);
    font-weight: 540;
    font-size: 0.98rem;
    line-height: 1.4;
    color: var(--pitch-ink);
    box-shadow: var(--pitch-shadow-md);
    max-width: var(--pitch-content-max);
    overflow: hidden;
  }

  .pitch-callout::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12%;
    bottom: 12%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--pitch-accent), var(--pitch-accent-deep));
  }

  /* ─── Agent grid (slide 6) ────────────────────────────────────────────── */
  .pitch-agent-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
    margin-top: 0.85rem;
  }

  /* ─── Stat KPI row ────────────────────────────────────────────────────── */
  .pitch-kpi-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 1rem;
  }

  /* ─── Pillar row (slide 10) ───────────────────────────────────────────── */
  .pitch-pillar-row {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 1.1rem;
  }

  .pitch-pillar-row::before {
    content: '';
    position: absolute;
    top: 1.5rem;
    left: 8%;
    right: 8%;
    height: 1px;
    background: repeating-linear-gradient(
      90deg,
      var(--pitch-border) 0 6px,
      transparent 6px 12px
    );
    z-index: 0;
  }

  .pitch-pillar {
    position: relative;
    padding: 1.05rem 1.1rem 1rem;
    border-radius: var(--pitch-radius-md);
    background: var(--pitch-bg-elevated);
    border: 1px solid var(--pitch-border-soft);
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.42rem;
    box-shadow: var(--pitch-shadow-sm);
    z-index: 1;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .pitch-pillar:hover {
    border-color: var(--pitch-accent-ring);
    box-shadow: var(--pitch-shadow-md);
    transform: translateY(-1px);
  }

  .pitch-pillar__step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 999px;
    font-family: var(--pitch-font-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #ffffff;
    background: linear-gradient(180deg, var(--pitch-accent), var(--pitch-accent-deep));
    box-shadow:
      0 0 0 3px var(--pitch-accent-ring),
      0 1px 2px rgba(91, 91, 255, 0.3);
  }

  .pitch-pillar__title {
    font-family: var(--pitch-font-display);
    font-size: 1.05rem;
    font-weight: 680;
    letter-spacing: -0.025em;
    color: var(--pitch-ink);
    margin-top: 0.15rem;
  }

  .pitch-pillar__body {
    font-size: 0.82rem;
    color: var(--pitch-slate);
    line-height: 1.42;
    flex: 1;
  }

  /* ─── Table (slide 11) ────────────────────────────────────────────────── */
  .pitch-table-wrap {
    margin-top: 0.85rem;
    border-radius: var(--pitch-radius-md);
    overflow: hidden;
    border: 1px solid var(--pitch-border-soft);
    box-shadow: var(--pitch-shadow-sm);
    background: var(--pitch-bg-elevated);
  }

  .pitch-table-wrap table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    margin: 0 !important;
  }

  .pitch-table-wrap thead th {
    text-align: left;
    padding: 0.65rem 0.95rem;
    background: var(--pitch-bg-tint);
    color: var(--pitch-ink);
    font-family: var(--pitch-font-display);
    font-weight: 660;
    letter-spacing: -0.015em;
    border-bottom: 1px solid var(--pitch-border-soft);
    font-size: 0.78rem;
  }

  /* Highlight the "Slash Cash" column header */
  .pitch-table-wrap thead th:last-child {
    color: var(--pitch-accent-deep);
    background: linear-gradient(180deg, var(--pitch-accent-tint), transparent);
    border-bottom-color: var(--pitch-accent-soft);
  }

  .pitch-table-wrap tbody td {
    padding: 0.55rem 0.95rem;
    vertical-align: top;
    border-bottom: 1px solid var(--pitch-border-soft);
    color: var(--pitch-slate);
    line-height: 1.35;
  }

  .pitch-table-wrap tbody td:first-child {
    color: var(--pitch-caption);
    font-family: var(--pitch-font-mono);
    font-size: 0.72rem;
    font-weight: 550;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    width: 16%;
    background: var(--pitch-bg-tint);
  }

  .pitch-table-wrap tbody td:nth-child(2) {
    color: var(--pitch-faint);
    text-decoration: line-through;
    text-decoration-color: rgba(148, 160, 184, 0.4);
    text-decoration-thickness: 1px;
  }

  .pitch-table-wrap tbody td:last-child {
    background: var(--pitch-accent-tint);
    color: var(--pitch-ink);
    font-weight: 540;
    position: relative;
  }

  .pitch-table-wrap tbody td:last-child strong {
    color: var(--pitch-accent-deep);
    font-weight: 700;
  }

  .pitch-table-wrap tbody tr:last-child td {
    border-bottom: none;
  }

  /* ─── Mermaid (kept for any leftover usage) ───────────────────────────── */
  .pitch-mermaid {
    margin-top: 0.65rem;
    padding: 1rem 1.1rem;
    border-radius: var(--pitch-radius-md);
    background: var(--pitch-bg-elevated);
    border: 1px solid var(--pitch-border-soft);
    box-shadow: var(--pitch-shadow-sm);
  }

  /* ─── Two-cols + dense modifiers ──────────────────────────────────────── */
  .slidev-layout.pitch-slide--dense {
    font-size: 16px;
  }

  .slidev-layout.pitch-slide--dense h1 {
    font-size: 2rem;
  }

  .slidev-layout.pitch-slide--dense h2 {
    font-size: 1.05rem;
  }

  /* ─── Deck chrome (footer brand mark + page count) ────────────────────── */
  .pitch-chrome {
    position: absolute;
    left: 3rem;
    right: 3rem;
    bottom: 1.05rem;
    z-index: 50;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--pitch-font-mono);
    font-size: 0.65rem;
    font-weight: 550;
    color: var(--pitch-faint);
    letter-spacing: 0.06em;
  }

  .pitch-chrome__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    color: var(--pitch-caption);
    text-transform: none;
    letter-spacing: 0;
  }

  .pitch-chrome__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 5px;
    background: linear-gradient(180deg, var(--pitch-accent), var(--pitch-accent-deep));
    color: #ffffff;
    font-family: var(--pitch-font-display);
    font-weight: 800;
    font-size: 0.74rem;
    line-height: 1;
    box-shadow: 0 1px 2px rgba(91, 91, 255, 0.35);
  }

  .pitch-chrome__name {
    font-family: var(--pitch-font-display);
    font-size: 0.72rem;
    font-weight: 620;
    color: var(--pitch-slate);
    letter-spacing: -0.015em;
  }

  .pitch-chrome__meta {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
  }

  .pitch-chrome__pill {
    font-size: 0.62rem;
    color: var(--pitch-caption);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .pitch-chrome__count {
    display: inline-flex;
    align-items: baseline;
    gap: 0.15rem;
    font-family: var(--pitch-font-mono);
    font-size: 0.7rem;
    color: var(--pitch-caption);
  }

  .pitch-chrome__num {
    color: var(--pitch-ink);
    font-weight: 650;
  }

  .pitch-chrome__sep {
    color: var(--pitch-faint);
  }

  /* ─── Score panel (slide 7) — supports both legacy + new components ──── */
  .pitch-score-panel {
    padding: 1.25rem 1.35rem;
    border-radius: var(--pitch-radius-lg);
    background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
    border: 1px solid var(--pitch-border-soft);
    box-shadow: var(--pitch-shadow-lg);
  }

  /* ─── Print / overview tweaks ─────────────────────────────────────────── */
  @media print {
    .pitch-chrome {
      opacity: 1 !important;
    }
  }
</style>
