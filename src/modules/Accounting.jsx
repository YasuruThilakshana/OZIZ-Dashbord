import { useMemo, useState } from "react";
import { Plus, Wallet, Trash2, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useStore, invoiceTotals } from "../store/StoreContext";
import { BRANCHES, EXPENSE_CATEGORIES, STAFF } from "../data/mockData";
import { fmtLKR, fmtLKR0 } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Modal, Table, Tabs, Field } from "../components/ui";

export default function Accounting() {
  const [tab, setTab] = useState("summary");
  const [from, setFrom] = useState("2026-11-12");
  const [to, setTo] = useState("2026-11-14");
  const [branch, setBranch] = useState("all");

  return (
    <div className="space-y-3 max-w-[1300px] mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">Accounting, Expenses & Reports</h1>
          <p className="text-sm text-slate-500">True net profit = gross profit − operating expenses.</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto text-xs" />
          <span className="text-xs text-slate-400">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto text-xs" />
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-auto text-xs">
            <option value="all">All Branches</option>
            {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.short}</option>)}
          </Select>
        </div>
      </div>

      <Tabs tabs={[
        { id: "summary", label: "Sales & Profit Summary" },
        { id: "sizes", label: "Size & Color Performance" },
        { id: "commission", label: "Salesman Commission" },
        { id: "tax", label: "Tax Summary (VAT/SSCL)" },
        { id: "expenses", label: "Daily Expenses" },
      ]} active={tab} onChange={setTab} />

      {tab === "summary" && <SummaryTab from={from} to={to} branch={branch} />}
      {tab === "sizes" && <SizeColorTab from={from} to={to} branch={branch} />}
      {tab === "commission" && <CommissionTab from={from} to={to} branch={branch} />}
      {tab === "tax" && <TaxTab from={from} to={to} branch={branch} />}
      {tab === "expenses" && <ExpenseTab />}
    </div>
  );
}

function useFiltered(from, to, branch) {
  const { invoices, expenses } = useStore();
  return useMemo(() => {
    const inv = invoices.filter((i) => i.date >= from && i.date <= to && (branch === "all" || i.branchId === branch));
    const exp = expenses.filter((e) => e.date >= from && e.date <= to && (branch === "all" || e.branchId === branch));
    return { inv, exp };
  }, [invoices, expenses, from, to, branch]);
}

