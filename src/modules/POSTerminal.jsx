import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanBarcode, Search, Minus, Plus, Trash2, UserPlus, PauseCircle, Play,
  BadgePercent, ShoppingCart, X, Phone, User, Tag, CircleAlert, Eraser,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { CATEGORIES, STAFF } from "../data/mockData";
import { fmtLKR, fmtLKR0, todayISO, uid } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Modal, Drawer, Toggle, Empty, Field } from "../components/ui";
import CheckoutModal from "./pos/CheckoutModal";
import Receipt from "./pos/Receipt";

export default function POSTerminal() {
  const {
    products, branchId, customers, setCustomers, promotions, setPromotions,
    heldBills, setHeldBills, clearance, completeSale, logAudit, shift,
  } = useStore();

  const [barcode, setBarcode] = useState("");
  const [scanMsg, setScanMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [salesmanId, setSalesmanId] = useState("");
  const [variantFor, setVariantFor] = useState(null); // product for selector
  const [selSize, setSelSize] = useState("");
  const [selColor, setSelColor] = useState("");
  const [showHeld, setShowHeld] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const scanRef = useRef(null);

  useEffect(() => { scanRef.current?.focus(); }, []);

  const customer = customers.find((c) => c.id === customerId) || null;
  const salesmen = STAFF.filter((s) => s.role === "Salesman");

  // ── catalog ─────────────────────────────────────────────────────────
  const catalog = useMemo(() => products.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase() === q ||
      p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.barcode.toLowerCase() === q || v.color.toLowerCase().includes(q));
  }), [products, category, search]);

  const stockOf = (v) => v.stock[branchId] || 0;
  const cartQty = (barcode) => cart.find((l) => l.barcode === barcode)?.qty || 0;

  const addVariant = (product, variant, qty = 1) => {
    const avail = stockOf(variant) - cartQty(variant.barcode);
    if (avail < qty) {
      setScanMsg({ ok: false, text: `Only ${stockOf(variant) - cartQty(variant.barcode)} left: ${product.name} (${variant.size}/${variant.color})` });
      return false;
    }
    setCart((c) => {
      const ex = c.find((l) => l.barcode === variant.barcode);
      if (ex) return c.map((l) => l.barcode === variant.barcode ? { ...l, qty: l.qty + qty } : l);
      return [...c, {
        barcode: variant.barcode, name: product.name, size: variant.size, color: variant.color,
        colorHex: variant.colorHex, unitPrice: variant.price, cost: variant.cost, qty,
        discountVal: 0, discountMode: "lkr", category: product.category,
      }];
    });
    return true;
  };

  const scan = () => {
    const code = barcode.trim().toUpperCase();
    if (!code) return;
    let found = null;
    for (const p of products) { const v = p.variants.find((x) => x.barcode.toUpperCase() === code); if (v) { found = { p, v }; break; } }
    if (!found) {
      setScanMsg({ ok: false, text: `Barcode ${code} not found. Try OZ-1001…OZ-1130.` });
    } else if (addVariant(found.p, found.v)) {
      setScanMsg({ ok: true, text: `Added ${found.p.name} (${found.v.size}/${found.v.color})` });
    }
    setBarcode("");
    setTimeout(() => setScanMsg(null), 2800);
  };

  // ── totals ──────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const gross = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const lineDisc = cart.reduce((s, l) => s + (l.discountMode === "pct" ? l.unitPrice * l.qty * (l.discountVal / 100) : Number(l.discountVal) || 0), 0);
    let promoDisc = 0;
    const promoLines = [];
    const b2g1 = promotions.find((p) => p.type === "b2g1");
    const th = promotions.find((p) => p.type === "threshold10");
    const cat5 = promotions.find((p) => p.type === "category5");
    const totalQty = cart.reduce((s, l) => s + l.qty, 0);
    if (b2g1?.enabled && totalQty >= 3 && cart.length > 0) {
      const cheapest = Math.min(...cart.map((l) => l.unitPrice));
      promoDisc += cheapest;
      promoLines.push({ name: "Buy 2 Get 1 Free", amount: cheapest });
    }
    if (cat5?.enabled) {
      const kidsBase = cart.filter((l) => l.category === cat5.category).reduce((s, l) => s + l.unitPrice * l.qty, 0);
      if (kidsBase > 0) { const d = kidsBase * (cat5.percent / 100); promoDisc += d; promoLines.push({ name: `${cat5.name} (${cat5.percent}%)`, amount: d }); }
    }
    const afterLine = gross - lineDisc - promoDisc;
    if (th?.enabled && afterLine > th.threshold) {
      const d = afterLine * (th.percent / 100); promoDisc += d; promoLines.push({ name: `${th.name} (${th.percent}%)`, amount: d });
    }
    let clearanceDisc = 0;
    cart.forEach((l) => {
      const c = clearance.find((x) => x.barcode === l.barcode);
      if (c) clearanceDisc += l.unitPrice * l.qty * (c.percent / 100);
    });
    if (clearanceDisc > 0) promoLines.push({ name: "Clearance discounts", amount: clearanceDisc });
    const net = Math.max(0, gross - lineDisc - promoDisc - clearanceDisc);
    return { gross, lineDisc, promoDisc: promoDisc + clearanceDisc, promoLines, net: Math.round(net * 100) / 100 };
  }, [cart, promotions, clearance]);

  const togglePromo = (id) => {
    setPromotions((ps) => ps.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
    const p = promotions.find((x) => x.id === id);
    logAudit("Promotion Toggled", `${p.name} → ${p.enabled ? "OFF" : "ON"}`);
  };

  // ── held bills ──────────────────────────────────────────────────────
  const parkBill = () => {
    if (cart.length === 0) return;
    setHeldBills((h) => [...h, { id: uid("HOLD"), at: new Date().toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" }), cart, customerId, salesmanId, net: totals.net }]);
    setCart([]); setCustomerId(""); setCustomerQuery(""); setSalesmanId("");
    logAudit("Bill Parked", `Cart parked (${cart.length} lines)`);
  };
  const recallBill = (id) => {
    const h = heldBills.find((x) => x.id === id);
    if (!h) return;
    setCart(h.cart); setCustomerId(h.customerId); setSalesmanId(h.salesmanId);
    const c = customers.find((x) => x.id === h.customerId);
    setCustomerQuery(c ? `${c.name} · ${c.phone}` : "");
    setHeldBills((list) => list.filter((x) => x.id !== id));
    setShowHeld(false);
  };

  const voidCart = () => {
    if (cart.length === 0) return;
    logAudit("Bill Voided", `Cart voided (${cart.length} lines, ${fmtLKR0(totals.net)})`);
    setCart([]); setCustomerId(""); setCustomerQuery("");
  };

  const finishSale = (payments, voucherUses, pointsRedeemed) => {
    const items = cart.map((l) => ({
      barcode: l.barcode, name: l.name, size: l.size, color: l.color, qty: l.qty,
      unitPrice: l.unitPrice, cost: l.cost,
      discount: Math.round((l.discountMode === "pct" ? l.unitPrice * l.qty * (l.discountVal / 100) : Number(l.discountVal) || 0) * 100) / 100,
    }));
    const inv = completeSale({ items, customerId: customerId || null, salesmanId: salesmanId || null, payments, promoDiscount: Math.round(totals.promoDisc * 100) / 100, pointsRedeemed, voucherUses });
    setLastInvoice(inv);
    setShowCheckout(false);
    setCart([]); setCustomerId(""); setCustomerQuery(""); setSalesmanId("");
  };

  const openVariant = (p) => {
    setVariantFor(p);
    const inStock = p.variants.filter((v) => stockOf(v) > 0);
    setSelSize(inStock[0]?.size || p.variants[0].size);
    setSelColor(inStock[0]?.color || p.variants[0].color);
  };
  const chosenVariant = variantFor?.variants.find((v) => v.size === selSize && v.color === selColor);

  const matchedCustomers = customerQuery.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(customerQuery.toLowerCase()) || c.phone.includes(customerQuery)).slice(0, 5)
    : [];

  return (
    <div className="grid xl:grid-cols-[1fr_400px] gap-3 items-start max-w-[1500px] mx-auto">
      {/* ── LEFT: catalog ─────────────────────────────────────────── */}
      <div className="space-y-3 min-w-0">
        <Card>
          <div className="p-3 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanBarcode size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input ref={scanRef} value={barcode} onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && scan()}
                  placeholder="Scan barcode… (e.g. OZ-1002, then Enter)"
                  className="w-full rounded-lg border-2 border-emerald-500 bg-emerald-50/50 pl-10 pr-3 py-2.5 text-sm font-mono font-bold outline-none placeholder:font-sans placeholder:font-normal" />
              </div>
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, color…" className="pl-10 py-2.5" />
              </div>
            </div>
            {scanMsg && (
              <p className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 ${scanMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                <CircleAlert size={14} /> {scanMsg.text}
              </p>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {["All", ...CATEGORIES].map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${category === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-2.5">
          {catalog.map((p) => {
            const total = p.variants.reduce((s, v) => s + stockOf(v), 0);
            const sizes = [...new Set(p.variants.filter((v) => stockOf(v) > 0).map((v) => v.size))];
            return (
              <button key={p.id} onClick={() => openVariant(p)}
                className="text-left bg-white rounded-xl border border-slate-200 p-3 shadow-[0_1px_3px_rgba(16,24,40,0.08)] hover:border-emerald-500 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="slate">{p.category}</Badge>
                  <span className={`text-[11px] font-bold ${total <= 5 ? "text-red-600" : "text-slate-500"}`}>{total} in stock</span>
                </div>
                <p className="font-bold text-sm text-slate-900 mt-2 leading-snug min-h-10">{p.name}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  {p.colors.map((c) => (
                    <span key={c.name} title={c.name} className="w-4 h-4 rounded-full border border-slate-300" style={{ background: c.hex }} />
                  ))}
                </div>
                <div className="flex items-end justify-between mt-2">
                  <p className="font-display font-extrabold text-emerald-700">{fmtLKR(p.basePrice, 0)}</p>
                  <p className="text-[10px] font-bold text-slate-400">{sizes.slice(0, 5).join(" · ")}{sizes.length > 5 ? "+" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
        {catalog.length === 0 && <Card><Empty icon={<Search size={20} />} title="No products match" hint="Try another search or category" /></Card>}
      </div>

      {/* ── RIGHT: cart ───────────────────────────────────────────── */}
      <Card className="xl:sticky xl:top-3">
        <div className="p-3 space-y-3">
          {/* customer */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={customer ? `${customer.name} · ${customer.phone}` : customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setCustomerId(""); }}
                  placeholder="Customer phone / name…" className="pl-9" />
                {customer && <button onClick={() => { setCustomerId(""); setCustomerQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={15} /></button>}
              </div>
              <Btn variant="outline" size="sm" onClick={() => setShowQuickAdd(true)} title="Quick add customer"><UserPlus size={15} /></Btn>
            </div>
            {!customer && matchedCustomers.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                {matchedCustomers.map((c) => (
                  <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerQuery(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{c.name} <span className="text-slate-400 font-normal">· {c.phone}</span></span>
                    <Badge tone={c.tier === "Platinum" ? "violet" : c.tier === "Gold" ? "amber" : "slate"}>{c.tier} · {c.points} pts</Badge>
                  </button>
                ))}
              </div>
            )}
            {customer && (
              <div className="flex items-center gap-2 mt-1.5 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                <User size={13} className="text-emerald-700" />
                <b>{customer.tier}</b><span className="text-slate-500">· {customer.points} pts · {fmtLKR0(customer.totalSpend)} lifetime</span>
              </div>
            )}
          </div>

          {/* salesman */}
          <Select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)}>
            <option value="">Salesman: — select —</option>
            {salesmen.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.commissionRate}% commission)</option>)}
          </Select>

          {/* promotions */}
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            {promotions.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5">
                <Toggle checked={p.enabled} onChange={() => togglePromo(p.id)} />
                <div className="min-w-0">
                  <p className="text-xs font-bold flex items-center gap-1"><BadgePercent size={12} className="text-amber-600" /> {p.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{p.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* cart lines */}
          <div className="space-y-2 max-h-64 overflow-y-auto slim-scroll pr-0.5">
            {cart.length === 0 && <Empty icon={<ShoppingCart size={20} />} title="Cart is empty" hint="Scan a barcode or tap a product" />}
            {cart.map((l) => (
              <div key={l.barcode} className="rounded-lg border border-slate-200 p-2.5 bg-white">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full border border-slate-300 shrink-0 mt-0.5" style={{ background: l.colorHex }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug">{l.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge tone="dark">{l.size}</Badge><Badge>{l.color}</Badge>
                      <span className="text-[11px] font-mono text-slate-400">{l.barcode}</span>
                      {clearance.some((c) => c.barcode === l.barcode) && <Badge tone="red"><Tag size={10} /> Clearance −{clearance.find((c) => c.barcode === l.barcode).percent}%</Badge>}
                    </div>
                  </div>
                  <button onClick={() => setCart((c) => c.filter((x) => x.barcode !== l.barcode))} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button onClick={() => setCart((c) => c.map((x) => x.barcode === l.barcode ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="numpad-btn p-1.5 rounded-md hover:bg-white"><Minus size={13} /></button>
                    <span className="w-7 text-center text-sm font-extrabold">{l.qty}</span>
                    <button onClick={() => setCart((c) => c.map((x) => {
                      if (x.barcode !== l.barcode) return x;
                      const v = products.flatMap((p) => p.variants).find((vv) => vv.barcode === l.barcode);
                      return x.qty + 1 > (v?.stock[branchId] || 0) ? x : { ...x, qty: x.qty + 1 };
                    }))} className="numpad-btn p-1.5 rounded-md hover:bg-white"><Plus size={13} /></button>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" min={0} value={l.discountVal} onChange={(e) => setCart((c) => c.map((x) => x.barcode === l.barcode ? { ...x, discountVal: e.target.value } : x))}
                      className="w-16 rounded-md border border-slate-300 px-1.5 py-1 text-xs font-bold outline-none focus:border-emerald-500" placeholder="Disc" title="Item discount" />
                    <button onClick={() => { setCart((c) => c.map((x) => x.barcode === l.barcode ? { ...x, discountMode: x.discountMode === "lkr" ? "pct" : "lkr" } : x)); logAudit("Manual Discount Applied", `${l.name}: discount mode toggled`); }}
                      className="text-[11px] font-extrabold px-1.5 py-1 rounded-md bg-amber-100 text-amber-800" title="Toggle % / Rs">
                      {l.discountMode === "lkr" ? "Rs" : "%"}
                    </button>
                  </div>
                  <p className="text-sm font-extrabold whitespace-nowrap">{fmtLKR(l.unitPrice * l.qty - (l.discountMode === "pct" ? l.unitPrice * l.qty * (l.discountVal / 100) : Number(l.discountVal) || 0), 0)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* totals */}
          <div className="rounded-lg bg-slate-900 text-white p-3 text-sm space-y-1">
            <div className="flex justify-between text-slate-300"><span>Gross ({cart.reduce((s, l) => s + l.qty, 0)} items)</span><span>{fmtLKR(totals.gross)}</span></div>
            {totals.lineDisc > 0 && <div className="flex justify-between text-amber-300"><span>Item discounts</span><span>−{fmtLKR(totals.lineDisc)}</span></div>}
            {totals.promoLines.map((p, i) => <div key={i} className="flex justify-between text-amber-300"><span>{p.name}</span><span>−{fmtLKR(p.amount)}</span></div>)}
            <div className="flex justify-between font-display font-extrabold text-lg pt-1 border-t border-white/15"><span>NET TOTAL</span><span className="text-amber-400">{fmtLKR(totals.net)}</span></div>
          </div>

          {/* actions */}
          <div className="grid grid-cols-3 gap-2">
            <Btn variant="outline" size="sm" onClick={parkBill} disabled={cart.length === 0}><PauseCircle size={14} /> Park</Btn>
            <Btn variant="outline" size="sm" onClick={() => setShowHeld(true)}>Held ({heldBills.length})</Btn>
            <Btn variant="ghost" size="sm" onClick={voidCart} disabled={cart.length === 0} className="text-red-600"><Eraser size={14} /> Void</Btn>
          </div>
          <Btn size="lg" className="w-full text-base" disabled={cart.length === 0} onClick={() => setShowCheckout(true)}>
            <ShoppingCart size={17} /> Charge {fmtLKR(totals.net, 0)}
          </Btn>
          {!shift.open && <p className="text-xs font-bold text-red-600 text-center">Shift is closed — open a shift in Staff &amp; Shifts to sell.</p>}
        </div>
      </Card>

      {/* variant selector */}
      <Modal open={!!variantFor} onClose={() => setVariantFor(null)} title={variantFor?.name || ""} width="max-w-lg"
        footer={<><Btn variant="ghost" onClick={() => setVariantFor(null)}>Cancel</Btn>
          <Btn disabled={!chosenVariant || stockOf(chosenVariant) - cartQty(chosenVariant.barcode) <= 0}
            onClick={() => { if (addVariant(variantFor, chosenVariant)) setVariantFor(null); }}>
            Add to Cart {chosenVariant ? `· ${fmtLKR(chosenVariant.price, 0)}` : ""}
          </Btn></>}>
        {variantFor && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">1 · Color</p>
              <div className="flex gap-2 flex-wrap">
                {variantFor.colors.map((c) => (
                  <button key={c.name} onClick={() => setSelColor(c.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-bold ${selColor === c.name ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}>
                    <span className="w-5 h-5 rounded-full border border-slate-300" style={{ background: c.hex }} />{c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">2 · Size</p>
              <div className="flex gap-2 flex-wrap">
                {variantFor.sizes.map((s) => {
                  const v = variantFor.variants.find((x) => x.size === s && x.color === selColor);
                  const q = v ? stockOf(v) - cartQty(v.barcode) : 0;
                  return (
                    <button key={s} disabled={!v || q <= 0} onClick={() => setSelSize(s)}
                      className={`min-w-12 px-3 py-2.5 rounded-lg border-2 text-sm font-extrabold ${selSize === s ? "border-emerald-600 bg-emerald-50" : "border-slate-200"} ${!v || q <= 0 ? "opacity-35 line-through" : ""}`}>
                      {s}<span className="block text-[10px] font-bold text-slate-400">{v ? `${q} left` : "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {chosenVariant && <p className="text-xs text-slate-500 font-mono">SKU {chosenVariant.sku} · Barcode {chosenVariant.barcode} · {stockOf(chosenVariant)} in branch stock</p>}
          </div>
        )}
      </Modal>

      {/* held bills */}
      <Drawer open={showHeld} onClose={() => setShowHeld(false)} title={`Held Bills (${heldBills.length})`}>
        <div className="space-y-2">
          {heldBills.length === 0 && <Empty icon={<PauseCircle size={20} />} title="No parked bills" />}
          {heldBills.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">{h.id} <span className="text-slate-400 font-normal">· {h.at}</span></p>
                <Badge tone="amber">{fmtLKR0(h.net)}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">{h.cart.length} lines · {customers.find((c) => c.id === h.customerId)?.name || "Walk-in"}</p>
              <div className="flex gap-2 mt-2">
                <Btn size="sm" onClick={() => recallBill(h.id)}><Play size={13} /> Recall</Btn>
                <Btn size="sm" variant="ghost" className="text-red-600" onClick={() => setHeldBills((l) => l.filter((x) => x.id !== h.id))}>Discard</Btn>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* quick add customer */}
      <QuickAddCustomer open={showQuickAdd} onClose={() => setShowQuickAdd(false)}
        onSaved={(c) => { setCustomerId(c.id); setCustomerQuery(""); setShowQuickAdd(false); }} />

      {/* checkout */}
      {showCheckout && (
        <CheckoutModal open={showCheckout} net={totals.net} customer={customer}
          onClose={() => setShowCheckout(false)} onComplete={finishSale} />
      )}

      {/* receipt */}
      <Modal open={!!lastInvoice} onClose={() => setLastInvoice(null)} title={`Sale Complete — ${lastInvoice?.id}`} width="max-w-md">
        {lastInvoice && <Receipt invoice={lastInvoice} customer={customers.find((c) => c.id === lastInvoice.customerId)} onClose={() => setLastInvoice(null)} />}
      </Modal>
    </div>
  );
}

function QuickAddCustomer({ open, onClose, onSaved }) {
  const { customers, setCustomers, logAudit } = useStore();
  const [f, setF] = useState({ name: "", phone: "", email: "", birthday: "" });
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setF({ name: "", phone: "", email: "", birthday: "" }); setErr(""); } }, [open ]);

  const save = () => {
    if (!f.name.trim() || !f.phone.trim()) { setErr("Name and phone are required."); return; }
    if (customers.some((c) => c.phone === f.phone.trim())) { setErr("A customer with this phone already exists."); return; }
    const c = { id: uid("c"), name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), birthday: f.birthday, tier: "Silver", points: 0, totalSpend: 0, joined: todayISO(), notes: "Added at POS" };
    setCustomers((cs) => [...cs, c]);
    logAudit("Customer Added", `${c.name} (${c.phone})`);
    onSaved(c);
  };
  return (
    <Modal open={open} onClose={onClose} title="Quick Add Customer" width="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save}>Save & Select</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Kasun Mendis" /></Field>
        <Field label="Phone *"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="07XXXXXXXX" /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@mail.com" /></Field>
        <Field label="Birthday"><Input type="date" value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} /></Field>
      </div>
      {err && <p className="text-sm font-semibold text-red-600 mt-3">{err}</p>}
    </Modal>
  );
}
