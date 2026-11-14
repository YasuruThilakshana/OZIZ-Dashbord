import { useMemo, useState } from "react";
import { Plus, Truck, PackageCheck, Wallet, Search } from "lucide-react";
import { useStore } from "../store/StoreContext";
import { BRANCHES } from "../data/mockData";
import { fmtLKR, fmtLKR0, todayISO, uid } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Modal, Table, Tabs, Empty, Field } from "../components/ui";

export default function Suppliers() {
  const [tab, setTab] = useState("suppliers");
  return (
    <div className="space-y-3 max-w-[1300px] mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">Suppliers, GRN & Purchase Orders</h1>
        <p className="text-sm text-slate-500">Receive stock, track supplier credit and record payments.</p>
      </div>
      <Tabs tabs={[
        { id: "suppliers", label: "Supplier Directory" },
        { id: "grn", label: "GRN — Goods Received" },
        { id: "po", label: "Purchase Orders" },
        { id: "payments", label: "Supplier Payments" },
      ]} active={tab} onChange={setTab} />
      {tab === "suppliers" && <SupplierTab />}
      {tab === "grn" && <GRNTab />}
      {tab === "po" && <POTab />}
      {tab === "payments" && <PaymentTab />}
    </div>
  );
}

function SupplierTab() {
  const { suppliers, setSuppliers, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({ name: "", contact: "", phone: "", email: "", address: "", paymentTerms: "30 days" });

  const openNew = () => { setEditing(null); setF({ name: "", contact: "", phone: "", email: "", address: "", paymentTerms: "30 days" }); setShow(true); };
  const openEdit = (s) => { setEditing(s); setF({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, address: s.address, paymentTerms: s.paymentTerms }); setShow(true); };

  const save = () => {
    if (!f.name.trim()) return;
    if (editing) {
      setSuppliers((ss) => ss.map((s) => s.id === editing.id ? { ...s, ...f } : s));
      logAudit("Supplier Updated", f.name);
    } else {
      setSuppliers((ss) => [...ss, { id: uid("sup"), ...f, creditBalance: 0 }]);
      logAudit("Supplier Added", f.name);
    }
    setShow(false);
  };

  const totalCredit = suppliers.reduce((s, x) => s + x.creditBalance, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {suppliers.map((s) => (
          <Card key={s.id}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0"><Truck size={18} /></div>
                <button onClick={() => openEdit(s)} className="text-xs font-bold text-slate-400 hover:text-emerald-600">Edit</button>
              </div>
              <p className="font-bold text-sm mt-2">{s.name}</p>
              <p className="text-xs text-slate-500">{s.contact} · {s.phone}</p>
              <p className="text-xs text-slate-500">{s.paymentTerms}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Credit due</span>
                <Badge tone={s.creditBalance > 0 ? "amber" : "green"}>{fmtLKR0(s.creditBalance)}</Badge>
              </div>
            </div>
          </Card>
        ))}
        <button onClick={openNew} className="rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 min-h-40 flex flex-col items-center justify-center gap-1 text-sm font-bold">
          <Plus size={20} /> Add Supplier
        </button>
      </div>
      <Card><p className="px-4 py-3 text-sm">Total supplier credit outstanding: <b className="font-display text-base">{fmtLKR(totalCredit)}</b></p></Card>

      <Modal open={show} onClose={() => setShow(false)} title={editing ? "Edit Supplier" : "Add Supplier"} width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn onClick={save}>Save</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Company Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
          <Field label="Contact Person"><Input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Payment Terms"><Select value={f.paymentTerms} onChange={(e) => setF({ ...f, paymentTerms: e.target.value })}><option>Cash on delivery</option><option>14 days</option><option>30 days</option><option>45 days</option></Select></Field>
          <div className="col-span-2"><Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        </div>
      </Modal>
    </div>
  );
}

function GRNTab() {
  const { grns, setGRNs, suppliers, setSuppliers, products, setProducts, branchId, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [poId, setPoId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState([]);
  const [qty, setQty] = useState("12");
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");

  const found = useMemo(() => {
    const code = barcode.trim().toUpperCase();
    if (!code) return null;
    for (const p of products) { const v = p.variants.find((x) => x.barcode === code); if (v) return { p, v }; }
    return "missing";
  }, [barcode, products]);

  const addLine = () => {
    if (!found || found === "missing" || !(+qty > 0) || !(+cost > 0) || !(+sell > 0)) return;
    setLines((ls) => [...ls, { barcode: found.v.barcode, product: found.p.name, detail: `${found.v.size} / ${found.v.color}`, qty: +qty, unitCost: +cost, sellPrice: +sell }]);
    setBarcode(""); setQty("12"); setCost(""); setSell("");
  };

  const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  const post = () => {
    if (!lines.length) return;
    const id = `GRN-2026-${String(78 + grns.length).padStart(3, "0")}`;
    setGRNs((gs) => [...gs, { id, poId: poId || "Direct", supplierId, date: todayISO(), branchId, receivedBy: "Current User", lines, total, status: "Posted to Inventory" }]);
    // update inventory + prices
    setProducts((ps) => ps.map((p) => ({
      ...p,
      variants: p.variants.map((v) => {
        const l = lines.find((x) => x.barcode === v.barcode);
        return l ? { ...v, cost: l.unitCost, price: l.sellPrice, stock: { ...v.stock, [branchId]: (v.stock[branchId] || 0) + l.qty } } : v;
      }),
    })));
    setSuppliers((ss) => ss.map((s) => s.id === supplierId ? { ...s, creditBalance: s.creditBalance + total } : s));
    logAudit("GRN Posted", `${id}: ${lines.length} lines, ${fmtLKR0(total)} from ${suppliers.find((s) => s.id === supplierId)?.name}`);
    setShow(false); setLines([]); setPoId("");
  };

  return (
    <div className="space-y-3">
      <Card title={`Goods Received Notes (${grns.length})`} action={<Btn size="sm" onClick={() => setShow(true)}><PackageCheck size={14} /> New GRN Entry</Btn>}>
        {grns.length === 0 && <Empty icon={<PackageCheck size={20} />} title="No GRNs yet" />}
        <div className="divide-y divide-slate-100">
          {[...grns].reverse().map((g) => (
            <div key={g.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-mono text-sm">{g.id}</b>
                <Badge tone="slate">{g.poId}</Badge>
                <span className="text-xs text-slate-500">{g.date} · {suppliers.find((s) => s.id === g.supplierId)?.name} · {BRANCHES.find((b) => b.id === g.branchId)?.short}</span>
                <span className="ml-auto font-extrabold">{fmtLKR(g.total, 0)}</span>
                <Badge tone="green">{g.status}</Badge>
              </div>
              <div className="mt-1 space-y-0.5">{g.lines.map((l, i) => (
                <p key={i} className="text-xs text-slate-600">{l.qty} × {l.product} <span className="text-slate-400">({l.detail}) @ cost {fmtLKR0(l.unitCost)} → sell {fmtLKR0(l.sellPrice || l.unitCost)}</span></p>
              ))}</div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={show} onClose={() => setShow(false)} title="GRN Entry — Receive Stock" width="max-w-2xl"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn disabled={!lines.length} onClick={post}>Post to Inventory · {fmtLKR0(total)}</Btn></>}>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Supplier"><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Against PO (optional)"><Input value={poId} onChange={(e) => setPoId(e.target.value)} placeholder="PO-2026-101" className="font-mono" /></Field>
          <Field label="Receiving Branch"><Select value={branchId} disabled><option>{BRANCHES.find((b) => b.id === branchId)?.name}</option></Select></Field>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 mt-3 bg-slate-50/60">
          <p className="text-xs font-bold text-slate-500 mb-2">ADD LINE — scan variant barcode, enter quantities & prices</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="col-span-2"><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="OZ-1002…" className="font-mono uppercase" /></div>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" title="Quantity" />
            <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost Rs" title="Unit cost" />
            <Input type="number" value={sell} onChange={(e) => setSell(e.target.value)} placeholder="Sell Rs" title="Selling price" />
          </div>
          {found && found !== "missing" && <p className="text-xs font-semibold text-emerald-700 mt-1.5">✓ {found.p.name} — {found.v.size}/{found.v.color} · current stock {found.v.stock[branchId]} · price {fmtLKR0(found.v.price)}</p>}
          {found === "missing" && barcode.trim() && <p className="text-xs font-semibold text-red-600 mt-1.5">Barcode not in inventory — create the product first.</p>}
          <Btn size="sm" variant="outline" className="mt-2" onClick={addLine} disabled={!found || found === "missing"}><Plus size={13} /> Add Line</Btn>
        </div>
        {lines.length > 0 && (
          <Table head={["Barcode", "Product", "Qty", "Unit Cost", "Sell Price", "Line Total", ""]}>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-mono text-xs font-bold">{l.barcode}</td>
                <td className="px-3 py-2 text-xs">{l.product} <span className="text-slate-400">({l.detail})</span></td>
                <td className="px-3 py-2 text-xs font-bold">{l.qty}</td>
                <td className="px-3 py-2 text-xs">{fmtLKR0(l.unitCost)}</td>
                <td className="px-3 py-2 text-xs">{fmtLKR0(l.sellPrice)}</td>
                <td className="px-3 py-2 text-xs font-bold">{fmtLKR0(l.qty * l.unitCost)}</td>
                <td className="px-3 py-2"><button onClick={() => setLines((ls) => ls.filter((_, x) => x !== i))} className="text-red-500 text-xs font-bold">Remove</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Modal>
    </div>
  );
}

function POTab() {
  const { pos, setPOs, suppliers, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id);
  const [expected, setExpected] = useState("2026-12-05");
  const [lines, setLines] = useState([{ product: "", detail: "", qty: "", unitCost: "" }]);

  const setLine = (i, patch) => setLines((ls) => ls.map((l, x) => x === i ? { ...l, ...patch } : l));
  const total = lines.reduce((s, l) => s + (+l.qty || 0) * (+l.unitCost || 0), 0);

  const create = () => {
    if (!lines.some((l) => l.product.trim() && +l.qty > 0)) return;
    const id = `PO-2026-${103 + pos.length}`;
    setPOs((ps) => [...ps, { id, supplierId, date: todayISO(), expectedDate: expected, status: "Sent",
      lines: lines.filter((l) => l.product.trim()).map((l) => ({ product: l.product, detail: l.detail, qty: +l.qty, unitCost: +l.unitCost })) }]);
    logAudit("PO Created", `${id} — ${fmtLKR0(total)} to ${suppliers.find((s) => s.id === supplierId)?.name}`);
    setShow(false); setLines([{ product: "", detail: "", qty: "", unitCost: "" }]);
  };

  const tone = (s) => s === "Received" ? "green" : s === "Partially Received" ? "blue" : "amber";

  return (
    <Card title={`Purchase Orders (${pos.length})`} action={<Btn size="sm" onClick={() => setShow(true)}><Plus size={14} /> New PO</Btn>}>
      <div className="divide-y divide-slate-100">
        {pos.map((p) => (
          <div key={p.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="min-w-52">
              <b className="font-mono text-sm">{p.id}</b>
              <p className="text-xs text-slate-500">{p.date} · exp {p.expectedDate}</p>
            </div>
            <div className="flex-1 min-w-52">
              <p className="text-sm font-bold">{suppliers.find((s) => s.id === p.supplierId)?.name}</p>
              {p.lines.map((l, i) => <p key={i} className="text-xs text-slate-500">{l.qty} × {l.product} ({l.detail}) @ {fmtLKR0(l.unitCost)}</p>)}
            </div>
            <b>{fmtLKR0(p.lines.reduce((s, l) => s + l.qty * l.unitCost, 0))}</b>
            <Badge tone={tone(p.status)}>{p.status}</Badge>
            {p.status !== "Received" && (
              <Select value={p.status} onChange={(e) => { setPOs((ps) => ps.map((x) => x.id === p.id ? { ...x, status: e.target.value } : x)); logAudit("PO Updated", `${p.id} → ${e.target.value}`); }} className="text-xs py-1.5 w-auto">
                <option>Sent</option><option>Partially Received</option><option>Received</option><option>Cancelled</option>
              </Select>
            )}
          </div>
        ))}
      </div>
      <Modal open={show} onClose={() => setShow(false)} title="New Purchase Order" width="max-w-2xl"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn onClick={create}>Send PO · {fmtLKR0(total)}</Btn></>}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Supplier"><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Expected Date"><Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
        </div>
        <div className="mt-3 space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input value={l.product} onChange={(e) => setLine(i, { product: e.target.value })} placeholder="Product" className="col-span-4 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500" />
              <input value={l.detail} onChange={(e) => setLine(i, { detail: e.target.value })} placeholder="Size/color detail" className="col-span-4 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500" />
              <input type="number" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} placeholder="Qty" className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500" />
              <input type="number" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} placeholder="Cost" className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
          ))}
          <Btn size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { product: "", detail: "", qty: "", unitCost: "" }])}><Plus size={13} /> Add Line</Btn>
        </div>
      </Modal>
    </Card>
  );
}

