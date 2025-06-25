import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useReports } from '../hooks/useReports';

const PER_PAGE = 150;

export function WarehouseReport() {
  const { getWarehouseReport } = useReports();
  const [names, setNames] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  /* Names */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('warehouse').select('"Common Name"');
      setNames(data?.map((w) => w['Common Name']).filter(Boolean).sort() || []);
    })();
  }, []);

  /* Close dropdown */
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function handleSelect(name: string) {
    setSelected(name);
    setSearch(name);
    setOpen(false);
    setLoading(true);
    try {
      const data = await getWarehouseReport(name);
      setReport(data);
      setPage(0);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search ? names.filter((n) => n.toLowerCase().includes(search.toLowerCase())) : names;

  /* Summary totals */
  const totals = report?.items?.reduce(
    (acc: any, row: any) => {
      acc.onHand += row.on_hand.total || 0;
      acc.inbound += row.inbound.total || 0;
      acc.out += row.scheduled_outbound.total || 0;
      acc.future += row.future_inventory.total || 0;
      return acc;
    },
    { onHand: 0, inbound: 0, out: 0, future: 0 },
  ) ?? { onHand: 0, inbound: 0, out: 0, future: 0 };

  /* Transactions pagination */
  const txRows = report?.transactions?.map((tx: any) => ({
    id: tx.transaction_id,
    date: tx.transaction_date,
    ref: tx.reference_number,
    type: tx.transaction_type,
    customer: tx.customer_name || '-',
    status: tx.detail_status,
    itemCount: tx.details?.length ?? 0,
    items: `${tx.quantity} ${tx.item_name} (${tx.inventory_status})`
  })) ?? [];

  const paged = txRows.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(txRows.length / PER_PAGE);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Warehouse Report</h2>

      <div className="relative max-w-md" ref={ref}>
        <label className="block font-medium mb-1">Search Warehouse</label>
        <input
          className="border rounded px-3 py-2 w-full focus:ring focus:ring-indigo-200"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Pasco…"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute bg-white border rounded w-full max-h-60 overflow-auto shadow z-10 mt-1">
            {filtered.map((n) => (
              <li key={n} onClick={() => handleSelect(n)} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer">
                {n}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <div className="h-64 bg-gray-200 rounded animate-pulse" />}

      {!!report && !loading && (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['On‑Hand', totals.onHand],
              ['Inbound', totals.inbound],
              ['Scheduled Out', totals.out],
              ['Future', totals.future],
            ].map(([lbl, val]) => (
              <div key={lbl} className="p-4 bg-white rounded shadow border-l-4 border-indigo-500">
                <p className="text-xs uppercase text-gray-500">{lbl}</p>
                <p className="text-xl font-bold">{Number(val).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Item table */}
          <div className="overflow-x-auto ring-1 ring-gray-200 rounded">
            <table className="min-w-full text-sm bg-white">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Item</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-right font-semibold">On‑Hand</th>
                  <th className="px-4 py-2 text-right font-semibold">Inbound</th>
                  <th className="px-4 py-2 text-right font-semibold">Scheduled Out</th>
                  <th className="px-4 py-2 text-right font-semibold">Future</th>
                </tr>
              </thead>
              <tbody>
                {report.items?.map((row: any) => (
                  <tr key={`${row.item_name}-${row.inventory_status}`} className="even:bg-gray-50">
                    <td className="border-t px-4 py-1">{row.item_name}</td>
                    <td className="border-t px-4 py-1">{row.inventory_status}</td>
                    <td className="border-t px-4 py-1 text-right">{row.on_hand.total?.toLocaleString() ?? 0}</td>
                    <td className="border-t px-4 py-1 text-right">{row.inbound.total?.toLocaleString() ?? 0}</td>
                    <td className="border-t px-4 py-1 text-right">{row.scheduled_outbound.total?.toLocaleString() ?? 0}</td>
                    <td className="border-t px-4 py-1 text-right">{row.future_inventory.total?.toLocaleString() ?? 0}</td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>

          {/* Transactions */}
          <section className="space-y-2">
            <h3 className="font-semibold text-lg">
              All Transactions ({txRows.length})
            </h3>
            {txRows.length ? (
              <>
                <div className="overflow-x-auto ring-1 ring-gray-200 rounded">
                  <table className="min-w-full text-sm bg-white">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Date</th>
                        <th className="px-4 py-2 text-left font-semibold">Ref</th>
                        <th className="px-4 py-2 text-left font-semibold">Type</th>
                        <th className="px-4 py-2 text-left font-semibold">Customer</th>
                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                        <th className="px-4 py-2 text-left font-semibold">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((t) => (
                        <tr key={t.id} className="even:bg-gray-50">
                          <td className="border-t px-4 py-1">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="border-t px-4 py-1">{t.ref}</td>
                          <td className="border-t px-4 py-1">{t.type}</td>
                          <td className="border-t px-4 py-1">{t.customer}</td>
                          <td className="border-t px-4 py-1">{t.status}</td>
                          <td className="border-t px-4 py-1">{t.items}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              <p className="text-sm text-gray-600">No transactions for this warehouse.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}