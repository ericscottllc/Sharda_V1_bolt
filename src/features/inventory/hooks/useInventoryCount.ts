import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CountData, Variance, PendingTransaction } from '../types';
import toast from 'react-hot-toast';

export function useInventoryCount() {
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [countData, setCountData] = useState<CountData[]>([]);
  const [calculatedInventory, setCalculatedInventory] = useState<any[]>([]);
  const [variances, setVariances] = useState<Variance[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInitialInventory() {
      if (!selectedWarehouse || !selectedDate) return;

      try {
        setLoading(true);
        setError('');

        const { data: snapshot, error: snapshotError } = await supabase
          .from('transactions_inventory_snapshot_by_date')
          .select('*')
          .eq('warehouse', selectedWarehouse)
          .lte('transaction_date', selectedDate)
          .order('item_name', { ascending: true })
          .order('transaction_date', { ascending: false });

        if (snapshotError) throw snapshotError;

        const latestSnapshots = new Map();
        snapshot?.forEach(record => {
          const key = record.item_name;
          if (!latestSnapshots.has(key)) {
            latestSnapshots.set(key, record);
          }
        });

        const processedSnapshot = Array.from(latestSnapshots.values()).filter(item => 
          item['On Hand: Stock'] !== 0 ||
          item['On Hand: Consign'] !== 0 ||
          item['On Hand: Hold'] !== 0
        );

        const { data: items, error: itemsError } = await supabase
          .from('item')
          .select(`
            item_name,
            pack_size (
              uom_per_each
            )
          `);

        if (itemsError) throw itemsError;

        const uomMap = new Map(
          items?.map(item => [
            item.item_name,
            item.pack_size?.uom_per_each || null
          ])
        );

        const initialCountData: CountData[] = [];
        
        processedSnapshot.forEach(item => {
          if (item['On Hand: Stock'] > 0) {
            initialCountData.push({
              itemName: item.item_name,
              quantity: 0,
              inventoryStatus: 'Stock',
              notes: '',
              uomPerEach: uomMap.get(item.item_name) || null,
              caseCount: 0
            });
          }
          
          if (item['On Hand: Consign'] > 0) {
            initialCountData.push({
              itemName: item.item_name,
              quantity: 0,
              inventoryStatus: 'Consignment',
              notes: '',
              uomPerEach: uomMap.get(item.item_name) || null,
              caseCount: 0
            });
          }
          
          if (item['On Hand: Hold'] > 0) {
            initialCountData.push({
              itemName: item.item_name,
              quantity: 0,
              inventoryStatus: 'Hold',
              notes: '',
              uomPerEach: uomMap.get(item.item_name) || null,
              caseCount: 0
            });
          }
        });

        setCountData(initialCountData);
        setCalculatedInventory(processedSnapshot || []);

      } catch (err: any) {
        console.error('Error fetching initial inventory:', err);
        setError(err.message);
        toast.error('Failed to fetch inventory items');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialInventory();
  }, [selectedWarehouse, selectedDate]);

  const calculateVariances = useCallback(async () => {
    if (!selectedWarehouse || !selectedDate || !countData.length) return;

    try {
      setLoading(true);
      setError('');

      const newVariances = countData.map(count => {
        const calculated = calculatedInventory.find(calc => 
          calc.item_name === count.itemName
        ) || {
          'On Hand: Total': 0,
          'On Hand: Stock': 0,
          'On Hand: Consign': 0,
          'On Hand: Hold': 0
        };

        let calculatedCount = 0;
        switch (count.inventoryStatus) {
          case 'Stock':
            calculatedCount = calculated['On Hand: Stock'] || 0;
            break;
          case 'Consignment':
            calculatedCount = calculated['On Hand: Consign'] || 0;
            break;
          case 'Hold':
            calculatedCount = calculated['On Hand: Hold'] || 0;
            break;
        }

        return {
          itemName: count.itemName,
          inventoryStatus: count.inventoryStatus,
          physicalCount: count.quantity,
          calculatedCount: calculatedCount,
          variance: count.quantity - calculatedCount
        };
      });

      setVariances(newVariances);

      const { data: pendingTx, error: pendingError } = await supabase
        .from('transaction_header')
        .select(`
          *,
          details:transaction_detail(*)
        `)
        .eq('warehouse', selectedWarehouse)
        .eq('details.status', 'Pending')
        .lte('transaction_date', selectedDate)
        .order('transaction_date', { ascending: true });

      if (pendingError) throw pendingError;

      setPendingTransactions(pendingTx || []);

    } catch (err: any) {
      console.error('Error calculating variances:', err);
      setError(err.message);
      toast.error('Failed to calculate variances');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedDate, countData, calculatedInventory]);

  const generateAdjustment = useCallback(async () => {
    if (!selectedWarehouse || !selectedDate || variances.length === 0) return;

    try {
      setLoading(true);
      setError('');

      // Get the last adjustment number
      const { data: lastRef } = await supabase
        .from('transaction_header')
        .select('reference_number')
        .ilike('reference_number', 'ADJ-%')
        .order('reference_number', { ascending: false })
        .limit(1);

      let sequence = 100001; // Start from 100001 if no previous adjustments
      if (lastRef && lastRef.length > 0) {
        const lastNum = parseInt(lastRef[0].reference_number.split('-')[1]) || 100000;
        sequence = lastNum + 1;
      }

      const adjustmentId = crypto.randomUUID();
      const { error: headerError } = await supabase
        .from('transaction_header')
        .insert({
          transaction_id: adjustmentId,
          transaction_type: 'Adjustment',
          transaction_date: selectedDate,
          warehouse: selectedWarehouse,
          reference_type: 'Inventory Count',
          reference_number: `ADJ-${sequence}`,
          comments: `Inventory count adjustment for ${selectedWarehouse} as of ${selectedDate}`
        });

      if (headerError) throw headerError;

      const details = variances
        .filter(v => v.variance !== 0)
        .map(variance => ({
          detail_id: crypto.randomUUID(),
          transaction_id: adjustmentId,
          item_name: variance.itemName,
          quantity: variance.variance,
          inventory_status: variance.inventoryStatus,
          status: 'Completed',
          comments: variance.variance > 0 ? 'Count overage' : 'Count shortage'
        }));

      const { error: detailsError } = await supabase
        .from('transaction_detail')
        .insert(details);

      if (detailsError) throw detailsError;

      toast.success('Adjustment transaction created successfully');
      return adjustmentId;

    } catch (err: any) {
      console.error('Error generating adjustment:', err);
      setError(err.message);
      toast.error('Failed to generate adjustment');
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedDate, variances]);

  return {
    selectedWarehouse,
    selectedDate,
    countData,
    calculatedInventory,
    variances,
    pendingTransactions,
    loading,
    error,
    setSelectedWarehouse,
    setSelectedDate,
    setCountData,
    calculateVariances,
    generateAdjustment
  };
}