function PaymentTab() {
  const { supplierPayments, setSupplierPayments, suppliers, setSuppliers, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ supplierId: suppliers[0]?.id, amount: "", method: "Bank Transfer", ref: "", note: "" });
  const [err, setErr] = useState("");

  const pay = () => {
    const sup = suppliers.find((s) => s.id === f.supplierId);
    if (!(+f.amount > 0)) { setErr("Enter an amount greater than zero."); return; }
    if (+f.amount > sup.creditBalance) { setErr(`${sup.name} owes only ${fmtLKR(sup.creditBalance)}.`); return; }
    setSupplierPayments((ps) => [{ id: `SP-2026-${String(32 + ps.length).padStart(3, "0")}`, supplierId: f.supplierId, date: todayISO(), amount: +f.amount, method: f.method, ref: f.ref, note: f.note }, ...ps]);
    setSuppliers((ss) => ss.map((s) => s.id === f.supplierId ? { ...s, creditBalance: s.creditBalance - +f.amount } : s));
    logAudit("Supplier Paid", `${fmtLKR0(+f.amount)} to ${sup.name} via ${f.method}`);
    setShow(false); setErr(""); setF({ supplierId: suppliers[0]?.id, amount: "", method: "Bank Transfer", ref: "", note: "" });
  };

  return (
    <Card title="Supplier Payments" action={<Btn size="sm" onClick={() => setShow(true)}><Wallet size={14} /> Record Payment</Btn>}>
      <Table head={["ID", "Date", "Supplier", "Method", "Ref", "Note", "Amount"]}>
        {supplierPayments.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5 font-mono font-bold text-xs">{p.id}</td>
            <td className="px-3 py-2.5 text-xs">{p.date}</td>
            <td className="px-3 py-2.5 text-xs font-semibold">{suppliers.find((s) => s.id === p.supplierId)?.name}</td>
            <td className="px-3 py-2.5 text-xs"><Badge tone="slate">{p.method}</Badge></td>
            <td className="px-3 py-2.5 text-xs font-mono">{p.ref || "—"}</td>
            <td className="px-3 py-2.5 text-xs text-slate-500">{p.note || "—"}</td>
            <td className="px-3 py-2.5 text-xs font-extrabold">{fmtLKR(p.amount, 0)}</td>
          </tr>
        ))}
      </Table>
      <Modal open={show} onClose={() => setShow(false)} title="Record Supplier Payment" width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn onClick={pay}>Record Payment</Btn></>}>
        <div className="space-y-3">
          <Field label="Supplier"><Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} — owes {fmtLKR0(s.creditBalance)}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (Rs)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
            <Field label="Method"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option>Cash</option><option>Bank Transfer</option><option>Cheque</option></Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="BT- / CHQ- no." /></Field>
            <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          </div>
          {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
        </div>
      </Modal>
    </Card>
  );
}
