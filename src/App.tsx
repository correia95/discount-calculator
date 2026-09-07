import { useEffect, useMemo, useState } from 'react';
import { CURRENCIES, Discount, DiscountKind, calculate, money, uid } from './calc';

function read() {
  try {
    const p = new URLSearchParams(window.location.search);
    const ds = (p.get('d') || '20p')
      .split(',')
      .map((tok) => {
        const m = /^(\d*\.?\d+)([pa])$/.exec(tok.trim());
        if (!m) return null;
        return { id: uid(), kind: (m[2] === 'p' ? 'percent' : 'amount') as DiscountKind, value: Number(m[1]) };
      })
      .filter(Boolean) as Discount[];
    return {
      price: p.get('p') || '80',
      currency: p.get('c') || 'USD',
      tax: p.get('t') || '0',
      stacked: p.get('s') === '1',
      discounts: ds.length ? ds : [{ id: uid(), kind: 'percent' as DiscountKind, value: 20 }],
    };
  } catch {
    return { price: '80', currency: 'USD', tax: '0', stacked: false, discounts: [{ id: uid(), kind: 'percent' as DiscountKind, value: 20 }] };
  }
}

export default function App() {
  const init = read();
  const [price, setPrice] = useState(init.price);
  const [currency, setCurrency] = useState(init.currency);
  const [tax, setTax] = useState(init.tax);
  const [stacked, setStacked] = useState(init.stacked);
  const [discounts, setDiscounts] = useState<Discount[]>(init.discounts);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => calculate({ price: Number(price), discounts, taxPercent: Number(tax) || 0, stacked }),
    [price, discounts, tax, stacked],
  );

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const q = u.searchParams;
      q.set('p', price);
      q.set('c', currency);
      q.set('t', tax);
      q.set('s', stacked ? '1' : '0');
      q.set('d', discounts.map((d) => `${d.value}${d.kind === 'percent' ? 'p' : 'a'}`).join(','));
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [price, currency, tax, stacked, discounts]);

  const m = (n: number) => money(n, currency);
  const set = (id: string, patch: Partial<Discount>) =>
    setDiscounts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const addD = () => setDiscounts((ds) => [...ds, { id: uid(), kind: 'percent', value: 10 }]);
  const rmD = (id: string) => setDiscounts((ds) => (ds.length > 1 ? ds.filter((d) => d.id !== id) : ds));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const pctCount = discounts.filter((d) => d.kind === 'percent' && d.value > 0).length;
  const showStackNote = pctCount >= 2;

  return (
    <div className="app">
      <header>
        <h1>Discount Calculator</h1>
        <p className="tag">
          Work out the sale price after one or more discounts, and how much you actually save. Add a
          sales-tax rate if you want the checkout total.
        </p>
      </header>

      <label className="pricefield">
        <span>Original price</span>
        <div className="ibox">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" inputMode="decimal" value={price} placeholder="0.00"
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
        </div>
      </label>

      <div className="block">
        <span className="lbl">Discounts</span>
        {discounts.map((d) => (
          <div className="drow" key={d.id}>
            <input type="text" inputMode="decimal" value={d.value || ''}
              onChange={(e) => set(d.id, { value: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} />
            <div className="kseg">
              <button className={d.kind === 'percent' ? 'on' : ''} onClick={() => set(d.id, { kind: 'percent' })}>%</button>
              <button className={d.kind === 'amount' ? 'on' : ''} onClick={() => set(d.id, { kind: 'amount' })}>{currency}</button>
            </div>
            <button className="x" onClick={() => rmD(d.id)} disabled={discounts.length < 2} aria-label="Remove discount">×</button>
          </div>
        ))}
        <div className="drowacts">
          <button className="add" onClick={addD}>+ Add discount</button>
          {discounts.length > 1 && (
            <label className="chk">
              <input type="checkbox" checked={stacked} onChange={(e) => setStacked(e.target.checked)} />
              apply one after another
            </label>
          )}
        </div>
      </div>

      <label className="taxfield">
        <span>Sales tax / VAT (applied after discounts)</span>
        <div className="ibox small"><input type="text" inputMode="decimal" value={tax}
          onChange={(e) => setTax(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" /><i>%</i></div>
      </label>

      {result ? (
        <div className="result">
          <div className="hero">
            <span>You pay</span>
            <strong>{m(result.finalPrice)}</strong>
            <em>was {m(result.original)}</em>
          </div>
          <div className="save">
            You save <b>{m(result.totalOff)}</b> ({result.percentOff}% off)
            {result.tax > 0 && <> · includes {m(result.tax)} tax</>}
          </div>
          {result.steps.length > 0 && (
            <ol className="steps">
              <li><span>Start</span><b>{m(result.original)}</b></li>
              {result.steps.map((s, i) => (
                <li key={i}><span>− {s.label}</span><b>{m(s.running)}</b></li>
              ))}
              {result.tax > 0 && <li><span>+ {tax}% tax</span><b>{m(result.finalPrice)}</b></li>}
            </ol>
          )}
          {showStackNote && !stacked && (
            <p className="note">
              Two percentages added together isn't the same as taking them one after another. Tick
              "apply one after another" to compound them — the total off is usually a bit smaller.
            </p>
          )}
          <button className="share" onClick={share}>{copied ? 'Link copied' : 'Copy shareable link'}</button>
        </div>
      ) : (
        <p className="hint">Enter a price.</p>
      )}

      <section className="explainer">
        <h2>How discounts stack</h2>
        <p>
          "30% off, then an extra 20%" is not 50% off. The second discount comes off the
          already-reduced price, so on a $100 item you'd pay $100 → $70 → $56 — that's 44% off, not
          50. This calculator does it either way: summed (add the percentages, then subtract once) or
          compounded (each discount off the running price).
        </p>
        <h3>Fixed-amount discounts</h3>
        <p>
          A "$10 off" voucher subtracts a flat amount and can't take the price below zero. Where you
          have both a percentage and an amount, the order can matter — check your retailer's terms,
          but this tool applies percentages first when they're summed, and in the order you list them
          when compounded.
        </p>
        <h3>Tax</h3>
        <p>
          Sales tax or VAT is worked out on the discounted price, which is normal — you're taxed on
          what you actually pay. In places where displayed prices already include tax, leave the tax
          field at zero.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. It's arithmetic in your browser, with the inputs stored only in the page link.</p>
        <footer>Discount Calculator · no sign-up · works offline once loaded</footer>
      </section>
    </div>
  );
}
