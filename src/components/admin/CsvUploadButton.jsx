import { useRef, useState } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { apiService } from '../../services/apiService';

/**
 * Upload button + template download for the per-event CSV imports
 * (sessions, chapels). Shows the server's created/skipped/error summary.
 */
const CsvUploadButton = ({ label, upload, templateEndpoint, templateFilename, onUploaded }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const { showSuccess, showError } = useApp();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const response = await upload(file);
      const data = response?.data || {};
      setResult({
        message: response?.message || 'Upload complete',
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
      if (response?.success === false) {
        showError(response?.message || 'Nothing was imported');
      } else {
        showSuccess(response?.message || 'Upload complete');
      }
      onUploaded?.(response);
    } catch (error) {
      showError(error.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleTemplate = async () => {
    try {
      const blob = await apiService.downloadTemplate(templateEndpoint);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = templateFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showError(error.message || 'Failed to download template');
    }
  };

  return (
    <>
      <div className="inline-flex rounded-md shadow-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
          {busy ? 'Uploading…' : label}
        </button>
        <button
          type="button"
          onClick={handleTemplate}
          title="Download CSV template"
          className="inline-flex items-center px-3 py-2 -ml-px rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span className="ml-1 hidden sm:inline">Template</span>
        </button>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      {result && result.errors.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setResult(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload finished with issues</h3>
              <p className="mt-1 text-sm text-gray-600">{result.message}</p>
            </div>
            <ul className="max-h-72 overflow-y-auto px-6 py-4 text-sm text-red-700 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>
                  {typeof err === 'string'
                    ? err
                    : `${err.row ? `Row ${err.row}: ` : ''}${err.message || err.error || JSON.stringify(err)}`}
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setResult(null)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CsvUploadButton;
