import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import {
  TransactionHeader,
  TransactionDetail,
  TransactionFormData,
  TransactionStatus,
  TransactionType
} from '../types';
import { addBusinessDays } from '../utils/dateUtils';
import { useAuth } from '../../auth/hooks/useAuth';

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      console.log('Fetching transactions...');

      // Query the view directly
      const { data: viewData, error } = await supabase
        .from('vw_transaction_full')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      // Group the flat view data by transaction_id
      const transactionMap = new Map<string, TransactionHeader>();

      viewData?.forEach(row => {
        if (!transactionMap.has(row.transaction_id)) {
          // Create new transaction header
          transactionMap.set(row.transaction_id, {
            transaction_id: row.transaction_id,
            transaction_type: row.transaction_type,
            transaction_date: row.transaction_date,
            reference_type: row.reference_type,
            reference_number: row.reference_number,
            warehouse: row.warehouse,
            shipment_carrier: row.shipment_carrier,
            shipping_document: row.shipping_document,
            customer_po: row.customer_po,
            customer_name: row.customer_name,
            comments: row.header_comments,
            created_at: row.header_created_at,
            last_edited_at: row.header_last_updated_at,
            created_by: row.created_by,
            last_edited_by: row.last_edited_by,
            created_by_name: row.created_by_name,
            last_edited_by_name: row.last_edited_by_name,
            details: []
          });
        }

        // Add detail to existing transaction
        const transaction = transactionMap.get(row.transaction_id)!;
        transaction.details?.push({
          detail_id: row.detail_id,
          transaction_id: row.transaction_id,
          item_name: row.item_name,
          quantity: parseFloat(row.quantity),
          inventory_status: row.inventory_status,
          status: row.detail_status,
          lot_number: row.lot_number,
          comments: row.detail_comments,
          created_by: row.created_by,
          last_edited_by: row.last_edited_by,
          created_by_name: row.created_by_name,
          last_edited_by_name: row.last_edited_by_name
        });
      });

      setTransactions(Array.from(transactionMap.values()));
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }

  async function updateTransactionDetail(transactionId: string, detail: TransactionDetail) {
    try {
      if (!user) return false;

      const transactionType = await getTransactionType(transactionId);

      if (!isStatusValidForType(detail.status, transactionType)) {
        toast.error(`Status "${detail.status}" not allowed for ${transactionType} transaction.`);
        return false;
      }

      const { error } = await supabase
        .from('transaction_detail')
        .update({
          quantity: detail.quantity,
          inventory_status: detail.inventory_status,
          status: detail.status,
          lot_number: detail.lot_number,
          comments: detail.comments,
          last_edited_by: user.id
        })
        .eq('detail_id', detail.detail_id);

      if (error) {
        console.error('Error updating transaction detail:', error);
        if (error.code === '42501') {
          toast.error('You do not have permission to update transaction details');
          return false;
        }
        throw error;
      }

      toast.success('Transaction detail updated');
      await fetchTransactions();
      return true;
    } catch (error: any) {
      console.error('Error updating transaction detail:', error);
      if (error.code === '42501') {
        toast.error('You do not have permission to perform this action');
      } else {
        toast.error('Failed to update transaction detail');
      }
      return false;
    }
  }

  async function updateTransactionHeader(transactionId: string, fields: Partial<TransactionHeader>) {
    try {
      if (!user) return false;

      const { error } = await supabase
        .from('transaction_header')
        .update({
          transaction_date: fields.transaction_date,
          warehouse: fields.warehouse,
          shipment_carrier: fields.shipment_carrier,
          shipping_document: fields.shipping_document,
          customer_po: fields.customer_po,
          customer_name: fields.customer_name,
          comments: fields.comments,
          last_edited_by: user.id
        })
        .eq('transaction_id', transactionId);

      if (error) {
        console.error('Error updating transaction header:', error);
        if (error.code === '42501') {
          toast.error('You do not have permission to update transactions');
          return false;
        }
        throw error;
      }

      toast.success('Transaction header updated');
      await fetchTransactions();
      return true;
    } catch (error: any) {
      console.error('Error updating transaction header:', error);
      if (error.code === '42501') {
        toast.error('You do not have permission to perform this action');
      } else {
        toast.error('Failed to update transaction header');
      }
      return false;
    }
  }

  async function deleteTransactionDetail(transactionId: string, detailId: string) {
    try {
      if (!user) return false;

      // Validate transactionId and detailId
      if (!transactionId || !detailId || detailId === 'null' || detailId === 'undefined') {
        console.error('Invalid transaction or detail ID:', { transactionId, detailId });
        toast.error('Invalid transaction detail');
        return false;
      }

      const { error } = await supabase
        .from('transaction_detail')
        .delete()
        .eq('transaction_id', transactionId)
        .eq('detail_id', detailId);

      if (error) {
        console.error('Error deleting transaction detail:', error);
        if (error.code === '42501') {
          toast.error('You do not have permission to delete transaction details');
          return false;
        }
        throw error;
      }

      toast.success('Transaction detail deleted');
      await fetchTransactions();
      return true;
    } catch (error: any) {
      console.error('Error deleting transaction detail:', error);
      if (error.code === '42501') {
        toast.error('You do not have permission to perform this action');
      } else {
        toast.error('Failed to delete transaction detail');
      }
      return false;
    }
  }

  async function deleteTransactionHeader(transactionId: string) {
    try {
      if (!user) return false;

      // Validate transactionId
      if (!transactionId || transactionId === 'null' || transactionId === 'undefined') {
        console.error('Invalid transaction ID:', { transactionId });
        toast.error('Invalid transaction');
        return false;
      }

      // Check if there are any related transactions (for transfer orders)
      const { data: relatedTransactions, error: relatedError } = await supabase
        .from('transaction_header')
        .select('transaction_id, reference_number')
        .eq('related_transaction_id', transactionId);

      if (relatedError) {
        console.error('Error checking related transactions:', relatedError);
        throw relatedError;
      }

      if (relatedTransactions && relatedTransactions.length > 0) {
        const relatedRefs = relatedTransactions.map(t => t.reference_number).join(', ');
        toast.error(`Cannot delete transaction. Related transactions exist: ${relatedRefs}`);
        return false;
      }

      // First delete all transaction details
      const { error: detailsError } = await supabase
        .from('transaction_detail')
        .delete()
        .eq('transaction_id', transactionId);

      if (detailsError) {
        console.error('Error deleting transaction details:', detailsError);
        if (detailsError.code === '42501') {
          toast.error('You do not have permission to delete transaction details');
          return false;
        }
        throw detailsError;
      }

      // Then delete the transaction header
      const { error: headerError } = await supabase
        .from('transaction_header')
        .delete()
        .eq('transaction_id', transactionId);

      if (headerError) {
        console.error('Error deleting transaction header:', headerError);
        if (headerError.code === '42501') {
          toast.error('You do not have permission to delete transactions');
          return false;
        }
        throw headerError;
      }

      toast.success('Transaction deleted successfully');
      await fetchTransactions();
      return true;
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      if (error.code === '42501') {
        toast.error('You do not have permission to perform this action');
      } else {
        toast.error('Failed to delete transaction');
      }
      return false;
    }
  }

  async function createTransaction(data: TransactionFormData) {
    try {
      if (!user) return null;

      if (!isStatusValidForType(data.status, data.type)) {
        toast.error(`Status "${data.status}" is not allowed for ${data.type} transaction`);
        return null;
      }

      let prefix = '';
      if (data.type === 'Inbound') prefix = 'IB-';
      else if (data.type === 'Outbound') prefix = 'OB-';
      else if (data.type === 'Adjustment') prefix = 'ADJ-';

      const { data: lastRef } = await supabase
        .from('transaction_header')
        .select('reference_number')
        .ilike('reference_number', `${prefix}%`)
        .order('reference_number', { ascending: false })
        .limit(1);

      let sequence = 100001; // Start from 100001 if no previous transactions
      if (lastRef && lastRef.length > 0) {
        const lastNum = parseInt(lastRef[0].reference_number.split('-')[1]) || 100000;
        sequence = lastNum + 1;
      }

      const referenceNumber = `${prefix}${sequence}`;
      const transaction_id = crypto.randomUUID();

      const { data: headerData, error: headerError } = await supabase
        .from('transaction_header')
        .insert([{
          transaction_id,
          transaction_type: data.type,
          transaction_date: data.date,
          warehouse: data.warehouse || null,
          reference_type: data.referenceType,
          reference_number: referenceNumber,
          shipment_carrier: data.shipmentCarrier,
          shipping_document: data.shippingDocument,
          customer_po: data.customerPO,
          customer_name: data.customerName,
          comments: data.comments,
          related_transaction_id: data.relatedTransactionId || null,
          created_by: user.id,
          last_edited_by: user.id
        }])
        .select()
        .single();

      if (headerError) throw headerError;

      const details = data.items.map(item => ({
        detail_id: crypto.randomUUID(),
        transaction_id,
        item_name: item.item_name,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        inventory_status: data.inventoryStatus,
        status: data.status,
        lot_number: item.lot_number || null,
        comments: item.comments || null,
        created_by: user.id,
        last_edited_by: user.id
      }));

      const { error: detailsError } = await supabase
        .from('transaction_detail')
        .insert(details);

      if (detailsError) throw detailsError;

      if (data.referenceType === 'Transfer Order' && data.transferToWarehouse) {
        const inboundReference = `IB-${sequence}`;
        const inboundId = crypto.randomUUID();
        const transferDate = data.transferDate ||
          addBusinessDays(new Date(data.date), 2).toISOString().split('T')[0];

        const { error: inboundHeaderError } = await supabase
          .from('transaction_header')
          .insert([{
            transaction_id: inboundId,
            transaction_type: 'Inbound',
            transaction_date: transferDate,
            warehouse: data.transferToWarehouse,
            reference_type: 'Transfer Order',
            reference_number: inboundReference,
            shipment_carrier: data.shipmentCarrier,
            shipping_document: data.shippingDocument,
            comments: data.comments,
            related_transaction_id: transaction_id,
            created_by: user.id,
            last_edited_by: user.id
          }]);

        if (inboundHeaderError) throw inboundHeaderError;

        const inboundDetails = data.items.map(item => ({
          detail_id: crypto.randomUUID(),
          transaction_id: inboundId,
          item_name: item.item_name,
          quantity: typeof item.quantity === 'number' ? item.quantity : 0,
          inventory_status: data.transferToInventoryStatus || data.inventoryStatus,
          status: 'Pending',
          lot_number: item.lot_number || null,
          comments: item.comments || null,
          created_by: user.id,
          last_edited_by: user.id
        }));

        const { error: inboundDetailsError } = await supabase
          .from('transaction_detail')
          .insert(inboundDetails);

        if (inboundDetailsError) throw inboundDetailsError;
      }

      toast.success('Transaction created successfully');
      await fetchTransactions();
      return headerData;
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error(error.message || 'Failed to create transaction');
      return null;
    }
  }

  function isStatusValidForType(status: TransactionStatus, transactionType: TransactionType) {
    switch (transactionType) {
      case 'Inbound':
        return status === 'Pending' || status === 'Received';
      case 'Outbound':
        return status === 'Pending' || status === 'Shipped';
      case 'Adjustment':
        return status === 'Pending' || status === 'Completed';
      default:
        return true;
    }
  }

  async function getTransactionType(transactionId: string): Promise<TransactionType> {
    const { data, error } = await supabase
      .from('transaction_header')
      .select('transaction_type')
      .eq('transaction_id', transactionId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch transaction type', error);
      return 'Adjustment';
    }
    return data.transaction_type as TransactionType;
  }

  function getNextStatusForType(transactionType: TransactionType): TransactionStatus | null {
    if (transactionType === 'Inbound') return 'Received';
    if (transactionType === 'Outbound') return 'Shipped';
    if (transactionType === 'Adjustment') return 'Completed';
    return null;
  }

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
    updateTransactionDetail,
    updateTransactionHeader,
    deleteTransactionDetail,
    deleteTransactionHeader,
    advanceTransactionToNextStep: async () => false
  };
}