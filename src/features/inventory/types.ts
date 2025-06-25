export interface CountData {
  itemName: string;
  quantity: number;
  inventoryStatus: 'Stock' | 'Consignment' | 'Hold';
  notes?: string;
  uomPerEach?: number;
  caseCount?: number;
}

export interface Variance {
  itemName: string;
  inventoryStatus: 'Stock' | 'Consignment' | 'Hold';
  physicalCount: number;
  calculatedCount: number;
  variance: number;
}

export interface PendingTransaction {
  transaction_id: string;
  transaction_type: string;
  transaction_date: string;
  reference_number: string;
  details: {
    item_name: string;
    quantity: number;
    status: string;
  }[];
}