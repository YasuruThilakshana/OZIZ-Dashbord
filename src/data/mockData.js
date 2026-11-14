// ─── Oziz Clothing · seed data (LKR) ─────────────────────────────────────────

export const BRANCHES = [
  { id: "b1", name: "Oziz Flagship - Colombo", short: "Colombo", address: "42 Galle Road, Colombo 03", phone: "011 234 5678" },
  { id: "b2", name: "Oziz Kandy Branch", short: "Kandy", address: "18 Dalada Veediya, Kandy", phone: "081 222 3344" },
  { id: "b3", name: "Oziz Negombo Branch", short: "Negombo", address: "7 Lewis Place, Negombo", phone: "031 222 8899" },
];

export const SIZES_APPAREL = ["S", "M", "L", "XL", "XXL"];
export const SIZES_FOOTWEAR = ["39", "40", "41", "42", "43", "44"];
export const SIZES_ONESIZE = ["One Size"];

export const CATEGORIES = ["Men", "Women", "Kids", "Footwear", "Accessories"];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 997;
  return h;
}

// Deterministic pseudo stock so every reload is stable
function stockFor(key, branchIdx) {
  const h = hash(key + branchIdx);
  return 2 + (h % 11); // 2..12
}
function daysFor(key) {
  return hash("d" + key) % 50; // 0..49 days
}

let barcodeSeq = 1000;
function buildVariants(pid, sizes, colors, cost, price, lowKeys = [], deadKeys = []) {
  const out = [];
  for (const c of colors) {
    for (const s of sizes) {
      barcodeSeq += 1;
      const key = `${pid}-${c.name}-${s}`;
      const isLow = lowKeys.includes(`${c.name}:${s}`);
      const isDead = deadKeys.includes(`${c.name}:${s}`);
      out.push({
        id: `v${barcodeSeq}`,
        sku: `${pid.toUpperCase()}-${c.name.slice(0, 3).toUpperCase()}-${s.replace(/\s/g, "")}`,
        barcode: `OZ-${barcodeSeq}`,
        size: s,
        color: c.name,
        colorHex: c.hex,
        cost,
        price,
        stock: {
          b1: isLow ? 1 : stockFor(key, 1),
          b2: isLow ? 0 : stockFor(key, 2),
          b3: stockFor(key, 3),
        },
        lastSoldDaysAgo: isDead ? 65 + (hash(key) % 40) : daysFor(key),
      });
    }
  }
  return out;
}

const NAVY = { name: "Navy", hex: "#22315e" };
const WHITE = { name: "White", hex: "#f4f4f5" };
const BLACK = { name: "Black", hex: "#18181b" };
const OLIVE = { name: "Olive", hex: "#5a6b3f" };
const MAROON = { name: "Maroon", hex: "#6b1f2a" };
const SKY = { name: "Sky Blue", hex: "#7fb3d5" };
const BEIGE = { name: "Beige", hex: "#d9c7a7" };
const RED = { name: "Red", hex: "#c0392b" };
const GREY = { name: "Grey", hex: "#8a8f98" };
const DENIM = { name: "Denim", hex: "#3b5b8c" };

