import { useMemo, useState } from "react";
import { Search, Plus, Gift, MessageCircle, Send, History, Pencil, Cake, Crown } from "lucide-react";
import { useStore, invoiceTotals } from "../store/StoreContext";
import { fmtLKR, fmtLKR0, todayISO, uid } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Modal, Table, Tabs, Empty, Field, TextArea } from "../components/ui";

export default function CRM() {
  const [tab, setTab] = useState("customers");
  return (
    <div className="space-y-3 max-w-[1300px] mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">CRM, Loyalty & Gift Vouchers</h1>
        <p className="text-sm text-slate-500">Customer tiers, points (1 pt per Rs. 100 · 1 pt = Rs. 5), vouchers and campaigns.</p>
      </div>
      <Tabs tabs={[
        { id: "customers", label: "Customer Directory" },
        { id: "vouchers", label: "Vouchers & Credit Notes" },
        { id: "campaigns", label: "SMS / WhatsApp Campaigns" },
      ]} active={tab} onChange={setTab} />
      {tab === "customers" && <CustomerTab />}
      {tab === "vouchers" && <VoucherTab />}
      {tab === "campaigns" && <CampaignTab />}
    </div>
  );
}

function CustomerTab() {
  const { customers, setCustomers, invoices, logAudit } = useStore();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("All");
  const [historyFor, setHistoryFor] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => customers.filter((c) => {
    if (tier !== "All" && c.tier !== tier) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.email.toLowerCase().includes(s);
  }), [customers, q, tier]);

  const history = (id) => invoices.filter((i) => i.customerId === id);

  const tierTone = (t) => t === "Platinum" ? "violet" : t === "Gold" ? "amber" : "slate";

  return (
    <Card title={`Customers (${filtered.length})`}
      action={<div className="flex gap-2">
        <Select value={tier} onChange={(e) => setTier(e.target.value)} className="text-xs py-1.5">
          <option>All</option><option>Silver</option><option>Gold</option><option>Platinum</option>
        </Select>
        <Btn size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={14} /> Add</Btn>
      </div>}>
      <div className="p-3 border-b border-slate-100">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="pl-9" />
        </div>
      </div>
      <Table head={["Customer", "Phone", "Birthday", "Tier", "Total Spend", "Points", "Purchases", ""]}>
        {filtered.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5">
              <p className="font-bold text-sm flex items-center gap-1.5">{c.name} {c.tier === "Platinum" && <Crown size={13} className="text-violet-600" />}</p>
              <p className="text-xs text-slate-500">{c.email}</p>
            </td>
            <td className="px-3 py-2.5 text-xs font-mono">{c.phone}</td>
            <td className="px-3 py-2.5 text-xs">{c.birthday} {new Date(c.birthday).getMonth() === new Date().getMonth() && <Cake size={13} className="inline text-pink-500" />}</td>
            <td className="px-3 py-2.5"><Badge tone={tierTone(c.tier)}>{c.tier}</Badge></td>
            <td className="px-3 py-2.5 text-xs font-bold">{fmtLKR0(c.totalSpend)}</td>
            <td className="px-3 py-2.5 text-xs font-bold text-emerald-700">{c.points.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-xs">{history(c.id).length} bills</td>
            <td className="px-3 py-2.5 whitespace-nowrap">
              <Btn size="xs" variant="ghost" onClick={() => setHistoryFor(c)}><History size={13} /> History</Btn>
              <Btn size="xs" variant="ghost" onClick={() => { setEditing(c); setShowForm(true); }}><Pencil size={13} /></Btn>
            </td>
          </tr>
        ))}
      </Table>

      {/* history modal */}
      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={historyFor ? `${historyFor.name} — Purchase History` : ""} width="max-w-2xl">
        {historyFor && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-slate-100 p-2"><p className="text-[11px] font-bold text-slate-500">TIER</p><Badge tone={tierTone(historyFor.tier)}>{historyFor.tier}</Badge></div>
              <div className="rounded-lg bg-slate-100 p-2"><p className="text-[11px] font-bold text-slate-500">POINTS</p><p className="font-extrabold text-emerald-700">{historyFor.points.toLocaleString()}</p></div>
              <div className="rounded-lg bg-slate-100 p-2"><p className="text-[11px] font-bold text-slate-500">LIFETIME</p><p className="font-extrabold">{fmtLKR0(historyFor.totalSpend)}</p></div>
              <div className="rounded-lg bg-slate-100 p-2"><p className="text-[11px] font-bold text-slate-500">BILLS</p><p className="font-extrabold">{history(historyFor.id).length}</p></div>
            </div>
            {historyFor.notes && <p className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Note: {historyFor.notes}</p>}
            {history(historyFor.id).length === 0 && <Empty icon={<History size={20} />} title="No purchases yet" />}
            {history(historyFor.id).map((inv) => (
              <div key={inv.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex justify-between text-sm"><b className="font-mono">{inv.id}</b><b>{fmtLKR(invoiceTotals(inv).net)}</b></div>
                <p className="text-xs text-slate-500">{inv.date} {inv.time} · {inv.payments.map((p) => p.method).join(" + ")}</p>
                <div className="mt-1.5 space-y-0.5">{inv.items.map((it, i) => (
                  <p key={i} className="text-xs">{it.qty} × {it.name} <span className="text-slate-400">({it.size}/{it.color})</span></p>
                ))}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <CustomerForm open={showForm} editing={editing} onClose={() => setShowForm(false)} />
    </Card>
  );
}

function CustomerForm({ open, editing, onClose }) {
  const { customers, setCustomers, logAudit } = useStore();
  const blank = { name: "", phone: "", email: "", birthday: "", notes: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const [k, setK] = useState(0);
  const [was, setWas] = useState(false);
  if (open && !was) { setWas(true); setK((x) => x + 1); setF(editing ? { name: editing.name, phone: editing.phone, email: editing.email, birthday: editing.birthday, notes: editing.notes || "" } : blank); setErr(""); }
  if (!open && was) setWas(false);

  const save = () => {
    if (!f.name.trim() || !f.phone.trim()) { setErr("Name and phone are required."); return; }
    if (!editing && customers.some((c) => c.phone === f.phone.trim())) { setErr("Phone already registered."); return; }
    if (editing) {
      setCustomers((cs) => cs.map((c) => c.id === editing.id ? { ...c, ...f } : c));
      logAudit("Customer Updated", f.name);
    } else {
      setCustomers((cs) => [...cs, { id: uid("c"), ...f, tier: "Silver", points: 0, totalSpend: 0, joined: todayISO() }]);
      logAudit("Customer Added", `${f.name} (${f.phone})`);
    }
    onClose();
  };
  return (
    <Modal key={k} open={open} onClose={onClose} title={editing ? "Edit Customer" : "Add Customer"} width="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save}>Save</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone *"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Birthday"><Input type="date" value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} /></Field>
      </div>
      <div className="mt-3"><Field label="Notes"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Sizes, preferences…" /></Field></div>
      {err && <p className="text-sm font-semibold text-red-600 mt-3">{err}</p>}
    </Modal>
  );
}

function VoucherTab() {
  const { vouchers, setVouchers, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ type: "Gift Voucher", value: "5000", issuedTo: "" });
  const [check, setCheck] = useState("");
  const [detail, setDetail] = useState(null);

  const issue = () => {
    if (!(+f.value > 0)) return;
    const prefix = f.type === "Gift Voucher" ? "OZV" : "CN";
    const code = `${prefix}-${5000 + vouchers.length * 7 + Math.floor(Math.random() * 5)}`;
    setVouchers((vs) => [...vs, {
      code, type: f.type, value: +f.value, balance: +f.value, issuedTo: f.issuedTo || "Walk-in",
      issuedDate: todayISO(), expiryDate: "2027-05-14", status: "Active",
      history: [{ date: todayISO(), action: `Issued Rs. ${(+f.value).toLocaleString()}` }],
    }]);
    logAudit("Voucher Issued", `${code} — Rs. ${(+f.value).toLocaleString()} to ${f.issuedTo || "Walk-in"}`);
    setShow(false); setF({ type: "Gift Voucher", value: "5000", issuedTo: "" });
  };

  const found = check.trim() ? vouchers.find((v) => v.code.toLowerCase() === check.trim().toLowerCase()) : null;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-3 items-start">
      <Card title={`Issued Vouchers (${vouchers.length})`} action={<Btn size="sm" onClick={() => setShow(true)}><Gift size={14} /> Issue Voucher</Btn>}>
        <Table head={["Code", "Type", "Value", "Balance", "Issued To", "Expiry", "Status", ""]}>
          {vouchers.map((v) => (
            <tr key={v.code} className="hover:bg-slate-50">
              <td className="px-3 py-2.5 font-mono font-bold text-xs">{v.code}</td>
              <td className="px-3 py-2.5 text-xs">{v.type}</td>
              <td className="px-3 py-2.5 text-xs">{fmtLKR0(v.value)}</td>
              <td className="px-3 py-2.5 text-xs font-bold text-emerald-700">{fmtLKR0(v.balance)}</td>
              <td className="px-3 py-2.5 text-xs">{v.issuedTo}</td>
              <td className="px-3 py-2.5 text-xs">{v.expiryDate}</td>
              <td className="px-3 py-2.5"><Badge tone={v.status === "Active" ? "green" : "slate"}>{v.status}</Badge></td>
              <td className="px-3 py-2.5"><Btn size="xs" variant="ghost" onClick={() => setDetail(v)}>History</Btn></td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Check Balance">
        <div className="p-4 space-y-2">
          <Input value={check} onChange={(e) => setCheck(e.target.value)} placeholder="Enter code e.g. OZV-5002" className="font-mono uppercase" />
          {check.trim() && (
            found ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
                <p className="font-mono font-extrabold">{found.code}</p>
                <p>{found.type} · <b>{fmtLKR(found.balance)}</b> available</p>
                <p className="text-xs text-slate-500">Expires {found.expiryDate} · {found.status}</p>
              </div>
            ) : <p className="text-sm font-semibold text-red-600">Code not found.</p>
          )}
          <div className="pt-1">
            <p className="text-xs font-bold text-slate-500 mb-1.5">QUICK ISSUE</p>
            <div className="flex gap-1.5 flex-wrap">
              {[2500, 5000, 10000].map((v) => (
                <button key={v} onClick={() => { setF({ type: "Gift Voucher", value: String(v), issuedTo: "" }); setShow(true); }}
                  className="px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold hover:bg-amber-200">Rs. {v.toLocaleString()}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Modal open={show} onClose={() => setShow(false)} title="Issue Gift Voucher / Credit Note" width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn onClick={issue}>Issue</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>Gift Voucher</option><option>Credit Note</option></Select></Field>
          <Field label="Value (Rs)"><Input type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><Field label="Issued To"><Input value={f.issuedTo} onChange={(e) => setF({ ...f, issuedTo: e.target.value })} placeholder="Customer name" /></Field></div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.code} — Redemption History` : ""} width="max-w-md">
        {detail && <div className="space-y-2">{detail.history.map((h, i) => (
          <div key={i} className="flex justify-between text-sm border-b border-slate-100 pb-2"><span>{h.action}</span><span className="text-slate-500">{h.date}</span></div>
        ))}</div>}
      </Modal>
    </div>
  );
}

function CampaignTab() {
  const { customers, campaigns, setCampaigns, branch, logAudit } = useStore();
  const [filter, setFilter] = useState("all");
  const [channel, setChannel] = useState("WhatsApp");
  const [message, setMessage] = useState("Hi {name}! Festive deals are live at Oziz {branch} — up to 30% off selected styles. Visit us this weekend!");
  const [sent, setSent] = useState(null);
  const thisMonth = new Date().getMonth();

  const audience = useMemo(() => customers.filter((c) => {
    if (filter === "vip") return c.tier === "Platinum";
    if (filter === "gold") return c.tier === "Gold" || c.tier === "Platinum";
    if (filter === "birthday") return new Date(c.birthday).getMonth() === thisMonth;
    if (filter === "dormant") return c.totalSpend < 50000;
    return true;
  }), [customers, filter, thisMonth]);

  const preview = message.replaceAll("{name}", audience[0]?.name.split(" ")[0] || "Customer").replaceAll("{branch}", branch.short);

  const send = () => {
    if (!audience.length || !message.trim()) return;
    const c = { id: uid("cmp"), name: `${channel} blast — ${filter}`, channel, audience: `${filter} (${audience.length})`, count: audience.length, date: todayISO(), message, status: "Sent" };
    setCampaigns((cs) => [c, ...cs]);
    logAudit("Campaign Sent", `${channel} to ${audience.length} customers (${filter})`);
    setSent(c);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-3 items-start">
      <Card title="Compose Campaign (Simulator)">
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audience Filter"><Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All customers</option><option value="vip">VIP — Platinum tier</option>
              <option value="gold">Gold + Platinum</option><option value="birthday">Birthday this month</option>
              <option value="dormant">Low spend (&lt; Rs. 50k)</option>
            </Select></Field>
            <Field label="Channel"><Select value={channel} onChange={(e) => setChannel(e.target.value)}><option>WhatsApp</option><option>SMS</option></Select></Field>
          </div>
          <Field label="Message — use {name} and {branch} placeholders"><TextArea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-[11px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1"><MessageCircle size={12} /> Preview → {audience[0]?.phone || "—"}</p>
            <p className="text-sm">{preview}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="dark">{audience.length} recipients</Badge>
            <div className="flex-1" />
            <Btn onClick={send} disabled={!audience.length}><Send size={15} /> Send {channel}</Btn>
          </div>
          {sent && <p className="text-sm font-bold text-emerald-700">✓ {sent.count} messages queued via {sent.channel} (simulated delivery).</p>}
          <div className="max-h-40 overflow-y-auto slim-scroll border border-slate-100 rounded-lg divide-y divide-slate-100">
            {audience.map((c) => <p key={c.id} className="text-xs px-3 py-1.5">{c.name} · <span className="font-mono">{c.phone}</span> · {c.tier}</p>)}
          </div>
        </div>
      </Card>
      <Card title="Campaign History">
        <div className="divide-y divide-slate-100">
          {campaigns.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center gap-2"><Badge tone={c.channel === "WhatsApp" ? "green" : "blue"}>{c.channel}</Badge><p className="font-bold text-sm">{c.name}</p><span className="ml-auto text-xs text-slate-400">{c.date}</span></div>
              <p className="text-xs text-slate-500 mt-1">{c.count} recipients · {c.audience}</p>
              <p className="text-xs mt-1 bg-slate-50 rounded-lg px-2.5 py-1.5">{c.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
