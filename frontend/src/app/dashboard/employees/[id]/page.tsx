'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeData, EmployeeDocument } from '@/types/employee';
import { useEmployee } from '@/hooks/use-employee';
import { ArrowLeft, FileText, Download, Eye, X, FolderOpen, FileSpreadsheet } from 'lucide-react';
import { EmployeeDocumentsModal } from '@/components/modals/EmployeeDocumentsModal';

/* ─── Inline attachment viewer modal ─────────────────────────────────── */
function AttachmentViewer({
  doc,
  onClose,
}: {
  doc: { type: string; file: string; fileUrl?: string; fileContent?: string; receivedDate: string; expiryDate?: string; notes?: string; status: string };
  onClose: () => void;
}) {
  const src = doc.fileUrl || doc.fileContent || '';
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.file) || src.startsWith('data:image/') || src.includes('image');
  const isPdf   = /\.pdf$/i.test(doc.file)  || src.startsWith('data:application/pdf') || src.includes('/pdf');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {isImage ? <Image className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
            <div>
              <p className="font-semibold text-slate-900">{doc.type}</p>
              <p className="text-xs text-slate-500">{doc.file}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={src}
              download={doc.file}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={doc.file}
              className="max-w-full mx-auto rounded-lg shadow"
            />
          )}
          {isPdf && (
            <iframe
              src={src}
              className="w-full rounded-lg"
              style={{ height: '65vh' }}
              title={doc.file}
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-500">
              <FileText className="h-16 w-16 text-slate-300" />
              <p className="text-sm">Preview not available for this file type.</p>
              <a
                href={src}
                download={doc.file}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" /> Download to view
              </a>
            </div>
          )}
        </div>

        {/* Footer — doc metadata */}
        <div className="px-6 py-3 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600 bg-white rounded-b-xl">
          <span><span className="font-medium">Received:</span> {doc.receivedDate}</span>
          {doc.expiryDate && <span><span className="font-medium">Expires:</span> {doc.expiryDate}</span>}
          <span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              doc.status === 'Current' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>{doc.status}</span>
          </span>
          {doc.notes && <span><span className="font-medium">Notes:</span> {doc.notes}</span>}
        </div>
      </div>
    </div>
  );
}