export function seedProducts() {
  barcodeSeq = 1000;
  return [
    { id: "p1", name: "Oziz Signature Oxford Shirt", category: "Men", brand: "Oziz", basePrice: 5950, baseCost: 2900, sizes: SIZES_APPAREL, colors: [WHITE, SKY, NAVY],
      variants: buildVariants("p1", SIZES_APPAREL, [WHITE, SKY, NAVY], 2900, 5950, ["Sky Blue:M"], []) },
    { id: "p2", name: "Oziz Premium Linen Shirt", category: "Men", brand: "Oziz", basePrice: 7450, baseCost: 3600, sizes: SIZES_APPAREL, colors: [BEIGE, WHITE, OLIVE],
      variants: buildVariants("p2", SIZES_APPAREL, [BEIGE, WHITE, OLIVE], 3600, 7450, ["Olive:XL"], []) },
    { id: "p3", name: "Oziz Slim-Fit Chino Trousers", category: "Men", brand: "Oziz", basePrice: 6900, baseCost: 3300, sizes: SIZES_APPAREL, colors: [NAVY, BEIGE, BLACK],
      variants: buildVariants("p3", SIZES_APPAREL, [NAVY, BEIGE, BLACK], 3300, 6900, ["Navy:L"], []) },
    { id: "p4", name: "Oziz Classic Denim Jeans", category: "Men", brand: "Oziz", basePrice: 8950, baseCost: 4300, sizes: SIZES_APPAREL, colors: [DENIM, BLACK],
      variants: buildVariants("p4", SIZES_APPAREL, [DENIM, BLACK], 4300, 8950, [], []) },
    { id: "p5", name: "Oziz Floral Summer Dress", category: "Women", brand: "Oziz", basePrice: 7950, baseCost: 3800, sizes: SIZES_APPAREL, colors: [MAROON, NAVY],
      variants: buildVariants("p5", SIZES_APPAREL, [MAROON, NAVY], 3800, 7950, ["Maroon:S"], []) },
    { id: "p6", name: "Oziz Essential Crew Tee", category: "Women", brand: "Oziz", basePrice: 2950, baseCost: 1350, sizes: SIZES_APPAREL, colors: [WHITE, BLACK, GREY, RED],
      variants: buildVariants("p6", SIZES_APPAREL, [WHITE, BLACK, GREY, RED], 1350, 2950, [], []) },
    { id: "p7", name: "Oziz Kids Graphic Tee", category: "Kids", brand: "Oziz Kids", basePrice: 2450, baseCost: 1100, sizes: SIZES_APPAREL, colors: [RED, SKY, NAVY],
      variants: buildVariants("p7", SIZES_APPAREL, [RED, SKY, NAVY], 1100, 2450, ["Red:S"], []) },
    { id: "p8", name: "Oziz Kids Denim Shorts", category: "Kids", brand: "Oziz Kids", basePrice: 3450, baseCost: 1600, sizes: SIZES_APPAREL, colors: [DENIM],
      variants: buildVariants("p8", SIZES_APPAREL, [DENIM], 1600, 3450, [], []) },
    { id: "p9", name: "Oziz Urban Sneakers", category: "Footwear", brand: "Oziz", basePrice: 12950, baseCost: 6800, sizes: SIZES_FOOTWEAR, colors: [WHITE, BLACK, GREY],
      variants: buildVariants("p9", SIZES_FOOTWEAR, [WHITE, BLACK, GREY], 6800, 12950, ["White:42"], []) },
    { id: "p10", name: "Oziz Full-Grain Leather Belt", category: "Accessories", brand: "Oziz", basePrice: 2950, baseCost: 1200, sizes: SIZES_ONESIZE, colors: [BLACK, MAROON],
      variants: buildVariants("p10", SIZES_ONESIZE, [BLACK, MAROON], 1200, 2950, [], []) },
    { id: "p11", name: "Oziz Everyday Canvas Tote", category: "Accessories", brand: "Oziz", basePrice: 2450, baseCost: 950, sizes: SIZES_ONESIZE, colors: [BEIGE, BLACK],
      variants: buildVariants("p11", SIZES_ONESIZE, [BEIGE, BLACK], 950, 2450, [], ["Beige:One Size"]) },
    { id: "p12", name: "Oziz Heritage Silk Scarf", category: "Accessories", brand: "Oziz", basePrice: 3950, baseCost: 1700, sizes: SIZES_ONESIZE, colors: [RED, BEIGE, NAVY],
      variants: buildVariants("p12", SIZES_ONESIZE, [RED, BEIGE, NAVY], 1700, 3950, [], ["Red:One Size", "Navy:One Size"]) },
  ];
}

export const STAFF = [
  { id: "st1", name: "Ozair Ahmed", role: "Owner", pin: "0000", phone: "077 900 1001", active: true },
  { id: "st2", name: "Sanduni Fernando", role: "Store Manager", pin: "1111", phone: "077 900 1002", active: true },
  { id: "st3", name: "Kasun Bandara", role: "Cashier", pin: "2222", phone: "077 900 1003", active: true },
  { id: "st4", name: "Nadeesha Silva", role: "Cashier", pin: "3333", phone: "077 900 1004", active: true },
  { id: "st5", name: "Ruwan Jayasuriya", role: "Salesman", pin: "4444", phone: "077 900 1005", active: true, commissionRate: 2 },
  { id: "st6", name: "Ishara Kumari", role: "Salesman", pin: "5555", phone: "077 900 1006", active: true, commissionRate: 2.5 },
];

