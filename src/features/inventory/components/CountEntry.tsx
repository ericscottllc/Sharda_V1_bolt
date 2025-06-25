import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CountData } from '../types';

interface CountEntryProps {
  warehouse: string;
  date: string;
  countData: CountData[];
  onCountUpdate: (data: CountData[]) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function CountEntry({
  warehouse,
  date,
  countData,
  onCountUpdate,
  onComplete,
  onBack
}: CountEntryProps) {
  const [items, setItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'counted' | 'uncounted'>('all');
  const [packageTypes, setPackageTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('item')
          .select(`
            item_name,
            pack_size (
              uom_per_each,
              package_type
            )
          `);

        if (error) throw error;
        
        const itemNames = data?.map(i => i.item_name) || [];
        const pkgTypes = Object.fromEntries(
          data?.map(i => [i.item_name, i.pack_size?.package_type || 'case']) || []
        );
        
        setItems(itemNames);
        setPackageTypes(pkgTypes);
      } catch (err) {
        console.error('Error fetching items:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.toLowerCase().includes(searchTerm.toLowerCase());
    const isInCountData = countData.some(d => d.itemName === item);
    
    switch (filter) {
      case 'counted':
        return matchesSearch && isInCountData;
      case 'uncounted':
        return matchesSearch && !isInCountData;
      default:
        return matchesSearch;
    }
  });

  const addItem = async (itemName: string) => {
    try {
      const { data, error } = await supabase
        .from('item')
        .select(`
          item_name,
          pack_size (
            uom_per_each
          )
        `)
        .eq('item_name', itemName)
        .single();

      if (error) throw error;

      const uomPerEach = data?.pack_size?.uom_per_each || null;

      onCountUpdate([...countData, { 
        itemName, 
        quantity: 0,
        inventoryStatus: 'Stock',
        uomPerEach,
        caseCount: 0
      }]);
    } catch (err) {
      console.error('Error fetching item UOM:', err);
      onCountUpdate([...countData, { 
        itemName, 
        quantity: 0,
        inventoryStatus: 'Stock',
        caseCount: 0
      }]);
    }
  };

  const updateCount = (index: number, field: string, value: any) => {
    const newData = [...countData];
    const item = newData[index];

    if (field === 'caseCount' && item.uomPerEach) {
      const caseCount = parseFloat(value) || 0;
      item.caseCount = caseCount;
      item.quantity = caseCount * item.uomPerEach;
    } else if (field === 'quantity') {
      const quantity = parseFloat(value) || 0;
      item.quantity = quantity;
      if (item.uomPerEach) {
        item.caseCount = quantity / item.uomPerEach;
      }
    } else {
      item[field] = value;
    }

    onCountUpdate(newData);
  };

  const removeItem = (index: number) => {
    const newData = [...countData];
    newData.splice(index, 1);
    onCountUpdate(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (countData.length === 0) return;
    onComplete();
  };

  const stats = {
    total: countData.length,
    counted: countData.filter(d => d.quantity > 0).length,
    remaining: countData.filter(d => d.quantity === 0).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold">Enter Count Data</h2>
            <p className="text-gray-600 mt-1">
              Record the physical count for each item
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.counted}</div>
            <div className="text-sm text-gray-600">Counted</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.remaining}</div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
        </div>
        {stats.total > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${(stats.counted / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('counted')}
            className={`px-3 py-1 rounded ${
              filter === 'counted'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Counted
          </button>
          <button
            onClick={() => setFilter('uncounted')}
            className={`px-3 py-1 rounded ${
              filter === 'uncounted'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Uncounted
          </button>
        </div>
      </div>

      {searchTerm && !countData.some(d => d.itemName.toLowerCase() === searchTerm.toLowerCase()) && (
        <div className="border rounded-lg max-h-48 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item}
              onClick={() => addItem(item)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
              disabled={countData.some(d => d.itemName === item)}
            >
              <Plus className="w-4 h-4 mr-2 text-gray-400" />
              {item}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {countData.map((item, index) => (
            <div
              key={item.itemName}
              className={`space-y-4 p-4 border rounded-lg ${
                item.quantity > 0 ? 'bg-green-50 border-green-200' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  {item.itemName}
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => updateCount(index, 'inventoryStatus', 'Stock')}
                  className={`px-3 py-1 rounded ${
                    item.inventoryStatus === 'Stock'
                      ? 'bg-blue-600 text-white'
                      : 'border hover:bg-gray-50'
                  }`}
                >
                  Stock
                </button>
                <button
                  type="button"
                  onClick={() => updateCount(index, 'inventoryStatus', 'Consignment')}
                  className={`px-3 py-1 rounded ${
                    item.inventoryStatus === 'Consignment'
                      ? 'bg-purple-600 text-white'
                      : 'border hover:bg-gray-50'
                  }`}
                >
                  Consignment
                </button>
                <button
                  type="button"
                  onClick={() => updateCount(index, 'inventoryStatus', 'Hold')}
                  className={`px-3 py-1 rounded ${
                    item.inventoryStatus === 'Hold'
                      ? 'bg-red-600 text-white'
                      : 'border hover:bg-gray-50'
                  }`}
                >
                  Hold
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateCount(index, 'quantity', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                {item.uomPerEach && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {packageTypes[item.itemName] || 'Package'}s ({item.uomPerEach} per {packageTypes[item.itemName] || 'package'})
                    </label>
                    <input
                      type="number"
                      value={item.caseCount}
                      onChange={(e) => updateCount(index, 'caseCount', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={countData.length === 0}
          >
            Review Variances
          </button>
        </div>
      </form>
    </div>
  );
}