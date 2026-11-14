import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  BRANCHES, STAFF, seedProducts, seedCustomers, seedSuppliers, seedInvoices,
  seedVouchers, seedExpenses, seedPOs, seedGRNs, seedPromotions, seedTransfers,
  seedDamaged, seedAudit,
} from "../data/mockData";
import { nowDateTime, todayISO, uid } from "../utils/format";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export const ROLES = ["Owner", "Store Manager", "Cashier"];

export function invoiceTotals(inv) {
  const gross = inv.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const discount = inv.items.reduce((s, i) => s + (i.discount || 0), 0) + (inv.promoDiscount || 0);
  const net = gross - discount;
  const cogs = inv.items.reduce((s, i) => s + (i.cost || 0) * i.qty, 0);
  return { gross, discount, net, cogs, profit: net - cogs };
}

export function StoreProvider({ children }) {
  // ── identity / session ──────────────────────────────────────────────
  const [role, setRole] = useState("Owner");
  const [branchId, setBranchId] = useState("b1");
  const [activeModule, setActiveModule] = useState("dashboard");

  // ── domain state ────────────────────────────────────────────────────
  const [products, setProducts] = useState(seedProducts);
  const [customers, setCustomers] = useState(seedCustomers);
  const [suppliers, setSuppliers] = useState(seedSuppliers);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [vouchers, setVouchers] = useState(seedVouchers);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [pos, setPOs] = useState(seedPOs);
  const [grns, setGRNs] = useState(seedGRNs);
  const [promotions, setPromotions] = useState(seedPromotions);
  const [transfers, setTransfers] = useState(seedTransfers);
  const [damaged, setDamaged] = useState(seedDamaged);
  const [audit, setAudit] = useState(seedAudit);
  const [heldBills, setHeldBills] = useState([]);
  const [clearance, setClearance] = useState([]); // {barcode, percent, created}
  const [supplierPayments, setSupplierPayments] = useState([
    { id: "SP-2026-031", supplierId: "sup1", date: "2026-11-10", amount: 200000, method: "Bank Transfer", ref: "BT-88412", note: "Part payment October" },
  ]);
  const [campaigns, setCampaigns] = useState([
    { id: "cmp1", name: "November VIP Drop", channel: "WhatsApp", audience: "Platinum tier", count: 2, date: "2026-11-05", message: "Hi {name}! New festive collection just landed at Oziz {branch}. Show this message for 10% off.", status: "Sent" },
  ]);

  // shift / drawer
  const [shift, setShift] = useState({
    open: true, openedBy: "Sanduni Fernando", openedAt: "2026-11-14 09:05 AM",
    openingFloat: 50000, cashIn: 20000, cashOut: 7500, cashOutNote: "Tuk hire + parcel",
  });
  const [shiftHistory, setShiftHistory] = useState([]);

  const currentUser = useMemo(() => {
    if (role === "Owner") return STAFF[0];
    if (role === "Store Manager") return STAFF[1];
    return STAFF[2];
  }, [role]);

  const branch = useMemo(() => BRANCHES.find((b) => b.id === branchId), [branchId]);
  const barcodeSeq = useRef(2000);

  // ── helpers ─────────────────────────────────────────────────────────
  const logAudit = useCallback((action, detail) => {
    setAudit((a) => [{ id: uid("a"), ts: nowDateTime(), user: currentUser.name, role, action, detail }, ...a]);
  }, [currentUser.name, role]);

  const findVariant = useCallback((barcode) => {
    for (const p of products) {
      const v = p.variants.find((x) => x.barcode === barcode);
      if (v) return { product: p, variant: v };
    }
    return null;
  }, [products]);

  const adjustStock = useCallback((barcode, branch, delta) => {
    setProducts((ps) => ps.map((p) => ({
      ...p,
      variants: p.variants.map((v) => v.barcode === barcode
        ? { ...v, stock: { ...v.stock, [branch]: Math.max(0, (v.stock[branch] || 0) + delta) } }
        : v),
    })));
  }, []);

  const nextBarcode = useCallback(() => {
    barcodeSeq.current += 1;
    return `OZ-${barcodeSeq.current}`;
  }, []);

  // complete a POS sale: persist invoice, decrement stock, loyalty, vouchers
  const completeSale = useCallback(({ items, customerId, salesmanId, payments, promoDiscount, pointsRedeemed, voucherUses }) => {
    const id = `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`;
    const net = items.reduce((s, i) => s + i.unitPrice * i.qty - (i.discount || 0), 0) - (promoDiscount || 0);
    const pointsEarned = customerId ? Math.floor(net / 100) : 0;
    const inv = {
      id, date: todayISO(), time: new Date().toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit", hour12: true }),
      branchId, cashierId: currentUser.id, salesmanId: salesmanId || null, customerId: customerId || null,
      status: "Completed", items, payments, promoDiscount: promoDiscount || 0,
      pointsRedeemed: pointsRedeemed || 0, pointsEarned,
      voucherCode: voucherUses?.[0]?.code || null,
    };
    setInvoices((list) => [...list, inv]);
    items.forEach((i) => adjustStock(i.barcode, branchId, -i.qty));
    if (customerId) {
      setCustomers((cs) => cs.map((c) => {
        if (c.id !== customerId) return c;
        const pts = c.points - (pointsRedeemed || 0) + pointsEarned;
        const spend = c.totalSpend + net;
        const tier = spend >= 500000 ? "Platinum" : spend >= 150000 ? "Gold" : "Silver";
        return { ...c, points: pts, totalSpend: spend, tier };
      }));
    }
    (voucherUses || []).forEach((u) => {
      setVouchers((vs) => vs.map((v) => {
        if (v.code !== u.code) return v;
        const bal = Math.max(0, v.balance - u.amount);
        return { ...v, balance: bal, status: bal === 0 ? "Redeemed" : "Active",
          history: [...v.history, { date: todayISO(), action: `Redeemed Rs. ${u.amount.toLocaleString()} on ${id}` }] };
      }));
    });
    logAudit("Sale Completed", `${id} - Rs. ${Math.round(net).toLocaleString()} (${payments.map((p) => p.method).join(" + ")})`);
    return inv;
  }, [invoices.length, branchId, currentUser.id, adjustStock, logAudit]);

  const value = {
    role, setRole, branchId, setBranchId, branch, currentUser,
    activeModule, setActiveModule,
    products, setProducts, customers, setCustomers, suppliers, setSuppliers,
    invoices, setInvoices, vouchers, setVouchers, expenses, setExpenses,
    pos, setPOs, grns, setGRNs, promotions, setPromotions, transfers, setTransfers,
    damaged, setDamaged, audit, heldBills, setHeldBills, clearance, setClearance,
    supplierPayments, setSupplierPayments, campaigns, setCampaigns,
    shift, setShift, shiftHistory, setShiftHistory,
    logAudit, findVariant, adjustStock, nextBarcode, completeSale,
    canSeeCosts: role !== "Cashier",
    isCashier: role === "Cashier",
    isOwner: role === "Owner",
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