export function seedCustomers() {
  return [
    { id: "c1", name: "Nimal Perera", phone: "0771234567", email: "nimal.p@gmail.com", birthday: "1988-11-22", tier: "Gold", points: 1250, totalSpend: 248500, joined: "2023-05-10", notes: "Prefers slim-fit shirts. Size M." },
    { id: "c2", name: "Amaya Wickramasinghe", phone: "0719876543", email: "amaya.w@gmail.com", birthday: "1995-03-08", tier: "Platinum", points: 3420, totalSpend: 612750, joined: "2022-11-01", notes: "VIP. Notify on new dress arrivals." },
    { id: "c3", name: "Mohamed Rizvi", phone: "0765554433", email: "rizvi.m@gmail.com", birthday: "1990-07-30", tier: "Silver", points: 420, totalSpend: 88400, joined: "2024-02-18", notes: "" },
    { id: "c4", name: "Chamari Jayawardena", phone: "0781112233", email: "chamari.j@gmail.com", birthday: "1999-11-05", tier: "Gold", points: 980, totalSpend: 196200, joined: "2023-09-25", notes: "Birthday November — send voucher." },
    { id: "c5", name: "Suresh Rajan", phone: "0777778899", email: "suresh.r@gmail.com", birthday: "1985-12-17", tier: "Silver", points: 150, totalSpend: 42300, joined: "2025-06-12", notes: "" },
    { id: "c6", name: "Dilini Gunasekara", phone: "0703344556", email: "dilini.g@gmail.com", birthday: "1993-01-27", tier: "Platinum", points: 5110, totalSpend: 884900, joined: "2022-04-03", notes: "Wholesale buyer for boutique." },
    { id: "c7", name: "Lakmal Herath", phone: "0712223344", email: "lakmal.h@gmail.com", birthday: "2001-08-11", tier: "Silver", points: 60, totalSpend: 15900, joined: "2026-01-20", notes: "" },
    { id: "c8", name: "Fatima Nazeer", phone: "0776661122", email: "fatima.n@gmail.com", birthday: "1997-05-19", tier: "Gold", points: 1730, totalSpend: 331600, joined: "2023-12-08", notes: "Kids wear regular." },
  ];
}

export function seedSuppliers() {
  return [
    { id: "sup1", name: "Lanka Textile Mills (Pvt) Ltd", contact: "Mr. De Silva", phone: "011 555 0101", email: "orders@lankatextile.lk", address: "Biyagama Export Zone", creditBalance: 485000, paymentTerms: "30 days" },
    { id: "sup2", name: "Colombo Garments Co.", contact: "Mrs. Peris", phone: "011 555 0202", email: "sales@colombogarments.lk", address: "Grandpass, Colombo 14", creditBalance: 132750, paymentTerms: "14 days" },
    { id: "sup3", name: "Kandy Fabrics & Trims", contact: "Mr. Rathnayake", phone: "081 555 0303", email: "info@kandyfabrics.lk", address: "Peradeniya Road, Kandy", creditBalance: 0, paymentTerms: "Cash on delivery" },
    { id: "sup4", name: "Global Footwear Sourcing", contact: "Ms. Chen", phone: "011 555 0404", email: "lk@globalfootwear.com", address: "World Trade Center, Colombo 01", creditBalance: 926000, paymentTerms: "45 days" },
  ];
}

