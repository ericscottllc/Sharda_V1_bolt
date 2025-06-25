import React, { useState, useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { EmailTemplate, EmailBuilderProps } from '../types';
import toast from 'react-hot-toast';

const getOrDefault = (value: string | null | undefined, defaultValue: string = '{Update}'): string => {
  return value && value.trim() ? value.trim() : defaultValue;
};

export function EmailBuilder({ referenceNumber, onClose }: EmailBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchTransactionData() {
      try {
        setLoading(true);
        
        // Fetch transaction data including pack size details
        const { data: txData, error: txError } = await supabase
          .from('vw_transaction_full')
          .select('*')
          .eq('reference_number', referenceNumber);

        if (txError) throw txError;
        if (!txData?.length) {
          toast.error('Transaction not found');
          return;
        }

        // Group items and fetch pack sizes
        const items = await Promise.all(
          txData.map(async (row) => {
            // Get pack size details with units_of_units
            const { data: packSizeData } = await supabase
              .from('item')
              .select(`
                item_name,
                pack_size (
                  pack_size,
                  uom_per_each,
                  package_type,
                  units_of_units
                )
              `)
              .eq('item_name', row.item_name)
              .single();

            const packSize = packSizeData?.pack_size || {
              uom_per_each: 1,
              package_type: 'unit',
              pack_size: '',
              units_of_units: 'unit'
            };

            return {
              itemName: row.item_name,
              volume: parseFloat(row.quantity) || 0,
              packSize: {
                uomPerEach: packSize.uom_per_each || 1,
                packageType: packSize.package_type || 'unit',
                displayName: packSize.pack_size || '',
                unitsOfUnits: packSize.units_of_units || 'unit'
              }
            };
          })
        );

        // Extract shipping info from first row
        const firstRow = txData[0];
        
        setTemplate({
          warehouseContact: 'Hi',
          customerPO: firstRow.customer_po || '',
          items,
          shippingInfo: {
            pickupLocation: firstRow.warehouse || '{Update Warehouse}',
            warehouse: firstRow.warehouse || '{Update Warehouse}',
            shipTo: {
              name: firstRow.customer_name || '{Update Customer}',
              address: firstRow.header_comments || '{Update Address}',
              contact: '{Update Contact Information}'
            }
          }
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load transaction data');
      } finally {
        setLoading(false);
      }
    }

    fetchTransactionData();
  }, [referenceNumber]);

  const handleCopy = () => {
    if (!template) return;

    const emailContent = generateEmailContent(template);
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    toast.success('Email content copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  function generateEmailContent(template: EmailTemplate): string {
    const itemLines = template.items.map(item => {
      const caseCount = Math.floor(item.volume / item.packSize.uomPerEach);
      // Add 's' only if caseCount is not 1
      const packageTypePlural = caseCount === 1 ? item.packSize.packageType : `${item.packSize.packageType}s`;
      return `${item.volume} ${item.packSize.unitsOfUnits} / ${caseCount} ${packageTypePlural} ${item.itemName}`;
    }).join('\n');

    return `Hi,

Please release the following on PO ${getOrDefault(template.customerPO)}
${itemLines}

Hi eShipping,

Pick Up:
${getOrDefault(template.shippingInfo.pickupLocation)}

Ship to:
${getOrDefault(template.shippingInfo.shipTo.address)}

Thank you!`;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="animate-pulse h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <p className="text-red-600">Failed to generate email template</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Email Template</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg border">
            {generateEmailContent(template)}
          </pre>
        </div>

        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}