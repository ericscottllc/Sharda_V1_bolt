import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface ViewInfo {
  name: string;
  columns: string[];
}

interface WhereClause {
  column: string;
  operator: string;
  value: string;
}

// Predefined views and their columns based on the database schema
const AVAILABLE_VIEWS: ViewInfo[] = [
  {
    name: 'vw_transaction_full',
    columns: [
      'transaction_id',
      'transaction_type',
      'transaction_date',
      'reference_type',
      'reference_number',
      'customer_po',
      'customer_name',
      'warehouse',
      'shipment_carrier',
      'shipping_document',
      'header_comments',
      'header_created_at',
      'header_last_updated_at',
      'detail_id',
      'item_name',
      'quantity',
      'inventory_status',
      'lot_number',
      'detail_comments',
      'detail_status',
      'detail_created_at',
      'detail_last_updated_at'
    ]
  },
  {
    name: 'inventory_view',
    columns: [
      'Item Name',
      'Warehouse',
      'Date',
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
    ]
  }
];

export function useDynamicReport() {
  const [views, setViews] = useState<ViewInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with predefined views instead of fetching from database
    setViews(AVAILABLE_VIEWS);
  }, []);

  const formatValue = (value: string, operator: string): string => {
    // Handle IN and NOT IN operators
    if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {
      // Split by comma and wrap each value in quotes
      const values = value.split(',').map(v => `'${v.trim()}'`).join(',');
      return `(${values})`;
    }

    // Handle LIKE and NOT LIKE operators
    if (operator.toUpperCase().includes('LIKE')) {
      return `'%${value}%'`;
    }

    // Handle numeric values
    if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
      return value;
    }

    // Handle date values
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `'${value}'::date`;
    }

    if (value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return `'${value}'::timestamp`;
    }

    // Default: treat as string
    return `'${value.replace(/'/g, "''")}'`;
  };

  async function executeQuery(
    viewName: string,
    selectedColumns: string[],
    whereClauses: WhereClause[]
  ) {
    try {
      setLoading(true);
      setError(null);

      // Validate view name to prevent SQL injection
      if (!AVAILABLE_VIEWS.some(view => view.name === viewName)) {
        throw new Error('Invalid view name');
      }

      // Validate columns to prevent SQL injection
      const validColumns = AVAILABLE_VIEWS.find(view => view.name === viewName)?.columns || [];
      if (!selectedColumns.every(col => validColumns.includes(col))) {
        throw new Error('Invalid column selection');
      }

      // Build the WHERE clause with proper value formatting
      const whereConditions = whereClauses
        .filter(clause => clause.column && clause.operator && clause.value)
        .map(clause => {
          const formattedValue = formatValue(clause.value, clause.operator);
          return `${clause.column} ${clause.operator} ${formattedValue}`;
        })
        .join(' AND ');

      const query = `
        SELECT ${selectedColumns.join(', ')}
        FROM ${viewName}
        ${whereConditions ? `WHERE ${whereConditions}` : ''}
        LIMIT 1000
      `;

      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: query
      });

      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      console.error('Error executing query:', err);
      setError(err.message);
      toast.error('Failed to execute query');
    } finally {
      setLoading(false);
    }
  }

  return {
    views,
    results,
    loading,
    error,
    executeQuery
  };
}