// Invoice item snapshots keyed by barcode so exchange/restock always resolves.
export function seedInvoices() {
  return [
    {
      id: "INV-2026-001", date: "2026-11-14", time: "09:41 AM", branchId: "b1", cashierId: "st3", salesmanId: "st5",
      customerId: "c1", status: "Completed",
      items: [
        { barcode: "OZ-1002", name: "Oziz Signature Oxford Shirt", size: "M", color: "White", qty: 2, unitPrice: 5950, cost: 2900, discount: 0 },
        { barcode: "OZ-1124", name: "Oziz Full-Grain Leather Belt", size: "One Size", color: "Black", qty: 1, unitPrice: 2950, cost: 1200, discount: 150 },
      ],
      payments: [{ method: "Cash", amount: 14700 }], pointsRedeemed: 0, pointsEarned: 147, voucherCode: null,
    },
    {
      id: "INV-2026-002", date: "2026-11-14", time: "10:15 AM", branchId: "b1", cashierId: "st3", salesmanId: "st6",
      customerId: "c2", status: "Completed",
      items: [
        { barcode: "OZ-1062", name: "Oziz Floral Summer Dress", size: "M", color: "Navy", qty: 1, unitPrice: 7950, cost: 3800, discount: 795 },
        { barcode: "OZ-1072", name: "Oziz Essential Crew Tee", size: "M", color: "Black", qty: 3, unitPrice: 2950, cost: 1350, discount: 0 },
      ],
      payments: [{ method: "Card", amount: 12005 }, { method: "Loyalty Points", amount: 4000 }], pointsRedeemed: 800, pointsEarned: 120, voucherCode: null,
    },
    {
      id: "INV-2026-003", date: "2026-11-14", time: "11:02 AM", branchId: "b1", cashierId: "st4", salesmanId: "st5",
      customerId: null, status: "Completed",
      items: [
        { barcode: "OZ-1109", name: "Oziz Urban Sneakers", size: "42", color: "White", qty: 1, unitPrice: 12950, cost: 6800, discount: 0 },
      ],
      payments: [{ method: "LankaQR", amount: 12950 }], pointsRedeemed: 0, pointsEarned: 0, voucherCode: null,
    },
    {
      id: "INV-2026-004", date: "2026-11-14", time: "12:26 PM", branchId: "b2", cashierId: "st4", salesmanId: "st6",
      customerId: "c4", status: "Completed",
      items: [
        { barcode: "OZ-1033", name: "Oziz Slim-Fit Chino Trousers", size: "L", color: "Navy", qty: 1, unitPrice: 6900, cost: 3300, discount: 0 },
        { barcode: "OZ-1017", name: "Oziz Premium Linen Shirt", size: "M", color: "Beige", qty: 1, unitPrice: 7450, cost: 3600, discount: 0 },
      ],
      payments: [{ method: "Cash", amount: 5000 }, { method: "Card", amount: 9350 }], pointsRedeemed: 0, pointsEarned: 143, voucherCode: null,
    },
    {
      id: "INV-2026-005", date: "2026-11-13", time: "03:12 PM", branchId: "b1", cashierId: "st3", salesmanId: "st5",
      customerId: "c8", status: "Completed",
      items: [
        { barcode: "OZ-1086", name: "Oziz Kids Graphic Tee", size: "S", color: "Red", qty: 2, unitPrice: 2450, cost: 1100, discount: 0 },
        { barcode: "OZ-1102", name: "Oziz Kids Denim Shorts", size: "M", color: "Denim", qty: 2, unitPrice: 3450, cost: 1600, discount: 345 },
      ],
      payments: [{ method: "Card", amount: 11455 }], pointsRedeemed: 0, pointsEarned: 114, voucherCode: null,
    },
    {
      id: "INV-2026-006", date: "2026-11-13", time: "05:48 PM", branchId: "b1", cashierId: "st4", salesmanId: "st6",
      customerId: "c6", status: "Completed",
      items: [
        { barcode: "OZ-1048", name: "Oziz Classic Denim Jeans", size: "L", color: "Denim", qty: 4, unitPrice: 8950, cost: 4300, discount: 1790 },
      ],
      payments: [{ method: "Gift Voucher", amount: 5000, code: "OZV-5001" }, { method: "Card", amount: 29010 }], pointsRedeemed: 0, pointsEarned: 340, voucherCode: "OZV-5001",
    },
    {
      id: "INV-2026-007", date: "2026-11-13", time: "06:20 PM", branchId: "b3", cashierId: "st3", salesmanId: "st5",
      customerId: null, status: "Refunded",
      items: [
        { barcode: "OZ-1068", name: "Oziz Essential Crew Tee", size: "L", color: "White", qty: 1, unitPrice: 2950, cost: 1350, discount: 0 },
      ],
      payments: [{ method: "Cash", amount: 2950 }], pointsRedeemed: 0, pointsEarned: 0, voucherCode: null,
    },
    {
      id: "INV-2026-008", date: "2026-11-12", time: "02:05 PM", branchId: "b1", cashierId: "st3", salesmanId: "st5",
      customerId: "c3", status: "Completed",
      items: [
        { barcode: "OZ-1006", name: "Oziz Signature Oxford Shirt", size: "S", color: "Sky Blue", qty: 1, unitPrice: 5950, cost: 2900, discount: 0 },
        { barcode: "OZ-1126", name: "Oziz Everyday Canvas Tote", size: "One Size", color: "Beige", qty: 1, unitPrice: 2450, cost: 950, discount: 0 },
      ],
      payments: [{ method: "Cash", amount: 8400 }], pointsRedeemed: 0, pointsEarned: 84, voucherCode: null,
    },
  ];
}