interface EmployeeDetailPageProps {
  params: { id: string };
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const { getEmployee } = useEmployee();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [id]);

  /* ─── Export helpers ─────────────────────────────────────────────── */
  const handleExportExcel = async () => {
    if (!employee) return;
    const XLSX = await import('xlsx');
    const data = [
      { Section: 'General', Field: 'Full Name', Value: employee.fullName ?? '' },
      { Section: 'General', Field: 'Employee Code', Value: employee.employeeCode ?? '' },
      { Section: 'General', Field: 'Email', Value: employee.email ?? '' },
      { Section: 'General', Field: 'Phone', Value: employee.phone ?? '' },
      { Section: 'General', Field: 'Status', Value: employee.employmentStatus ?? '' },
      { Section: 'General', Field: 'Department', Value: employee.department ?? '' },
      { Section: 'General', Field: 'Branch', Value: employee.branch ?? '' },
      { Section: 'General', Field: 'Job Title', Value: employee.jobTitle ?? '' },
      { Section: 'Personal', Field: 'Date of Birth', Value: employee.dateOfBirth ?? '' },
      { Section: 'Personal', Field: 'Nationality', Value: employee.nationality ?? '' },
      { Section: 'Personal', Field: 'National ID', Value: employee.nationalId ?? '' },
      { Section: 'Personal', Field: 'Gender', Value: employee.gender === 'M' ? 'Male' : employee.gender === 'F' ? 'Female' : (employee.gender ?? '') },
      { Section: 'Personal', Field: 'Address', Value: employee.currentAddress ?? '' },
      { Section: 'Personal', Field: 'Marital Status', Value: employee.maritalStatus ?? '' },
      { Section: 'Employment', Field: 'Start Date', Value: employee.startDate ?? '' },
      { Section: 'Employment', Field: 'Employment Type', Value: employee.employmentType ?? '' },
      { Section: 'Employment', Field: 'Category', Value: employee.category ?? '' },
      { Section: 'Employment', Field: 'Position Type', Value: employee.positionType ?? '' },
      { Section: 'Salary', Field: 'Current Salary', Value: `${employee.currency ?? 'AED'} ${employee.currentSalary ?? 0}` },
      { Section: 'Salary', Field: 'Payment Method', Value: employee.paymentMethod ?? '' },
      { Section: 'Bank', Field: 'Bank Name', Value: employee.bankName ?? '' },
      { Section: 'Bank', Field: 'Account Number', Value: employee.accountNumber ?? '' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee');

    // Documents sheet
    if (employee.documents && employee.documents.length > 0) {
      const docRows = employee.documents.map((d: any) => ({
        'Document Type': d.type ?? '',
        'Received Date': d.receivedDate ?? '',
        'Expiry Date': d.expiryDate ?? '',
        'Status': d.status ?? '',
        'Notes': d.notes ?? '',
      }));
      const ws2 = XLSX.utils.json_to_sheet(docRows);
      ws2['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Documents');
    }

    XLSX.writeFile(wb, `${employee.fullName.replace(/\s+/g, '_')}_${employee.employeeCode ?? 'EMP'}.xlsx`);
  };

  const handleExportPdf = async () => {
    if (!employee) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text(employee.fullName, 40, 45);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${employee.jobTitle ?? ''} | ${employee.department ?? ''} | ${employee.branch ?? ''}`, 40, 62);
    doc.text(`Employee Code: ${employee.employeeCode ?? ''}  |  Status: ${employee.employmentStatus ?? ''}`, 40, 76);

    // Separator line
    doc.setDrawColor(200);
    doc.line(40, 85, pageW - 40, 85);

    // Personal & Employment info table
    autoTable(doc, {
      startY: 95,
      head: [['Field', 'Value']],
      body: [
        ['Email', employee.email ?? ''],
        ['Phone', employee.phone ?? ''],
        ['Date of Birth', employee.dateOfBirth ?? ''],
        ['Nationality', employee.nationality ?? ''],
        ['National ID', employee.nationalId ?? ''],
        ['Gender', employee.gender === 'M' ? 'Male' : employee.gender === 'F' ? 'Female' : (employee.gender ?? '')],
        ['Address', employee.currentAddress ?? ''],
        ['Marital Status', employee.maritalStatus ?? ''],
        ['Start Date', employee.startDate ?? ''],
        ['Employment Type', employee.employmentType ?? ''],
        ['Category', employee.category ?? ''],
        ['Position Type', employee.positionType ?? ''],
        ['Salary', `${employee.currency ?? 'AED'} ${employee.currentSalary ?? 0}`],
        ['Payment Method', employee.paymentMethod ?? ''],
        ['Bank Name', employee.bankName ?? ''],
        ['Account Number', employee.accountNumber ?? ''],
      ],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 } },
    });

    // Documents table
    if (employee.documents && employee.documents.length > 0) {
      const lastY = (doc as any).lastAutoTable?.finalY ?? 400;
      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175);
      doc.text('Documents', 40, lastY + 28);

      autoTable(doc, {
        startY: lastY + 38,
        head: [['Type', 'Received', 'Expiry', 'Status', 'Notes']],
        body: employee.documents.map((d: any) => [
          d.type ?? '', d.receivedDate ?? '', d.expiryDate ?? '', d.status ?? '', d.notes ?? '',
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(170);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, doc.internal.pageSize.getHeight() - 20);
      doc.text(`Page ${i} / ${pages}`, pageW - 80, doc.internal.pageSize.getHeight() - 20);
    }

    doc.save(`${employee.fullName.replace(/\s+/g, '_')}_${employee.employeeCode ?? 'EMP'}.pdf`);
  };

  const loadEmployee = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployee(id);
      setEmployee(data);
    } catch (err) {
      console.error('Error loading employee:', err);
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading employee...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </button>
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Employee not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Export Excel
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-red-500" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                  {employee.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={employee.profilePicture} alt={employee.fullName} className="w-full h-full object-cover" />
                  ) : (
                    employee.fullName.split(' ').map((n: string) => n[0]).join('')
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-grow">
                <h1 className="text-3xl font-bold text-slate-900">{employee.fullName}</h1>
                <p className="text-slate-600 mt-1">{employee.jobTitle}</p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Employee Code</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.employeeCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Status</p>
                    <div className="mt-1">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {employee.employmentStatus}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Department</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Branch</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.branch}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-slate-900">{employee.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Date of Birth</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Nationality</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.nationality}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">National ID</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.nationalId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Gender</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.gender === 'M' ? 'Male' : 'Female'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Current Address</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.currentAddress}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Marital Status</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.maritalStatus}</p>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Employment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.startDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Employment Type</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.employmentType}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Category</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.category}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Position Type</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.positionType}</p>
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Salary Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Current Salary</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: employee.currency || 'AED'
                  }).format(employee.currentSalary)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider">Payment Method</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{employee.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Bank Account */}
          {(employee.bankName || employee.accountNumber) && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Bank Account</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {employee.bankName && (
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Bank Name</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{employee.bankName}</p>
                  </div>
                )}
                {employee.accountNumber && (
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">Account Number</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{employee.accountNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                Employee File / Documents
                {employee.documents && employee.documents.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                    {employee.documents.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowDocsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <FolderOpen className="h-4 w-4" />
                Manage Documents
              </button>
            </div>

            {(!employee.documents || employee.documents.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <FileText className="h-12 w-12 text-slate-200" />
                <p className="text-sm">No documents on file</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Document Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Received Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Expiry Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Attachment</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employee.documents.map((doc: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{doc.type || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{doc.receivedDate || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{doc.expiryDate || '—'}</td>
                        <td className="px-4 py-3">
                          {(doc.fileUrl || doc.fileContent) ? (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setViewingDoc(doc)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                              <a
                                href={doc.fileUrl || doc.fileContent}
                                download={doc.file}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No file</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            doc.status === 'Current'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'Renewal Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doc.status || 'Current'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={() => router.push(`/dashboard/employees/${id}/edit`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Edit Employee
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Attachment viewer modal */}
    {viewingDoc && (
      <AttachmentViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
    )}
    {/* Documents manager modal */}
    {showDocsModal && employee && (
      <EmployeeDocumentsModal
        employeeId={id}
        employeeName={employee.fullName}
        initialDocuments={(employee.documents || []) as EmployeeDocument[]}
        onClose={() => setShowDocsModal(false)}
        onSaved={(docs) => {
          setEmployee(prev => prev ? { ...prev, documents: docs } : prev);
          setShowDocsModal(false);
        }}
      />
    )}
    </>
  );
}
