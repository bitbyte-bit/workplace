import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldIcon, UsersIcon, AlertTriangleIcon, BanIcon, Trash2Icon, 
  CheckCircleIcon, XCircleIcon, SearchIcon, RefreshIcon, LogOutIcon 
} from './Icons';
import { 
  getAllUsers, getAdminStats, warnUser, suspendUser, unsuspendUser, banUser, deleteUser, User, AdminStats 
} from '../services/db';

interface AdminDashboardProps {
  adminId: string;
  onLogout: () => void;
}

export default function AdminDashboard({ adminId, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        getAllUsers(adminId),
        getAdminStats(adminId)
      ]);
      setUsers(usersData.users);
      setStats(statsData.stats);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action();
      await loadData();
      setShowWarningModal(false);
      setShowSuspendModal(false);
      setShowBanModal(false);
      setShowDeleteModal(false);
      setSelectedUser(null);
      setReason('');
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.businessName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || user.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string, warnings: number) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <CheckCircleIcon style={{ width: 14, height: 14 }} /> Active
          </span>
        );
      case 'suspended':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
            <XCircleIcon style={{ width: 14, height: 14 }} /> Suspended
          </span>
        );
      case 'banned':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
            <BanIcon style={{ width: 14, height: 14 }} /> Banned
          </span>
        );
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <ShieldIcon style={{ width: 24, height: 24 }} /> Admin Dashboard
        </h2>
        <button onClick={onLogout} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogOutIcon style={{ width: 16, height: 16 }} /> Exit Admin
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card">
            <UsersIcon style={{ width: 20, height: 20 }} />
            <div>
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #10b981' }}>
            <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />
            <div>
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <AlertTriangleIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />
            <div>
              <div className="stat-value">{stats.warnedUsers}</div>
              <div className="stat-label">Warned</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <BanIcon style={{ width: 20, height: 20, color: '#ef4444' }} />
            <div>
              <div className="stat-value">{stats.bannedUsers + stats.suspendedUsers}</div>
              <div className="stat-label">Suspended/Banned</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #6366f1' }}>
            <div style={{ fontSize: '20px' }}>💰</div>
            <div>
              <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <SearchIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'active', 'suspended', 'banned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshIcon style={{ width: 16, height: 16 }} /> Refresh
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Business</th>
              <th>Status</th>
              <th>Warnings</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: User) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{user.fullName}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</span>
                  </div>
                </td>
                <td>{user.businessName}</td>
                <td>{getStatusBadge(user.status, user.warningCount)}</td>
                <td>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    background: user.warningCount > 0 ? '#fef3c7' : '#f3f4f6',
                    color: user.warningCount > 0 ? '#d97706' : '#6b7280',
                    fontSize: '12px'
                  }}>
                    <AlertTriangleIcon style={{ width: 12, height: 12 }} /> {user.warningCount}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: '#6b7280' }}>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setSelectedUser(user); setShowWarningModal(true); }}
                      className="action-btn warning"
                      title="Warn User"
                      disabled={actionLoading === user.id}
                    >
                      <AlertTriangleIcon style={{ width: 14, height: 14 }} />
                    </button>
                    {user.status === 'suspended' ? (
                      <button
                        onClick={() => { setActionLoading(user.id); handleAction(() => unsuspendUser(adminId, user.id)); }}
                        className="action-btn success"
                        title="Unsuspend User"
                        disabled={actionLoading === user.id}
                      >
                        <CheckCircleIcon style={{ width: 14, height: 14 }} />
                      </button>
                    ) : user.status !== 'banned' && (
                      <button
                        onClick={() => { setSelectedUser(user); setShowSuspendModal(true); }}
                        className="action-btn suspend"
                        title="Suspend User"
                        disabled={actionLoading === user.id}
                      >
                        <XCircleIcon style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
                      className="action-btn ban"
                      title="Ban User"
                      disabled={actionLoading === user.id || user.status === 'banned'}
                    >
                      <BanIcon style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                      className="action-btn delete"
                      title="Delete User"
                      disabled={actionLoading === user.id}
                    >
                      <Trash2Icon style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showWarningModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowWarningModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Warn User</h3>
            <p>Send a warning to <strong>{selectedUser.fullName}</strong> ({selectedUser.email})</p>
            <textarea
              placeholder="Reason for warning (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '80px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowWarningModal(false)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={() => { setActionLoading(selectedUser.id); handleAction(() => warnUser(adminId, selectedUser.id, reason)); }} 
                className="btn btn-warning"
              >
                Send Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspendModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowSuspendModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⏸️ Suspend User</h3>
            <p>Suspend <strong>{selectedUser.fullName}</strong> ({selectedUser.email})</p>
            <textarea
              placeholder="Reason for suspension (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '80px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSuspendModal(false)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={() => { setActionLoading(selectedUser.id); handleAction(() => suspendUser(adminId, selectedUser.id, reason)); }} 
                className="btn btn-warning"
                disabled={!reason.trim()}
              >
                Suspend User
              </button>
            </div>
          </div>
        </div>
      )}

      {showBanModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowBanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🚫 Ban User</h3>
            <p>Permanently ban <strong>{selectedUser.fullName}</strong> ({selectedUser.email})?</p>
            <p style={{ color: '#ef4444', fontSize: '14px' }}>This action cannot be undone. The user will not be able to log in.</p>
            <textarea
              placeholder="Reason for ban (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '80px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBanModal(false)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={() => { setActionLoading(selectedUser.id); handleAction(() => banUser(adminId, selectedUser.id, reason)); }} 
                className="btn btn-danger"
                disabled={!reason.trim()}
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ Delete User</h3>
            <p>Delete <strong>{selectedUser.fullName}</strong> and all their data?</p>
            <p style={{ color: '#ef4444', fontSize: '14px' }}>⚠️ This will permanently delete all sales, stock, debts, and expenses for this user. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={() => { setActionLoading(selectedUser.id); handleAction(() => deleteUser(adminId, selectedUser.id)); }} 
                className="btn btn-danger"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
