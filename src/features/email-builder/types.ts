export interface EmailTemplate {
  warehouseContact: string;
  customerPO: string;
  items: {
    itemName: string;
    volume: number;
    packSize: {
      uomPerEach: number;
      packageType: string;
      displayName: string;
      unitsOfUnits: string;
    };
  }[];
  shippingInfo: {
    pickupLocation: string;
    warehouse: string;
    shipTo: {
      name: string;
      address: string;
      contact: string;
    };
  };
}

export interface EmailBuilderProps {
  referenceNumber: string;
  onClose: () => void;
}