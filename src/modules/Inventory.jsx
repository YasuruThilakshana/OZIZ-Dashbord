import { useMemo, useState } from "react";
import {
  ChevronDown, Plus, Pencil, Printer, ArrowLeftRight, Bandage,
  Search, Tag, Check,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { BRANCHES, CATEGORIES, SIZES_APPAREL, SIZES_FOOTWEAR, SIZES_ONESIZE } from "../data/mockData";
import { fmtLKR, fmtLKR0, todayISO, uid } from "../utils/format";
import { Btn, Card, Input, Select, Badge, Modal, Table, Tabs, Empty, Field, TextArea } from "../components/ui";
import { BarcodeVisual } from "./pos/Receipt";

const SIZE_SETS = { Apparel: SIZES_APPAREL, Footwear: SIZES_FOOTWEAR, "One Size": SIZES_ONESIZE };
const PALETTE = [
  { name: "Black", hex: "#18181b" }, { name: "White", hex: "#f4f4f5" }, { name: "Navy", hex: "#22315e" },
  { name: "Grey", hex: "#8a8f98" }, { name: "Beige", hex: "#d9c7a7" }, { name: "Olive", hex: "#5a6b3f" },
  { name: "Maroon", hex: "#6b1f2a" }, { name: "Red", hex: "#c0392b" }, { name: "Sky Blue", hex: "#7fb3d5" },
  { name: "Denim", hex: "#3b5b8c" },
];

export default function Inventory() {
  const { products, branchId, canSeeCosts, logAudit } = useStore();
  const [tab, setTab] = useState("matrix");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(["p1"]);
  const [showProduct, setShowProduct] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showTags, setShowTags] = useState(false);

  const filtered = useMemo(() => products.filter((p) =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.variants.some((v) => v.barcode.toLowerCase().includes(search.toLowerCase()) || v.sku.toLowerCase().includes(search.toLowerCase()))),
    [products, search]);

  const toggle = (id) => setExpanded((e) => e.includes(id) ? e.filter((x) => x !== id) : [...e, id]);

  return (
    <div className="space-y-3 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">Inventory — Size × Color Matrix</h1>
          <p className="text-sm text-slate-500">{products.length} styles · {products.reduce((s, p) => s + p.variants.length, 0)} variants · stock shown for {BRANCHES.find((b) => b.id === branchId)?.short}</p>
        </div>
        <div className="flex-1" />
        <Btn variant="outline" onClick={() => setShowTags(true)}><Printer size={15} /> Barcode / Price Tags</Btn>
        <Btn onClick={() => { setEditing(null); setShowProduct(true); }}><Plus size={15} /> Add Product</Btn>
      </div>

      <Tabs tabs={[
        { id: "matrix", label: "Variant Matrix" },
        { id: "transfers", label: "Branch Transfers" },
        { id: "damaged", label: "Damaged Stock" },
      ]} active={tab} onChange={setTab} />

      {tab === "matrix" && (
        <Card>
          <div className="p-3 border-b border-slate-100 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, barcode…" className="pl-9" />
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const open = expanded.includes(p.id);
              const totalStock = p.variants.reduce((s, v) => s + (v.stock[branchId] || 0), 0);
              return (
                <div key={p.id}>
                  <button onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <ChevronDown size={17} className={`text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`} />
                    <div className="flex gap-1">{p.colors.slice(0, 4).map((c) => <span key={c.name} className="w-4 h-4 rounded-full border border-slate-300" style={{ background: c.hex }} />)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.variants.length} variants · {fmtLKR(p.basePrice, 0)}</p>
                    </div>
                    <Badge tone="slate">{p.category}</Badge>
                    <Badge tone={totalStock <= 5 ? "red" : totalStock <= 20 ? "amber" : "green"}>{totalStock} units</Badge>
                    <span onClick={(e) => { e.stopPropagation(); setEditing(p); setShowProduct(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Pencil size={15} /></span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4">
                      <MatrixTable product={p} />
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <Empty icon={<Search size={20} />} title="No products found" />}
          </div>
        </Card>
      )}

      {tab === "transfers" && <TransferTab />}
      {tab === "damaged" && <DamagedTab />}

      <ProductModal open={showProduct} editing={editing} onClose={() => setShowProduct(false)} />
      <TagGeneratorModal open={showTags} onClose={() => setShowTags(false)} />
    </div>
  );
}

function MatrixTable({ product }) {
  const { branchId, canSeeCosts, adjustStock, logAudit, setProducts } = useStore();
  const [editingStock, setEditingStock] = useState(null); // barcode
  const [stockVal, setStockVal] = useState("");

  const saveStock = (v) => {
    const nv = Math.max(0, parseInt(stockVal, 10) || 0);
    setProducts((ps) => ps.map((p) => p.id === product.id
      ? { ...p, variants: p.variants.map((x) => x.barcode === v.barcode ? { ...x, stock: { ...x.stock, [branchId]: nv } } : x) }
      : p));
    logAudit("Stock Adjusted", `${product.name} ${v.size}/${v.color}: set to ${nv} (${BRANCHES.find((b) => b.id === branchId)?.short})`);
    setEditingStock(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <Table head={["SKU", "Barcode", "Size", "Color", ...(canSeeCosts ? ["Cost"] : []), "Price", `Stock (${BRANCHES.find((b) => b.id === branchId)?.short})`, "All Branches", ""]}>
        {product.variants.map((v) => (
          <tr key={v.barcode} className="hover:bg-slate-50">
            <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
            <td className="px-3 py-2 font-mono text-xs font-bold">{v.barcode}</td>
            <td className="px-3 py-2"><Badge tone="dark">{v.size}</Badge></td>
            <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold"><span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" style={{ background: v.colorHex }} />{v.color}</span></td>
            {canSeeCosts && <td className="px-3 py-2 text-xs">{fmtLKR(v.cost, 0)}</td>}
            <td className="px-3 py-2 text-xs font-bold">{fmtLKR(v.price, 0)}</td>
            <td className="px-3 py-2">
              {editingStock === v.barcode ? (
                <span className="flex items-center gap-1">
                  <input autoFocus type="number" min={0} value={stockVal} onChange={(e) => setStockVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveStock(v)}
                    className="w-16 rounded-md border border-emerald-500 px-1.5 py-1 text-xs font-bold outline-none" />
                  <button onClick={() => saveStock(v)} className="text-emerald-600"><Check size={15} /></button>
                </span>
              ) : (
                <Badge tone={(v.stock[branchId] || 0) === 0 ? "red" : (v.stock[branchId] || 0) <= 2 ? "amber" : "green"}>{v.stock[branchId] || 0}</Badge>
              )}
            </td>
            <td className="px-3 py-2 text-xs text-slate-500">C:{v.stock.b1} · K:{v.stock.b2} · N:{v.stock.b3}</td>
            <td className="px-3 py-2">
              <button title="Adjust stock" onClick={() => { setEditingStock(v.barcode); setStockVal(String(v.stock[branchId] || 0)); }} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 text-xs font-bold">Adjust</button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function ProductModal({ open, editing, onClose }) {
  const { products, setProducts, nextBarcode, logAudit } = useStore();
  const [f, setF] = useState({ name: "", category: "Men", brand: "Oziz", cost: "", price: "", sizeSet: "Apparel", colors: ["Black", "White"], opening: "8" });

  useState(() => {});
  const startEdit = (p) => ({ name: p.name, category: p.category, brand: p.brand, cost: String(p.baseCost), price: String(p.basePrice), sizeSet: p.sizes.length === 1 ? "One Size" : "Apparel", colors: p.colors.map((c) => c.name), opening: "8" });

  // reset when opened
  const [key, setKey] = useState(0);
  const wasOpen = useState(false);
  if (open && !wasOpen[0]) { wasOpen[1](true); setKey((k) => k + 1); setF(editing ? startEdit(editing) : { name: "", category: "Men", brand: "Oziz", cost: "", price: "", sizeSet: "Apparel", colors: ["Black", "White"], opening: "8" }); }
  if (!open && wasOpen[0]) wasOpen[1](false);

  const sizes = SIZE_SETS[f.sizeSet];
  const matrixCount = sizes.length * f.colors.length;

  const toggleColor = (name) => setF((s) => ({ ...s, colors: s.colors.includes(name) ? s.colors.filter((c) => c !== name) : [...s.colors, name] }));

  const save = () => {
    if (!f.name.trim() || !f.cost || !f.price || f.colors.length === 0) return;
    if (editing) {
      setProducts((ps) => ps.map((p) => p.id === editing.id ? {
        ...p, name: f.name.trim(), category: f.category, brand: f.brand, basePrice: +f.price, baseCost: +f.cost,
        variants: p.variants.map((v) => ({ ...v, price: +f.price, cost: +f.cost })),
      } : p));
      logAudit("Product Updated", f.name.trim());
    } else {
      const pid = `p${products.length + 1}`;
      const colorObjs = f.colors.map((n) => PALETTE.find((c) => c.name === n));
      const variants = [];
      colorObjs.forEach((c) => sizes.forEach((s) => {
        const bc = nextBarcode();
        variants.push({
          id: `v${bc}`, sku: `${pid.toUpperCase()}-${c.name.slice(0, 3).toUpperCase()}-${s.replace(/\s/g, "")}`,
          barcode: bc, size: s, color: c.name, colorHex: c.hex, cost: +f.cost, price: +f.price,
          stock: { b1: +f.opening || 0, b2: Math.floor((+f.opening || 0) / 2), b3: Math.floor((+f.opening || 0) / 2) }, lastSoldDaysAgo: 0,
        });
      }));
      setProducts((ps) => [...ps, { id: pid, name: f.name.trim(), category: f.category, brand: f.brand, basePrice: +f.price, baseCost: +f.cost, sizes, colors: colorObjs, variants }]);
      logAudit("Product Created", `${f.name.trim()} — ${variants.length} variants generated`);
    }
    onClose();
  };

  const valid = f.name.trim() && +f.cost > 0 && +f.price > 0 && f.colors.length > 0;

  return (
    <Modal key={key} open={open} onClose={onClose} title={editing ? "Edit Product" : "Add Product — Auto Matrix Generator"} width="max-w-2xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={!valid} onClick={save}>{editing ? "Save Changes" : `Generate ${matrixCount} Variants`}</Btn></>}>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Product Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Oziz Classic Polo Tee" /></Field>
        <Field label="Brand"><Input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Size Set"><Select value={f.sizeSet} onChange={(e) => setF({ ...f, sizeSet: e.target.value })}>{Object.keys(SIZE_SETS).map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Cost Price (Rs) *"><Input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} placeholder="2800" /></Field>
        <Field label="Selling Price (Rs) *"><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="5950" /></Field>
        {!editing && <Field label="Opening Stock per Variant (Colombo)"><Input type="number" value={f.opening} onChange={(e) => setF({ ...f, opening: e.target.value })} /></Field>}
        {editing && <div className="text-xs text-slate-500 self-end pb-2">Price changes apply to all {editing.variants.length} variants. Stock is adjusted per-variant in the matrix.</div>}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">Colors * — matrix preview: {sizes.length} sizes × {f.colors.length} colors = <b>{matrixCount} variants</b> with auto barcodes</p>
        <div className="flex gap-2 flex-wrap">
          {PALETTE.map((c) => (
            <button key={c.name} onClick={() => toggleColor(c.name)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-bold ${f.colors.includes(c.name) ? "border-emerald-600 bg-emerald-50" : "border-slate-200 opacity-70"}`}>
              <span className="w-4 h-4 rounded-full border border-slate-300" style={{ background: c.hex }} />{c.name}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TagGeneratorModal({ open, onClose }) {
  const { products } = useStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState({}); // barcode -> qty
  const [printed, setPrinted] = useState(false);

  const matches = query.trim() ? products.flatMap((p) => p.variants.map((v) => ({ p, v })))
    .filter(({ p, v }) => p.name.toLowerCase().includes(query.toLowerCase()) || v.barcode.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : [];

  const rows = Object.entries(selected).map(([barcode, qty]) => {
    for (const p of products) { const v = p.variants.find((x) => x.barcode === barcode); if (v) return { p, v, qty }; }
    return null;
  }).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Barcode & Price Tag Generator" width="max-w-3xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Close</Btn><Btn variant="dark" disabled={rows.length === 0} onClick={() => { setPrinted(true); window.print(); setTimeout(() => setPrinted(false), 500); }}><Printer size={15} /> Print Tags</Btn></>}>
      <div className="no-print relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search variant to add… (name or barcode)" className="pl-9" />
        {matches.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
            {matches.map(({ p, v }) => (
              <button key={v.barcode} onClick={() => { setSelected((s) => ({ ...s, [v.barcode]: (s[v.barcode] || 0) + 1 })); setQuery(""); }}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-sm font-semibold flex justify-between">
                <span>{p.name} — {v.size}/{v.color} <span className="font-mono text-slate-400">· {v.barcode}</span></span>
                <span className="font-bold">{fmtLKR0(v.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 && <div className="no-print"><Empty icon={<Tag size={20} />} title="No tags queued" hint="Search and add variants above" /></div>}

      <div className="print-area grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {rows.flatMap(({ p, v, qty }) => Array.from({ length: Math.min(qty, 12) }, (_, i) => (
          <div key={`${v.barcode}-${i}`} className="border-2 border-slate-900 rounded-lg p-2.5 text-center bg-white relative">
            <p className="font-extrabold text-[13px] tracking-wide">OZIZ CLOTHING</p>
            <p className="text-[11px] font-semibold truncate">{p.name}</p>
            <p className="text-[11px]">Size: <b>{v.size}</b> · {v.color}</p>
            <p className="font-extrabold text-base">{fmtLKR(v.price, 0)}</p>
            <BarcodeVisual code={v.barcode} height={30} />
            <button onClick={() => setSelected((s) => { const n = { ...s }; delete n[v.barcode]; return n; })}
              className="no-print absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">×</button>
          </div>
        )))}
      </div>
      {rows.length > 0 && (
        <div className="no-print mt-3 space-y-1.5">
          {rows.map(({ p, v, qty }) => (
            <div key={v.barcode} className="flex items-center gap-2 text-sm">
              <span className="font-mono font-bold">{v.barcode}</span>
              <span className="flex-1 truncate text-slate-600">{p.name} · {v.size}/{v.color}</span>
              <label className="text-xs font-bold text-slate-500">Qty:</label>
              <input type="number" min={1} max={12} value={qty} onChange={(e) => setSelected((s) => ({ ...s, [v.barcode]: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-14 rounded-md border border-slate-300 px-1.5 py-1 text-xs font-bold" />
            </div>
          ))}
        </div>
      )}
      {printed && <p className="no-print text-xs font-bold text-emerald-700 mt-2">Sent to printer (simulated print dialog).</p>}
    </Modal>
  );
}

function TransferTab() {
  const { transfers, setTransfers, adjustStock, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ from: "b1", to: "b2", barcode: "OZ-1002", qty: "6", note: "" });
  const [err, setErr] = useState("");

  const advance = (t) => {
    const flow = { Pending: "In-Transit", "In-Transit": "Completed" };
    const next = flow[t.status];
    if (!next) return;
    if (next === "Completed") {
      t.items.forEach((it) => { adjustStock(it.barcode, t.from, -it.qty); adjustStock(it.barcode, t.to, it.qty); });
      logAudit("Transfer Completed", `${t.id}: stock moved ${BRANCHES.find((b) => b.id === t.from)?.short} → ${BRANCHES.find((b) => b.id === t.to)?.short}`);
    } else logAudit("Transfer Updated", `${t.id} → In-Transit`);
    setTransfers((ts) => ts.map((x) => x.id === t.id ? { ...x, status: next } : x));
  };

  const create = () => {
    if (f.from === f.to) { setErr("Source and destination branches must differ."); return; }
    if (!f.barcode.trim() || !(+f.qty > 0)) { setErr("Enter a valid barcode and quantity."); return; }
    const id = `TR-2026-${String(23 + transfers.length).padStart(3, "0")}`;
    setTransfers((ts) => [...ts, { id, from: f.from, to: f.to, date: todayISO(), status: "Pending", items: [{ barcode: f.barcode.trim().toUpperCase(), name: "—", size: "—", color: "—", qty: +f.qty }], note: f.note }]);
    logAudit("Transfer Created", `${id}: ${f.barcode} × ${f.qty}`);
    setShow(false); setErr("");
  };

  const tone = (s) => s === "Completed" ? "green" : s === "In-Transit" ? "blue" : "amber";

  return (
    <Card title="Multi-Branch Stock Transfers" action={<Btn size="sm" onClick={() => setShow(true)}><ArrowLeftRight size={14} /> New Transfer</Btn>}>
      <Table head={["ID", "Route", "Date", "Items", "Note", "Status", ""]}>
        {transfers.map((t) => (
          <tr key={t.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5 font-mono font-bold text-xs">{t.id}</td>
            <td className="px-3 py-2.5 text-xs font-semibold">{BRANCHES.find((b) => b.id === t.from)?.short} → {BRANCHES.find((b) => b.id === t.to)?.short}</td>
            <td className="px-3 py-2.5 text-xs">{t.date}</td>
            <td className="px-3 py-2.5 text-xs">{t.items.map((i) => `${i.barcode} × ${i.qty}`).join(", ")}</td>
            <td className="px-3 py-2.5 text-xs text-slate-500">{t.note}</td>
            <td className="px-3 py-2.5"><Badge tone={tone(t.status)}>{t.status}</Badge></td>
            <td className="px-3 py-2.5">{t.status !== "Completed" && <Btn size="xs" variant="outline" onClick={() => advance(t)}>Mark {t.status === "Pending" ? "In-Transit" : "Completed"}</Btn>}</td>
          </tr>
        ))}
      </Table>
      <Modal open={show} onClose={() => setShow(false)} title="New Stock Transfer" width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn onClick={create}>Create Transfer</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>{BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.short}</option>)}</Select></Field>
          <Field label="To"><Select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.short}</option>)}</Select></Field>
          <Field label="Variant Barcode"><Input value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} className="font-mono uppercase" /></Field>
          <Field label="Quantity"><Input type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Reason for transfer" /></Field></div>
        {err && <p className="text-sm font-semibold text-red-600 mt-3">{err}</p>}
        <p className="text-xs text-slate-500 mt-3">Stock moves only when the transfer is marked <b>Completed</b> (deducts from source, adds to destination).</p>
      </Modal>
    </Card>
  );
}

function DamagedTab() {
  const { damaged, setDamaged, branchId, adjustStock, logAudit } = useStore();
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ barcode: "", name: "", size: "", color: "", qty: "1", reason: "Torn / stitching defect" });

  const record = () => {
    if (!f.barcode.trim() || !(+f.qty > 0)) return;
    adjustStock(f.barcode.trim().toUpperCase(), branchId, -(+f.qty));
    setDamaged((d) => [...d, {
      id: `DM-2026-${String(13 + d.length).padStart(3, "0")}`, date: todayISO(), branchId,
      barcode: f.barcode.trim().toUpperCase(), name: f.name || "—", size: f.size || "—", color: f.color || "—",
      qty: +f.qty, reason: f.reason, reportedBy: "Current User", costValue: 0,
    }]);
    logAudit("Damaged Stock Recorded", `${f.barcode} × ${f.qty} — ${f.reason}`);
    setShow(false);
    setF({ barcode: "", name: "", size: "", color: "", qty: "1", reason: "Torn / stitching defect" });
  };

  return (
    <Card title="Damaged / Defective Stock Ledger" action={<Btn size="sm" variant="danger" onClick={() => setShow(true)}><Bandage size={14} /> Record Damaged Item</Btn>}>
      <Table head={["ID", "Date", "Branch", "Barcode", "Item", "Qty", "Reason", "Reported By", "Cost Value"]}>
        {damaged.map((d) => (
          <tr key={d.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5 font-mono font-bold text-xs">{d.id}</td>
            <td className="px-3 py-2.5 text-xs">{d.date}</td>
            <td className="px-3 py-2.5 text-xs">{BRANCHES.find((b) => b.id === d.branchId)?.short}</td>
            <td className="px-3 py-2.5 font-mono text-xs">{d.barcode}</td>
            <td className="px-3 py-2.5 text-xs font-semibold">{d.name} · {d.size}/{d.color}</td>
            <td className="px-3 py-2.5 text-xs font-bold">{d.qty}</td>
            <td className="px-3 py-2.5 text-xs">{d.reason}</td>
            <td className="px-3 py-2.5 text-xs">{d.reportedBy}</td>
            <td className="px-3 py-2.5 text-xs">{d.costValue ? fmtLKR0(d.costValue) : "—"}</td>
          </tr>
        ))}
      </Table>
      <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">Damaged quantities are removed from sellable inventory immediately and never return to stock.</p>
      <Modal open={show} onClose={() => setShow(false)} title="Record Damaged Stock" width="max-w-md"
        footer={<><Btn variant="ghost" onClick={() => setShow(false)}>Cancel</Btn><Btn variant="danger" onClick={record}>Remove from Stock</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Variant Barcode *"><Input value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} className="font-mono uppercase" placeholder="OZ-10.." /></Field>
          <Field label="Quantity *"><Input type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
          <Field label="Item Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Size / Color"><Input value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} placeholder="M / Navy" /></Field>
        </div>
        <div className="mt-3"><Field label="Reason"><Select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
          <option>Torn / stitching defect</option><option>Stained in storage</option><option>Customer return - unwearable</option><option>Faded / sun damage</option><option>Missing buttons / trims</option>
        </Select></Field></div>
      </Modal>
    </Card>
  );
}
