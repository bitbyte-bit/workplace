import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldIcon, UsersIcon, AlertTriangleIcon, BanIcon, Trash2Icon, 
  CheckCircleIcon, XCircleIcon, SearchIcon, RefreshIcon, LogOutIcon, 
  SalesIcon, StockIcon, DebtIcon, ExpenseIcon
} from './Icons';
import { 
  getAllUsers, getAdminStats, warnUser, suspendUser, unsuspendUser, banUser, deleteUser, User, AdminStats 
} from '../services/db';

interface AdminDashboardProps {
  adminId: string;
  onLogout: () => void;
}

interface MonthlyData {
  month: string;
  sales: number;
  expenses: number;
  stock: number;
  debts: number;
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
  const [activeSection, setActiveSection] = useState<'overview' | 'users'>('overview');

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

  // Generate sample monthly data for charts
  const monthlyData: MonthlyData[] = [
    { month: 'Jan', sales: 12000, expenses: 4500, stock: 8500, debts: 3200 },
    { month: 'Feb', sales: 15000, expenses: 5200, stock: 9200, debts: 2800 },
    { month: 'Mar', sales: 18000, expenses: 4800, stock: 9800, debts: 3500 },
    { month: 'Apr', sales: 14000, expenses: 5100, stock: 9000, debts: 3100 },
    { month: 'May', sales: 22000, expenses: 6000, stock: 11000, debts: 2900 },
    { month: 'Jun', sales: 19500, expenses: 5500, stock: 10500, debts: 3300 },
  ];

  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.sales, d.expenses, d.stock, d.debts)));

  const getBarHeight = (value: number) => (value / maxValue) * 100;

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setActiveSection('overview')}
            className={`btn ${activeSection === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveSection('users')}
            className={`btn ${activeSection === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          >
            User Management
          </button>
        </div>
        <button onClick={onLogout} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogOutIcon style={{ width: 16, height: 16 }} /> Exit Admin
        </button>
      </div>

      {activeSection === 'overview' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <ShieldIcon style={{ width: 24, height: 24 }} /> Admin Dashboard
            </h2>
            <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshIcon style={{ width: 16, height: 16 }} /> Refresh
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div className="stat-card">
                <UsersIcon style={{ width: 24, height: 24, color: '#3b82f6' }} />
                <div>
                  <div className="stat-value">{stats.totalUsers}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
              <div className="stat-card">
                <CheckCircleIcon style={{ width: 24, height: 24, color: '#10b981' }} />
                <div>
                  <div className="stat-value">{stats.activeUsers}</div>
                  <div className="stat-label">Active Users</div>
                </div>
              </div>
              <div className="stat-card">
                <AlertTriangleIcon style={{ width: 24, height: 24, color: '#f59e0b' }} />
                <div>
                  <div className="stat-value">{stats.warnedUsers}</div>
                  <div className="stat-label">Warned Users</div>
                </div>
              </div>
              <div className="stat-card">
                <BanIcon style={{ width: 24, height: 24, color: '#ef4444' }} />
                <div>
                  <div className="stat-value">{stats.bannedUsers}</div>
                  <div className="stat-label">Banned</div>
                </div>
              </div>
              <div className="stat-card">
                <SalesIcon style={{ width: 24, height: 24, color: '#8b5cf6' }} />
                <div>
                  <div className="stat-value">{stats.totalSales}</div>
                  <div className="stat-label">Total Sales</div>
                </div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: '24px' }}>💰</div>
                <div>
                  <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
                  <div className="stat-label">Revenue</div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* Bar Chart - Performance Overview */}
            <div className="chart-card">
              <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 600 }}>Performance Overview</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', padding: '0 10px' }}>
                {monthlyData.map((data, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '160px' }}>
                      <div 
                        className="bar sales-bar"
                        style={{ 
                          width: '20px', 
                          height: `${getBarHeight(data.sales)}%`,
                          background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                        title={`Sales: $${data.sales.toLocaleString()}`}
                      />
                      <div 
                        className="bar expense-bar"
                        style={{ 
                          width: '20px', 
                          height: `${getBarHeight(data.expenses)}%`,
                          background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                        title={`Expenses: $${data.expenses.toLocaleString()}`}
                      />
                      <div 
                        className="bar stock-bar"
                        style={{ 
                          width: '20px', 
                          height: `${getBarHeight(data.stock)}%`,
                          background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                        title={`Stock: $${data.stock.toLocaleString()}`}
                      />
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{data.month}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#3b82f6' }} />
                  Sales
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ef4444' }} />
                  Expenses
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10b981' }} />
                  Stock
                </div>
              </div>
            </div>

            {/* Pie Chart - User Distribution */}
            <div className="chart-card">
              <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 600 }}>User Status Distribution</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
                <div style={{ 
                  width: '160px', 
                  height: '160px', 
                  borderRadius: '50%',
                  background: 'conic-gradient(#10b981 0deg 180deg, #f59e0b 180deg 252deg, #ef4444 252deg 288deg, #94a3b8 288deg 360deg)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: '30px',
                    background: 'white',
                    borderRadius: '50%'
                  }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10b981' }} />
                    <span>Active ({stats.activeUsers})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f59e0b' }} />
                    <span>Warned ({stats.warnedUsers})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ef4444' }} />
                    <span>Suspended/Banned ({stats.suspendedUsers + stats.bannedUsers})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart - Revenue Trend */}
          <div className="chart-card">
            <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 600 }}>Revenue & Expenses Trend</h3>
            <div style={{ position: 'relative', height: '180px', padding: '0 10px' }}>
              <svg width="100%" height="100%" viewBox="0 0 600 150" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                  <line 
                    key={i}
                    x1="0" 
                    y1={i * 30} 
                    x2="600" 
                    y2={i * 30} 
                    stroke="#e2e8f0" 
                    strokeWidth="1"
                  />
                ))}
                
                {/* Revenue line */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  points={monthlyData.map((d, i) => `${i * 100 + 50},${150 - (d.sales / maxValue) * 120}`).join(' ')}
                />
                
                {/* Expenses line */}
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  points={monthlyData.map((d, i) => `${i * 100 + 50},${150 - (d.expenses / maxValue) * 120}`).join(' ')}
                />

                {/* Data points - Revenue */}
                {monthlyData.map((d, i) => (
                  <circle 
                    key={`r-${i}`}
                    cx={i * 100 + 50} 
                    cy={150 - (d.sales / maxValue) * 120} 
                    r="5" 
                    fill="#3b82f6"
                  />
                ))}

                {/* Data points - Expenses */}
                {monthlyData.map((d, i) => (
                  <circle 
                    key={`e-${i}`}
                    cx={i * 100 + 50} 
                    cy={150 - (d.expenses / maxValue) * 120} 
                    r="5" 
                    fill="#ef4444"
                  />
                ))}
              </svg>
              
              {/* X-axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 50px', marginTop: '8px' }}>
                {monthlyData.map((d, i) => (
                  <span key={i} style={{ fontSize: '12px', color: '#64748b' }}>{d.month}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <div style={{ width: '20px', height: '3px', background: '#3b82f6' }} />
                Revenue
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <div style={{ width: '20px', height: '3px', background: '#ef4444' }} />
                Expenses
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === 'users' && (
        <>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <UsersIcon style={{ width: 24, height: 24 }} /> User Management
          </h2>

          {/* Search and Filter */}
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

          {/* Users Table */}
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
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '12px',
                        background: user.status === 'active' ? '#dcfce7' : user.status === 'suspended' ? '#fef3c7' : '#fee2e2',
                        color: user.status === 'active' ? '#16a34a' : user.status === 'suspended' ? '#d97706' : '#dc2626'
                      }}>
                        {user.status === 'active' && <CheckCircleIcon style={{ width: 12, height: 12 }} />}
                        {user.status === 'suspended' && <XCircleIcon style={{ width: 12, height: 12 }} />}
                        {user.status === 'banned' && <BanIcon style={{ width: 12, height: 12 }} />}
                        {user.status}
                      </span>
                    </td>
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
        </>
      )}

      {/* Warning Modal */}
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

      {/* Suspend Modal */}
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

      {/* Ban Modal */}
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

      {/* Delete Modal */}
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
