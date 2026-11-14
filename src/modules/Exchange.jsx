import { useMemo, useState } from "react";
import { Search, ArrowLeftRight, RotateCcw, Check, Plus, Minus, Trash2, ReceiptText, CircleAlert } from "lucide-react";
import { useStore, invoiceTotals } from "../store/StoreContext";
import { fmtLKR, fmtLKR0, todayISO, uid } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Empty, Field } from "../components/ui";

export default function Exchange() {
  const {
    invoices, setInvoices, customers, products, branchId, adjustStock,
    vouchers, setVouchers, damaged, setDamaged, logAudit,
  } = useStore();

  const [query, setQuery] = useState("INV-2026-001");
  const [invoiceId, setInvoiceId] = useState(null);
  const [returns, setReturns] = useState({}); // lineIdx -> {qty, condition}
  const [replacements, setReplacements] = useState([]);
  const [repQuery, setRepQuery] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [done, setDone] = useState(null);

  const invoice = invoices.find((i) => i.id === invoiceId) || null;
  const customer = customers.find((c) => c.id === invoice?.customerId) || null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return invoices.filter((i) =>
      i.id.toLowerCase().includes(q) ||
      (i.customerId && customers.find((c) => c.id === i.customerId)?.phone.includes(query.trim()))).slice(0, 6);
  }, [query, invoices, customers]);

  const selectInvoice = (id) => { setInvoiceId(id); setReturns({}); setReplacements([]); setDone(null); };

  const alreadyReturned = (idx) => invoice?.returned?.[idx] || 0;

  const setReturn = (idx, patch) => setReturns((r) => ({ ...r, [idx]: { qty: 0, condition: "Good - Restock to Sellable", ...r[idx], ...patch } }));

  const repMatches = repQuery.trim() ? products.flatMap((p) => p.variants
    .filter((v) => (v.stock[branchId] || 0) > 0)
    .map((v) => ({ p, v })))
    .filter(({ p, v }) => p.name.toLowerCase().includes(repQuery.toLowerCase()) || v.barcode.toLowerCase().includes(repQuery.toLowerCase())).slice(0, 8) : [];

  const addReplacement = (p, v) => {
    setReplacements((rs) => {
      const ex = rs.find((r) => r.barcode === v.barcode);
      if (ex) return rs.map((r) => r.barcode === v.barcode ? { ...r, qty: Math.min(v.stock[branchId], r.qty + 1) } : r);
      return [...rs, { barcode: v.barcode, name: p.name, size: v.size, color: v.color, qty: 1, unitPrice: v.price, cost: v.cost }];
    });
    setRepQuery("");
  };

  const calc = useMemo(() => {
    if (!invoice) return { returnValue: 0, replacementTotal: 0, diff: 0, returnQty: 0 };
    let returnValue = 0, returnQty = 0;
    invoice.items.forEach((it, idx) => {
      const r = returns[idx];
      if (r && r.qty > 0) {
        const perUnit = (it.unitPrice * it.qty - (it.discount || 0)) / it.qty;
        returnValue += perUnit * r.qty;
        returnQty += r.qty;
      }
    });
    const replacementTotal = replacements.reduce((s, r) => s + r.unitPrice * r.qty, 0);
    return { returnValue, replacementTotal, diff: replacementTotal - returnValue, returnQty };
  }, [invoice, returns, replacements]);

  const complete = () => {
    if (!invoice || calc.returnQty === 0) return;
    const retLines = [];
    const newReturned = { ...(invoice.returned || {}) };
    invoice.items.forEach((it, idx) => {
      const r = returns[idx];
      if (!r || r.qty <= 0) return;
      newReturned[idx] = (newReturned[idx] || 0) + r.qty;
      retLines.push({ ...it, qty: r.qty, condition: r.condition });
      if (r.condition.startsWith("Good")) {
        adjustStock(it.barcode, invoice.branchId, r.qty);
      } else {
        setDamaged((d) => [...d, {
          id: `DM-2026-${String(13 + d.length).padStart(3, "0")}`, date: todayISO(), branchId: invoice.branchId,
          barcode: it.barcode, name: it.name, size: it.size, color: it.color, qty: r.qty,
          reason: "Customer return - damaged", reportedBy: "Exchange desk", costValue: (it.cost || 0) * r.qty,
        }]);
      }
    });
    replacements.forEach((r) => adjustStock(r.barcode, invoice.branchId, -r.qty));

    let creditNote = null;
    if (calc.diff < -0.01) {
      creditNote = { code: `CN-${3100 + vouchers.length}`, type: "Credit Note", value: Math.round(-calc.diff * 100) / 100, balance: Math.round(-calc.diff * 100) / 100,
        issuedTo: customer?.name || "Walk-in", issuedDate: todayISO(), expiryDate: "2027-02-09", status: "Active",
        history: [{ date: todayISO(), action: `Issued from exchange on ${invoice.id}` }] };
      setVouchers((vs) => [...vs, creditNote]);
    }

    // replacement sale invoice (even if zero-item, record the exchange)
    const exId = `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`;
    const newInv = {
      id: exId, date: todayISO(), time: new Date().toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit", hour12: true }),
      branchId: invoice.branchId, cashierId: invoice.cashierId, salesmanId: invoice.salesmanId,
      customerId: invoice.customerId, status: "Completed",
      items: replacements.map((r) => ({ barcode: r.barcode, name: r.name, size: r.size, color: r.color, qty: r.qty, unitPrice: r.unitPrice, cost: r.cost, discount: 0 })),
      payments: calc.diff > 0.01 ? [{ method: payMethod, amount: Math.round(calc.diff * 100) / 100 }] : [{ method: "Exchange", amount: 0 }],
      promoDiscount: 0, pointsRedeemed: 0, pointsEarned: 0, voucherCode: null, exchangeOf: invoice.id,
    };
    const fullyReturned = invoice.items.every((it, idx) => (newReturned[idx] || 0) >= it.qty);
    setInvoices((list) => [...list.map((i) => i.id === invoice.id ? { ...i, returned: newReturned, status: fullyReturned ? "Exchanged" : i.status } : i), ...(replacements.length ? [newInv] : [])]);
    logAudit("Exchange Processed", `${invoice.id}: ${calc.returnQty} pcs returned, ${replacements.length} replacements` +
      (calc.diff > 0.01 ? `, collected ${fmtLKR0(calc.diff)}` : creditNote ? `, credit note ${creditNote.code} ${fmtLKR0(creditNote.value)}` : ", even swap"));
    setDone({ creditNote, collected: calc.diff > 0.01 ? calc.diff : 0, exId: replacements.length ? exId : null });
  };

  return (
    <div className="space-y-3 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">Exchange, Returns & Credit Notes</h1>
        <p className="text-sm text-slate-500">Look up an invoice, take back items, swap replacements, settle the difference.</p>
      </div>

      {/* step 1 */}
      <Card title="1 · Find Original Invoice">
        <div className="p-4 space-y-2">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Invoice ID (INV-2026-001) or customer phone…" className="pl-9 font-mono" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {matches.map((m) => (
              <button key={m.id} onClick={() => selectInvoice(m.id)}
                className={`px-3 py-2 rounded-lg border-2 text-left text-sm ${invoiceId === m.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                <b className="font-mono">{m.id}</b>
                <span className="text-slate-500"> · {m.date} · {fmtLKR0(invoiceTotals(m).net)} · </span>
                <Badge tone={m.status === "Completed" ? "green" : "amber"}>{m.status}</Badge>
              </button>
            ))}
            {query.trim() && matches.length === 0 && <p className="text-sm text-slate-500">No invoices match. Seeded IDs: INV-2026-001 … INV-2026-008.</p>}
          </div>
        </div>
      </Card>

      {!invoice && <Card><Empty icon={<ArrowLeftRight size={20} />} title="No invoice selected" hint="Search and pick an invoice above to start an exchange" /></Card>}

      {invoice && (
        <div className="grid lg:grid-cols-2 gap-3">
          {/* step 2 */}
          <Card title={`2 · Items to Return — ${invoice.id}`}>
            <div className="p-3 space-y-2">
              {customer && <p className="text-xs text-slate-500 px-1">Customer: <b className="text-slate-800">{customer.name}</b> · {customer.phone} · {customer.tier}</p>}
              {invoice.items.map((it, idx) => {
                const ret = alreadyReturned(idx);
                const max = it.qty - ret;
                const r = returns[idx] || { qty: 0, condition: "Good - Restock to Sellable" };
                return (
                  <div key={idx} className="rounded-lg border border-slate-200 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{it.name}</p>
                        <p className="text-xs text-slate-500">{it.size} · {it.color} · {it.barcode} · {fmtLKR0(it.unitPrice)} each</p>
                        {ret > 0 && <Badge tone="amber" className="mt-1">{ret} already returned</Badge>}
                      </div>
                      <Badge tone="slate">Billed × {it.qty}</Badge>
                    </div>
                    {max > 0 ? (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                          <button onClick={() => setReturn(idx, { qty: Math.max(0, r.qty - 1) })} className="p-1.5 rounded-md hover:bg-white"><Minus size={13} /></button>
                          <span className="w-6 text-center text-sm font-extrabold">{r.qty}</span>
                          <button onClick={() => setReturn(idx, { qty: Math.min(max, r.qty + 1) })} className="p-1.5 rounded-md hover:bg-white"><Plus size={13} /></button>
                        </div>
                        <Select value={r.condition} onChange={(e) => setReturn(idx, { condition: e.target.value })} className="text-xs flex-1 min-w-52">
                          <option>Good - Restock to Sellable</option>
                          <option>Damaged - Move to Damaged Stock</option>
                        </Select>
                      </div>
                    ) : <p className="text-xs font-bold text-slate-400 mt-1">Fully returned</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* step 3 */}
          <div className="space-y-3">
            <Card title="3 · Replacement Items (from inventory)">
              <div className="p-3 space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input value={repQuery} onChange={(e) => setRepQuery(e.target.value)} placeholder="Search replacement… (name or barcode)" className="pl-9" />
                  {repMatches.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                      {repMatches.map(({ p, v }) => (
                        <button key={v.barcode} onClick={() => addReplacement(p, v)} className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-sm flex justify-between gap-2">
                          <span className="font-semibold truncate">{p.name} — {v.size}/{v.color} <span className="font-mono text-slate-400">· {v.barcode}</span></span>
                          <span className="font-bold shrink-0">{fmtLKR0(v.price)} <span className="text-slate-400">({v.stock[branchId]} left)</span></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {replacements.length === 0 && <p className="text-xs text-slate-400">No replacements — a pure return issues the full value as a credit note.</p>}
                {replacements.map((r) => (
                  <div key={r.barcode} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.size} · {r.color} · {fmtLKR0(r.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                      <button onClick={() => setReplacements((rs) => rs.map((x) => x.barcode === r.barcode ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="p-1 rounded hover:bg-white"><Minus size={12} /></button>
                      <span className="w-5 text-center text-xs font-extrabold">{r.qty}</span>
                      <button onClick={() => setReplacements((rs) => rs.map((x) => x.barcode === r.barcode ? { ...x, qty: x.qty + 1 } : x))} className="p-1 rounded hover:bg-white"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => setReplacements((rs) => rs.filter((x) => x.barcode !== r.barcode))} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </Card>

            {/* step 4 */}
            <Card title="4 · Settle Price Difference">
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Return value ({calc.returnQty} pcs)</span><b className="text-emerald-700">{fmtLKR(calc.returnValue)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Replacement total</span><b>{fmtLKR(calc.replacementTotal)}</b></div>
                <div className={`flex justify-between font-display font-extrabold text-base pt-2 border-t ${calc.diff > 0.01 ? "text-red-600" : "text-sky-700"}`}>
                  <span>{calc.diff > 0.01 ? "Collect from customer" : calc.diff < -0.01 ? "Refund as credit note" : "Even swap"}</span>
                  <span>{fmtLKR(Math.abs(calc.diff))}</span>
                </div>
                {calc.diff > 0.01 && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><Field label="Collect via"><Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}><option>Cash</option><option>Card</option><option>LankaQR</option><option>Bank Transfer</option></Select></Field></div>
                  </div>
                )}
                {calc.diff < -0.01 && (
                  <p className="text-xs bg-sky-50 border border-sky-200 text-sky-800 rounded-lg px-3 py-2 flex gap-1.5"><ReceiptText size={14} className="shrink-0 mt-0.5" /> A store credit note for {fmtLKR(-calc.diff)} will be issued to {customer?.name || "the customer"}.</p>
                )}
                <Btn className="w-full" disabled={calc.returnQty === 0} onClick={complete}><RotateCcw size={15} /> Complete Exchange</Btn>
                {done && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm space-y-1">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5"><Check size={15} /> Exchange recorded</p>
                    {done.exId && <p>Replacement bill: <b className="font-mono">{done.exId}</b></p>}
                    {done.collected > 0 && <p>Collected {fmtLKR(done.collected)} via {payMethod}.</p>}
                    {done.creditNote && <p>Credit note <b className="font-mono">{done.creditNote.code}</b> issued for {fmtLKR(done.creditNote.value)}.</p>}
                    <Btn size="sm" variant="outline" onClick={() => { setInvoiceId(null); setQuery(""); setReturns({}); setReplacements([]); setDone(null); }}>Start another exchange</Btn>
                  </div>
                )}
                {calc.returnQty === 0 && <p className="text-xs text-slate-400 flex items-center gap-1"><CircleAlert size={13} /> Select at least one item to return.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
