---
theme: default
title: Slash Cash
info: |
  Slash Cash pitch deck.
colorSchema: light
drawings:
  persist: false
# Forward / back transitions — https://sli.dev/guide/animations#slide-transitions
transition: slide-left | slide-right
# Click steps — https://sli.dev/guide/animations#click-animation-presets
clickAnimation: fade-in
mdc: true
canvasWidth: 1280
aspectRatio: 16/9
fonts:
  sans: Plus Jakarta Sans
  mono: JetBrains Mono
layout: cover
class: pitch-cover text-left
---

<div class="pitch-cover__grid">

<div class="pitch-cover__copy">

<PitchEyebrow label="Investor deck · Slash Cash" />

# Slash Cash

## Open-source personal finance agents that run locally for wealth growth.

<div class="pitch-cover__tagline">

A private finance team on your laptop.

</div>

<div class="pitch-cover__footer">

<span class="pitch-cover__footer-chip">Local-first</span>
<span class="pitch-cover__footer-chip">Privacy-first</span>
<span class="pitch-cover__footer-chip">Open-source</span>
<span class="pitch-cover__footer-chip">CLI-first</span>

</div>

</div>

<div class="pitch-cover__panel">

<PitchProductPreview />

</div>

</div>

<!--
Open clean.
Positioning line: not another finance dashboard — a private finance team running locally.
-->

---
layout: default
---

<div class="pitch-slide-head">
  Problem
</div>

# People are spending digitally, but managing money manually.

<div class="pitch-muted-block">

For an **active salaried user**, a normal month can include:

</div>

<v-clicks depth="1">

- approx. **100–300** transactions
- **2–4** payment apps
- **1–3** credit cards
- **5–15** subscriptions
- multiple bank, investment, and loan accounts

</v-clicks>

<div v-click class="pitch-callout">

The data exists. **The visibility does not.**

</div>

<!--
Problem is fragmentation + manual reconciliation, not ‘lack of banking apps’.
-->

---
layout: default
---

<div class="pitch-slide-head">
  Gap
</div>

# Most finance apps show what happened. They do not help fix it.

<v-clicks>

- Manual tracking **does not scale**
- Cloud sync creates **trust issues**
- Dashboards show charts, **not actions**
- Insights arrive **after** money is already spent
- Users still need to decide **what to fix**

</v-clicks>

<div v-after class="pitch-callout">

People do not need one more chart. They need a system that **watches money behavior** and tells them **what to fix**.

</div>

<!--
Keep this blunt — charts without decisions are shelf-ware.
-->

---
layout: default
---

<div class="pitch-slide-head">
  Product
</div>

# Slash Cash is a team of agents for your money — running on your laptop.

<v-clicks>

- Each agent has **one job** — categorize spends, detect leaks, score behavior, suggest actions
- They run on **your machine**, on **your data** — nothing leaves the device
- They connect only to sources **you approve** — SMS, exports, email, files
- They **explain themselves** — every decision is reviewable, not a black box
- They work on a **schedule** so the analysis is ready **before** you open the dashboard

</v-clicks>

<div v-after class="pitch-callout">

Not another finance dashboard. **A private finance team running locally.**

</div>

<!--
Lead with the agent thesis. Bullets describe *how* the team works; slide 6 names the roster.
Trust model is local execution + inspectable workflows, not a pitch deck promise.
-->

---
layout: default
class: pitch-slide--full
---

<div class="pitch-slide-head">
  Flow
</div>

# Product flow

<PitchFlowDiagram />

<div v-click class="pitch-muted-block mt-6 text-center">

Sources → understanding → **decisions**. Not ‘pretty charts after the month ends’.

</div>

<!--
Five-second read: pipeline from messy inputs to concrete actions.
-->

---
layout: default
class: pitch-slide--dense
zoom: 0.9
---

<div class="pitch-slide-head">
  Architecture
</div>

# Agent architecture

<div class="pitch-agent-grid">

<PitchAgentCard v-click glyph="C" title="Connector Agent" description="Imports user-approved financial data (SMS, exports, email, files)." />
<PitchAgentCard v-click glyph="S" title="Spend Agent" description="Categorizes spending consistently month to month." />
<PitchAgentCard v-click glyph="L" title="Leak Detection Agent" description="Finds wasteful spends and recurring subscriptions." />
<PitchAgentCard v-click glyph="◎" title="Score Agent" description="Scores monthly money health (behavior, not credit)." />
<PitchAgentCard v-click glyph="!" title="Alert Agent" description="Warns before overspending patterns repeat." />
<PitchAgentCard v-click glyph="₹" title="Investor Agent" description="Suggests saving and investing actions that fit cash flow." />
<PitchAgentCard v-click wide glyph="R" title="Review Agent" description="Explains what changed month over month—plain English, no vanity metrics." />

</div>

<div v-after class="pitch-muted-block mt-5">

Each agent has **one job**. Together they behave like a **private finance team**.

</div>

<!--
Small, inspectable units — same discipline as design-system primitives.
-->

---
layout: two-cols
zoom: 0.93
class: pitch-slide--split
---

