import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAllUsers, getAllPayments, getAnalytics, updatePaymentStatus, updateUser } from '../lib/database';
import { notifyAdmin } from '../lib/telegram';
import {
  Users, CreditCard, BarChart3, Settings,
  Check, X, Clock, ArrowLeft, RefreshCw,
  ChevronDown, Search, Filter, TrendingUp, DollarSign
} from 'lucide-react';

export function AdminDashboard() {
  const { state, dispatch, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, paymentsData, analyticsData] = await Promise.all([
        getAllUsers(),
        getAllPayments(),
        getAnalytics()
      ]);
      setUsers(usersData);
      setPayments(paymentsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Load admin data error:', error);
      showToast('Data ရယူ၍ မရပါ', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovePayment(payment) {
    try {
      await updatePaymentStatus(payment.id, 'approved');
      await updateUser(payment.telegram_id, { is_paid: true });

      // Notify user via proxy
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          chat_id: payment.telegram_id,
          text: '🎉 သင့်ရဲ့ Payment ကို အတည်ပြုပြီးပါပြီ။ Nihon Ready App ထဲမှာ Content အားလုံးကို ယခု Unlock ဖြစ်ပါပြီ။'
        })
      });

      showToast('Payment Approved');
      loadData();
    } catch (error) {
      console.error('Approve error:', error);
      showToast('Approve မလုပ်နိုင်ပါ', 'error');
    }
  }

  async function handleRejectPayment(payment) {
    try {
      await updatePaymentStatus(payment.id, 'rejected');
      showToast('Payment Rejected');
      loadData();
    } catch (error) {
      console.error('Reject error:', error);
      showToast('Reject မလုပ်နိုင်ပါ', 'error');
    }
  }

  async function toggleUserPaid(user) {
    try {
      await updateUser(user.telegram_id, { is_paid: !user.is_paid });
      showToast(user.is_paid ? 'User Locked' : 'User Unlocked');
      loadData();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  }

  const filteredUsers = users.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        String(u.telegram_id).includes(q)
      );
    }
    return true;
  });

  const filteredPayments = payments.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { id: 'users', label: 'Users', icon: <Users size={16} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Admin Dashboard ကို ဖွင့်နေပါသည်...</div>
      </div>
    );
  }

  return (
    <div className="admin-container fade-in">
      {/* Header */}
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main' })}
              style={{ background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: 4 }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1>Admin Dashboard</h1>
          </div>
          <button
            onClick={loadData}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ padding: '0 16px', background: 'var(--white)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {activeTab === 'overview' && analytics && (
          <OverviewTab analytics={analytics} />
        )}
        {activeTab === 'users' && (
          <UsersTab
            users={filteredUsers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onTogglePaid={toggleUserPaid}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab
            payments={filteredPayments}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onApprove={handleApprovePayment}
            onReject={handleRejectPayment}
            users={users}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ analytics }) {
  const stats = [
    { label: 'Total Users', value: analytics.totalUsers, icon: <Users size={20} /> },
    { label: 'Paid Users', value: analytics.paidUsers, icon: <Check size={20} /> },
    { label: 'Pending Payments', value: analytics.pendingPayments, icon: <Clock size={20} /> },
    { label: 'Total Revenue', value: `${analytics.totalRevenue.toLocaleString()} MMK`, icon: <DollarSign size={20} /> },
    { label: 'Content Generated', value: analytics.contentGenerated, icon: <BarChart3 size={20} /> },
    { label: 'Conversion Rate', value: `${analytics.conversionRate}%`, icon: <TrendingUp size={20} /> },
  ];

  return (
    <div className="fade-in">
      <div className="admin-stats">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card fade-in-up" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ color: 'var(--gray-400)' }}>{stat.icon}</div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Daily Registrations */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Daily Registrations (7 days)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {analytics.dailyRegs.map((day, i) => {
            const maxCount = Math.max(...analytics.dailyRegs.map(d => d.count), 1);
            const height = (day.count / maxCount) * 100;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{day.count}</span>
                <div style={{
                  width: '100%',
                  height: `${Math.max(height, 4)}%`,
                  background: 'var(--black)',
                  borderRadius: 4,
                  transition: 'height 0.5s ease'
                }}></div>
                <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, searchQuery, setSearchQuery, onTogglePaid }) {
  return (
    <div className="fade-in">
      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: 42 }}
            placeholder="Search by name, username, or Telegram ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
        {users.length} users found
      </p>

      {/* Users List */}
      {users.map((user, i) => (
        <div key={user.id || i} className="card" style={{ marginBottom: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {user.first_name} {user.last_name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                @{user.username || 'N/A'} | ID: {user.telegram_id}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                Onboarding: {user.onboarding_count || 0}x | 
                Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${user.is_paid ? 'badge-success' : 'badge-neutral'}`}>
                {user.is_paid ? 'Paid' : 'Free'}
              </span>
              <button
                className={`btn ${user.is_paid ? 'btn-outline' : 'btn-primary'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => onTogglePaid(user)}
              >
                {user.is_paid ? 'Lock' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab({ payments, filterStatus, setFilterStatus, onApprove, onReject, users }) {
  const getUserName = (telegramId) => {
    const user = users.find(u => u.telegram_id === telegramId);
    return user ? `${user.first_name} ${user.last_name || ''}`.trim() : String(telegramId);
  };

  return (
    <div className="fade-in">
      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
        {payments.length} payments found
      </p>

      {/* Payments List */}
      {payments.map((payment, i) => (
        <div key={payment.id || i} className="card" style={{ marginBottom: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {getUserName(payment.telegram_id)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                ID: {payment.telegram_id}
              </div>
            </div>
            <span className={`badge ${payment.status === 'approved' ? 'badge-success' : payment.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
              {payment.status}
            </span>
          </div>

          <div className="payment-info" style={{ marginBottom: 8 }}>
            <div className="payment-info-row">
              <span className="payment-info-label">Amount</span>
              <span className="payment-info-value">{payment.amount?.toLocaleString()} MMK</span>
            </div>
            <div className="payment-info-row">
              <span className="payment-info-label">Type</span>
              <span className="payment-info-value">{payment.payment_type}</span>
            </div>
            <div className="payment-info-row">
              <span className="payment-info-label">Date</span>
              <span className="payment-info-value">
                {payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>

          {payment.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 16px', fontSize: 13 }}
                onClick={() => onApprove(payment)}
              >
                <Check size={16} />
                Approve
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '10px 16px', fontSize: 13 }}
                onClick={() => onReject(payment)}
              >
                <X size={16} />
                Reject
              </button>
            </div>
          )}
        </div>
      ))}

      {payments.length === 0 && (
        <div className="empty-state">
          <CreditCard size={48} />
          <h3>Payment မရှိပါ</h3>
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>App Information</h3>
        <div className="payment-info">
          <div className="payment-info-row">
            <span className="payment-info-label">App Name</span>
            <span className="payment-info-value">Nihon Ready</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">Version</span>
            <span className="payment-info-value">1.0.0</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">Base Price</span>
            <span className="payment-info-value">30,000 MMK</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">Extra Onboarding</span>
            <span className="payment-info-value">15,000 MMK</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">Free Onboarding</span>
            <span className="payment-info-value">2 times</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Payment Info</h3>
        <div className="payment-info">
          <div className="payment-info-row">
            <span className="payment-info-label">Phone</span>
            <span className="payment-info-value">09765028400</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">Name</span>
            <span className="payment-info-value">U Zwe Nyi Lin</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">Contact</span>
            <span className="payment-info-value">@rin311202</span>
          </div>
        </div>
      </div>
    </div>
  );
}
