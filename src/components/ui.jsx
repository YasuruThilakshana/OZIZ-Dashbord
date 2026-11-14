import { useEffect } from "react";
import { X } from "lucide-react";

// ── Buttons ───────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", size = "md", className = "", disabled, title }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { xs: "text-xs px-2 py-1", sm: "text-xs px-2.5 py-1.5", md: "text-sm px-3.5 py-2", lg: "text-sm px-5 py-2.5" };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    dark: "bg-slate-900 text-white hover:bg-slate-800",
    accent: "bg-amber-400 text-slate-900 hover:bg-amber-300",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    soft: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    warn: "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200",
  };
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, className = "", title, action }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(16,24,40,0.08)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Inputs ────────────────────────────────────────────────────────────
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
export function Input(props) { return <input {...props} className={`${inputCls} ${props.className || ""}`} />; }
export function Select({ children, ...props }) { return <select {...props} className={`${inputCls} ${props.className || ""}`}>{children}</select>; }
export function TextArea(props) { return <textarea {...props} className={`${inputCls} ${props.className || ""}`} />; }
export function Label({ children }) { return <label className="block text-xs font-semibold text-slate-600 mb-1">{children}</label>; }
export function Field({ label, children, className = "" }) {
  return <div className={className}><Label>{label}</Label>{children}</div>;
}

// ── Badge ─────────────────────────────────────────────────────────────
export function Badge({ tone = "slate", children, className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-800",
    blue: "bg-sky-100 text-sky-800", violet: "bg-violet-100 text-violet-800",
    dark: "bg-slate-900 text-white", pink: "bg-rose-100 text-rose-800",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none ${tones[tone]} ${className}`}>{children}</span>;
}

// ── Table ─────────────────────────────────────────────────────────────
export function Table({ head, children, className = "" }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
            {head.map((h, i) => <th key={i} className="px-3 py-2.5 font-bold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = "max-w-2xl", footer }) {
  useEffect(() => {
    if (!open) return;
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[92vh] flex flex-col oz-rise`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-display font-bold text-slate-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto slim-scroll">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-slate-50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────
export function Drawer({ open, onClose, title, children, width = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full ${width} bg-white shadow-2xl flex flex-col oz-rise`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display font-bold text-slate-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto slim-scroll flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${checked ? "bg-emerald-600" : "bg-slate-300"}`}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-[3px]"}`} />
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────
export function Empty({ icon, title, hint }) {
  return (
    <div className="text-center py-10 text-slate-400">
      <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">{icon}</div>
      <p className="font-semibold text-slate-600 text-sm">{title}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
    </div>
  );
}

// ── Stat ──────────────────────────────────────────────────────────────
export function Stat({ label, value, sub, icon, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-600", amber: "bg-amber-500", sky: "bg-sky-600",
    rose: "bg-rose-600", violet: "bg-violet-600", slate: "bg-slate-800",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="font-display font-extrabold text-slate-900 text-xl mt-1 tracking-tight truncate">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg ${tones[tone]} text-white flex items-center justify-center shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit flex-wrap">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${active === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
