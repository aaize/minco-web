---
type: concept
updated: 2026-10-02
sources: pages/checkin.html, assets/js/checkin.js, WORKFLOW.txt:149-196
---

# Wellbeing Checkin

`pages/checkin.html` + `checkin.js` + `checkin.css`. PRIVACY: 100% on-device scoring. Answers never sent/stored. Only optional score history in `localStorage "minco_checkin_history"` (max 30). Bands are reflection, NOT diagnosis — [[safety-privacy]].

## Questionnaires

- Low-mood: 9 questions, 0–3 scale ("Not at all".."Nearly every day", last 2 weeks), max 27. Bands: Minimal 0–4, Mild 5–9, Moderate 10–14, Mod-severe 15–19, Severe 20–27
- Worry: 7 questions, max 21. Bands: Minimal 0–4, Mild 5–9, Moderate 10–14, Severe 15–21
- Tabs switch screeners (answers reset). Progress "X of N answered"

## Result flow

1. "See my result" validates all answered (error + scroll to first missing). Sum → band + guidance
2. Result card: score circle, band, range, guidance, animated fill bar. Low-mood Q9 (self-harm) >0 → crisis box (emergency + US 988 + UK 116 123)
3. Actions: Retake, "Save to my history" (`{screener,name,score,max,band,crisis,ts,answers}`, dedupe double-save), Resources/Meetings links
4. History list (newest first, last 10): date, severity bar (band-colored), score/band. "Clear history" wipes

## Stats dashboard ("My wellbeing insights")

- Filters: scope Both|Low mood|Worry; range 30d|7d|All time
- Current snapshot: latest → color dot + band/score, interpretation, date, wellbeing ring (100 − avg severity%)
- KPI tiles: total (+streak), latest (+date/band), avg severity%, trend (linear-regression slope: Improving/Steady/Rising, <2 = need more data)
- Score-over-time: dependency-free canvas line chart (severity%, gridlines 0/25/50/75/100)
- Time-in-each-band: counts + % bars + streak line
- Per-question: Latest vs Average toggle, worst-first sorted, heaviest highlighted
- Gentle insights: auto-written bullets — current picture, direction, heaviest area, most-improved, crisis nudge or keep-noticing tip

No backend endpoints. Complements [[mood-calendar]] (server-stored daily mood) with private deep reflection.

## Related

[[index]] · [[mood-calendar]] · [[frontend-shell]] · [[safety-privacy]] · [[meetings-board]] · [[resource-library]] · [[offline-first]]
