import React, { useEffect, useMemo, useState } from 'react';
import { useReports } from '../hooks/useReports';
import { CustomerReport as CustomerReportType, TransactionDetail } from '../types';

const PER_PAGE = 150;

export function CustomerReport() {
  const { getCustomerReport } = useReports();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CustomerReportType | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  /* fetch once */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getCustomerReport();
      setReport(data);
      setLoading(false);
    })();
  }, []);

  /* flatten + filter */
  const rows = useMemo(() => {
    if (!report) return [];
    return report.all_transactions.flatMap((tx) =>
      tx.customer_name
        ? tx.details.map((d: TransactionDetail) => ({
            id: `${tx.transaction_id}-${d.detail_id}`,
            date: tx.transaction_date,
            reference: tx.reference_number,
            customer: tx.customer_name,
            customerPO: tx.customer_po || '-',
            carrier: tx.shipment_carrier || '-',
            shippingDoc: tx.shipping_document || '-',
            item: d.item_name,
            quantity: d.quantity,
            invStatus: d.inventory_status,
            status: d.status,
            headerComment: tx.comments || '-',
            detailComment: d.comments || '-'
          }))
        : [],
    );
  }, [report]);

  const filtered = rows.filter((r) =>
    r.customer.toLowerCase().includes(search.toLowerCase()),
  );

  /* analytics */
  const uniqueItems = new Set(filtered.map((r) => r.item));
  const totalRows = filtered.length;

  /* pagination */
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  /* UI */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Report</h2>

      {/* search always visible */}
      <div className="max-w-xs">
        <label className="block font-medium mb-1">Search Customer</label>
        <input
          className="border rounded px-3 py-2 w-full focus:ring focus:ring-indigo-200"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Start typing…"
        />
      </div>

      {loading ? (
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      ) : (
        <>
          {/* quick stats */}
          <div className="text-sm space-x-4">
            <span className="font-semibold">Rows:</span> {totalRows}
            <span className="font-semibold">Unique Items:</span> {uniqueItems.size}
          </div>

          {/* table or no‑match */}
          {filtered.length ? (
            <>
              <div className="overflow-x-auto ring-1 ring-gray-200 rounded">
                <table className="min-w-full text-sm bg-white">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Reference</th>
                      <th className="px-4 py-2 text-left font-semibold">Customer</th>
                      <th className="px-4 py-2 text-left font-semibold">Customer PO</th>
                      <th className="px-4 py-2 text-left font-semibold">Carrier</th>
                      <th className="px-4 py-2 text-left font-semibold">Ship Doc</th>
                      <th className="px-4 py-2 text-left font-semibold">Item</th>
                      <th className="px-4 py-2 text-left font-semibold">Qty</th>
                      <th className="px-4 py-2 text-left font-semibold">Inv Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Header Comment</th>
                      <th className="px-4 py-2 text-left font-semibold">Detail Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r) => (
                      <tr key={r.id} className="even:bg-gray-50">
                        <td className="border-t px-4 py-1">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="border-t px-4 py-1">{r.reference}</td>
                        <td className="border-t px-4 py-1">{r.customer}</td>
                        <td className="border-t px-4 py-1">{r.customerPO}</td>
                        <td className="border-t px-4 py-1">{r.carrier}</td>
                        <td className="border-t px-4 py-1">{r.shippingDoc}</td>
                        <td className="border-t px-4 py-1">{r.item}</td>
                        <td className="border-t px-4 py-1 text-right">{r.quantity.toLocaleString()}</td>
                        <td className="border-t px-4 py-1">{r.invStatus}</td>
                        <td className="border-t px-4 py-1">{r.status}</td>
                        <td className="border-t px-4 py-1">{r.headerComment}</td>
                        <td className="border-t px-4 py-1">{r.detailComment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* pager */}
              <div className="flex justify-between items-center text-sm">
                <span>
                  Page {page + 1}/{totalPages}
                </span>
                <div className="space-x-2">
                  <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 border rounded">
                    ‹
                  </button>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2 py-1 border rounded"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-600">No matching transactions.</p>
          )}
        </>
      )}
    </div>
  );
}