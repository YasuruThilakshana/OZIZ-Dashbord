import { useState } from "react";
import { MessageCircle, Send, Printer, Check } from "lucide-react";
import { BRANCHES } from "../../data/mockData";
import { fmtLKR } from "../../utils/format";
import { Btn } from "../../components/ui";
import { invoiceTotals } from "../../store/StoreContext";

export function BarcodeVisual({ code, height = 44 }) {
  return (
    <div className="text-center">
      <div className="barcode-stripes mx-auto rounded-sm" style={{ height, width: "82%" }} />
      <p className="tracking-[0.3em] text-[11px] font-bold mt-1">{code}</p>
    </div>
  );
}

export default function Receipt({ invoice, customer, onClose }) {
  const [sent, setSent] = useState(null);
  const branch = BRANCHES.find((b) => b.id === invoice.branchId);
  const t = invoiceTotals(invoice);
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const change = Math.max(0, paid - t.net);

  const send = (channel) => {
    setSent(channel);
    setTimeout(() => setSent(null), 2600);
  };

  return (
    <div>
      <div className="print-area receipt-paper mx-auto rounded-lg border border-slate-300 shadow-sm p-5 text-slate-900" style={{ maxWidth: 340 }}>
        <div className="text-center">
          <p className="font-extrabold text-xl tracking-tight">OZIZ CLOTHING</p>
          <p className="text-[11px]">{branch?.name}</p>
          <p className="text-[11px]">{branch?.address}</p>
          <p className="text-[11px]">Tel: {branch?.phone}</p>
        </div>
        <div className="receipt-dash my-3" />
        <div className="text-[11px] space-y-0.5">
          <div className="flex justify-between"><span>Invoice:</span><b>{invoice.id}</b></div>
          <div className="flex justify-between"><span>Date:</span><span>{invoice.date} {invoice.time}</span></div>
          <div className="flex justify-between"><span>Cashier:</span><span>{invoice.cashierId}</span></div>
          <div className="flex justify-between"><span>Customer:</span><span>{customer?.name || "Walk-in"}</span></div>
          {customer && <div className="flex justify-between"><span>Loyalty Tier:</span><span>{customer.tier} · {customer.points} pts</span></div>}
        </div>
        <div className="receipt-dash my-3" />
        <div className="text-[11px] space-y-1.5">
          {invoice.items.map((it, i) => (
            <div key={i}>
              <p className="font-bold">{it.name}</p>
              <p className="text-slate-600">{it.size} · {it.color} · {it.barcode}</p>
              <div className="flex justify-between">
                <span>{it.qty} × {fmtLKR(it.unitPrice, 0)}{it.discount ? ` (−${fmtLKR(it.discount, 0)})` : ""}</span>
                <b>{fmtLKR(it.qty * it.unitPrice - (it.discount || 0), 0)}</b>
              </div>
            </div>
          ))}
        </div>
        <div className="receipt-dash my-3" />
        <div className="text-[11px] space-y-0.5">
          <div className="flex justify-between"><span>Gross:</span><span>{fmtLKR(t.gross)}</span></div>
          <div className="flex justify-between"><span>Discounts:</span><span>−{fmtLKR(t.discount)}</span></div>
          <div className="flex justify-between text-sm font-extrabold"><span>TOTAL:</span><span>{fmtLKR(t.net)}</span></div>
          {invoice.payments.map((p, i) => (
            <div key={i} className="flex justify-between"><span>{p.method}{p.code ? ` (${p.code})` : ""}:</span><span>{fmtLKR(p.amount)}</span></div>
          ))}
          {change > 0 && <div className="flex justify-between font-bold"><span>Change:</span><span>{fmtLKR(change)}</span></div>}
          {invoice.pointsEarned > 0 && <div className="flex justify-between"><span>Points earned:</span><b>+{invoice.pointsEarned}</b></div>}
        </div>
        <div className="receipt-dash my-3" />
        <BarcodeVisual code={invoice.id} />
        <p className="text-center text-[11px] mt-3">Thank you for shopping with Oziz!</p>
        <p className="text-center text-[11px]">Exchange within 7 days with receipt.</p>
      </div>

      <div className="no-print flex flex-wrap gap-2 mt-4 justify-center">
        <Btn variant="dark" onClick={() => window.print()}><Printer size={15} /> Print Receipt</Btn>
        <Btn variant="soft" onClick={() => send("WhatsApp")}><MessageCircle size={15} /> {sent === "WhatsApp" ? "Sent ✓" : "WhatsApp E-Receipt"}</Btn>
        <Btn variant="outline" onClick={() => send("SMS")}><Send size={15} /> {sent === "SMS" ? "Sent ✓" : "SMS E-Receipt"}</Btn>
        {sent && <span className="w-full text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1"><Check size={14} /> E-receipt sent via {sent} to {customer?.phone || "customer phone"} (simulated)</span>}
        <Btn variant="ghost" onClick={onClose}>New Sale</Btn>
      </div>
    </div>
  );
}
