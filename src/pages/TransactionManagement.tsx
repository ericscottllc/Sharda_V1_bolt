import React, { useState } from 'react';
import { Package, Truck as TruckDelivery, ArrowRightLeft, FileText, Mail } from 'lucide-react';
import { useTransactions } from '../features/transactions/hooks/useTransactions';
import {
  TransactionHeader,
  TransactionDetail
} from '../features/transactions/types';

import { TransactionCreateModal } from '../features/transactions/components/modals/TransactionCreateModal';
import { TransactionEditModal } from '../features/transactions/components/modals/TransactionEditModal';
import { TransactionList } from '../features/transactions/components/TransactionList';
import { EmailBuilder } from '../features/email-builder/components/EmailBuilder';

export function TransactionManagement() {
  const {
    transactions,
    loading,
    createTransaction,
    updateTransactionDetail,
    updateTransactionHeader,
    deleteTransactionHeader,
    advanceTransactionToNextStep,
    fetchTransactions,
    deleteTransactionDetail
  } = useTransactions();

  // Create Transaction Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalType, setCreateModalType] =
    useState<'inbound-po' | 'outbound-so' | 'transfer' | 'other' | null>(null);

  // Edit Transaction Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHeader | null>(null);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState<number | null>(null);

  // Email Builder Modal
  const [showEmailBuilder, setShowEmailBuilder] = useState(false);
  const [selectedReference, setSelectedReference] = useState('');

  // Filter transactions based on line status
  const pendingTransactions = transactions.map(transaction => ({
    ...transaction,
    details: transaction.details?.filter(detail => detail.status === 'Pending') || []
  })).filter(t => t.details.length > 0);

  const transactionHistory = transactions.map(transaction => ({
    ...transaction,
    details: transaction.details?.filter(detail => detail.status !== 'Pending') || []
  })).filter(t => t.details.length > 0);

  // Provide color classes for statuses
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800';
      case 'Received':
        return 'bg-purple-100 text-purple-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handlers
  const handleNewTransaction = (type: 'inbound-po' | 'outbound-so' | 'transfer' | 'other') => {
    setCreateModalType(type);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalType(null);
    setShowCreateModal(false);
  };

  const handleEmailClick = (transaction: TransactionHeader) => {
    setSelectedReference(transaction.reference_number);
    setShowEmailBuilder(true);
  };

  // Called when user clicks "Edit" in the table
  const handleEditClick = (transaction: TransactionHeader, detailIndex: number) => {
    setSelectedTransaction(transaction);
    setSelectedDetailIndex(detailIndex);
    setShowEditModal(true);
  };

  // Handle delete click
  const handleDeleteClick = async (transaction: TransactionHeader, detailIndex: number) => {
    const detail = transaction.details?.[detailIndex];
    if (!detail) return;

    if (window.confirm('Are you sure you want to delete this transaction detail? This action cannot be undone.')) {
      const success = await deleteTransactionDetail(transaction.transaction_id, detail.detail_id);
      if (success) {
        await fetchTransactions();
      }
    }
  };

  // Handle delete entire transaction
  const handleDeleteHeaderClick = async (transaction: TransactionHeader) => {
    const detailCount = transaction.details?.length || 0;
    const confirmMessage = detailCount > 1 
      ? `Are you sure you want to delete this entire transaction and all ${detailCount} of its details? This action cannot be undone.`
      : 'Are you sure you want to delete this transaction? This action cannot be undone.';

    if (window.confirm(confirmMessage)) {
      const success = await deleteTransactionHeader(transaction.transaction_id);
      if (success) {
        await fetchTransactions();
      }
    }
  };

  // Save header changes
  const handleSaveHeader = async (transactionId: string, fields: Partial<TransactionHeader>) => {
    const success = await updateTransactionHeader(transactionId, fields);
    if (success) {
      await fetchTransactions();
    }
    return success;
  };

  // Save detail changes
  const handleSaveDetail = async (transactionId: string, detail: TransactionDetail) => {
    const success = await updateTransactionDetail(transactionId, detail);
    if (success) {
      await fetchTransactions();
    }
    return success;
  };

  // Called after user closes or successful creation
  const handleCompleteCreate = async () => {
    setCreateModalType(null);
    setShowCreateModal(false);
    await fetchTransactions();
  };

  // Advance next step for a specific detail
  const handleAdvanceNextStep = async (transaction: TransactionHeader, detailIndex: number) => {
    if (!transaction.details?.[detailIndex]) return;

    const detail = transaction.details[detailIndex];
    let nextStatus: string;
    
    switch (transaction.transaction_type) {
      case 'Inbound':
        nextStatus = 'Received';
        break;
      case 'Outbound':
        nextStatus = 'Shipped';
        break;
      case 'Adjustment':
        nextStatus = 'Completed';
        break;
      default:
        return;
    }

    const updatedDetail = {
      ...detail,
      status: nextStatus
    };

    const success = await updateTransactionDetail(transaction.transaction_id, updatedDetail);
    if (success) {
      await fetchTransactions();
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Transaction Management</h1>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleNewTransaction('inbound-po')}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700"
        >
          <Package className="w-5 h-5" />
          <span>Inbound PO</span>
        </button>
        <button
          onClick={() => handleNewTransaction('outbound-so')}
          className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700"
        >
          <TruckDelivery className="w-5 h-5" />
          <span>Outbound SO</span>
        </button>
        <button
          onClick={() => handleNewTransaction('transfer')}
          className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700"
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span>Transfer</span>
        </button>
        <button
          onClick={() => handleNewTransaction('other')}
          className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700"
        >
          <FileText className="w-5 h-5" />
          <span>Other</span>
        </button>
      </div>

      {/* Pending Transactions Section */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Pending Transactions</h2>
        </div>
        <TransactionList
          loading={loading}
          transactions={pendingTransactions}
          getStatusColor={getStatusColor}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onDeleteHeaderClick={handleDeleteHeaderClick}
          onAdvanceClick={handleAdvanceNextStep}
          onEmailClick={handleEmailClick}
          showAdvanceButton={true}
          onRefresh={fetchTransactions}
        />
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Transaction History</h2>
        </div>
        <TransactionList
          loading={loading}
          transactions={transactionHistory}
          getStatusColor={getStatusColor}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onDeleteHeaderClick={handleDeleteHeaderClick}
          onEmailClick={handleEmailClick}
          showAdvanceButton={false}
          onRefresh={fetchTransactions}
        />
      </div>

      {/* Create Modal */}
      <TransactionCreateModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onComplete={handleCompleteCreate}
        initialWorkflow={createModalType}
      />

      {/* Edit Modal */}
      <TransactionEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
          setSelectedDetailIndex(null);
        }}
        transaction={selectedTransaction}
        detailIndex={selectedDetailIndex}
        onSaveHeader={handleSaveHeader}
        onSaveDetail={handleSaveDetail}
      />

      {/* Email Builder Modal */}
      {showEmailBuilder && (
        <EmailBuilder
          referenceNumber={selectedReference}
          onClose={() => setShowEmailBuilder(false)}
        />
      )}
    </div>
  );
}