<div class="pitch-slide-head">
  Wedge
</div>

# CIBIL tells you credit health.

## Slash Cash tells you money health.

<div class="pitch-muted-block">

The Personal Finance Score is a **behavior score**, not a credit score.

</div>

<v-clicks depth="1">

- savings rate
- spend growth
- recurring expense load
- debt pressure
- emergency fund coverage
- investment consistency
- avoidable leaks
- month-over-month improvement

</v-clicks>

::right::

<div v-click>

<PitchScoreCard />

</div>

<!--
This slide should prompt: what changed, why, what do I do this week?
-->

---
layout: default
class: pitch-slide--dense
---

<div class="pitch-slide-head">
  Why now
</div>

# The timing is right for local personal finance agents.

<v-clicks>

1. **UPI scale** → transaction volume exploded (more noise per month)
2. **Fragmentation** → money data lives across apps, banks, cards, PDFs, messages
3. **Privacy awareness** → fewer people want raw finance data in random clouds
4. **Local models** → private analysis on-device is finally practical
5. **Open-source** → trust comes from **inspectability**, not marketing lines

</v-clicks>

<div class="pitch-kpi-row">

<PitchStat v-click value="10B+" label="UPI txns / month" caption="Public scale" />
<PitchStat v-click value="300M+" label="UPI users in India" caption="Approx." />
<PitchStat v-click value="Local" label="No raw money data uploaded" caption="By design" />

</div>

<!--
Timing = volume + fragmentation + privacy + tooling maturity.
-->

---
layout: default
---

<div class="pitch-slide-head">
  Beachhead
</div>

# Start with users who already feel the pain.

<v-clicks>

- **Developers** (comfortable with CLI / local tools)
- **Privacy-conscious** users
- Salaried professionals earning **₹15L–₹80L / yr**
- Heavy **UPI + cards + subscriptions + investments**
- Want discipline **without** shipping data to another cloud finance app

</v-clicks>

<div v-after class="pitch-card px-6 py-5 mt-5">

Narrow on purpose: enough transaction volume to hurt, enough income for behavior change to matter, and enough fluency to adopt **open-source local software** early.

</div>

<!--
First users fund clarity — not ‘every smartphone owner’.
-->

---
layout: default
class: pitch-slide--dense
---

<div class="pitch-slide-head">
  Market logic
</div>

# Start narrow. Expand into personal finance infrastructure.

<div class="pitch-pillar-row">

<div v-click class="pitch-pillar">

<div class="pitch-pillar__step">01</div>

<div class="pitch-pillar__title">Beachhead</div>

<div class="pitch-pillar__body">Indian developers & salaried professionals actively managing UPI, cards, subscriptions, investments.</div>

</div>

<div v-click class="pitch-pillar">

<div class="pitch-pillar__step">02</div>

<div class="pitch-pillar__title">Expansion</div>

<div class="pitch-pillar__body">Privacy-conscious personal finance users globally.</div>

</div>

<div v-click class="pitch-pillar">

<div class="pitch-pillar__step">03</div>

<div class="pitch-pillar__title">Long-term</div>

<div class="pitch-pillar__body">Local-first finance OS for individuals & families.</div>

</div>

</div>

<div v-after class="pitch-muted-block mt-6">

India has **hundreds of millions** of digital payment users. You do not need a fake TAM slide — even a **small, serious** slice of people who deeply care about money management can support a large product.

</div>

<!--
Practical framing beats invented precision.
-->

---
layout: default
---

<div class="pitch-slide-head">
  Differentiation
</div>

# Traditional apps vs Slash Cash

<PitchDiffTable />

<div v-click class="pitch-callout">

**Bet:** earn trust with a local + open-source core; monetize through **license keys** for advanced agents and commercial use.

</div>

<!--
Positioning should scan in ~5 seconds — table does the heavy lifting.
-->

---
layout: default
class: pitch-slide--dense
zoom: 0.92
---

<div class="pitch-slide-head">
  Model · Founder
</div>

# Open-source core. License keys fund the product.

<v-clicks depth="1">

**How we monetize**

- **Free / Personal:** full open-source CLI for individual, non-commercial use
- **Pro license key:** advanced agents, premium connectors, advanced planning flows
- **Family license key:** multi-user household, shared review loops
- **Advisor / Business license:** CAs, financial planners, family offices using Slash Cash with clients

**Why license keys, not SaaS**

- Stays **local-first** — no hosted backend, no cloud sync of finance data
- License key only validates **entitlement**; money data never leaves the device
- Predictable revenue without ever holding a user's financial data

</v-clicks>

<div v-after class="pitch-card px-6 py-5 mt-5">

I have spent years building systems that help engineering teams **trust automation** in complex fintech environments. Slash Cash applies the same pattern to personal finance: **trusted agents**, **local execution**, **clear review loops**.

</div>

<div v-after class="pitch-callout mt-6">

Vision: **every person** should have a private finance team that works **for them** — not for an ads business.

</div>

<!--
Founder: EM · Razorpay — Frontend Platform / Blade DS (keep light on internals).
No revenue / user claims.
-->
