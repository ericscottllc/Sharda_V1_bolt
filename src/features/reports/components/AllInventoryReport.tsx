import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Filter, X, ChevronUp, ChevronDown } from 'lucide-react';

interface InventoryRow {
  'Item Name': string;
  'Warehouse': string;
  'Date': string;
  'Inventory As Of Date': number;
  'On Hand: Total': number;
  'On Hand: Stock': number;
  'On Hand: Consignment': number;
  'On Hand: Hold': number;
  'Inbound: Total': number;
  'Inbound: Stock': number;
  'Inbound: Consignment': number;
  'Inbound: Hold': number;
  'Scheduled Outbound: Total': number;
  'Scheduled Outbound: Stock': number;
  'Scheduled Outbound: Consign': number;
  'Scheduled Outbound: Hold': number;
  'Future Inventory: Total': number;
  'Future Inventory: Stock': number;
  'Future Inventory: Consign': number;
  'Future Inventory: Hold': number;
}

type SortDirection = 'asc' | 'desc';
type SortColumn = keyof InventoryRow;

const PER_PAGE = 100;

export function AllInventoryReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InventoryRow[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    warehouse: '',
    item: ''
  });
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>('Item Name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [data, searchTerm, filters, sortColumn, sortDirection]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      const { data: inventoryData, error } = await supabase
        .from('inventory_view')
        .select('*');

      if (error) throw error;

      // Filter out rows where all numeric columns are 0
      const filteredRows = (inventoryData || []).filter((row: InventoryRow) => {
        const numericColumns = [
          'Inventory As Of Date',
          'On Hand: Total',
          'On Hand: Stock',
          'On Hand: Consignment',
          'On Hand: Hold',
          'Inbound: Total',
          'Inbound: Stock',
          'Inbound: Consignment',
          'Inbound: Hold',
          'Scheduled Outbound: Total',
          'Scheduled Outbound: Stock',
          'Scheduled Outbound: Consign',
          'Scheduled Outbound: Hold',
          'Future Inventory: Total',
          'Future Inventory: Stock',
          'Future Inventory: Consign',
          'Future Inventory: Hold'
        ];

        return numericColumns.some(col => {
          const value = Number(row[col as keyof InventoryRow]);
          return !isNaN(value) && value !== 0;
        });
      });

      setData(filteredRows);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        row['Item Name'].toLowerCase().includes(search) ||
        row['Warehouse'].toLowerCase().includes(search)
      );
    }

    // Apply warehouse filter
    if (filters.warehouse) {
      filtered = filtered.filter(row => 
        row['Warehouse'].toLowerCase().includes(filters.warehouse.toLowerCase())
      );
    }

    // Apply item filter
    if (filters.item) {
      filtered = filtered.filter(row => 
        row['Item Name'].toLowerCase().includes(filters.item.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle different data types
      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Handle dates or mixed types
        const aStr = String(aValue);
        const bStr = String(bValue);
        comparison = aStr.localeCompare(bStr);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredData(filtered);
    setPage(0); // Reset to first page when filters/sort change
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ warehouse: '', item: '' });
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(Number(value))) return '0';
    return Number(value).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th 
      className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortColumn === column && (
          sortDirection === 'asc' ? 
            <ChevronUp className="w-4 h-4" /> : 
            <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / PER_PAGE);
  const paginatedData = filteredData.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // Get unique warehouses and items for filter dropdowns
  const uniqueWarehouses = [...new Set(data.map(row => row['Warehouse']))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">All Inventory</h2>
        <div className="text-sm text-gray-600">
          Showing {filteredData.length} of {data.length} records
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items or warehouses..."
              className="pl-9 pr-4 py-2 border rounded-lg w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button
              onClick={fetchInventoryData}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
            {(searchTerm || filters.warehouse || filters.item) && (
              <button
                onClick={clearFilters}
                className="text-red-600 hover:text-red-800 flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse
              </label>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Warehouses</option>
                {uniqueWarehouses.map(warehouse => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <input
                type="text"
                value={filters.item}
                onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Filter by item name..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <SortableHeader column="Item Name">Item Name</SortableHeader>
                <SortableHeader column="Warehouse">Warehouse</SortableHeader>
                <SortableHeader column="Date">Date</SortableHeader>
                <SortableHeader column="Inventory As Of Date">Inventory As Of Date</SortableHeader>
                <SortableHeader column="On Hand: Total">On Hand: Total</SortableHeader>
                <SortableHeader column="On Hand: Stock">On Hand: Stock</SortableHeader>
                <SortableHeader column="On Hand: Consignment">On Hand: Consignment</SortableHeader>
                <SortableHeader column="On Hand: Hold">On Hand: Hold</SortableHeader>
                <SortableHeader column="Inbound: Total">Inbound: Total</SortableHeader>
                <SortableHeader column="Inbound: Stock">Inbound: Stock</SortableHeader>
                <SortableHeader column="Inbound: Consignment">Inbound: Consignment</SortableHeader>
                <SortableHeader column="Inbound: Hold">Inbound: Hold</SortableHeader>
                <SortableHeader column="Scheduled Outbound: Total">Scheduled Outbound: Total</SortableHeader>
                <SortableHeader column="Scheduled Outbound: Stock">Scheduled Outbound: Stock</SortableHeader>
                <SortableHeader column="Scheduled Outbound: Consign">Scheduled Outbound: Consign</SortableHeader>
                <SortableHeader column="Scheduled Outbound: Hold">Scheduled Outbound: Hold</SortableHeader>
                <SortableHeader column="Future Inventory: Total">Future Inventory: Total</SortableHeader>
                <SortableHeader column="Future Inventory: Stock">Future Inventory: Stock</SortableHeader>
                <SortableHeader column="Future Inventory: Consign">Future Inventory: Consign</SortableHeader>
                <SortableHeader column="Future Inventory: Hold">Future Inventory: Hold</SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row['Item Name']}</td>
                  <td className="px-4 py-3">{row['Warehouse']}</td>
                  <td className="px-4 py-3">{formatDate(row['Date'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Inventory As Of Date'])}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNumber(row['On Hand: Total'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['On Hand: Stock'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['On Hand: Consignment'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['On Hand: Hold'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Inbound: Total'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Inbound: Stock'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Inbound: Consignment'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Inbound: Hold'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Scheduled Outbound: Total'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Scheduled Outbound: Stock'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Scheduled Outbound: Consign'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Scheduled Outbound: Hold'])}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNumber(row['Future Inventory: Total'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Future Inventory: Stock'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Future Inventory: Consign'])}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(row['Future Inventory: Hold'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {page * PER_PAGE + 1} to {Math.min((page + 1) * PER_PAGE, filteredData.length)} of {filteredData.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No inventory records found with non-zero values.
        </div>
      )}
    </div>
  );
}