import { useMemo, useState } from "react";
import { Clock, LockOpen, Lock, Plus, Minus, ScrollText, ShieldCheck, Search } from "lucide-react";
import { useStore, invoiceTotals } from "../store/StoreContext";
import { STAFF } from "../data/mockData";
import { fmtLKR, fmtLKR0, nowDateTime, todayISO } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Modal, Table, Tabs, Field } from "../components/ui";

export default function Staff() {
  const [tab, setTab] = useState("shifts");
  return (
    <div className="space-y-3 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">Staff, Shifts & Audit Logs</h1>
        <p className="text-sm text-slate-500">Cash drawer control, Z-reports and the security trail. Switch roles in the top bar to test access live.</p>
      </div>
      <Tabs tabs={[
        { id: "shifts", label: "Shift & Cash Drawer" },
        { id: "staff", label: "Staff Directory" },
        { id: "audit", label: "Security Audit Log" },
      ]} active={tab} onChange={setTab} />
      {tab === "shifts" && <ShiftTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

function ShiftTab() {
  const { shift, setShift, shiftHistory, setShiftHistory, invoices, branchId, currentUser, logAudit } = useStore();
  const [showOpen, setShowOpen] = useState(false);
  const [showMove, setShowMove] = useState(null); // 'in' | 'out'
  const [showClose, setShowClose] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [counted, setCounted] = useState("");
  const [lastZ, setLastZ] = useState(null);

  const todayCashSales = useMemo(() => invoices
    .filter((i) => i.date === todayISO() && i.branchId === branchId && i.status === "Completed")
    .reduce((s, i) => s + i.payments.filter((p) => p.method === "Cash").reduce((x, p) => x + p.amount, 0), 0),
    [invoices, branchId]);

  const expected = shift.openingFloat + shift.cashIn - shift.cashOut + todayCashSales;
  const diff = counted === "" ? null : (+counted || 0) - expected;

  const openShift = () => {
    if (!(+amount > 0)) return;
    setShift({ open: true, openedBy: currentUser.name, openedAt: nowDateTime(), openingFloat: +amount, cashIn: 0, cashOut: 0, cashOutNote: "" });
    logAudit("Shift Opened", `Opening float ${fmtLKR0(+amount)} by ${currentUser.name}`);
    setShowOpen(false); setAmount("");
  };

  const moveCash = () => {
    if (!(+amount > 0)) return;
    if (showMove === "in") {
      setShift((s) => ({ ...s, cashIn: s.cashIn + +amount }));
      logAudit("Cash In", `${fmtLKR0(+amount)} added to drawer — ${note || "no note"}`);
    } else {
      setShift((s) => ({ ...s, cashOut: s.cashOut + +amount, cashOutNote: note }));
      logAudit("Cash Out", `${fmtLKR0(+amount)} removed — ${note || "no note"}`);
    }
    setShowMove(null); setAmount(""); setNote("");
  };

  const closeShift = () => {
    if (counted === "") return;
    const z = { id: `Z-${todayISO()}-01`, date: todayISO(), closedBy: currentUser.name, closedAt: nowDateTime(),
      openingFloat: shift.openingFloat, cashIn: shift.cashIn, cashOut: shift.cashOut,
      cashSales: todayCashSales, expected, counted: +counted, diff: diff || 0 };
    setShiftHistory((h) => [z, ...h]);
    setLastZ(z);
    setShift((s) => ({ ...s, open: false }));
    logAudit("Shift Closed", `Z-Report: expected ${fmtLKR0(expected)} / counted ${fmtLKR0(+counted)} (${(diff || 0) === 0 ? "balanced" : diff > 0 ? `excess ${fmtLKR0(diff)}` : `short ${fmtLKR0(-diff)}`})`);
    setShowClose(false); setCounted("");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-3 items-start">
      <Card title="Cash Drawer — Current Shift">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge tone={shift.open ? "green" : "red"}>{shift.open ? "SHIFT OPEN" : "SHIFT CLOSED"}</Badge>
            {shift.open && <span className="text-xs text-slate-500">Opened by {shift.openedBy} · {shift.openedAt}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-slate-100 p-3"><p className="text-[11px] font-bold text-slate-500">OPENING FLOAT</p><p className="font-display font-extrabold">{fmtLKR0(shift.openingFloat)}</p></div>
            <div className="rounded-lg bg-slate-100 p-3"><p className="text-[11px] font-bold text-slate-500">CASH SALES TODAY</p><p className="font-display font-extrabold text-emerald-700">+{fmtLKR0(todayCashSales)}</p></div>
            <div className="rounded-lg bg-slate-100 p-3"><p className="text-[11px] font-bold text-slate-500">CASH IN / OUT</p><p className="font-extrabold text-sm">+{fmtLKR0(shift.cashIn)} / −{fmtLKR0(shift.cashOut)}</p></div>
            <div className="rounded-lg bg-slate-900 text-white p-3"><p className="text-[11px] font-bold text-slate-400">EXPECTED IN DRAWER</p><p className="font-display font-extrabold text-amber-400">{fmtLKR0(expected)}</p></div>
          </div>
          {shift.cashOutNote && <p className="text-xs text-slate-500">Cash-out note: {shift.cashOutNote}</p>}
          <div className="flex gap-2 flex-wrap">
            {!shift.open && <Btn onClick={() => setShowOpen(true)}><LockOpen size={15} /> Open Shift</Btn>}
            {shift.open && <>
              <Btn variant="outline" onClick={() => setShowMove("in")}><Plus size={15} /> Cash In</Btn>
              <Btn variant="outline" onClick={() => setShowMove("out")}><Minus size={15} /> Cash Out</Btn>
              <Btn variant="dark" onClick={() => setShowClose(true)}><Lock size={15} /> Close Shift (Z-Report)</Btn>
            </>}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {lastZ && <ZReport z={lastZ} />}
        <Card title={`Past Z-Reports (${shiftHistory.length})`}>
          {shiftHistory.length === 0 && <p className="px-4 py-6 text-sm text-slate-400 text-center">No closed shifts this session yet.</p>}
          <div className="divide-y divide-slate-100">
            {shiftHistory.filter((z) => z.id !== lastZ?.id).map((z) => (
              <div key={z.id} className="px-4 py-2.5 text-sm flex items-center gap-2 flex-wrap">
                <b className="font-mono text-xs">{z.id}</b>
                <span className="text-xs text-slate-500">{z.closedAt} · {z.closedBy}</span>
                <span className="ml-auto text-xs font-bold">Exp {fmtLKR0(z.expected)} / Count {fmtLKR0(z.counted)}</span>
                <Badge tone={z.diff === 0 ? "green" : z.diff > 0 ? "blue" : "red"}>{z.diff === 0 ? "Balanced" : z.diff > 0 ? `+${fmtLKR0(z.diff)} excess` : `${fmtLKR0(z.diff)} short`}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* open */}
      <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Open Shift" width="max-w-sm"
        footer={<><Btn variant="ghost" onClick={() => setShowOpen(false)}>Cancel</Btn><Btn onClick={openShift}>Open Shift</Btn></>}>
        <Field label="Opening Float — Cash in Drawer (Rs)"><Input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" /></Field>
        <p className="text-xs text-slate-500 mt-2">Count the physical cash in the drawer and enter it as the opening float.</p>
      </Modal>

      {/* cash in/out */}
      <Modal open={!!showMove} onClose={() => setShowMove(null)} title={showMove === "in" ? "Cash In — Add to Drawer" : "Cash Out — Remove from Drawer"} width="max-w-sm"
        footer={<><Btn variant="ghost" onClick={() => setShowMove(null)}>Cancel</Btn><Btn onClick={moveCash}>Record</Btn></>}>
        <div className="space-y-3">
          <Field label="Amount (Rs)"><Input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Note / Reason"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={showMove === "in" ? "e.g. Petty cash top-up" : "e.g. Tuk hire, supplier advance"} /></Field>
        </div>
      </Modal>

      {/* close / Z */}
      <Modal open={showClose} onClose={() => setShowClose(false)} title="Close Shift — Z-Report" width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShowClose(false)}>Cancel</Btn><Btn variant="dark" disabled={counted === ""} onClick={closeShift}>Close Shift</Btn></>}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Opening float</span><b>{fmtLKR(shift.openingFloat)}</b></div>
          <div className="flex justify-between"><span className="text-slate-500">+ Cash sales today</span><b>{fmtLKR(todayCashSales)}</b></div>
          <div className="flex justify-between"><span className="text-slate-500">+ Cash in / − Cash out</span><b>+{fmtLKR0(shift.cashIn)} / −{fmtLKR0(shift.cashOut)}</b></div>
          <div className="flex justify-between font-extrabold text-base border-t pt-2"><span>Expected cash</span><span>{fmtLKR(expected)}</span></div>
          <Field label="Actual Counted Cash (Rs)"><Input type="number" autoFocus value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Count the drawer…" /></Field>
          {diff !== null && (
            <p className={`font-bold px-3 py-2 rounded-lg text-center ${diff === 0 ? "bg-emerald-50 text-emerald-700" : diff > 0 ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-600"}`}>
              {diff === 0 ? "✓ Balanced — no variance" : diff > 0 ? `Cash EXCESS of ${fmtLKR(diff)}` : `Cash SHORT of ${fmtLKR(-diff)}`}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ZReport({ z }) {
  return (
    <Card title={`Z-Report — ${z.id}`}>
      <div className="p-4 font-mono text-sm space-y-1.5 receipt-paper rounded-b-xl">
        <p className="text-center font-extrabold">OZIZ CLOTHING — Z-REPORT</p>
        <p className="text-center text-xs">{z.date} · {z.closedAt}</p>
        <div className="receipt-dash" />
        <div className="flex justify-between"><span>Opening float</span><span>{fmtLKR(z.openingFloat)}</span></div>
        <div className="flex justify-between"><span>Cash sales</span><span>{fmtLKR(z.cashSales)}</span></div>
        <div className="flex justify-between"><span>Cash in/out</span><span>+{fmtLKR0(z.cashIn)} / −{fmtLKR0(z.cashOut)}</span></div>
        <div className="flex justify-between font-bold"><span>EXPECTED</span><span>{fmtLKR(z.expected)}</span></div>
        <div className="flex justify-between font-bold"><span>COUNTED</span><span>{fmtLKR(z.counted)}</span></div>
        <div className="receipt-dash" />
        <p className={`text-center font-extrabold ${z.diff === 0 ? "" : z.diff > 0 ? "text-sky-700" : "text-red-600"}`}>
          {z.diff === 0 ? "BALANCED ✓" : z.diff > 0 ? `EXCESS ${fmtLKR(z.diff)}` : `SHORT ${fmtLKR(-z.diff)}`}
        </p>
        <p className="text-center text-xs">Closed by {z.closedBy}</p>
        <div className="no-print pt-2"><Btn size="sm" variant="dark" className="w-full" onClick={() => window.print()}>Print Z-Report</Btn></div>
      </div>
    </Card>
  );
}

function StaffTab() {
  const { role } = useStore();
  const [q, setQ] = useState("");
  const list = STAFF.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.toLowerCase()) || s.role.toLowerCase().includes(q.toLowerCase()));
  const tone = (r) => r === "Owner" ? "violet" : r === "Store Manager" ? "blue" : r === "Cashier" ? "green" : "amber";

  const matrix = [
    ["Dashboard & analytics", true, true, false],
    ["POS billing", true, true, true],
    ["Cost prices & margins", true, true, false],
    ["Inventory edit / GRN", true, true, false],
    ["Exchange approval", true, true, true],
    ["CRM & campaigns", true, true, false],
    ["Supplier payments", true, true, false],
    ["Reports & expenses", true, true, false],
    ["Shift close / Z-report", true, true, false],
    ["Void bill", true, true, false],
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-3 items-start">
      <Card title={`Staff (${list.length})`}>
        <div className="p-3 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="pl-9" />
          </div>
        </div>
        <Table head={["Name", "Role", "Phone", "PIN", "Status"]}>
          {list.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5"><p className="font-bold text-sm">{s.name}</p>{s.commissionRate && <p className="text-[11px] text-slate-500">{s.commissionRate}% commission</p>}</td>
              <td className="px-3 py-2.5"><Badge tone={tone(s.role)}>{s.role}</Badge></td>
              <td className="px-3 py-2.5 text-xs font-mono">{s.phone}</td>
              <td className="px-3 py-2.5 text-xs font-mono">{role === "Cashier" ? "••••" : s.pin}</td>
              <td className="px-3 py-2.5"><Badge tone={s.active ? "green" : "red"}>{s.active ? "Active" : "Inactive"}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Role Access Matrix">
        <div className="p-3 space-y-1">
          <div className="grid grid-cols-[1fr_52px_52px_52px] text-[11px] font-bold text-slate-500 uppercase px-2">
            <span>Capability</span><span className="text-center">Own</span><span className="text-center">Mgr</span><span className="text-center">Csh</span>
          </div>
          {matrix.map(([cap, o, m, c]) => (
            <div key={cap} className="grid grid-cols-[1fr_52px_52px_52px] items-center text-xs px-2 py-1.5 rounded-lg bg-slate-50">
              <span className="font-semibold">{cap}</span>
              {[o, m, c].map((v, i) => <span key={i} className={`text-center font-extrabold ${v ? "text-emerald-600" : "text-slate-300"}`}>{v ? "✓" : "—"}</span>)}
            </div>
          ))}
          <p className="text-xs text-slate-500 flex gap-1.5 pt-1"><ShieldCheck size={14} className="shrink-0 text-emerald-600" /> You are testing as <b>{role}</b>. Cost prices, margins and restricted modules hide automatically for Cashier.</p>
        </div>
      </Card>
    </div>
  );
}

function AuditTab() {
  const { audit } = useStore();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("All");
  const actions = ["All", ...new Set(audit.map((a) => a.action))];
  const list = audit.filter((a) => (action === "All" || a.action === action) &&
    (!q.trim() || (a.detail + a.user + a.action).toLowerCase().includes(q.toLowerCase())));

  return (
    <Card title={`Security Audit Log (${list.length})`}
      action={<div className="flex gap-2">
        <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search log…" className="pl-8 py-1.5 text-xs w-44" /></div>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="text-xs py-1.5 w-auto">{actions.map((a) => <option key={a}>{a}</option>)}</Select>
      </div>}>
      <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto slim-scroll">
        {list.length === 0 && <p className="px-4 py-8 text-sm text-slate-400 text-center flex items-center justify-center gap-2"><ScrollText size={16} /> No matching entries</p>}
        {list.map((a) => (
          <div key={a.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-extrabold shrink-0">{a.user.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs"><b className="text-slate-900">{a.action}</b> <span className="text-slate-500">· {a.user} ({a.role})</span></p>
              <p className="text-xs text-slate-600">{a.detail}</p>
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1"><Clock size={11} />{a.ts}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
