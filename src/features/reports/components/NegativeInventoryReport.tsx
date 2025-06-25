import React, { useEffect, useState } from 'react';
import { useReports } from '../hooks/useReports';
import { NegativeInventoryReport as NegativeInventoryReportType } from '../types';

interface Props {
  onItemClick: (itemName: string) => void;
}

export function NegativeInventoryReport({ onItemClick }: Props) {
  const { getNegativeInventoryReport } = useReports();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<NegativeInventoryReportType | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getNegativeInventoryReport();
      setReport(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="h-40 bg-gray-200 rounded animate-pulse" />;
  }

  if (!report || !report.negative_items.length) {
    return <div className="text-center py-10">No negative inventory found.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Negative Inventory</h2>

      <div className="overflow-x-auto ring-1 ring-gray-200 rounded-md">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {['Item', 'Warehouse', 'On‑Hand Total'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.negative_items.map((neg, i) => (
              <tr
                key={i}
                onClick={() => onItemClick(neg.item_name)}
                className="cursor-pointer even:bg-gray-50 hover:bg-rose-50/60"
              >
                <td className="border-t px-4 py-2">{neg.item_name}</td>
                <td className="border-t px-4 py-2">{neg.warehouse}</td>
                <td className="border-t px-4 py-2 text-right text-red-600 font-semibold">
                  {neg.on_hand_total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600">Click any row to view that item’s report.</p>
    </div>
  );
}
