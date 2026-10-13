/* Payment submission, verification and receipts. Loaded by resident.html and admin.html.

   The system does not process payments. A resident pays at the office, by bank
   transfer, GCash or Maya, then submits the amount, method and reference number here.
   The administrator checks it and confirms it, and the resident can then download a receipt.

   Both pages read and write the same list (localStorage, same browser), and the
   "storage" event below refreshes the other page the moment something changes. */

const PAY_METHODS = ["Office (cash)", "Bank transfer", "GCash", "Maya"];
const PAY_KEY = "residenthub_payment_proofs_v1";
const PAY_SEQ_KEY = "residenthub_receipt_seq_v1";

function readProofs(){
  try { const v = JSON.parse(localStorage.getItem(PAY_KEY) || "[]"); return Array.isArray(v) ? v : []; }
  catch(err){ return []; }
}
function writeProofs(list){
  try { localStorage.setItem(PAY_KEY, JSON.stringify(list)); } catch(err){ /* storage unavailable */ }
}
function nextReceiptNo(){
  let n = 1;
  try { n = (parseInt(localStorage.getItem(PAY_SEQ_KEY) || "0", 10) || 0) + 1; localStorage.setItem(PAY_SEQ_KEY, String(n)); } catch(err){ n = Date.now() % 10000; }
  return "OR-2026-" + String(n).padStart(4, "0");
}
function payDate(){
  return new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function payEsc(s){
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- resident: submit "I have paid" ---------- */
function submitProof(p){
  const amount = Number(p.amount);
  const reference = String(p.reference || "").trim();
  if (!p.forText) return "Choose what the payment is for.";
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount you paid.";
  if (!PAY_METHODS.includes(p.method)) return "Choose how you paid.";
  if (reference.length < 4) return "Enter the reference number from your receipt or transaction.";
  const list = readProofs();
  if (list.some(x => x.reference.toLowerCase() === reference.toLowerCase() && x.method === p.method && x.status !== "Rejected")){
    return "That reference number was already submitted.";
  }
  list.unshift({
    id: Date.now(), unit: p.unit, payer: p.payer, forText: p.forText, method: p.method,
    reference: reference, amount: amount, date: payDate(), status: "Pending", receiptNo: ""
  });
  writeProofs(list);
  return null;
}
function myProofs(unit){ return readProofs().filter(x => x.unit === unit); }

/* ---------- administrator: confirm or reject ---------- */
function reviewProof(id, confirm){
  const list = readProofs();
  const p = list.find(x => x.id === id);
  if (!p || p.status !== "Pending") return null;
  p.status = confirm ? "Confirmed" : "Rejected";
  if (confirm){ p.receiptNo = nextReceiptNo(); p.confirmedOn = payDate(); }
  writeProofs(list);
  return p;
}

/* ---------- receipt (opens in Word) ---------- */
function receiptHtml(p){
  const rows = [
    ["Receipt no.", p.receiptNo], ["Date paid", p.date], ["Unit", p.unit], ["Received from", p.payer],
    ["Payment for", p.forText], ["Amount", peso(p.amount)], ["Payment method", p.method],
    ["Reference no.", p.reference], ["Status", "Paid"]
  ];
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Payment receipt</title></head><body style="font-family:Arial,sans-serif">'
    + '<h1>Payment receipt</h1><p>City Residences Condominium Corporation</p>'
    + '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse"><tr><th align="left">Detail</th><th align="left">Information</th></tr>'
    + rows.map(r => "<tr><td>" + payEsc(r[0]) + "</td><td>" + payEsc(r[1]) + "</td></tr>").join("")
    + '</table><p>This receipt is your proof of payment. Keep a copy for your records.</p></body></html>';
}
function downloadReceipt(id){
  const p = readProofs().find(x => x.id === id);
  if (!p || p.status !== "Confirmed"){ toast("The receipt is available once the office confirms the payment."); return; }
  const blob = new Blob(["﻿", receiptHtml(p)], { type:"application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "receipt-" + p.receiptNo + ".doc";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportPaymentHistoryCSV(list){
  exportCSV("payments.csv", ["Receipt no.","Date","Unit","Paid by","Payment for","Method","Reference no.","Amount"],
    list.map(p => [p.receiptNo, p.date, p.unit, p.payer, p.forText, p.method, p.reference, p.amount]));
}

function proofChip(status){
  return '<span class="chip ' + (status === "Confirmed" ? "good" : status === "Rejected" ? "bad" : "warn") + '">' + payEsc(status) + "</span>";
}

/* ---------- live refresh: when the other page changes the list, redraw this one ---------- */
window.addEventListener("storage", function(e){
  if (e.key !== PAY_KEY) return;
  try { if (typeof state !== "undefined" && state.authed && typeof render === "function") render(); } catch(err){ /* ignore */ }
});
