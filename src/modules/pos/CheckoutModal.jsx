import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, QrCode, Gift, Star, ReceiptText, Landmark, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/StoreContext";
import { fmtLKR } from "../../utils/format";
import { Btn, Modal, Input, Select, Badge } from "../../components/ui";

const METHODS = [
  { id: "Cash", icon: Banknote },
  { id: "Card", icon: CreditCard },
  { id: "LankaQR", icon: QrCode },
  { id: "Gift Voucher", icon: Gift },
  { id: "Credit Note", icon: ReceiptText },
  { id: "Loyalty Points", icon: Star },
  { id: "Bank Transfer", icon: Landmark },
];
const POINT_VALUE = 5; // Rs. 5 per point

export default function CheckoutModal({ open, net, customer, onClose, onComplete }) {
  const { vouchers } = useStore();
  const [rows, setRows] = useState([{ id: 1, method: "Cash", amount: "", code: "", points: "" }]);
  const [error, setError] = useState("");
  let nextId = 10;

  useEffect(() => {
    if (open) { setRows([{ id: 1, method: "Cash", amount: "", code: "", points: "" }]); setError(""); }
  }, [open ]);

  const resolvedRows = useMemo(() => rows.map((r) => {
    if (r.method === "Loyalty Points") return { ...r, resolved: (parseFloat(r.points) || 0) * POINT_VALUE };
    return { ...r, resolved: parseFloat(r.amount) || 0 };
  }), [rows]);

  const paid = resolvedRows.reduce((s, r) => s + r.resolved, 0);
  const remaining = Math.max(0, net - paid);
  const change = Math.max(0, paid - net);

  const setRow = (id, patch) => setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));

  const voucherFor = (code) => vouchers.find((v) => v.code.toLowerCase() === (code || "").trim().toLowerCase());

  const validate = () => {
    for (const r of resolvedRows) {
      if (r.resolved <= 0) return "Every payment row must have an amount greater than zero.";
      if ((r.method === "Gift Voucher" || r.method === "Credit Note")) {
        const v = voucherFor(r.code);
        if (!v) return `Voucher code "${r.code}" not found.`;
        if (v.status !== "Active" || v.balance <= 0) return `Voucher ${v.code} has no usable balance.`;
        if (r.resolved > v.balance) return `${v.code} balance is only ${fmtLKR(v.balance)}.`;
        if (r.method === "Gift Voucher" && v.type !== "Gift Voucher") return `${v.code} is a ${v.type}, not a Gift Voucher.`;
        if (r.method === "Credit Note" && v.type !== "Credit Note") return `${v.code} is a ${v.type}, not a Credit Note.`;
      }
      if (r.method === "Loyalty Points") {
        if (!customer) return "Select a customer to redeem loyalty points.";
        const pts = parseFloat(r.points) || 0;
        if (pts > customer.points) return `${customer.name} has only ${customer.points} points.`;
      }
    }
    if (paid < net - 0.01) return `Short by ${fmtLKR(net - paid)}. Add another payment.`;
    const nonCash = resolvedRows.filter((r) => r.method !== "Cash").reduce((s, r) => s + r.resolved, 0);
    if (nonCash > net + 0.01) return "Non-cash payments exceed the bill total — change can only come from cash.";
    return "";
  };

  const complete = () => {
    const err = validate();
    if (err) { setError(err); return; }
    const payments = resolvedRows.map((r) => ({ method: r.method, amount: Math.round(r.resolved * 100) / 100, ...(r.code ? { code: r.code.trim().toUpperCase() } : {}) }));
    const voucherUses = resolvedRows.filter((r) => r.method === "Gift Voucher" || r.method === "Credit Note")
      .map((r) => ({ code: r.code.trim().toUpperCase(), amount: Math.round(r.resolved * 100) / 100 }));
    const pointsRedeemed = resolvedRows.filter((r) => r.method === "Loyalty Points").reduce((s, r) => s + (parseFloat(r.points) || 0), 0);
    onComplete(payments, voucherUses, pointsRedeemed);
  };

  const fillExact = (id) => {
    const others = resolvedRows.filter((r) => r.id !== id).reduce((s, r) => s + r.resolved, 0);
    setRow(id, { amount: String(Math.max(0, Math.round((net - others) * 100) / 100)) });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Checkout — ${fmtLKR(net)}`} width="max-w-xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={complete}>Complete Sale · {fmtLKR(net)}</Btn></>}>
      <div className="space-y-3">
        {/* tender summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-100 p-2.5"><p className="text-[11px] font-bold text-slate-500 uppercase">Bill Total</p><p className="font-display font-extrabold">{fmtLKR(net)}</p></div>
          <div className="rounded-lg bg-emerald-50 p-2.5"><p className="text-[11px] font-bold text-emerald-600 uppercase">Paid</p><p className="font-display font-extrabold text-emerald-700">{fmtLKR(paid)}</p></div>
          <div className={`rounded-lg p-2.5 ${remaining > 0 ? "bg-red-50" : "bg-sky-50"}`}>
            <p className="text-[11px] font-bold uppercase text-slate-500">{remaining > 0 ? "Remaining" : "Change"}</p>
            <p className={`font-display font-extrabold ${remaining > 0 ? "text-red-600" : "text-sky-700"}`}>{fmtLKR(remaining > 0 ? remaining : change)}</p>
          </div>
        </div>

        {rows.map((r, idx) => {
          const M = METHODS.find((m) => m.id === r.method);
          const Icon = M.icon;
          const v = (r.method === "Gift Voucher" || r.method === "Credit Note") && r.code ? voucherFor(r.code) : null;
          return (
            <div key={r.id} className="rounded-xl border border-slate-200 p-3 space-y-2.5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0"><Icon size={16} /></span>
                <Select value={r.method} onChange={(e) => setRow(r.id, { method: e.target.value, amount: "", code: "", points: "" })} className="font-semibold">
                  {METHODS.map((m) => <option key={m.id}>{m.id}</option>)}
                </Select>
                {rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>}
              </div>

              {r.method === "Loyalty Points" ? (
                <div>
                  <div className="flex gap-2">
                    <Input type="number" min={0} placeholder="Points to redeem" value={r.points} onChange={(e) => setRow(r.id, { points: e.target.value })} />
                    <Btn variant="outline" size="sm" onClick={() => customer && setRow(r.id, { points: String(Math.min(customer.points, Math.floor(net / POINT_VALUE))) })}>Max</Btn>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {customer ? <>{customer.name}: <b>{customer.points} pts</b> (= {fmtLKR(customer.points * POINT_VALUE)}) · 1 pt = {fmtLKR(POINT_VALUE, 0)}</> : "No customer selected."}
                  </p>
                </div>
              ) : (r.method === "Gift Voucher" || r.method === "Credit Note") ? (
                <div className="flex gap-2">
                  <Input placeholder={r.method === "Gift Voucher" ? "e.g. OZV-5002" : "e.g. CN-3001"} value={r.code} onChange={(e) => setRow(r.id, { code: e.target.value })} className="font-mono uppercase" />
                  <Input type="number" min={0} placeholder="Amount" value={r.amount} onChange={(e) => setRow(r.id, { amount: e.target.value })} className="max-w-[130px]" />
                  <Btn variant="outline" size="sm" onClick={() => v && fillExact(r.id)}>Exact</Btn>
                  {r.code && <div className="self-center">{v ? <Badge tone="green">{fmtLKR(v.balance, 0)} left</Badge> : <Badge tone="red">Not found</Badge>}</div>}
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <Input type="number" min={0} placeholder="Amount received" value={r.amount} onChange={(e) => setRow(r.id, { amount: e.target.value })} autoFocus={idx === 0} />
                    <Btn variant="outline" size="sm" onClick={() => fillExact(r.id)}>Exact</Btn>
                  </div>
                  {r.method === "Cash" && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[5000, 10000, 20000, 50000].map((d) => (
                        <button key={d} onClick={() => setRow(r.id, { amount: String(d) })} className="numpad-btn text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700">
                          {d.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <Btn variant="outline" size="sm" onClick={() => { nextId += 1; setRows((rs) => [...rs, { id: Date.now() + nextId, method: "Card", amount: "", code: "", points: "" }]); }}>
          <Plus size={14} /> Split — Add Payment Method
        </Btn>

        {error && <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      </div>
    </Modal>
  );
}
