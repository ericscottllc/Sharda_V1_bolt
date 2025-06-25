import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import {
  CustomerReport,
  ItemReport,
  ProductReport,
  WarehouseReport,
  NegativeInventoryReport,
  InventorySummary,
} from '../types';

/**
 * Safely converts a value to a number, returning 0 if the value is null or undefined
 */
function toNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Fetch from the "inventory_view" view using filters.
 */
async function fetchInventorySummary(filters: {
  item?: string;
  items?: string[];
  warehouse?: string;
  negative?: boolean;
}): Promise<InventorySummary[]> {
  let query = supabase.from('inventory_view').select('*');

  if (filters.item) {
    query = query.eq('"Item Name"', filters.item);
  }
  if (filters.items && filters.items.length > 0) {
    query = query.in('"Item Name"', filters.items);
  }
  if (filters.warehouse) {
    query = query.eq('Warehouse', filters.warehouse);
  }
  if (filters.negative) {
    query = query.lt('"On Hand: Total"', 0);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchInventorySummary error:', error);
    throw error;
  }

  // Ensure all numeric values are properly converted from null/undefined to numbers
  return (data || []).map(row => ({
    'Item Name': row['Item Name'],
    'Warehouse': row['Warehouse'],
    'Date': row['Date'],
    'Inventory As Of Date': toNumber(row['Inventory As Of Date']),
    'On Hand: Total': toNumber(row['On Hand: Total']),
    'On Hand: Stock': toNumber(row['On Hand: Stock']),
    'On Hand: Consignment': toNumber(row['On Hand: Consignment']),
    'On Hand: Hold': toNumber(row['On Hand: Hold']),
    'Inbound: Total': toNumber(row['Inbound: Total']),
    'Inbound: Stock': toNumber(row['Inbound: Stock']),
    'Inbound: Consignment': toNumber(row['Inbound: Consignment']),
    'Inbound: Hold': toNumber(row['Inbound: Hold']),
    'Scheduled Outbound: Total': toNumber(row['Scheduled Outbound: Total']),
    'Scheduled Outbound: Stock': toNumber(row['Scheduled Outbound: Stock']),
    'Scheduled Outbound: Consign': toNumber(row['Scheduled Outbound: Consign']),
    'Scheduled Outbound: Hold': toNumber(row['Scheduled Outbound: Hold']),
    'Future Inventory: Total': toNumber(row['Future Inventory: Total']),
    'Future Inventory: Stock': toNumber(row['Future Inventory: Stock']),
    'Future Inventory: Consign': toNumber(row['Future Inventory: Consign']),
    'Future Inventory: Hold': toNumber(row['Future Inventory: Hold'])
  }));
}

