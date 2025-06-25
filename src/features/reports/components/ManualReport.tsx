import React, { useState } from 'react';
import { Plus, Minus, Search, Table } from 'lucide-react';
import { useDynamicReport } from '../hooks/useDynamicReport';

interface WhereClause {
  column: string;
  operator: string;
  value: string;
}

export function ManualReport() {
  const { views, results, loading, error, executeQuery } = useDynamicReport();
  const [selectedView, setSelectedView] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // Operators available for where clauses
  const operators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN'];

  const handleViewSelect = (viewName: string) => {
    setSelectedView(viewName);
    const view = views.find(v => v.name === viewName);
    if (view) {
      setAvailableColumns(view.columns);
      setSelectedColumns([]);
      setWhereClauses([]);
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const addWhereClause = () => {
    setWhereClauses(prev => [...prev, { column: '', operator: '=', value: '' }]);
  };

  const removeWhereClause = (index: number) => {
    setWhereClauses(prev => prev.filter((_, i) => i !== index));
  };

  const updateWhereClause = (index: number, field: keyof WhereClause, value: string) => {
    setWhereClauses(prev => prev.map((clause, i) =>
      i === index ? { ...clause, [field]: value } : clause
    ));
  };

  const handleExecuteQuery = () => {
    if (!selectedView || selectedColumns.length === 0) {
      toast.error('Please select a view and at least one column');
      return;
    }
    executeQuery(selectedView, selectedColumns, whereClauses);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manual Report Builder</h2>

      {/* View Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Select View</label>
        <select
          value={selectedView}
          onChange={(e) => handleViewSelect(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select a view...</option>
          {views.map(view => (
            <option key={view.name} value={view.name}>
              {view.name}
            </option>
          ))}
        </select>
      </div>

      {selectedView && (
        <>
          {/* Column Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Select Columns</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {availableColumns.map(column => (
                <label
                  key={column}
                  className={`flex items-center p-2 rounded border ${
                    selectedColumns.includes(column)
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                    className="mr-2"
                  />
                  <span className="text-sm truncate">{column}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Where Clauses */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Where Conditions</label>
              <button
                onClick={addWhereClause}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Condition
              </button>
            </div>
            <div className="space-y-2">
              {whereClauses.map((clause, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <select
                    value={clause.column}
                    onChange={(e) => updateWhereClause(index, 'column', e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="">Select column...</option>
                    {availableColumns.map(column => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                  <select
                    value={clause.operator}
                    onChange={(e) => updateWhereClause(index, 'operator', e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  >
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={clause.value}
                    onChange={(e) => updateWhereClause(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 border rounded-lg px-3 py-2"
                  />
                  <button
                    onClick={() => removeWhereClause(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Execute Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExecuteQuery}
              disabled={loading || selectedColumns.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2" />
                  Running Query...
                </>
              ) : (
                <>
                  <Table className="w-4 h-4 mr-2" />
                  Run Query
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectedColumns.map(column => (
                      <th
                        key={column}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((row, i) => (
                    <tr key={i}>
                      {selectedColumns.map(column => (
                        <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row[column]?.toString() || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}