'use client';

interface ImportGuideModalProps {
  onClose: () => void;
  onFileImport: (file: File) => void;
  isImporting: boolean;
}

const REQUIRED_COLUMNS = [
  { column: 'employeeId',   type: 'string',  example: 'abc123',      note: 'Firestore employee document ID' },
  { column: 'employeeCode', type: 'string',  example: 'EMP-001',     note: 'Employee code' },
  { column: 'employeeName', type: 'string',  example: 'Ahmed Ali',   note: 'Full name' },
  { column: 'branch',       type: 'string',  example: 'Cairo Branch', note: 'Branch name (exact match)' },
  { column: 'category',     type: 'string',  example: 'WhiteCollar', note: 'WhiteCollar | BlueCollar | Management | PartTime' },
  { column: 'date',         type: 'string',  example: '2026-03-24',  note: 'YYYY-MM-DD format' },
  { column: 'status',       type: 'string',  example: 'present',     note: 'present | late | absent | on_leave | unpaid_leave' },
];

const OPTIONAL_COLUMNS = [
  { column: 'checkIn',              type: 'string',  example: '08:10',  note: 'HH:MM 24-hour format' },
  { column: 'checkOut',             type: 'string',  example: '16:30',  note: 'HH:MM 24-hour format' },
  { column: 'excuse',               type: 'string',  example: 'Traffic', note: 'Reason for late or absence' },
  { column: 'lateMinutesOverride',  type: 'number',  example: '15',     note: 'Override auto-calculated late minutes' },
  { column: 'deductionDaysOverride',type: 'number',  example: '1',      note: 'Override deduction days' },
  { column: 'saturdayWorkOverride', type: 'boolean', example: 'true',   note: 'Override Saturday work flag (true/false)' },
  { column: 'notes',                type: 'string',  example: 'Approved', note: 'Additional notes' },
];

export function ImportGuideModal({ onClose, onFileImport, isImporting }: ImportGuideModalProps) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileImport(file);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Import Attendance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Upload an Excel (.xlsx) file with the columns below</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* File upload */}
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50/40">
            <div className="text-3xl mb-2">📂</div>
            <p className="text-sm font-medium text-slate-700 mb-3">
              Select your Excel file (.xlsx)
            </p>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {isImporting ? 'Importing...' : 'Choose File'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isImporting}
                className="sr-only"
              />
            </label>
          </div>

          {/* Required columns */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Required Columns
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Column', 'Type', 'Example', 'Note'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {REQUIRED_COLUMNS.map((col) => (
                    <tr key={col.column} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-semibold">{col.column}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.type}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{col.example}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Optional columns */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Optional Columns
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Column', 'Type', 'Example', 'Note'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {OPTIONAL_COLUMNS.map((col) => (
                    <tr key={col.column} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 font-semibold">{col.column}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.type}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{col.example}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Tips</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>First row must be the column headers (exact spelling, case-sensitive)</li>
              <li>Date format must be YYYY-MM-DD (e.g. 2026-03-24)</li>
              <li>Time format must be HH:MM in 24-hour (e.g. 08:10, 16:30)</li>
              <li>Leave optional columns empty — system will auto-calculate late minutes and deductions</li>
              <li>Save your Excel file as .xlsx before uploading</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
