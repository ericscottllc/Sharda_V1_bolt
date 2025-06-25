import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useReports } from '../hooks/useReports';
import { ProductReport as ProductReportType, TransactionDetail } from '../types';

const PER_PAGE = 150;

export function ProductReport() {
  const { getProductReport } = useReports();

  const [products, setProducts] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<ProductReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  /* Names */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('product').select('product_name');
      setProducts([...new Set(data?.map((r) => r.product_name))].sort());
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
      const data = await getProductReport(name);
      setReport(data);
      setPage(0);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search ? products.filter((p) => p.toLowerCase().includes(search.toLowerCase())) : products;

  /* Transactions pagination */
  const txRows =
    report?.transactions.flatMap((tx) =>
      tx.details.map((d: TransactionDetail) => ({
        id: `${tx.transaction_id}-${d.detail_id}`,
        date: tx.transaction_date,
        ref: tx.reference_number,
        warehouse: tx.warehouse,
        item: d.item_name,
        qty: d.quantity,
      })),
    ) || [];
  const paged = txRows.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(txRows.length / PER_PAGE);

  /* UI */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Product Report</h2>

      {/* Autocomplete */}
      <div className="relative max-w-md" ref={ref}>
        <label className="block font-medium mb-1">Search Product</label>
        <input
          className="border rounded px-3 py-2 w-full focus:ring focus:ring-indigo-200"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Glyphosate…"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute bg-white border rounded w-full max-h-60 overflow-auto shadow z-10 mt-1">
            {filtered.map((p) => (
              <li
                key={p}
                onClick={() => handleSelect(p)}
                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer"
              >
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <div className="h-64 bg-gray-200 rounded animate-pulse" />}

      {!!report && !loading && (
        <>
          {/* Items summary */}
          <section>
            <h3 className="font-semibold text-lg mb-2">
              Items ({report.items.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.items.map((item) => (
                <div key={item.item_name} className="p-4 bg-white rounded-lg shadow border">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.item_name}</span>
                    <span>{item.total_on_hand.total.toLocaleString()}</span>
                  </div>
                  <ul className="text-xs text-gray-600 mt-1">
                    {item.by_warehouse.map((wh) => (
                      <li key={wh.warehouse} className="flex justify-between">
                        <span>{wh.warehouse}</span>
                        <span>{wh.on_hand.total.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

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
                        {['Date', 'Reference', 'Warehouse', 'Item', 'Qty'].map((h) => (
                          <th key={h} className="px-4 py-2 text-left font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((r) => (
                        <tr key={r.id} className="even:bg-gray-50">
                          <td className="border-t px-4 py-1">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="border-t px-4 py-1">{r.ref}</td>
                          <td className="border-t px-4 py-1">{r.warehouse}</td>
                          <td className="border-t px-4 py-1">{r.item}</td>
                          <td className="border-t px-4 py-1 text-right">{r.qty.toLocaleString()}</td>
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
              <p className="text-sm text-gray-600">No transactions found.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
