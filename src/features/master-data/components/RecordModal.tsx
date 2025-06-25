import React, { useEffect } from 'react';
import { Record, TableStructure, ForeignKeyData } from '../types';
import { ComboBox } from '../../../components/ComboBox';

type RecordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  record: Record;
  setRecord: (record: Record) => void;
  mode: 'add' | 'edit';
  table: string;
  tableStructure: TableStructure;
  foreignKeyData: ForeignKeyData;
};

export function RecordModal({
  isOpen,
  onClose,
  onSave,
  record,
  setRecord,
  mode,
  table,
  tableStructure,
  foreignKeyData
}: RecordModalProps) {
  if (!isOpen) return null;

  // Function to check if a field is required
  const isFieldRequired = (column: string) => {
    // Primary keys are always required
    if (column === tableStructure[table]?.columns[0]) return true;
    
    // For pack_size table specific requirements
    if (table === 'pack_size') {
      return ['units_per_each', 'volume_per_unit', 'units_of_units', 'package_type'].includes(column);
    }
    
    // For item table specific requirements
    if (table === 'item') {
      return ['item_name', 'product_name', 'pack_size'].includes(column);
    }
    
    // For product table specific requirements
    if (table === 'product') {
      return ['product_name', 'registrant', 'product_type'].includes(column);
    }

    return false;
  };

  // Function to generate pack size string
  const generatePackSize = (unitsPerEach: number, volumePerUnit: number, unitsOfUnits: string, packageType: string) => {
    if (!unitsPerEach || !volumePerUnit || !unitsOfUnits || !packageType) {
      return '';
    }

    if (unitsPerEach === 1) {
      return `${volumePerUnit} ${unitsOfUnits.toLowerCase()}/${packageType.toLowerCase()}`;
    }
    return `${unitsPerEach}x${volumePerUnit} ${unitsOfUnits.toLowerCase()}/${packageType.toLowerCase()}`;
  };

  // Function to generate item name when product and pack size are selected
  const generateItemName = (productName: string, packSize: string) => {
    if (productName && packSize) {
      return `${productName} ${packSize}`;
    }
    return '';
  };

  // Calculate UOM per each based on units per each and volume per unit
  const calculateUOMPerEach = (unitsPerEach: number, volumePerUnit: number) => {
    if (!unitsPerEach || !volumePerUnit) return 0;
    return unitsPerEach * volumePerUnit;
  };

  // Handle changes for pack size fields
  const handlePackSizeChange = (field: string, value: any) => {
    const newRecord = { ...record, [field]: value };
    
    if (table === 'pack_size') {
      const unitsPerEach = field === 'units_per_each' ? value : record.units_per_each;
      const volumePerUnit = field === 'volume_per_unit' ? value : record.volume_per_unit;
      const unitsOfUnits = field === 'units_of_units' ? value : record.units_of_units;
      const packageType = field === 'package_type' ? value : record.package_type;

      // Auto-calculate UOM per each
      if (unitsPerEach && volumePerUnit) {
        newRecord.uom_per_each = calculateUOMPerEach(
          parseFloat(unitsPerEach),
          parseFloat(volumePerUnit)
        );
      }

      // Auto-generate pack_size
      if (unitsPerEach && volumePerUnit && unitsOfUnits && packageType) {
        newRecord.pack_size = generatePackSize(
          parseFloat(unitsPerEach),
          parseFloat(volumePerUnit),
          unitsOfUnits,
          packageType
        );
      }

      // Auto-increment ID if adding new record
      if (mode === 'add' && !newRecord.id) {
        const maxId = Math.max(...(foreignKeyData.pack_size?.map(p => parseInt(p.id)) || [0]));
        newRecord.id = maxId + 1;
      }
    }

    setRecord(newRecord);
  };

  // Handle changes for item table specifically
  const handleItemChange = (field: string, value: string) => {
    if (table === 'item') {
      if (field === 'product_name' || field === 'pack_size') {
        const newRecord = { ...record, [field]: value };
        // Auto-generate item name when both product and pack size are selected
        if (field === 'product_name' && record.pack_size) {
          newRecord.item_name = generateItemName(value, record.pack_size);
        } else if (field === 'pack_size' && record.product_name) {
          newRecord.item_name = generateItemName(record.product_name, value);
        }
        setRecord(newRecord);
      } else {
        setRecord({ ...record, [field]: value });
      }
    } else {
      setRecord({ ...record, [field]: value });
    }
  };

  // Sort pack sizes by id in descending order
  const getSortedPackSizes = () => {
    if (foreignKeyData.pack_size) {
      return [...foreignKeyData.pack_size].sort((a, b) => b.id - a.id);
    }
    return [];
  };

  // Function to determine if a field is numeric based on column type
  const isNumericField = (columnName: string) => {
    const numericTypes = ['bigint', 'numeric', 'decimal', 'integer'];
    const columnType = tableStructure[table]?.columnTypes?.[columnName]?.toLowerCase() || '';
    return numericTypes.some(type => columnType.includes(type));
  };

  // Function to determine if a field should be hidden
  const shouldHideField = (column: string) => {
    // Hide ID field for pack_size table
    if (table === 'pack_size' && column === 'id') return true;
    // Hide UOM per each as it's auto-calculated
    if (table === 'pack_size' && column === 'uom_per_each') return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {mode === 'add' ? 'Add New' : 'Edit'} {table.replace(/_/g, ' ').toUpperCase()} Record
        </h3>
        
        <div className="text-sm text-gray-500 mb-4">
          Fields marked with an asterisk (*) are required
        </div>

        <div className="space-y-4">
          {tableStructure[table]?.columns.map(column => {
            // Skip hidden fields
            if (shouldHideField(column)) return null;

            const foreignKey = tableStructure[table].foreignKeys[column];
            const isNumeric = isNumericField(column);
            const required = isFieldRequired(column);

            if (foreignKey) {
              const options = foreignKeyData[column]?.map(item => item[foreignKey.column]) || [];
              return (
                <div key={column}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {column.replace(/_/g, ' ')} {required && <span className="text-red-500">*</span>}
                  </label>
                  <ComboBox
                    options={options}
                    value={record[column] || ''}
                    onChange={(val) => {
                      if (table === 'pack_size') {
                        handlePackSizeChange(column, val);
                      } else {
                        handleItemChange(column, val);
                      }
                    }}
                    placeholder={`Search ${column.replace(/_/g, ' ')}...`}
                  />
                </div>
              );
            }

            // For pack_size table, show numeric inputs for units and volume
            if (table === 'pack_size' && (column === 'units_per_each' || column === 'volume_per_unit')) {
              return (
                <div key={column}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {column.replace(/_/g, ' ')} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    value={record[column] || ''}
                    onChange={(e) => handlePackSizeChange(column, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    step="0.01"
                    min="0"
                    required={required}
                  />
                </div>
              );
            }

            // For auto-generated fields (item_name, pack_size)
            if ((table === 'item' && column === 'item_name') || 
                (table === 'pack_size' && column === 'pack_size')) {
              return (
                <div key={column}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {column.replace(/_/g, ' ')} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 bg-gray-100"
                    value={record[column] || ''}
                    readOnly
                    placeholder="Auto-generated"
                  />
                </div>
              );
            }

            return (
              <div key={column}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {column.replace(/_/g, ' ')} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={isNumeric ? 'number' : 'text'}
                  className="w-full border rounded-lg px-3 py-2"
                  value={record[column] || ''}
                  onChange={(e) => setRecord({ ...record, [column]: e.target.value })}
                  placeholder={`Enter ${column.replace(/_/g, ' ').toLowerCase()}`}
                  required={required}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {mode === 'add' ? 'Add' : 'Save'} Record
          </button>
        </div>
      </div>
    </div>
  );
}