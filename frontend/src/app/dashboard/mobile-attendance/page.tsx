'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';
import { MobileAttendanceTable } from '@/components/mobile-attendance/mobile-attendance-table';
import { MobileDevicesTable } from '@/components/mobile-attendance/mobile-devices-table';
import { MobileAttendanceStats } from '@/components/mobile-attendance/mobile-attendance-stats';
import {
  mobileAttendanceService,
  MobileAttendanceRecord,
  MobileDevice,
  MobileMember,
} from '@/lib/services/mobile-attendance.service';
import { employeeService } from '@/lib/services/employee.service';
import { organizationService } from '@/lib/services/organization.service';
import { leavesService, LeaveRequest, LEAVE_TYPE_LABELS } from '@/lib/services/leaves.service';

type Tab = 'records' | 'devices' | 'leaves' | 'members';

function MobileAttendanceContent() {
  const [tab, setTab] = useState<Tab>('records');
  const [records, setRecords] = useState<MobileAttendanceRecord[]>([]);
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [branchNames, setBranchNames] = useState<Record<string, string>>({});

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('');
  const [approvingLeave, setApprovingLeave] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<MobileMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Edit modal state
  const [editRecord, setEditRecord] = useState<MobileAttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecords = useCallback(async (date?: string) => {    setLoadingRecords(true);
    setError(null);
    try {
      const data = await mobileAttendanceService.getRecords(date);
      setRecords(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load records');
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    setError(null);
    try {
      const data = await mobileAttendanceService.getDevices();
      setDevices(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load devices');
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const loadLeaves = useCallback(async (status?: string) => {
    setLoadingLeaves(true);
    try {
      const data = await leavesService.getMobileLeaves(status || undefined);
      setLeaveRequests(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load leave requests');
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await mobileAttendanceService.getMembers();
      setMembers(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    loadDevices();
    loadLeaves();
    loadMembers();
    // Load employee and branch lookup maps
    (async () => {
      try {
        const [emps, branches] = await Promise.all([
          employeeService.getAllEmployees(),
          organizationService.getBranches(),
        ]);
        setEmployeeNames(Object.fromEntries(emps.map((e) => [e.id, e.fullName])));
        setBranchNames(Object.fromEntries(branches.map((b) => [b.id ?? '', b.name])));
      } catch (_) {/* non-critical, fall back to raw IDs */}
    })();
  }, [loadRecords, loadDevices, loadLeaves, loadMembers]);

  const handleRevoke = async (deviceId: string) => {
    if (!confirm(`Revoke device ${deviceId}? The employee will be logged out.`)) return;
    try {
      await mobileAttendanceService.revokeDevice(deviceId);
      await loadDevices();
    } catch (e: any) {
      setError(e?.message || 'Failed to revoke device');
    }
  };

  const handleExportExcel = () => {
    if (records.length === 0) return;
    const rows = records.map((r) => ({
      'Date':               r.date,
      'Employee ID':        r.employeeId,
      'Branch ID':          r.branchId,
      'Check-In':           r.checkIn  ?? '',
      'Check-Out':          r.checkOut ?? '',
      'Check-In Lat':       r.checkInLat  ?? '',
      'Check-In Lon':       r.checkInLon  ?? '',
      'Check-Out Lat':      r.checkOutLat ?? '',
      'Check-Out Lon':      r.checkOutLon ?? '',
      'Check-In Distance (m)':  r.checkInDistance  ?? '',
      'Check-Out Distance (m)': r.checkOutDistance ?? '',
      'Status':             r.status ?? '',
      'Source':             r.source ?? 'mobile',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mobile Attendance');
    const filename = `mobile_attendance${dateFilter ? `_${dateFilter}` : `_${new Date().toISOString().slice(0, 10)}`}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleDateFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
    loadRecords(e.target.value || undefined);
  };

  const handleEdit = (record: MobileAttendanceRecord) => {
    setEditRecord(record);
    setEditCheckIn(record.checkIn ?? '');
    setEditCheckOut(record.checkOut ?? '');
    setEditStatus(record.status ?? 'present');
  };

  const handleSaveEdit = async () => {
    if (!editRecord?.id) return;
    setSaving(true);
    try {
      await mobileAttendanceService.updateRecord(editRecord.id, {
        checkIn: editCheckIn || undefined,
        checkOut: editCheckOut || undefined,
        status: editStatus || undefined,
      });
      setEditRecord(null);
      await loadRecords(dateFilter || undefined);
    } catch (e: any) {
      setError(e?.message || 'Failed to update record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: MobileAttendanceRecord) => {
    if (!record.id) return;
    if (!confirm(`Delete attendance record for ${employeeNames[record.employeeId] ?? record.employeeId} on ${record.date}?`)) return;
    try {
      await mobileAttendanceService.deleteRecord(record.id);
      await loadRecords(dateFilter || undefined);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete record');
    }
  };

  const handleLeaveStatusChange = async (leaveId: string, status: 'approved' | 'rejected') => {
    setApprovingLeave(leaveId);
    try {
      await leavesService.update(leaveId, { status });
      await loadLeaves(leaveStatusFilter || undefined);
    } catch (e: any) {
      setError(e?.message || 'Failed to update leave status');
    } finally {
      setApprovingLeave(null);
    }
  };

  const tabClass = (t: Tab) =>
    `px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      tab === t
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📱 Mobile Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">GPS-verified attendance from the Android app</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <MobileAttendanceStats records={records} devices={devices} />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <button className={tabClass('records')} onClick={() => setTab('records')}>
          Attendance Records
        </button>
        <button className={tabClass('devices')} onClick={() => setTab('devices')}>
          Registered Devices
        </button>
        <button className={tabClass('leaves')} onClick={() => setTab('leaves')}>
          Leave Requests
          {leaveRequests.filter((l) => l.status === 'pending').length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-xs w-5 h-5">
              {leaveRequests.filter((l) => l.status === 'pending').length}
            </span>
          )}
        </button>
        <button className={tabClass('members')} onClick={() => setTab('members')}>
          Members
          {members.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-xs w-5 h-5">
              {members.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'records' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={handleDateFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {dateFilter && (
              <button
                onClick={() => { setDateFilter(''); loadRecords(); }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
            )}
            <div className="ml-auto">
              <button
                onClick={handleExportExcel}
                disabled={records.length === 0 || loadingRecords}
                className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
          <MobileAttendanceTable
            records={records}
            loading={loadingRecords}
            employeeNames={employeeNames}
            branchNames={branchNames}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {tab === 'devices' && (
        <MobileDevicesTable devices={devices} loading={loadingDevices} onRevoke={handleRevoke} />
      )}

      {tab === 'leaves' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by status:</label>
            <select
              value={leaveStatusFilter}
              onChange={(e) => {
                setLeaveStatusFilter(e.target.value);
                loadLeaves(e.target.value || undefined);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => loadLeaves(leaveStatusFilter || undefined)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Refresh
            </button>
            <span className="ml-auto text-xs text-slate-400">
              {leaveRequests.length} request{leaveRequests.length !== 1 ? 's' : ''} from Android app
            </span>
          </div>

          {/* Table */}
          {loadingLeaves ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading leave requests…</div>
          ) : leaveRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No leave requests submitted from the Android app yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRequests.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {leave.employeeName || leave.employeeId}
                        {leave.employeeBranch && (
                          <span className="block text-xs text-slate-400">{leave.employeeBranch}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{leave.startDate}</td>
                      <td className="px-4 py-3 text-slate-600">{leave.endDate}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{leave.totalDays}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={leave.reason}>{leave.reason || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {leave.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleLeaveStatusChange(leave.id, 'approved')}
                              disabled={approvingLeave === leave.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveStatusChange(leave.id, 'rejected')}
                              disabled={approvingLeave === leave.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {members.length} employee{members.length !== 1 ? 's' : ''} registered via the Android app
            </span>
            <button
              onClick={loadMembers}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading members…</div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">No employees have registered via the Android app yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch / Dept</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Registered</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => {
                    const regDate = member.registeredAt?._seconds
                      ? new Date(member.registeredAt._seconds * 1000).toLocaleDateString()
                      : member.registeredAt
                        ? new Date(member.registeredAt).toLocaleDateString()
                        : '—';
                    return (
                      <tr key={member.employeeId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {member.fullName || '—'}
                          {member.jobTitle && (
                            <span className="block text-xs text-slate-400">{member.jobTitle}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{member.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                            {member.role || 'employee'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {member.branch || '—'}
                          {member.department && (
                            <span className="block text-xs text-slate-400">{member.department}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {member.deviceModel || '—'}
                          {member.osVersion && (
                            <span className="block text-xs text-slate-400">OS: {member.osVersion}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{regDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.isActive ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Record Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Edit Attendance Record</h2>
            <p className="text-xs text-slate-500 mb-4">
              {employeeNames[editRecord.employeeId] ?? editRecord.employeeId} — {editRecord.date}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Check-In Time (HH:MM)</label>
                <input
                  type="time"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Check-Out Time (HH:MM)</label>
                <input
                  type="time"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setEditRecord(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileAttendancePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MobileAttendanceContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
