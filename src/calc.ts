// Sale-price maths: apply one or more discounts, then optional tax.

export type DiscountKind = 'percent' | 'amount';
export interface Discount {
  id: string;
  kind: DiscountKind;
  value: number;
}

export interface Input {
  price: number;
  discounts: Discount[];
  taxPercent: number; // applied after discounts, 0 = none
  stacked: boolean; // percent discounts compound one after another vs sum then apply
}

export interface Step {
  label: string;
  amount: number; // reduction at this step
  running: number; // price after this step
}

export interface Result {
  original: number;
  steps: Step[];
  afterDiscounts: number;
  totalOff: number;
  percentOff: number;
  tax: number;
  finalPrice: number;
}

const fixed2 = (n: number) => Math.round(n * 100) / 100;

export function calculate(inp: Input): Result | null {
  const price = inp.price;
  if (!Number.isFinite(price) || price < 0) return null;

  let running = price;
  const steps: Step[] = [];

  const active = inp.discounts.filter((d) => Number.isFinite(d.value) && d.value > 0);

  if (!inp.stacked) {
    // sum all percents, then subtract; amounts subtract directly
    const pctSum = active.filter((d) => d.kind === 'percent').reduce((a, d) => a + d.value, 0);
    const amtSum = active.filter((d) => d.kind === 'amount').reduce((a, d) => a + d.value, 0);
    if (pctSum > 0) {
      const off = fixed2(running * Math.min(pctSum, 100) / 100);
      running = fixed2(running - off);
      steps.push({ label: `${Math.min(pctSum, 100)}% off`, amount: off, running });
    }
    if (amtSum > 0) {
      const off = fixed2(Math.min(amtSum, running));
      running = fixed2(running - off);
      steps.push({ label: `${amtSum} off`, amount: off, running });
    }
  } else {
    for (const d of active) {
      let off: number;
      if (d.kind === 'percent') {
        off = fixed2(running * Math.min(d.value, 100) / 100);
        running = fixed2(running - off);
        steps.push({ label: `${d.value}% off`, amount: off, running });
      } else {
        off = fixed2(Math.min(d.value, running));
        running = fixed2(running - off);
        steps.push({ label: `${d.value} off`, amount: off, running });
      }
    }
  }

  const afterDiscounts = running;
  const totalOff = fixed2(price - afterDiscounts);
  const percentOff = price > 0 ? fixed2((totalOff / price) * 100) : 0;

  const tax = inp.taxPercent > 0 ? fixed2(afterDiscounts * inp.taxPercent / 100) : 0;
  const finalPrice = fixed2(afterDiscounts + tax);

  return { original: price, steps, afterDiscounts, totalOff, percentOff, tax, finalPrice };
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'INR', 'ZAR', 'JPY', 'SGD'];
