import { useMemo, useState } from "react";
import {
  Banknote, TrendingUp, Receipt, Package, Wallet, TriangleAlert,
  Tag, ArrowRight, Flame,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { useStore, invoiceTotals } from "../store/StoreContext";
import { BRANCHES } from "../data/mockData";
import { fmtLKR, fmtLKR0, fmtNum, todayISO } from "../utils/format";
import { Card, Stat, Badge, Btn, Table, Empty } from "../components/ui";

const PAST_WEEK = [
  { day: "Nov 8", sales: 184500, profit: 96200 },
  { day: "Nov 9", sales: 231800, profit: 121400 },
  { day: "Nov 10", sales: 156200, profit: 81900 },
  { day: "Nov 11", sales: 198700, profit: 104300 },
  { day: "Nov 12", sales: 214300, profit: 112600 },
  { day: "Nov 13", sales: 267900, profit: 140800 },
];

const CAT_COLORS = { Men: "#0f766e", Women: "#db2777", Kids: "#d97706", Footwear: "#0284c7", Accessories: "#7c3aed" };

export default function Dashboard() {
  const { invoices, products, branchId, shift, audit, clearance, setClearance, logAudit, setActiveModule, customers } = useStore();
  const [scope, setScope] = useState("branch"); // branch | all
  const today = todayISO();

  const scoped = useMemo(() => scope === "all" ? invoices : invoices.filter((i) => i.branchId === branchId), [invoices, scope, branchId]);
  const todayInv = useMemo(() => scoped.filter((i) => i.date === today && i.status === "Completed"), [scoped, today]);

  const kpi = useMemo(() => {
    let net = 0, profit = 0, items = 0;
    todayInv.forEach((inv) => { const t = invoiceTotals(inv); net += t.net; profit += t.profit; items += inv.items.reduce((s, i) => s + i.qty, 0); });
    return { net, profit, orders: todayInv.length, items };
  }, [todayInv]);

  const drawerCash = shift.openingFloat + shift.cashIn - shift.cashOut;

  const lowStock = useMemo(() => {
    const out = [];
    products.forEach((p) => p.variants.forEach((v) => {
      const q = scope === "all" ? v.stock.b1 + v.stock.b2 + v.stock.b3 : v.stock[branchId];
      if (q <= 2) out.push({ product: p, variant: v, qty: q });
    }));
    return out.sort((a, b) => a.qty - b.qty).slice(0, 8);
  }, [products, scope, branchId]);

  const lowCount = useMemo(() => {
    let n = 0;
    products.forEach((p) => p.variants.forEach((v) => {
      const q = scope === "all" ? v.stock.b1 + v.stock.b2 + v.stock.b3 : v.stock[branchId];
      if (q <= 2) n += 1;
    }));
    return n;
  }, [products, scope, branchId]);

  const deadStock = useMemo(() => {
    const out = [];
    products.forEach((p) => p.variants.forEach((v) => {
      if (v.lastSoldDaysAgo > 60) out.push({ product: p, variant: v });
    }));
    return out.slice(0, 6);
  }, [products]);

  const trend = useMemo(() => [...PAST_WEEK, { day: "Today", sales: Math.round(kpi.net), profit: Math.round(kpi.profit) }], [kpi]);

  const hourly = useMemo(() => {
    const buckets = {};
    todayInv.forEach((inv) => {
      const h = parseHour(inv.time);
      const t = invoiceTotals(inv);
      buckets[h] = (buckets[h] || 0) + t.net;
    });
    return Object.keys(buckets).sort().map((h) => ({ hour: h, sales: Math.round(buckets[h]) }));
  }, [todayInv]);

  const byCategory = useMemo(() => {
    const map = {};
    scoped.filter((i) => i.status === "Completed").forEach((inv) => {
      inv.items.forEach((it) => {
        const prod = products.find((p) => p.variants.some((v) => v.barcode === it.barcode));
        const cat = prod?.category || "Men";
        map[cat] = (map[cat] || 0) + it.unitPrice * it.qty - (it.discount || 0);
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [scoped, products]);

  const bySize = useMemo(() => {
    const map = {};
    scoped.filter((i) => i.status === "Completed").forEach((inv) => inv.items.forEach((it) => { map[it.size] = (map[it.size] || 0) + it.qty; }));
    const order = ["S", "M", "L", "XL", "XXL"];
    return Object.entries(map).map(([size, qty]) => ({ size, qty })).sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size) || b.qty - a.qty);
  }, [scoped]);

  const byColor = useMemo(() => {
    const map = {};
    scoped.filter((i) => i.status === "Completed").forEach((inv) => inv.items.forEach((it) => { map[it.color] = (map[it.color] || 0) + it.qty; }));
    return Object.entries(map).map(([color, qty]) => ({ color, qty })).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [scoped]);

  const createClearance = (barcode, name, percent = 30) => {
    if (clearance.some((c) => c.barcode === barcode)) return;
    setClearance((c) => [...c, { barcode, percent, created: todayISO() }]);
    logAudit("Clearance Created", `${percent}% off ${name} (${barcode})`);
  };

  const branchName = (id) => BRANCHES.find((b) => b.id === id)?.short || id;
  const custName = (id) => customers.find((c) => c.id === id)?.name || "Walk-in";

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">Store Overview</h1>
          <p className="text-sm text-slate-500">{scope === "all" ? "All branches" : BRANCHES.find((b) => b.id === branchId)?.name} · {new Date().toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-lg">
          <button onClick={() => setScope("branch")} className={`px-3 py-1.5 rounded-md text-xs font-bold ${scope === "branch" ? "bg-slate-900 text-white" : "text-slate-500"}`}>This Branch</button>
          <button onClick={() => setScope("all")} className={`px-3 py-1.5 rounded-md text-xs font-bold ${scope === "all" ? "bg-slate-900 text-white" : "text-slate-500"}`}>All Branches</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Today's Net Sales" value={fmtLKR0(kpi.net)} sub={`${kpi.orders} orders`} icon={<Banknote size={19} />} tone="emerald" />
        <Stat label="Gross Profit" value={fmtLKR0(kpi.profit)} sub={kpi.net ? `${Math.round((kpi.profit / kpi.net) * 100)}% margin` : "—"} icon={<TrendingUp size={19} />} tone="sky" />
        <Stat label="Total Orders" value={fmtNum(kpi.orders)} sub="completed today" icon={<Receipt size={19} />} tone="violet" />
        <Stat label="Items Sold" value={fmtNum(kpi.items)} sub="units today" icon={<Package size={19} />} tone="amber" />
        <Stat label="Cash in Drawer" value={fmtLKR0(drawerCash)} sub={shift.open ? "shift open" : "shift closed"} icon={<Wallet size={19} />} tone="slate" />
        <Stat label="Low Stock Alerts" value={fmtNum(lowCount)} sub="variants ≤ 2 units" icon={<TriangleAlert size={19} />} tone="rose" />
      </div>

      <div className="grid xl:grid-cols-3 gap-3">
        {/* sales trend */}
        <Card title="Sales Trend — Last 7 Days (LKR)" className="xl:col-span-2" action={<Badge tone="green">Live</Badge>}>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" fontSize={11} tick={{ fill: "#64748b" }} />
                <YAxis fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => fmtLKR0(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" name="Net Sales" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2.5} />
                <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#0284c7" fill="#0284c7" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* hourly */}
        <Card title="Today — Hourly Sales">
          <div className="p-4 h-64">
            {hourly.length === 0 ? <Empty icon={<Receipt size={20} />} title="No sales yet today" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" fontSize={11} tick={{ fill: "#64748b" }} />
                  <YAxis fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => fmtLKR0(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="sales" name="Sales" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* category donut */}
        <Card title="Sales by Category">
          <div className="p-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                  {byCategory.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name] || "#64748b"} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtLKR0(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* sizes */}
        <Card title="Top Selling Sizes">
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySize} layout="vertical" margin={{ left: 10, right: 15 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="size" fontSize={12} tick={{ fill: "#0f172a", fontWeight: 700 }} width={48} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="qty" name="Units" fill="#0f766e" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* colors */}
        <Card title="Top Selling Colors">
          <div className="p-4 space-y-2.5 overflow-y-auto slim-scroll h-56">
            {byColor.map((c) => {
              const max = byColor[0]?.qty || 1;
              return (
                <div key={c.color}>
                  <div className="flex justify-between text-xs font-semibold mb-1"><span>{c.color}</span><span className="text-slate-500">{c.qty} units</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-500" style={{ width: `${(c.qty / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* alerts */}
        <Card title="Stock Alerts" action={<Badge tone="red">{lowCount + deadStock.length}</Badge>}>
          <div className="p-3 space-y-2 overflow-y-auto slim-scroll h-56">
            {lowStock.slice(0, 4).map(({ product, variant, qty }) => (
              <div key={variant.barcode} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                <TriangleAlert size={15} className="text-red-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{product.name}</p>
                  <p className="text-[11px] text-slate-500">{variant.size} · {variant.color} · <b className="text-red-600">{qty} left</b></p>
                </div>
              </div>
            ))}
            {deadStock.slice(0, 2).map(({ product, variant }) => (
              <div key={variant.barcode} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                <Flame size={15} className="text-amber-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{product.name}</p>
                  <p className="text-[11px] text-slate-500">Unsold {variant.lastSoldDaysAgo} days</p>
                </div>
                <Btn size="xs" variant="warn" onClick={() => createClearance(variant.barcode, product.name)}>
                  <Tag size={12} /> Clearance
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-3">
        <Card title="Recent Transactions" action={<Btn size="xs" variant="ghost" onClick={() => setActiveModule("accounting")}>All reports <ArrowRight size={13} /></Btn>}>
          <Table head={["Invoice", "Customer", "Branch", "Items", "Total", "Status"]}>
            {[...scoped].reverse().slice(0, 6).map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-mono font-bold text-xs">{inv.id}</td>
                <td className="px-3 py-2.5 text-xs">{custName(inv.customerId)}</td>
                <td className="px-3 py-2.5 text-xs">{branchName(inv.branchId)}</td>
                <td className="px-3 py-2.5 text-xs">{inv.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td className="px-3 py-2.5 font-bold text-xs whitespace-nowrap">{fmtLKR(invoiceTotals(inv).net)}</td>
                <td className="px-3 py-2.5"><Badge tone={inv.status === "Completed" ? "green" : "red"}>{inv.status}</Badge></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Audit Log — Latest" action={<Btn size="xs" variant="ghost" onClick={() => setActiveModule("staff")}>View all <ArrowRight size={13} /></Btn>}>
          <div className="divide-y divide-slate-100">
            {audit.slice(0, 6).map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-extrabold text-slate-600 shrink-0">{a.user.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{a.action} <span className="font-normal text-slate-500">· {a.user}</span></p>
                  <p className="text-xs text-slate-500 truncate">{a.detail}</p>
                </div>
                <span className="ml-auto text-[11px] text-slate-400 whitespace-nowrap shrink-0">{a.ts}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function parseHour(timeStr) {
  // "09:41 AM" -> "9 AM"
  try {
    const [hm, ap] = timeStr.split(" ");
    let h = parseInt(hm.split(":")[0], 10);
    return `${h} ${ap}`;
  } catch { return timeStr; }
}
