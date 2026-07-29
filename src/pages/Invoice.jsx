import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const toWords = (num) => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = inWords(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + inWords(paise) + ' Paise';
  return result;
};

const fmt = (n) => Number(n || 0).toFixed(2);

/* ─── Invoice component ────────────────────────────────────────────────────── */
const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await client.get(`/orders/${id}`);
        setOrder(res.data);
        setTimeout(() => window.print(), 600);
      } catch (error) {
        console.error('Invoice fetch error:', error);
        toast.error('Failed to load invoice');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>Loading invoice…</div>;
  if (!order) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>Invoice not found.</div>;

  /* ── derived values ── */
  const invoiceNo = 1800 + Number(order.id);   // sequential-ish number
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // Item-level calculations (18% GST split equally as CGST 9% + SGST 9%)
  const GST_RATE = 0.18;
  const CGST_RATE = 0.09;
  const SGST_RATE = 0.09;

  const rows = (order.items || []).map((item) => {
    const mrp   = item.product?.mrp || item.price_at_purchase || 0;
    const rate  = item.price_at_purchase || (item.product?.sale_price || item.product?.price) || 0;
    const qty   = item.quantity || 1;
    const tax   = Math.round(rate * qty * GST_RATE);     // ₹ total tax (CGST+SGST)
    const amount = Math.round(rate * qty + tax);          // inclusive
    const hsn   = item.product?.skv || '85176210';        // use skv as HSN or default
    return { item, mrp, rate, qty, tax, amount, hsn };
  });

  const totalQty    = rows.reduce((s, r) => s + r.qty, 0);
  const totalTax    = rows.reduce((s, r) => s + r.tax, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  // Tax breakdown
  const transport     = 0;          // free shipping
  const taxableAmount = Math.round(totalAmount * (1 - GST_RATE / (1 + GST_RATE)) * (1 + GST_RATE / (1 + GST_RATE)) - totalTax / 2); // base
  const taxableBase   = Math.round(totalAmount / (1 + GST_RATE));
  const cgst          = Math.round(taxableBase * CGST_RATE);
  const sgst          = Math.round(taxableBase * SGST_RATE);
  const grandTotal    = totalAmount + transport;
  const received      = order.status === 'confirmed' ? grandTotal : 0;
  const balance       = grandTotal - received;

  const amountInWords = toWords(grandTotal);

  /* ── company constants ── */
  const CO = {
    name    : 'Tronix365',
    addr1   : 'E1 society, flat No 84, Ganga Orchid, Mudhawa Road, Pingle wasti, Pune, Maharashtra, 411036',
    mobile  : '8830153805',
    gstin   : '27CXGPA7692P1ZP',
    pan     : 'CXGPA7692P',
    email   : 'admin@tronix365.in',
    bank    : { name: 'Mangesh Sanjay Adsule', ifsc: 'INDB0000002', account: '201014802605', bankName: 'IndusInd Bank, PUNE' },
    terms   : ['All disputes are subject to Pune jurisdiction only', '100% Payment Against PO'],
  };

  /* customer */
  const cusName    = order.full_name || order.customer_email || 'N/A';
  const cusAddr    = [order.address_line, order.city, order.state, order.pincode].filter(Boolean).join(', ') || 'N/A';
  const cusState   = order.state || 'Maharashtra';
  const cusPhone   = order.phone || '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'Roboto', Arial, sans-serif; background: #f0f0f0; }

        .inv-page {
          width: 794px;
          min-height: 1123px;
          margin: 20px auto;
          background: #fff;
          border: 1px solid #aaa;
          font-size: 11px;
          color: #111;
        }

        /* ── TOP BANNER ── */
        .inv-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          border-bottom: 2px solid #000;
          padding: 4px 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .inv-banner-tag {
          border: 1px solid #000;
          padding: 2px 8px;
          font-size: 9.5px;
        }

        /* ── HEADER ── */
        .inv-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 10px 14px 8px;
          border-bottom: 2px solid #000;
        }
        .inv-logo-box {
          border: 2px solid #000;
          width: 72px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .inv-logo-inner {
          background: #222;
          color: #fff;
          padding: 4px 6px;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 1px;
          text-align: center;
          line-height: 1.4;
        }
        .inv-logo-inner span { display: block; color: #a78bfa; font-size: 7px; letter-spacing: 2px; }
        .inv-co-details { flex: 1; }
        .inv-co-name { font-size: 22px; font-weight: 700; letter-spacing: 0; margin-bottom: 2px; }
        .inv-co-details p { font-size: 10px; color: #222; line-height: 1.6; }

        /* ── META ROW ── */
        .inv-meta {
          display: flex;
          justify-content: space-between;
          padding: 5px 14px;
          border-bottom: 1px solid #000;
          font-size: 10.5px;
        }
        .inv-meta strong { font-weight: 700; }

        /* ── BILL/SHIP ── */
        .inv-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #000;
        }
        .inv-party {
          padding: 7px 14px;
        }
        .inv-party:first-child { border-right: 1px solid #000; }
        .inv-party-title {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          border-bottom: 1px solid #ccc;
          margin-bottom: 5px;
          padding-bottom: 2px;
          letter-spacing: 0.5px;
        }
        .inv-party p { font-size: 10px; line-height: 1.7; }
        .inv-party strong { font-weight: 700; font-size: 11px; }

        /* ── ITEMS TABLE ── */
        .inv-table { width: 100%; border-collapse: collapse; }
        .inv-table th, .inv-table td {
          border: 1px solid #000;
          padding: 4px 6px;
          font-size: 10px;
        }
        .inv-table th {
          background: #f5f5f5;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9.5px;
          text-align: center;
        }
        .inv-table td:first-child { text-align: left; }
        .inv-table td { text-align: center; vertical-align: middle; }
        .inv-table .subtotal-row td {
          font-weight: 700;
          background: #fafafa;
        }

        /* ── BOTTOM SECTION ── */
        .inv-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #000;
        }
        .inv-bank { padding: 8px 14px; border-right: 1px solid #000; }
        .inv-bank h4 { font-size: 9.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        .inv-bank p { font-size: 10px; line-height: 1.8; }
        .inv-bank strong { font-weight: 700; }

        .inv-tax-summary { padding: 8px 14px; }
        .inv-tax-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .inv-tax-table td { padding: 2.5px 6px; }
        .inv-tax-table .lbl { text-align: left; }
        .inv-tax-table .val { text-align: right; font-weight: 600; }
        .inv-tax-table .sep td { border-top: 1px solid #aaa; }
        .inv-tax-table .total-row td { font-weight: 700; font-size: 11px; border-top: 1.5px solid #000; }

        /* ── TERMS ── */
        .inv-terms {
          padding: 6px 14px;
          border-top: 1px solid #000;
          font-size: 9.5px;
        }
        .inv-terms h4 { font-weight: 700; text-transform: uppercase; margin-bottom: 3px; font-size: 9px; }
        .inv-terms ol { padding-left: 14px; }
        .inv-terms li { line-height: 1.7; }

        /* ── FOOTER ── */
        .inv-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #000;
          padding: 8px 14px;
          align-items: flex-end;
        }
        .inv-words { font-size: 10px; }
        .inv-words strong { font-weight: 700; }
        .inv-signatory { text-align: right; }
        .inv-signatory .sig-line {
          font-family: 'Brush Script MT', cursive;
          font-size: 28px;
          color: #1a237e;
          margin-bottom: 2px;
          display: block;
        }
        .inv-signatory p { font-size: 9.5px; font-weight: 700; text-transform: uppercase; border-top: 1px solid #000; padding-top: 3px; margin-top: 2px; }

        /* ── No-print helper ── */
        .no-print-bar {
          width: 794px;
          margin: 0 auto 16px;
          display: flex;
          gap: 12px;
        }
        .no-print-bar button {
          padding: 8px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }
        .btn-print { background: #4f46e5; color: #fff; }
        .btn-back  { background: #e5e7eb; color: #111; }

        @media print {
          body { background: white; }
          .no-print-bar { display: none !important; }
          .inv-page { margin: 0; border: none; box-shadow: none; }
        }
      `}</style>

      {/* Print / Back buttons */}
      <div className="no-print-bar">
        <button className="btn-print" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="inv-page">

        {/* ── BANNER ── */}
        <div className="inv-banner">
          <span>Tax Invoice</span>
          <span className="inv-banner-tag">Original For Recipient</span>
        </div>

        {/* ── HEADER ── */}
        <div className="inv-header">
          <div className="inv-logo-box">
            <div className="inv-logo-inner">
              TRONIX
              <span>365</span>
            </div>
          </div>
          <div className="inv-co-details">
            <div className="inv-co-name">Tronix365</div>
            <p>{CO.addr1}</p>
            <p>
              <strong>Mobile:</strong> {CO.mobile}&nbsp;&nbsp;
              <strong>GSTIN:</strong> {CO.gstin}&nbsp;&nbsp;
              <strong>PAN Number:</strong> {CO.pan}
            </p>
            <p><strong>Email:</strong> {CO.email}</p>
          </div>
        </div>

        {/* ── META ROW ── */}
        <div className="inv-meta">
          <div><strong>Invoice No.:</strong> {invoiceNo}</div>
          <div><strong>Invoice Date:</strong> {invoiceDate}</div>
        </div>

        {/* ── BILL TO / SHIP TO ── */}
        <div className="inv-parties">
          <div className="inv-party">
            <div className="inv-party-title">{(order.is_gst_invoice || order.gstin || order.company_name) ? 'Bill To (B2B Tax Invoice)' : 'Bill To'}</div>
            {order.company_name && <p style={{ fontWeight: 700, fontSize: '11px', color: '#4c1d95' }}>🏢 {order.company_name}</p>}
            <p><strong>{cusName}</strong></p>
            <p>{(order.is_gst_invoice && order.company_address) ? order.company_address : cusAddr}</p>
            {order.gstin && <p style={{ fontWeight: 700, color: '#6d28d9', letterSpacing: '0.5px' }}><strong>Customer GSTIN:</strong> {order.gstin}</p>}
            {cusPhone && <p><strong>Mobile:</strong> {cusPhone}</p>}
            <p><strong>Place of Supply:</strong> {cusState}</p>
          </div>
          <div className="inv-party">
            <div className="inv-party-title">Ship To</div>
            <p><strong>{cusName}</strong></p>
            <p>{cusAddr}</p>
            {cusPhone && <p><strong>Mobile:</strong> {cusPhone}</p>}
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <table className="inv-table">
          <thead>
            <tr>
              <th style={{ width: '32%', textAlign: 'left' }}>Items</th>
              <th style={{ width: '11%' }}>HSN</th>
              <th style={{ width: '7%' }}>Qty.</th>
              <th style={{ width: '10%' }}>MRP</th>
              <th style={{ width: '10%' }}>Rate</th>
              <th style={{ width: '16%' }}>Tax</th>
              <th style={{ width: '10%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, mrp, rate, qty, tax, amount, hsn }, i) => (
              <tr key={i}>
                <td>{item.product ? item.product.title : `Product #${item.product_id}`}</td>
                <td>{hsn}</td>
                <td>{qty} PCS</td>
                <td>{Math.round(mrp)}</td>
                <td>{Math.round(rate)}</td>
                <td>
                  {Math.round(tax)}<br />
                  <span style={{ fontSize: 8.5, color: '#555' }}>
                    (3.5% GST)
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{amount.toLocaleString('en-IN')}</td>
              </tr>
            ))}

            {/* empty rows for visual padding if few items */}
            {rows.length < 4 && Array.from({ length: 4 - rows.length }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ height: 22 }}>
                <td /><td /><td /><td /><td /><td /><td />
              </tr>
            ))}

            {/* SUBTOTAL */}
            <tr className="subtotal-row" style={{ borderTop: '2px solid #000' }}>
              <td style={{ fontWeight: 700 }}>Sub Total</td>
              <td />
              <td style={{ fontWeight: 700 }}>{totalQty}</td>
              <td />
              <td />
              <td style={{ fontWeight: 700 }}>₹ {totalTax.toLocaleString('en-IN')}</td>
              <td style={{ fontWeight: 700 }}>₹ {totalAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        {/* ── BOTTOM: Bank Details + Tax Summary ── */}
        <div className="inv-bottom">

          {/* Bank Details */}
          <div className="inv-bank">
            <h4>Bank Details</h4>
            <p><strong>Name:</strong> {CO.bank.name}</p>
            <p><strong>IFSC Code:</strong> {CO.bank.ifsc}</p>
            <p><strong>Account No.:</strong> {CO.bank.account}</p>
            <p><strong>Bank:</strong> {CO.bank.bankName}</p>
          </div>

          {/* Tax Summary */}
          <div className="inv-tax-summary">
            <table className="inv-tax-table">
              <tbody>
                <tr>
                  <td className="lbl">Transport</td>
                  <td className="val">₹ {transport}</td>
                </tr>
                <tr>
                  <td className="lbl">Taxable Amount</td>
                  <td className="val">₹ {taxableBase.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="lbl">CGST @9%</td>
                  <td className="val">₹ {cgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="lbl">SGST @9%</td>
                  <td className="val">₹ {sgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="total-row">
                  <td className="lbl">Total Amount</td>
                  <td className="val">₹ {grandTotal.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="sep">
                  <td className="lbl">Received Amount</td>
                  <td className="val">₹ {received.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="lbl">Balance</td>
                  <td className="val">₹ {balance.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TERMS ── */}
        <div className="inv-terms">
          <h4>Terms and Conditions</h4>
          <ol>
            {CO.terms.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        </div>

        {/* ── FOOTER: Amount in words + Signatory ── */}
        <div className="inv-footer">
          <div className="inv-words">
            <strong>Total Amount (in words)</strong><br />
            {amountInWords}
          </div>
          <div className="inv-signatory">
            <span className="sig-line">Tronix365</span>
            <p>Authorised Signatory For<br />{CO.name}</p>
          </div>
        </div>

      </div>
    </>
  );
};

export default Invoice;
