<script setup lang="ts">
interface Row {
  area: string;
  traditional: string;
  slashcash: string;
}

const rows: Row[] = [
  {
    area: 'Data storage',
    traditional: 'Cloud-first',
    slashcash: 'Local-first',
  },
  {
    area: 'Trust model',
    traditional: 'Closed-source',
    slashcash: 'Open-source',
  },
  {
    area: 'User effort',
    traditional: 'Manual or bank-sync dependent',
    slashcash: 'Agent automation',
  },
  {
    area: 'Output',
    traditional: 'Charts & reports',
    slashcash: 'Actions + finance score',
  },
  {
    area: 'Privacy',
    traditional: 'Trust the vendor',
    slashcash: 'Data stays on laptop',
  },
  {
    area: 'Extensibility',
    traditional: 'Limited',
    slashcash: 'Connectors + agents',
  },
  {
    area: 'Target user',
    traditional: 'Mass consumer',
    slashcash: 'Builders & privacy-first users',
  },
];
</script>

<template>
  <div class="pitch-diff">
    <div class="pitch-diff__head">
      <div class="pitch-diff__head-cell pitch-diff__head-cell--label">Area</div>
      <div class="pitch-diff__head-cell pitch-diff__head-cell--against">
        Traditional finance apps
      </div>
      <div class="pitch-diff__head-cell pitch-diff__head-cell--us">
        <span class="pitch-diff__head-pill">Slash Cash</span>
      </div>
    </div>

    <div class="pitch-diff__body">
      <div v-for="row in rows" :key="row.area" class="pitch-diff__row">
        <div class="pitch-diff__cell pitch-diff__cell--label">{{ row.area }}</div>
        <div class="pitch-diff__cell pitch-diff__cell--against">
          <span class="pitch-diff__glyph pitch-diff__glyph--neg" aria-hidden="true">—</span>
          <span>{{ row.traditional }}</span>
        </div>
        <div class="pitch-diff__cell pitch-diff__cell--us">
          <span class="pitch-diff__glyph pitch-diff__glyph--pos" aria-hidden="true">✓</span>
          <span>{{ row.slashcash }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitch-diff {
  margin-top: 0.85rem;
  border-radius: var(--pitch-radius-md);
  overflow: hidden;
  border: 1px solid var(--pitch-border-soft);
  box-shadow: var(--pitch-shadow-md);
  background: var(--pitch-bg-elevated);
}

.pitch-diff__head,
.pitch-diff__row {
  display: grid;
  grid-template-columns: 16% 1fr 1fr;
  align-items: stretch;
}

.pitch-diff__head {
  background: var(--pitch-bg-tint);
  border-bottom: 1px solid var(--pitch-border-soft);
}

.pitch-diff__head-cell {
  padding: 0.7rem 0.95rem;
  font-family: var(--pitch-font-display);
  font-size: 0.74rem;
  font-weight: 670;
  letter-spacing: -0.015em;
  color: var(--pitch-ink);
}

.pitch-diff__head-cell--label {
  font-family: var(--pitch-font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pitch-caption);
}

.pitch-diff__head-cell--against {
  color: var(--pitch-slate);
}

.pitch-diff__head-cell--us {
  background: linear-gradient(180deg, var(--pitch-accent-tint), transparent);
  color: var(--pitch-accent-deep);
  border-left: 1px solid var(--pitch-border-soft);
}

.pitch-diff__head-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.pitch-diff__head-pill::before {
  content: '/';
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
  font-size: 0.72rem;
  line-height: 1;
}

.pitch-diff__row {
  border-bottom: 1px solid var(--pitch-border-soft);
  font-size: 0.78rem;
}

.pitch-diff__row:last-child {
  border-bottom: none;
}

.pitch-diff__cell {
  padding: 0.55rem 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  line-height: 1.32;
  color: var(--pitch-slate);
}

.pitch-diff__cell--label {
  font-family: var(--pitch-font-mono);
  font-size: 0.68rem;
  font-weight: 550;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pitch-caption);
  background: var(--pitch-bg-tint);
}

.pitch-diff__cell--against {
  color: var(--pitch-faint);
}

.pitch-diff__cell--against span:not(.pitch-diff__glyph) {
  text-decoration: line-through;
  text-decoration-color: rgba(148, 160, 184, 0.45);
  text-decoration-thickness: 1px;
}

.pitch-diff__cell--us {
  background: var(--pitch-accent-tint);
  color: var(--pitch-ink);
  font-weight: 540;
  border-left: 1px solid var(--pitch-border-soft);
}

.pitch-diff__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  font-family: var(--pitch-font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  line-height: 1;
}

.pitch-diff__glyph--neg {
  background: rgba(148, 160, 184, 0.18);
  color: var(--pitch-faint);
}

.pitch-diff__glyph--pos {
  background: var(--pitch-accent);
  color: #ffffff;
  font-size: 0.62rem;
  box-shadow: 0 0 0 3px var(--pitch-accent-ring);
}
</style>
