import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Boxes, ArrowLeftRight, HeartHandshake,
  Truck, Calculator, Users, Menu, ChevronLeft, Store, Clock, Plus,
  PauseCircle, Printer, UserCircle2, Lock,
} from "lucide-react";
import { useStore, ROLES } from "../store/StoreContext";
import { BRANCHES } from "../data/mockData";
import { fmtLKR0 } from "../utils/format";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Owner", "Store Manager"] },
  { id: "pos", label: "POS Terminal", icon: ShoppingCart, roles: ROLES },
  { id: "inventory", label: "Inventory", icon: Boxes, roles: ROLES },
  { id: "exchange", label: "Exchange & Returns", icon: ArrowLeftRight, roles: ROLES },
  { id: "crm", label: "CRM & Loyalty", icon: HeartHandshake, roles: ["Owner", "Store Manager"] },
  { id: "suppliers", label: "Suppliers & GRN", icon: Truck, roles: ["Owner", "Store Manager"] },
  { id: "accounting", label: "Accounting & Reports", icon: Calculator, roles: ["Owner", "Store Manager"] },
  { id: "staff", label: "Staff & Shifts", icon: Users, roles: ROLES },
];

export default function Layout({ children }) {
  const { role, setRole, branchId, setBranchId, activeModule, setActiveModule, shift, currentUser, logAudit } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV.filter((n) => n.roles.includes(role));

  const switchRole = (r) => {
    setRole(r);
    if (!NAV.find((n) => n.id === activeModule)?.roles.includes(r)) setActiveModule("pos");
  };

  const drawerCash = shift.openingFloat + shift.cashIn - shift.cashOut;

  const sidebar = (
    <div className={`h-full flex flex-col bg-slate-950 text-slate-300 ${collapsed ? "w-[68px]" : "w-60"} transition-all`}>
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 font-display font-extrabold flex items-center justify-center text-lg shrink-0">O</div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-extrabold text-white leading-none tracking-tight">OZIZ</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mt-0.5">Clothing</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto slim-scroll p-2.5 space-y-1">
        {visibleNav.map((n) => {
          const Icon = n.icon;
          const active = activeModule === n.id;
          return (
            <button key={n.id} title={collapsed ? n.label : ""}
              onClick={() => { setActiveModule(n.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${active ? "bg-amber-400 text-slate-950" : "hover:bg-white/10 text-slate-300"}`}>
              <Icon size={19} className="shrink-0" />
              {!collapsed && n.label}
            </button>
          );
        })}
        {!collapsed && (
          <div className="pt-3 space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Restricted</p>
            {NAV.filter((n) => !n.roles.includes(role)).map((n) => {
              const Icon = n.icon;
              return (
                <div key={n.id} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600">
                  <Lock size={16} className="shrink-0" /><span className="truncate">{n.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </nav>
      <div className="p-3 border-t border-white/10 shrink-0">
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10">
          <ChevronLeft size={16} className={collapsed ? "rotate-180" : ""} />{!collapsed && "Collapse"}
        </button>
        {!collapsed && <p className="text-[10px] text-slate-500 text-center mt-1">v2.4.0 · Colombo HQ</p>}
      </div>
    </div>
  );

  return (
    <div className="h-full flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:block h-full shrink-0">{sidebar}</aside>
      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── top header ─────────────────────────────────────────── */}
        <header className="bg-white border-b border-slate-200 px-3 sm:px-5 h-auto min-h-16 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0 z-30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>

          <div className="flex items-center gap-2 min-w-0">
            <Store size={17} className="text-emerald-600 shrink-0" />
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
              className="font-bold text-sm text-slate-900 bg-transparent outline-none cursor-pointer max-w-[190px] truncate">
              {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${shift.open ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
              <Clock size={13} /> {shift.open ? `Shift Open · ${fmtLKR0(drawerCash)} in drawer` : "Shift Closed"}
            </span>
          </div>

          <div className="flex-1" />

          {/* quick actions */}
          <div className="flex items-center gap-1.5">
            <button title="New Sale" onClick={() => setActiveModule("pos")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Plus size={18} /></button>
            <button title="Held Bills" onClick={() => setActiveModule("pos")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><PauseCircle size={18} /></button>
            <button title="Print Last Receipt" onClick={() => { setActiveModule("pos"); logAudit("Quick Action", "Print last receipt requested"); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Printer size={18} /></button>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          {/* role switcher */}
          <div className="flex items-center gap-2">
            <UserCircle2 size={18} className="text-slate-400" />
            <select value={role} onChange={(e) => switchRole(e.target.value)}
              className="text-xs font-bold rounded-lg border border-amber-300 bg-amber-50 text-slate-900 px-2 py-1.5 outline-none cursor-pointer">
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-display font-bold flex items-center justify-center text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500">{role}</p>
            </div>
          </div>
        </header>

        {/* module body */}
        <main className="flex-1 overflow-y-auto slim-scroll p-3 sm:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
