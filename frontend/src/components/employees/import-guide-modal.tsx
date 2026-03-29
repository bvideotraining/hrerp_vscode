'use client';

interface ImportGuideModalProps {
  onClose: () => void;
  onFileImport: (file: File) => void;
  isImporting: boolean;
}

const REQUIRED_COLUMNS = [
  { column: 'Employee Code', type: 'string',  example: 'EMP-001',          note: 'Unique code for the employee' },
  { column: 'Full Name',     type: 'string',  example: 'Ahmed Mohamed',     note: 'Employee full name' },
  { column: 'Email',         type: 'string',  example: 'ahmed@company.com', note: 'Must be a valid email address' },
];

const OPTIONAL_COLUMNS = [
  { column: 'Phone',          type: 'string', example: '+20-10-1234-5678',  note: 'Phone number' },
  { column: 'Date of Birth',  type: 'string', example: '1990-05-15',        note: 'YYYY-MM-DD format' },
  { column: 'Hiring Date',    type: 'string', example: '2024-01-01',        note: 'YYYY-MM-DD format. Defaults to today if empty' },
  { column: 'Branch',         type: 'string', example: 'Cairo Branch',      note: 'Branch name — must match an existing branch' },
  { column: 'Department',     type: 'string', example: 'HR',                note: 'Department name' },
  { column: 'Job Title',      type: 'string', example: 'Software Engineer', note: 'Job title' },
  { column: 'Category',       type: 'string', example: 'WhiteCollar',       note: 'WhiteCollar | BlueCollar | Management | PartTime' },
  { column: 'Status',         type: 'string', example: 'Active',            note: 'Active | Inactive | On Leave | Terminated' },
  { column: 'Salary',         type: 'number', example: '15000',             note: 'Numeric value only — no currency symbol' },
  { column: 'Currency',       type: 'string', example: 'EGP',               note: 'EGP | USD | EUR | SAR | AED' },
  { column: 'Payment Method', type: 'string', example: 'Bank Transfer',     note: 'Bank Transfer | Cash' },
  { column: 'Bank Name',      type: 'string', example: 'CIB',               note: 'Bank name for payroll' },
  { column: 'Account Number', type: 'string', example: '1234567890',        note: 'Bank account number' },
  { column: 'National ID',    type: 'string', example: '12345678901234',    note: '14-digit national ID' },
  { column: 'Nationality',    type: 'string', example: 'Egyptian',          note: 'Employee nationality' },
];

const TIPS = [
  'First row must be the exact column headers shown above (case-sensitive).',
  'Required columns must not be empty — rows missing them will be rejected.',
  'Date fields must use YYYY-MM-DD format (e.g. 1990-05-15).',
  'Salary must be a plain number — do not include currency symbols or commas.',
  'Category accepted values: WhiteCollar, BlueCollar, Management, PartTime.',
  'Status accepted values: Active, Inactive, On Leave, Terminated.',
  'Employee Code must be unique — duplicate codes will cause import to fail.',
  'Save your file as .xlsx before uploading.',
];

export function EmployeeImportGuideModal({ onClose, onFileImport, isImporting }: ImportGuideModalProps) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileImport(file);
      onClose();
    }
  }

  function handleDownloadTemplate() {
    import('xlsx').then((XLSX) => {
      const headers = [
        ...REQUIRED_COLUMNS.map((c) => c.column),
        ...OPTIONAL_COLUMNS.map((c) => c.column),
      ];
      const exampleRow = {
        'Employee Code': 'EMP-001',
        'Full Name': 'Ahmed Mohamed',
        'Email': 'ahmed@company.com',
        'Phone': '+20-10-1234-5678',
        'Date of Birth': '1990-05-15',
        'Hiring Date': '2024-01-01',
        'Branch': 'Cairo Branch',
        'Department': 'HR',
        'Job Title': 'HR Specialist',
        'Category': 'WhiteCollar',
        'Status': 'Active',
        'Salary': 15000,
        'Currency': 'EGP',
        'Payment Method': 'Bank Transfer',
        'Bank Name': 'CIB',
        'Account Number': '1234567890',
        'National ID': '12345678901234',
        'Nationality': 'Egyptian',
      };
      const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
      ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, 'employee_import_template.xlsx');
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Import Employees</h2>
            <p className="text-xs text-slate-400 mt-0.5">Upload an Excel (.xlsx) or CSV file with the columns below</p>
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

          {/* File upload + download template */}
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50/40">
            <div className="text-3xl mb-2">📂</div>
            <p className="text-sm font-medium text-slate-700 mb-4">
              Select your Excel or CSV file to begin import
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isImporting ? 'Importing…' : 'Choose File'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="sr-only"
                />
              </label>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-green-600 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Template
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3">Supports .xlsx, .xls, .csv</p>
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
                    <tr key={col.column} className="hover:bg-red-50/30">
                      <td className="px-4 py-2.5 font-mono text-xs text-red-600 font-semibold whitespace-nowrap">{col.column}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.type}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 whitespace-nowrap">{col.example}</td>
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
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">{col.column}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.type}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 whitespace-nowrap">{col.example}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{col.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
            <p className="font-semibold mb-2">Tips for a successful import</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {TIPS.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