function SummaryTab({ from, to, branch }) {
  const { inv, exp } = useFiltered(from, to, branch);
  const done = inv.filter((i) => i.status === "Completed");
  const refunded = inv.filter((i) => i.status === "Refunded");

  const gross = done.reduce((s, i) => s + invoiceTotals(i).gross, 0);
  const disc = done.reduce((s, i) => s + invoiceTotals(i).discount, 0);
  const net = done.reduce((s, i) => s + invoiceTotals(i).net, 0);
  const cogs = done.reduce((s, i) => s + invoiceTotals(i).cogs, 0);
  const retVal = refunded.reduce((s, i) => s + invoiceTotals(i).net, 0);
  const expTotal = exp.reduce((s, e) => s + e.amount, 0);
  const grossProfit = net - cogs;
  const netProfit = grossProfit - expTotal - retVal;

  const rows = [
    ["Gross Sales", gross, ""],
    ["Less: Discounts & Promotions", -disc, "text-red-600"],
    ["Less: Refunds / Voids", -retVal, "text-red-600"],
    ["Net Sales", net - retVal, "font-extrabold text-base"],
    ["Less: Cost of Goods Sold (COGS)", -cogs, "text-red-600"],
    ["Gross Profit", grossProfit, "font-extrabold text-emerald-700"],
    ["Less: Operating Expenses", -expTotal, "text-red-600"],
    ["NET PROFIT", netProfit, "font-display font-extrabold text-lg text-slate-900 bg-amber-100"],
  ];

  const byMethod = {};
  done.forEach((i) => i.payments.forEach((p) => { byMethod[p.method] = (byMethod[p.method] || 0) + p.amount; }));

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-3 items-start">
      <Card title={`Profit & Loss — ${from} to ${to}`}>
        <div className="divide-y divide-slate-100">
          {rows.map(([label, v, cls], i) => (
            <div key={i} className={`flex justify-between px-4 py-2.5 text-sm ${cls}`}>
              <span className={v < 0 || i % 2 === 0 ? "" : ""}>{label}</span>
              <b className={v < 0 ? "text-red-600" : ""}>{v < 0 ? `(${fmtLKR(-v)})` : fmtLKR(v)}</b>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          {done.length} completed bills · {done.reduce((s, i) => s + i.items.reduce((x, l) => x + l.qty, 0), 0)} units · avg bill {done.length ? fmtLKR0(net / done.length) : "—"} · margin {net ? Math.round((grossProfit / net) * 100) : 0}%
        </div>
      </Card>
      <Card title="Collections by Payment Method">
        <div className="p-4 space-y-2">
          {Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
            <div key={m}>
              <div className="flex justify-between text-xs font-bold mb-1"><span>{m}</span><span>{fmtLKR0(v)}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${(v / net) * 100}%` }} /></div>
            </div>
          ))}
          <Btn size="sm" variant="outline" className="w-full mt-2" onClick={() => exportCSV("sales-summary", [["Metric", "LKR"], ...rows.map(([l, v]) => [l, Math.round(v)])])}>
            <Download size={14} /> Export CSV
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function SizeColorTab({ from, to, branch }) {
  const { inv } = useFiltered(from, to, branch);
  const done = inv.filter((i) => i.status === "Completed");

  const sizes = {};
  const colors = {};
  done.forEach((i) => i.items.forEach((it) => {
    const rev = it.unitPrice * it.qty - (it.discount || 0);
    if (!sizes[it.size]) sizes[it.size] = { size: it.size, qty: 0, revenue: 0 };
    sizes[it.size].qty += it.qty; sizes[it.size].revenue += rev;
    if (!colors[it.color]) colors[it.color] = { color: it.color, qty: 0, revenue: 0 };
    colors[it.color].qty += it.qty; colors[it.color].revenue += rev;
  }));
  const sizeRows = Object.values(sizes).sort((a, b) => b.qty - a.qty);
  const colorRows = Object.values(colors).sort((a, b) => b.qty - a.qty);

  return (
    <div className="grid lg:grid-cols-2 gap-3 items-start">
      <Card title="Size Performance">
        <div className="p-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sizeRows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="size" fontSize={12} tick={{ fill: "#0f172a", fontWeight: 700 }} />
              <YAxis fontSize={11} tick={{ fill: "#64748b" }} />
              <Tooltip formatter={(v, n) => n === "revenue" ? fmtLKR0(v) : v} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="qty" name="Units" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Table head={["Size", "Units", "Revenue", "Share"]}>
          {sizeRows.map((r) => {
            const tot = sizeRows.reduce((s, x) => s + x.qty, 0) || 1;
            return (
              <tr key={r.size}><td className="px-3 py-2"><Badge tone="dark">{r.size}</Badge></td>
                <td className="px-3 py-2 text-xs font-bold">{r.qty}</td><td className="px-3 py-2 text-xs">{fmtLKR0(r.revenue)}</td>
                <td className="px-3 py-2 text-xs">{Math.round((r.qty / tot) * 100)}%</td></tr>
            );
          })}
        </Table>
      </Card>
      <Card title="Color Performance">
        <div className="p-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={colorRows} layout="vertical" margin={{ left: 10, right: 15 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="color" fontSize={12} tick={{ fill: "#0f172a", fontWeight: 700 }} width={80} />
              <Tooltip formatter={(v, n) => n === "revenue" ? fmtLKR0(v) : v} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="qty" name="Units" fill="#db2777" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Table head={["Color", "Units", "Revenue", "Share"]}>
          {colorRows.map((r) => {
            const tot = colorRows.reduce((s, x) => s + x.qty, 0) || 1;
            return (
              <tr key={r.color}><td className="px-3 py-2 text-xs font-bold">{r.color}</td>
                <td className="px-3 py-2 text-xs font-bold">{r.qty}</td><td className="px-3 py-2 text-xs">{fmtLKR0(r.revenue)}</td>
                <td className="px-3 py-2 text-xs">{Math.round((r.qty / tot) * 100)}%</td></tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}

function CommissionTab({ from, to, branch }) {
  const { inv } = useFiltered(from, to, branch);
  const { logAudit } = useStore();
  const [paidOut, setPaidOut] = useState({});
  const done = inv.filter((i) => i.status === "Completed" && i.salesmanId);
  const men = STAFF.filter((s) => s.role === "Salesman");

  const rows = men.map((m) => {
    const bills = done.filter((i) => i.salesmanId === m.id);
    const sales = bills.reduce((s, i) => s + invoiceTotals(i).net, 0);
    return { staff: m, bills: bills.length, sales, commission: sales * ((m.commissionRate || 2) / 100) };
  });

  return (
    <Card title={`Salesman Commission — ${from} to ${to}`}>
      <Table head={["Salesman", "Rate", "Bills", "Net Sales", "Commission", "Status", ""]}>
        {rows.map((r) => (
          <tr key={r.staff.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5 font-bold text-sm">{r.staff.name}</td>
            <td className="px-3 py-2.5 text-xs">{r.staff.commissionRate}%</td>
            <td className="px-3 py-2.5 text-xs">{r.bills}</td>
            <td className="px-3 py-2.5 text-xs font-bold">{fmtLKR0(r.sales)}</td>
            <td className="px-3 py-2.5 text-xs font-extrabold text-emerald-700">{fmtLKR(r.commission, 0)}</td>
            <td className="px-3 py-2.5"><Badge tone={paidOut[r.staff.id] ? "green" : "amber"}>{paidOut[r.staff.id] ? "Paid" : "Payable"}</Badge></td>
            <td className="px-3 py-2.5">{!paidOut[r.staff.id] && r.commission > 0 && (
              <Btn size="xs" variant="outline" onClick={() => { setPaidOut((p) => ({ ...p, [r.staff.id]: true })); logAudit("Commission Paid", `${r.staff.name} — ${fmtLKR0(r.commission)}`); }}>Mark Paid</Btn>
            )}</td>
          </tr>
        ))}
      </Table>
      <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">Commission auto-calculates from POS bills tagged to each salesman. Bills without a salesman are excluded.</p>
    </Card>
  );
}

function TaxTab({ from, to, branch }) {
  const { inv } = useFiltered(from, to, branch);
  const done = inv.filter((i) => i.status === "Completed");
  const net = done.reduce((s, i) => s + invoiceTotals(i).net, 0);
  // Prices are tax-inclusive: VAT 18% + SSCL 2.5%
  const exVat = net / 1.18;
  const vat = net - exVat;
  const sscl = net - net / 1.025;

  return (
    <div className="grid lg:grid-cols-2 gap-3 items-start">
      <Card title="Tax Summary — Tax-Inclusive Prices">
        <div className="divide-y divide-slate-100 text-sm">
          {[["Net Sales (incl. tax)", net, ""], ["Sales excl. VAT", exVat, ""], ["VAT 18% (included)", vat, "font-bold"], ["SSCL 2.5% (included)", sscl, "font-bold"], ["Bills in period", done.length, ""]].map(([l, v, cls], i) => (
            <div key={i} className={`flex justify-between px-4 py-2.5 ${cls}`}>
              <span>{l}</span><b>{typeof v === "number" && l !== "Bills in period" ? fmtLKR(v) : v}</b>
            </div>
          ))}
        </div>
        <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">Selling prices at Oziz are VAT & SSCL inclusive, as shown on receipts. Consult your accountant before filing.</p>
      </Card>
      <Card title="Daily Tax Breakdown">
        <Table head={["Date", "Bills", "Net Sales", "VAT 18%", "SSCL 2.5%"]}>
          {[...new Set(done.map((i) => i.date))].sort().map((d) => {
            const day = done.filter((i) => i.date === d);
            const n = day.reduce((s, i) => s + invoiceTotals(i).net, 0);
            return (
              <tr key={d}><td className="px-3 py-2.5 text-xs font-bold">{d}</td><td className="px-3 py-2.5 text-xs">{day.length}</td>
                <td className="px-3 py-2.5 text-xs">{fmtLKR0(n)}</td><td className="px-3 py-2.5 text-xs">{fmtLKR0(n - n / 1.18)}</td>
                <td className="px-3 py-2.5 text-xs">{fmtLKR0(n - n / 1.025)}</td></tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}

function ExpenseTab() {
  const { expenses, setExpenses, branchId, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ date: "2026-11-14", category: "Tea & Refreshments", description: "", amount: "", paidBy: "Cash" });

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const save = () => {
    if (!f.description.trim() || !(+f.amount > 0)) return;
    setExpenses((es) => [...es, { id: `ex${Date.now()}`, date: f.date, branchId, category: f.category, description: f.description, amount: +f.amount, paidBy: f.paidBy, staff: "Current User" }]);
    logAudit("Expense Added", `${f.category}: ${fmtLKR0(+f.amount)} — ${f.description}`);
    setShow(false); setF({ date: "2026-11-14", category: "Tea & Refreshments", description: "", amount: "", paidBy: "Cash" });
  };

  const byCat = {};
  expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-3 items-start">
      <Card title={`Daily Expenses — ${fmtLKR(total, 0)} total`} action={<Btn size="sm" onClick={() => setShow(true)}><Plus size={14} /> Add Expense</Btn>}>
        <Table head={["Date", "Branch", "Category", "Description", "Paid By", "Staff", "Amount", ""]}>
          {sorted.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5 text-xs font-bold">{e.date}</td>
              <td className="px-3 py-2.5 text-xs">{BRANCHES.find((b) => b.id === e.branchId)?.short}</td>
              <td className="px-3 py-2.5 text-xs"><Badge tone="slate">{e.category}</Badge></td>
              <td className="px-3 py-2.5 text-xs">{e.description}</td>
              <td className="px-3 py-2.5 text-xs">{e.paidBy}</td>
              <td className="px-3 py-2.5 text-xs">{e.staff}</td>
              <td className="px-3 py-2.5 text-xs font-extrabold">{fmtLKR(e.amount, 0)}</td>
              <td className="px-3 py-2.5"><button onClick={() => { setExpenses((es) => es.filter((x) => x.id !== e.id)); logAudit("Expense Deleted", `${e.category} ${fmtLKR0(e.amount)}`); }} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Spend by Category">
        <div className="p-4 space-y-2">
          <Wallet size={0} className="hidden" />
          {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
            <div key={c}>
              <div className="flex justify-between text-xs font-bold mb-1"><span>{c}</span><span>{fmtLKR0(v)}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${(v / (total || 1)) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>
      <Modal open={show} onClose={() => setShow(false)} title="Add Shop Expense" width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn onClick={save}>Save Expense</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <div className="col-span-2"><Field label="Description"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Staff tea + biscuits" /></Field></div>
          <Field label="Amount (Rs)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Paid By"><Select value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })}><option>Cash</option><option>Bank Transfer</option><option>Card</option></Select></Field>
        </div>
      </Modal>
    </div>
  );
}

function exportCSV(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name}.csv`;
  a.click();
}