export function useReports() {
  const [loading, setLoading] = useState(false);

  // 1) CUSTOMER REPORT
  async function getCustomerReport(): Promise<CustomerReport> {
    try {
      const { data, error } = await supabase
        .from('transaction_header')
        .select('*, details:transaction_detail(*)')
        .order('transaction_date', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return { all_transactions: data || [] };
    } catch (err) {
      console.error('Error fetching customer report:', err);
      toast.error('Failed to fetch customer report');
      return { all_transactions: [] };
    }
  }

  // 2) ITEM REPORT - Using the view directly
  async function getItemReport(itemName: string): Promise<ItemReport> {
    try {
      const summary = await fetchInventorySummary({ item: itemName });

      const totalOnHand = {
        total: 0,
        stock: 0,
        consign: 0,
        hold: 0
      };

      const byWarehouse = summary.map(row => ({
        warehouse: row['Warehouse'],
        on_hand: {
          total: toNumber(row['On Hand: Total']),
          stock: toNumber(row['On Hand: Stock']),
          consign: toNumber(row['On Hand: Consignment']),
          hold: toNumber(row['On Hand: Hold'])
        },
        inbound: {
          total: toNumber(row['Inbound: Total']),
          stock: toNumber(row['Inbound: Stock']),
          consign: toNumber(row['Inbound: Consignment']),
          hold: toNumber(row['Inbound: Hold'])
        },
        scheduled_outbound: {
          total: toNumber(row['Scheduled Outbound: Total']),
          stock: toNumber(row['Scheduled Outbound: Stock']),
          consign: toNumber(row['Scheduled Outbound: Consign']),
          hold: toNumber(row['Scheduled Outbound: Hold'])
        },
        future_inventory: {
          total: toNumber(row['Future Inventory: Total']),
          stock: toNumber(row['Future Inventory: Stock']),
          consign: toNumber(row['Future Inventory: Consign']),
          hold: toNumber(row['Future Inventory: Hold'])
        }
      }));

      // Calculate totals
      byWarehouse.forEach(wh => {
        totalOnHand.total += wh.on_hand.total;
        totalOnHand.stock += wh.on_hand.stock;
        totalOnHand.consign += wh.on_hand.consign;
        totalOnHand.hold += wh.on_hand.hold;
      });

      // Get transactions from the view
      const { data: viewData, error: viewError } = await supabase
        .from('vw_transaction_full')
        .select('*')
        .eq('item_name', itemName)
        .order('transaction_date', { ascending: false });

      if (viewError) throw viewError;

      // Transform view data into expected format
      const transactions = (viewData || []).map(row => ({
        transaction_id: row.transaction_id,
        transaction_type: row.transaction_type,
        transaction_date: row.transaction_date,
        reference_number: row.reference_number,
        warehouse: row.warehouse,
        customer_name: row.customer_name,
        customer_po: row.customer_po,
        shipment_carrier: row.shipment_carrier,
        shipping_document: row.shipping_document,
        comments: row.header_comments,
        details: [{
          detail_id: row.detail_id,
          item_name: row.item_name,
          quantity: toNumber(row.quantity),
          inventory_status: row.inventory_status,
          status: row.detail_status,
          lot_number: row.lot_number,
          comments: row.detail_comments
        }]
      }));

      return {
        item_name: itemName,
        total_on_hand: totalOnHand,
        by_warehouse: byWarehouse,
        transactions: transactions,
        transaction_count: transactions.length
      };
    } catch (err) {
      console.error('Error fetching item report:', err);
      toast.error('Failed to fetch item report');
      return {
        item_name: itemName,
        total_on_hand: { total: 0, stock: 0, consign: 0, hold: 0 },
        by_warehouse: [],
        transactions: [],
        transaction_count: 0
      };
    }
  }

  // 3) PRODUCT REPORT
  async function getProductReport(productName: string): Promise<ProductReport> {
    try {
      // Get all items for this product
      const { data: itemsData, error: itemsError } = await supabase
        .from('item')
        .select('item_name')
        .eq('product_name', productName);

      if (itemsError) throw itemsError;
      const itemNames = itemsData?.map(i => i.item_name) || [];

      // Get inventory for all items
      const summary = await fetchInventorySummary({ items: itemNames });

      // Group by item
      const itemSummaries = new Map();
      summary.forEach(row => {
        const itemName = row['Item Name'];
        if (!itemSummaries.has(itemName)) {
          itemSummaries.set(itemName, {
            item_name: itemName,
            total_on_hand: {
              total: 0,
              stock: 0,
              consign: 0,
              hold: 0
            },
            by_warehouse: []
          });
        }

        const item = itemSummaries.get(itemName);
        item.total_on_hand.total += toNumber(row['On Hand: Total']);
        item.total_on_hand.stock += toNumber(row['On Hand: Stock']);
        item.total_on_hand.consign += toNumber(row['On Hand: Consignment']);
        item.total_on_hand.hold += toNumber(row['On Hand: Hold']);

        item.by_warehouse.push({
          warehouse: row['Warehouse'],
          on_hand: {
            total: toNumber(row['On Hand: Total']),
            stock: toNumber(row['On Hand: Stock']),
            consign: toNumber(row['On Hand: Consignment']),
            hold: toNumber(row['On Hand: Hold'])
          }
        });
      });

      // Get transactions from view
      const { data: viewData, error: viewError } = await supabase
        .from('vw_transaction_full')
        .select('*')
        .in('item_name', itemNames)
        .order('transaction_date', { ascending: false });

      if (viewError) throw viewError;

      // Transform view data
      const transactions = (viewData || []).map(row => ({
        transaction_id: row.transaction_id,
        transaction_type: row.transaction_type,
        transaction_date: row.transaction_date,
        reference_number: row.reference_number,
        warehouse: row.warehouse,
        customer_name: row.customer_name,
        details: [{
          detail_id: row.detail_id,
          item_name: row.item_name,
          quantity: toNumber(row.quantity),
          inventory_status: row.inventory_status,
          status: row.detail_status,
          lot_number: row.lot_number,
          comments: row.detail_comments
        }]
      }));

      return {
        product_name: productName,
        items: Array.from(itemSummaries.values()),
        transactions: transactions,
        transaction_count: transactions.length
      };
    } catch (err) {
      console.error('Error fetching product report:', err);
      toast.error('Failed to fetch product report');
      return {
        product_name: productName,
        items: [],
        transactions: [],
        transaction_count: 0
      };
    }
  }

  // 4) WAREHOUSE REPORT
  async function getWarehouseReport(warehouseName: string): Promise<WarehouseReport> {
    try {
      // Get inventory summary
      const summary = await fetchInventorySummary({ warehouse: warehouseName });

      // Get transactions
      const { data: transactions, error: txError } = await supabase
        .from('vw_transaction_full')
        .select('*')
        .eq('warehouse', warehouseName)
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;

      const items = summary.map(row => ({
        item_name: row['Item Name'],
        inventory_status: row['On Hand: Stock'] > 0 ? 'Stock' : 
                        row['On Hand: Consignment'] > 0 ? 'Consignment' : 
                        row['On Hand: Hold'] > 0 ? 'Hold' : 'Stock',
        on_hand: {
          total: toNumber(row['On Hand: Total']),
          stock: toNumber(row['On Hand: Stock']),
          consign: toNumber(row['On Hand: Consignment']),
          hold: toNumber(row['On Hand: Hold'])
        },
        inbound: {
          total: toNumber(row['Inbound: Total']),
          stock: toNumber(row['Inbound: Stock']),
          consign: toNumber(row['Inbound: Consignment']),
          hold: toNumber(row['Inbound: Hold'])
        },
        scheduled_outbound: {
          total: toNumber(row['Scheduled Outbound: Total']),
          stock: toNumber(row['Scheduled Outbound: Stock']),
          consign: toNumber(row['Scheduled Outbound: Consign']),
          hold: toNumber(row['Scheduled Outbound: Hold'])
        },
        future_inventory: {
          total: toNumber(row['Future Inventory: Total']),
          stock: toNumber(row['Future Inventory: Stock']),
          consign: toNumber(row['Future Inventory: Consign']),
          hold: toNumber(row['Future Inventory: Hold'])
        }
      }));

      return {
        warehouse_name: warehouseName,
        items,
        transactions: transactions || []
      };
    } catch (err) {
      console.error('Error fetching warehouse report:', err);
      toast.error('Failed to fetch warehouse report');
      return { 
        warehouse_name: warehouseName, 
        items: [],
        transactions: []
      };
    }
  }

  // 5) NEGATIVE INVENTORY REPORT
  async function getNegativeInventoryReport(): Promise<NegativeInventoryReport> {
    try {
      const summary = await fetchInventorySummary({ negative: true });
      const negativeItems = summary.map(row => ({
        item_name: row['Item Name'],
        warehouse: row['Warehouse'],
        on_hand_total: toNumber(row['On Hand: Total'])
      }));
      return { negative_items: negativeItems };
    } catch (err) {
      console.error('Error fetching negative inventory report:', err);
      toast.error('Failed to fetch negative inventory report');
      return { negative_items: [] };
    }
  }

  return {
    loading,
    getCustomerReport,
    getItemReport,
    getProductReport,
    getWarehouseReport,
    getNegativeInventoryReport
  };
}