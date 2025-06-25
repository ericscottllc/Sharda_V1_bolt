import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useReports } from '../hooks/useReports';
import { ItemReport as ItemReportType, TransactionDetail } from '../types';

const PER_PAGE = 150;

/* Mini utility component */
function WarehouseCard({ wh }: { wh: ItemReportType['by_warehouse'][number] }) {
  const {
    on_hand: { total, stock, consign, hold },
    inbound,
    scheduled_outbound,
    future_inventory,
    warehouse,
  } = wh;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm space-y-1 border">
      <div className="flex justify-between font-semibold">
        <span>{warehouse}</span>
        <span>{total.toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 text-xs text-gray-600">
        <span>Stock:</span> <span>{stock.toLocaleString()}</span>
        <span>Consign:</span> <span>{consign.toLocaleString()}</span>
        <span>Hold:</span> <span>{hold.toLocaleString()}</span>
        <span>Inbound:</span> <span>{inbound.total.toLocaleString()}</span>
        <span>Sched‑Out:</span>{' '}
        <span>{scheduled_outbound.total.toLocaleString()}</span>
        <span className="font-medium">Future:</span>{' '}
        <span className="font-medium">{future_inventory.total.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface Props {
  initialItemName?: string;
}

export function ItemReport({ initialItemName = '' }: Props) {
  const { getItemReport } = useReports();
  const [allItems, setAllItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(initialItemName);
  const [report, setReport] = useState<ItemReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  /* Dropdown close */
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /* Load item names once */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('item').select('item_name');
      setAllItems(data?.map((r) => r.item_name) || []);
    })();
  }, []);

  /* If coming from negative inventory */
  useEffect(() => {
    if (initialItemName) handleSelect(initialItemName);
  }, [initialItemName]);

  async function handleSelect(name: string) {
    setSelectedItem(name);
    setSearchTerm(name);
    setOpen(false);
    setLoading(true);
    try {
      const data = await getItemReport(name);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = searchTerm
    ? allItems.filter((n) => n.toLowerCase().includes(searchTerm.toLowerCase()))
    : allItems;

  /* Transactions paging */
  const [page, setPage] = useState(0);
  const transactions = report?.transactions.flatMap((tx) =>
    tx.details.map((d: TransactionDetail) => ({
      id: `${tx.transaction_id}-${d.detail_id}`,
      date: tx.transaction_date,
      ref: tx.reference_number,
      warehouse: tx.warehouse,
      qty: d.quantity,
      item: d.item_name,
    })),
  ) || [];
  const pagedTx = transactions.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(transactions.length / PER_PAGE);

  /* UI */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Item Report</h2>

      {/* Autocomplete */}
      <div className="relative max-w-md" ref={wrapperRef}>
        <label className="block font-medium mb-1">Search or Select Item</label>
        <input
          className="border rounded px-3 py-2 w-full focus:ring focus:ring-indigo-200"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Start typing…"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute bg-white border rounded w-full max-h-60 overflow-auto shadow z-10 mt-1">
            {filtered.map((n) => (
              <li
                key={n}
                onClick={() => handleSelect(n)}
                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer"
              >
                {n}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Loading */}
      {loading && <div className="h-64 bg-gray-200 rounded animate-pulse" />}

      {/* Content */}
      {!!report && !loading && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Total On‑Hand', report.total_on_hand.total],
              ['Stock', report.total_on_hand.stock],
              ['Consign', report.total_on_hand.consign],
              ['Hold', report.total_on_hand.hold],
            ].map(([lbl, val]) => (
              <div key={lbl} className="p-4 bg-white rounded-lg shadow border-l-4 border-indigo-500">
                <p className="text-xs uppercase text-gray-500">{lbl}</p>
                <p className="text-xl font-bold">{Number(val).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Warehouse cards */}
          <section>
            <h3 className="font-semibold text-lg my-2">Warehouses</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.by_warehouse.map((wh) => (
                <WarehouseCard key={wh.warehouse} wh={wh} />
              ))}
            </div>
          </section>

          {/* Transactions */}
          <section className="space-y-2">
            <h3 className="font-semibold text-lg">
              All Transactions ({transactions.length})
            </h3>
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
                  {pagedTx.map((r) => (
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
            {/* Pager */}
            <div className="flex justify-between items-center text-sm">
              <span>
                Page {page + 1} / {totalPages}
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
          </section>
        </>
      )}
    </div>
  );
}
