export function fmtLKR(n, decimals = 2) {
  const v = Number(n || 0);
  return "Rs. " + v.toLocaleString("en-LK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtLKR0(n) {
  const v = Number(n || 0);
  return "Rs. " + Math.round(v).toLocaleString("en-LK");
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-LK");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function nowDateTime() {
  const d = new Date();
  return d.toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" }) + " " + nowTime();
}

let seq = 100;
export function uid(prefix = "ID") {
  seq += 1;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${seq}`;
}

export function nextInvoiceId(count) {
  return `INV-2026-${String(count + 1).padStart(3, "0")}`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
