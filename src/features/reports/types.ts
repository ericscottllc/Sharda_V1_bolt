/**
 * Reflects the columns in the inventory_view.
 * Note: Using exact column names from the view for type safety
 */
export interface InventorySummary {
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

export interface TransactionDetail {
  detail_id: string;
  item_name: string;
  quantity: number;
  inventory_status: string;
  lot_number?: string;
  comments?: string;
  status: string;
}

export interface TransactionHeader {
  transaction_id: string;
  transaction_type: string;
  transaction_date: string;
  warehouse: string;
  reference_number?: string;
  customer_name?: string;
  shipping_document?: string;
  customer_po?: string;
  details: TransactionDetail[];
}

// For Customer Report
export interface CustomerReport {
  all_transactions: TransactionHeader[];
}

// For Item Report
export interface ItemReport {
  item_name: string;
  total_on_hand: {
    total: number;
    stock: number;
    consign: number;
    hold: number;
  };
  by_warehouse: {
    warehouse: string;
    on_hand: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
    inbound: { 
      total: number; 
      stock: number; 
      consign: number; 
      hold: number 
    };
    scheduled_outbound: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
    future_inventory: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
  }[];
  transactions: TransactionHeader[];
  transaction_count: number;
}

// For Product Report
export interface ProductReport {
  product_name: string;
  items: {
    item_name: string;
    total_on_hand: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
    by_warehouse: {
      warehouse: string;
      on_hand: {
        total: number;
        stock: number;
        consign: number;
        hold: number;
      };
    }[];
  }[];
  transactions: TransactionHeader[];
  transaction_count: number;
}

// For Warehouse Report
export interface WarehouseReport {
  warehouse_name: string;
  items: {
    item_name: string;
    on_hand: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
    inbound: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
    scheduled_outbound: {
      total: number;
      stock: number;
      consign: number;
      hold: number;
    };
  }[];
}

// For Negative Inventory
export interface NegativeInventoryReport {
  negative_items: {
    item_name: string;
    warehouse: string;
    on_hand_total: number;
  }[];
}