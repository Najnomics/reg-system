import { useState } from 'react';
import { ArrowDownTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';

const ExportButtons = ({ onExport }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: DocumentIcon },
    { value: 'csv', label: 'CSV (.csv)', icon: DocumentIcon },
    { value: 'pdf', label: 'PDF (.pdf)', icon: DocumentIcon },
  ];

  return (
    <div className="flex items-center space-x-3">
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value)}
        className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        {exportOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => handleExport(exportFormat)}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <div className="animate-spin -ml-1 mr-2 h-4 w-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            Exporting...
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" />
            Export
          </>
        )}
      </button>
    </div>
  );
};

export default ExportButtons;