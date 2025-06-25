import React from 'react';
import { TransactionHeader } from '../types';
import { RefreshCw, Edit, ArrowRight, Search, Filter, X, Trash2, Mail, FileX } from 'lucide-react';

interface TransactionListProps {
  loading: boolean;
  transactions: TransactionHeader[];
  getStatusColor: (status: string) => string;
  onEditClick: (transaction: TransactionHeader, detailIndex: number) => void;
  onDeleteClick?: (transaction: TransactionHeader, detailIndex: number) => void;
  onDeleteHeaderClick?: (transaction: TransactionHeader) => void;
  onAdvanceClick?: (transaction: TransactionHeader, detailIndex: number) => void;
  onEmailClick?: (transaction: TransactionHeader) => void;
  showAdvanceButton: boolean;
  onRefresh: () => void;
}

export function TransactionList({
  loading,
  transactions,
  getStatusColor,
  onEditClick,
  onDeleteClick,
  onDeleteHeaderClick,
  onAdvanceClick,
  onEmailClick,
  showAdvanceButton,
  onRefresh
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState({
    type: '',
    status: '',
    reference: '',
    createdBy: '',
    lastEditedBy: ''
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString.split('T')[0]);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const searchableValues = [
      transaction.reference_number,
      transaction.warehouse,
      transaction.customer_name,
      transaction.customer_po,
      transaction.shipment_carrier,
      transaction.shipping_document,
      transaction.comments,
      transaction.created_by_name,
      transaction.last_edited_by_name,
      transaction.transaction_type,
      formatDate(transaction.transaction_date),
      ...transaction.details?.map(d => [
        d.item_name,
        d.quantity?.toString(),
        d.inventory_status,
        d.status,
        d.lot_number,
        d.comments
      ]).flat() || []
    ].map(val => (val || '').toString().toLowerCase());

    const matchesSearch = searchTerm === '' || 
      searchableValues.some(val => val.includes(searchTerm.toLowerCase()));

    const matchesType = !filters.type || transaction.transaction_type === filters.type;
    const matchesStatus = !filters.status || transaction.details?.some(d => d.status === filters.status);
    const matchesReference = !filters.reference || transaction.reference_number?.includes(filters.reference);
    const matchesCreatedBy = !filters.createdBy || transaction.created_by_name?.toLowerCase().includes(filters.createdBy.toLowerCase());
    const matchesLastEditedBy = !filters.lastEditedBy || transaction.last_edited_by_name?.toLowerCase().includes(filters.lastEditedBy.toLowerCase());

    return matchesSearch && matchesType && matchesStatus && matchesReference && matchesCreatedBy && matchesLastEditedBy;
  });

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading transactions...
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No transactions found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="p-4 border-b space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions..."
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
              onClick={onRefresh}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All</option>
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
                <option value="Adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Received">Received</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Filter by creator..."
                value={filters.createdBy}
                onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2 w-32">Actions</th>
              <th className="px-4 py-2 w-32">Reference</th>
              <th className="px-4 py-2 w-32">Date</th>
              <th className="px-4 py-2 w-24">Type</th>
              <th className="px-4 py-2 w-40">Warehouse</th>
              <th className="px-4 py-2 w-40">Customer</th>
              <th className="px-4 py-2 w-32">Customer PO</th>
              <th className="px-4 py-2 w-32">Carrier/PRO #</th>
              <th className="px-4 py-2 w-32">Ship Doc/BOL</th>
              <th className="px-4 py-2 w-40">Item</th>
              <th className="px-4 py-2 w-24">Quantity</th>
              <th className="px-4 py-2 w-32">Inv Status</th>
              <th className="px-4 py-2 w-24">Status</th>
              <th className="px-4 py-2 w-32">Lot Number</th>
              <th className="px-4 py-2 w-40">Detail Comments</th>
              <th className="px-4 py-2 w-40">Header Comments</th>
              <th className="px-4 py-2 w-32">Created By</th>
              <th className="px-4 py-2 w-32">Last Edited</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredTransactions.map((transaction) => (
              transaction.details?.map((detail, detailIndex) => (
                <tr key={`${transaction.transaction_id}-${detail.detail_id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => onEditClick(transaction, detailIndex)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {onDeleteClick && (
                        <button
                          onClick={() => onDeleteClick(transaction, detailIndex)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete Detail"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteHeaderClick && detailIndex === 0 && (
                        <button
                          onClick={() => onDeleteHeaderClick(transaction)}
                          className="text-red-700 hover:text-red-900 p-1"
                          title="Delete Entire Transaction"
                        >
                          <FileX className="w-4 h-4" />
                        </button>
                      )}
                      {showAdvanceButton && onAdvanceClick && detail.status === 'Pending' && (
                        <button
                          onClick={() => onAdvanceClick(transaction, detailIndex)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Advance Status"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      {onEmailClick && detailIndex === 0 && (
                        <button
                          onClick={() => onEmailClick(transaction)}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          title="Generate Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.reference_number}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(transaction.transaction_date)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.transaction_type}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.warehouse}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.customer_name || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.customer_po || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.shipment_carrier || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.shipping_document || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{detail.item_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{detail.quantity}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{detail.inventory_status}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(detail.status)}`}>
                      {detail.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{detail.lot_number || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{detail.comments || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.comments || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.created_by_name || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{transaction.last_edited_by_name || '-'}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}