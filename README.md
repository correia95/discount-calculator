# discount-calculator

Sale price after one or more discounts, plus how much you save. Each discount is
a percentage or a fixed amount; multiple discounts can be summed (add the
percentages) or compounded (each off the running price). Optional sales-tax rate,
applied after discounts. A step-by-step breakdown and a note that "20% then 10%"
isn't "30% off". Everything in the URL.

**Live:** https://discount-calculator.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/calc.ts`](src/calc.ts): `calculate({ price, discounts, taxPercent,
stacked })` → `{ finalPrice, afterDiscounts, totalOff, percentOff, tax, steps }`.
Percent discounts clamp to 100%, amount discounts clamp to the running price,
tax on the discounted total. `money` via `Intl.NumberFormat`.

Verified in Node: 80 − 25% = 60; 100 − 20% − 10% summed = 70, compounded = 72;
59.99 − 30% − $5 + 8.25% tax = 40.04; $50 off $20 clamps to 0; negative → null.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
