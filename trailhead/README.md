# TRAILHEAD — Marketing Website

Premium marketing site for TRAILHEAD, an AI operating system for e-commerce, built with React + Vite.

## Getting started

```bash
npm install
npm run dev       # start local dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

## Structure

- `src/components/` — one component per section (Hero, AIEmployees, OpportunityEngine, AIBusinessManager, etc.)
- `src/data/content.js` — copy/content for repeatable sections (problems, employees, opportunities, predictions, use cases…)
- `src/styles/` — design tokens (`_tokens.scss`) plus one partial per section group, all imported from `global.scss`

## Notes

- No fake social proof (logos, testimonials, review counts) is included, per the brief — all product screens are clearly-labeled UI mockups.
- Respects `prefers-reduced-motion` for CSS-driven animation.
- All nav/CTA links point to in-page anchors or `#` placeholders — wire these up to real routes/forms when ready.