export function seedVouchers() {
  return [
    { code: "OZV-5001", type: "Gift Voucher", value: 5000, balance: 0, issuedTo: "Dilini Gunasekara", issuedDate: "2026-10-20", expiryDate: "2027-04-20", status: "Redeemed", history: [{ date: "2026-11-13", action: "Redeemed Rs. 5,000 on INV-2026-006" }] },
    { code: "OZV-5002", type: "Gift Voucher", value: 10000, balance: 10000, issuedTo: "Amaya Wickramasinghe", issuedDate: "2026-11-02", expiryDate: "2027-05-02", status: "Active", history: [{ date: "2026-11-02", action: "Issued Rs. 10,000" }] },
    { code: "OZV-2501", type: "Gift Voucher", value: 2500, balance: 2500, issuedTo: "Walk-in", issuedDate: "2026-11-10", expiryDate: "2027-05-10", status: "Active", history: [{ date: "2026-11-10", action: "Issued Rs. 2,500" }] },
    { code: "CN-3001", type: "Credit Note", value: 3450, balance: 3450, issuedTo: "Nimal Perera", issuedDate: "2026-11-09", expiryDate: "2027-02-09", status: "Active", history: [{ date: "2026-11-09", action: "Issued from exchange on INV-2026-008" }] },
  ];
}

export function seedExpenses() {
  return [
    { id: "ex1", date: "2026-11-14", branchId: "b1", category: "Tea & Refreshments", description: "Staff tea + biscuits", amount: 1850, paidBy: "Cash", staff: "Sanduni Fernando" },
    { id: "ex2", date: "2026-11-14", branchId: "b1", category: "Packaging", description: "500 branded paper bags", amount: 12500, paidBy: "Bank Transfer", staff: "Sanduni Fernando" },
    { id: "ex3", date: "2026-11-14", branchId: "b1", category: "Transport", description: "Delivery tuk - Kandy transfer", amount: 4500, paidBy: "Cash", staff: "Kasun Bandara" },
    { id: "ex4", date: "2026-11-13", branchId: "b1", category: "Electricity", description: "CEB partial bill October", amount: 28750, paidBy: "Bank Transfer", staff: "Sanduni Fernando" },
    { id: "ex5", date: "2026-11-13", branchId: "b2", category: "Tea & Refreshments", description: "Staff refreshments", amount: 1200, paidBy: "Cash", staff: "Nadeesha Silva" },
  ];
}

export function seedPOs() {
  return [
    { id: "PO-2026-101", supplierId: "sup1", date: "2026-11-08", expectedDate: "2026-11-20", status: "Partially Received",
      lines: [
        { product: "Oziz Signature Oxford Shirt", detail: "White / assorted sizes", qty: 120, unitCost: 2900 },
        { product: "Oziz Premium Linen Shirt", detail: "Beige / assorted sizes", qty: 60, unitCost: 3600 },
      ] },
    { id: "PO-2026-102", supplierId: "sup4", date: "2026-11-11", expectedDate: "2026-12-05", status: "Sent",
      lines: [{ product: "Oziz Urban Sneakers", detail: "White/Black / 39-44", qty: 72, unitCost: 6800 }] },
  ];
}

export function seedGRNs() {
  return [
    { id: "GRN-2026-077", poId: "PO-2026-101", supplierId: "sup1", date: "2026-11-12", branchId: "b1", receivedBy: "Sanduni Fernando",
      lines: [{ product: "Oziz Signature Oxford Shirt", detail: "White / assorted sizes", qty: 120, unitCost: 2900, sellPrice: 5950 }],
      total: 348000, status: "Posted to Inventory" },
  ];
}

export function seedPromotions() {
  return [
    { id: "promo1", name: "Buy 2 Get 1 Free", description: "Cheapest item free when cart has 3+ apparel items", type: "b2g1", enabled: true },
    { id: "promo2", name: "Seasonal 10% Off", description: "Auto 10% off on bills above Rs. 10,000", type: "threshold10", threshold: 10000, percent: 10, enabled: true },
    { id: "promo3", name: "Kids Week 5% Off", description: "Extra 5% off all Kids category lines", type: "category5", category: "Kids", percent: 5, enabled: false },
  ];
}

export function seedTransfers() {
  return [
    { id: "TR-2026-021", from: "b1", to: "b2", date: "2026-11-13", status: "In-Transit", items: [{ barcode: "OZ-1002", name: "Oziz Signature Oxford Shirt", size: "M", color: "White", qty: 12 }], note: "Festival season top-up" },
    { id: "TR-2026-022", from: "b1", to: "b3", status: "Pending", items: [{ barcode: "OZ-1109", name: "Oziz Urban Sneakers", size: "42", color: "White", qty: 6 }], note: "Weekend demand", date: "2026-11-14" },
  ];
}

export function seedDamaged() {
  return [
    { id: "DM-2026-011", date: "2026-11-10", branchId: "b1", barcode: "OZ-1068", name: "Oziz Essential Crew Tee", size: "L", color: "White", qty: 2, reason: "Stained in storage", reportedBy: "Kasun Bandara", costValue: 2700 },
    { id: "DM-2026-012", date: "2026-11-12", branchId: "b2", barcode: "OZ-1006", name: "Oziz Signature Oxford Shirt", size: "S", color: "Sky Blue", qty: 1, reason: "Torn sleeve - customer return", reportedBy: "Nadeesha Silva", costValue: 2900 },
  ];
}

export function seedAudit() {
  return [
    { id: "a1", ts: "2026-11-14 09:05 AM", user: "Sanduni Fernando", role: "Store Manager", action: "Shift Opened", detail: "Opening float Rs. 50,000 - Colombo" },
    { id: "a2", ts: "2026-11-14 10:15 AM", user: "Kasun Bandara", role: "Cashier", action: "Manual Discount Applied", detail: "Rs. 795 on INV-2026-002 (manager approved)" },
    { id: "a3", ts: "2026-11-13 06:22 PM", user: "Sanduni Fernando", role: "Store Manager", action: "Bill Voided", detail: "INV-2026-007 voided - wrong size billed" },
    { id: "a4", ts: "2026-11-12 02:40 PM", user: "Sanduni Fernando", role: "Store Manager", action: "Stock Adjusted", detail: "GRN-2026-077 posted: +120 Oxford Shirts" },
    { id: "a5", ts: "2026-11-13 09:02 PM", user: "Sanduni Fernando", role: "Store Manager", action: "Shift Closed", detail: "Z-Report: expected Rs. 214,300 / counted Rs. 214,300" },
  ];
}

export const EXPENSE_CATEGORIES = ["Tea & Refreshments", "Electricity", "Water", "Rent", "Packaging", "Transport", "Salaries", "Maintenance", "Marketing", "Other"];

export const PAYMENT_METHODS = ["Cash", "Card", "LankaQR", "Gift Voucher", "Loyalty Points", "Credit Note", "Bank Transfer"];
