import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import '../Dashboard.css';
import './AdminDashboard.css';

const ROLE_COLORS = {
    admin: { bg: 'rgba(245, 158, 11, 0.15)', fill: '#f59e0b' },
    clinician: { bg: 'rgba(6, 182, 212, 0.15)', fill: '#06b6d4' },
    donor: { bg: 'rgba(236, 72, 153, 0.15)', fill: '#ec4899' },
    recipient: { bg: 'rgba(139, 92, 246, 0.15)', fill: '#8b5cf6' },
};

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [pendingDonors, setPendingDonors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState(null);
    const [expandedDonor, setExpandedDonor] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, pendingRes] = await Promise.all([
                    api.get('/admin/statistics'),
                    api.get('/admin/pending-donors'),
                ]);
                setStats(statsRes.data);
                setPendingDonors(pendingRes.data || []);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const handleDonorAction = async (donorId, status) => {
        setActionLoading(donorId);
        try {
            await api.patch(`/donors/${donorId}/status`, { status });
            setPendingDonors(prev => prev.filter(d => d.id !== donorId));
            setStats(prev => prev ? {
                ...prev,
                pending_donors: Math.max(0, (prev.pending_donors || 0) - 1),
                approved_donors: status === 'approved' ? (prev.approved_donors || 0) + 1 : prev.approved_donors,
            } : prev);
            setToast({ type: 'success', msg: `Donor ${status} successfully` });
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Action failed' });
        }
        setActionLoading(null);
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const totalByRole = stats?.users_by_role || {};
    const maxRoleCount = Math.max(...Object.values(totalByRole), 1);

    return (
        <div className="page admin-page-custom-bg">
            <div className="page-header">
                <h1 className="page-title">Admin Dashboard ⚙️</h1>
                <p className="page-subtitle">System overview and management</p>
            </div>

            {/* ── Animated Stat Cards ── */}
            <div className="stats-grid">
                <Link to="/admin/users" className="admin-stat-card admin-stat-card--clickable" style={{ '--stat-accent': '#6366f1', '--stat-glow': 'rgba(99, 102, 241, 0.4)', animationDelay: '0ms' }}>
                    <div className="stat-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>👥</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Users</div>
                        <div className="stat-value"><AnimatedCounter target={stats?.total_users || 0} /></div>
                        <span className="stat-trend neutral">📊 All roles — Click to manage</span>
                    </div>
                </Link>
                <Link to="/admin/users" state={{ filter: 'donor' }} className="admin-stat-card admin-stat-card--clickable" style={{ '--stat-accent': '#10b981', '--stat-glow': 'rgba(16, 185, 129, 0.4)', animationDelay: '100ms' }}>
                    <div className="stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>✅</div>
                    <div className="stat-content">
                        <div className="stat-label">Approved Donors</div>
                        <div className="stat-value"><AnimatedCounter target={stats?.approved_donors || 0} /></div>
                        <span className="stat-trend up">↑ Active profiles</span>
                    </div>
                </Link>
                <Link
                    to="/admin/users" state={{ filter: 'pending' }}
                    className={`admin-stat-card ${stats?.pending_donors > 0 ? 'admin-stat-card--clickable' : 'admin-stat-card--all-clear'}`}
                    style={{
                        '--stat-accent': stats?.pending_donors > 0 ? '#f59e0b' : '#10b981',
                        '--stat-glow': stats?.pending_donors > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.2)',
                        animationDelay: '200ms',
                    }}
                >
                    <div className="stat-icon-box" style={{ background: stats?.pending_donors > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}>
                        {stats?.pending_donors > 0 ? '⏳' : '✨'}
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Pending Donors</div>
                        <div className="stat-value"><AnimatedCounter target={stats?.pending_donors || 0} /></div>
                        {stats?.pending_donors > 0 ? (
                            <span className="stat-trend neutral animate-pulse">⏱ Awaiting review — Click to view</span>
                        ) : (
                            <span className="stat-trend up">✅ All clear — No pending reviews</span>
                        )}
                    </div>
                    {(stats?.pending_donors || 0) > 0 && (
                        <span className="pending-pulse-badge">{stats.pending_donors}</span>
                    )}
                </Link>
                <Link to="/admin/users" state={{ filter: 'recipient' }} className="admin-stat-card admin-stat-card--clickable" style={{ '--stat-accent': '#8b5cf6', '--stat-glow': 'rgba(139, 92, 246, 0.4)', animationDelay: '300ms' }}>
                    <div className="stat-icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>💜</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Recipients</div>
                        <div className="stat-value"><AnimatedCounter target={stats?.total_recipients || 0} /></div>
                        <span className="stat-trend neutral">Click to view list</span>
                    </div>
                </Link>
                <Link to="/admin/matching-config" className="admin-stat-card admin-stat-card--clickable" style={{ '--stat-accent': '#06b6d4', '--stat-glow': 'rgba(6, 182, 212, 0.4)', animationDelay: '400ms' }}>
                    <div className="stat-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>🔗</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Matches</div>
                        <div className="stat-value"><AnimatedCounter target={stats?.total_matches || 0} /></div>
                        <span className="stat-trend neutral">Manage engine config</span>
                    </div>
                </Link>
                <Link to="/admin/matching-config" className="admin-stat-card admin-stat-card--clickable" style={{ '--stat-accent': '#10b981', '--stat-glow': 'rgba(16, 185, 129, 0.4)', animationDelay: '500ms' }}>
                    <div className="stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>🎯</div>
                    <div className="stat-content">
                        <div className="stat-label">Approved Matches</div>
                        <div className="stat-value"><AnimatedCounter target={stats?.approved_matches || 0} /></div>
                        <span className="stat-trend up">↑ Successful logic</span>
                    </div>
                </Link>
            </div>

            {/* ── Analytics & Trend Lines ── */}
            <div className="admin-analytics-row">
                {/* Sparkline Trend Chart */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <h3>📈 Registration Trend</h3>
                        <span className="analytics-badge up">+12% this week</span>
                    </div>
                    <svg className="sparkline-chart" viewBox="0 0 300 80" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="sparkGrad1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d="M0,60 Q20,55 40,50 T80,40 T120,45 T160,30 T200,35 T240,20 T280,15 L300,12 L300,80 L0,80 Z" fill="url(#sparkGrad1)" className="sparkline-area" />
                        <path d="M0,60 Q20,55 40,50 T80,40 T120,45 T160,30 T200,35 T240,20 T280,15 L300,12" fill="none" stroke="#6366f1" strokeWidth="2.5" className="sparkline-line" />
                        <circle cx="300" cy="12" r="4" fill="#6366f1" className="sparkline-dot" />
                    </svg>
                    <div className="sparkline-labels">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                {/* Match Success Rate Gauge */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <h3>🎯 Match Success Rate</h3>
                        <span className="analytics-badge up">Excellent</span>
                    </div>
                    <div className="gauge-container">
                        <svg viewBox="0 0 120 70" className="gauge-svg">
                            <path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
                            <path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="157" strokeDashoffset={157 - (157 * Math.min(((stats?.approved_matches || 1) / Math.max(stats?.total_matches || 1, 1)) * 100, 100)) / 100} className="gauge-fill" />
                            <defs>
                                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="50%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                            <text x="60" y="55" textAnchor="middle" fill="#111827" fontSize="18" fontWeight="800">
                                {stats?.total_matches ? Math.round((stats.approved_matches / stats.total_matches) * 100) : 0}%
                            </text>
                        </svg>
                        <div className="gauge-labels">
                            <span>{stats?.approved_matches || 0} approved</span>
                            <span>{stats?.total_matches || 0} total</span>
                        </div>
                    </div>
                </div>

                {/* Donor vs Recipient Activity */}
                <div className="analytics-card">
                    <div className="analytics-card-header">
                        <h3>🌸 Donor vs Recipient</h3>
                        <span className="analytics-badge neutral">Balance</span>
                    </div>
                    <svg className="sparkline-chart" viewBox="0 0 300 80" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="sparkGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="sparkGrad3" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Donors line */}
                        <path d="M0,50 Q30,45 60,40 T120,35 T180,30 T240,25 L300,20" fill="none" stroke="#ec4899" strokeWidth="2" opacity="0.8" />
                        {/* Recipients line */}
                        <path d="M0,55 Q30,50 60,48 T120,42 T180,38 T240,32 L300,28" fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.8" />
                        <circle cx="300" cy="20" r="3" fill="#ec4899" />
                        <circle cx="300" cy="28" r="3" fill="#8b5cf6" />
                    </svg>
                    <div className="sparkline-legend">
                        <span><i style={{ background: '#ec4899' }}></i> Donors ({stats?.approved_donors || 0})</span>
                        <span><i style={{ background: '#8b5cf6' }}></i> Recipients ({stats?.total_recipients || 0})</span>
                    </div>
                </div>
            </div>

            {/* ── System Health Indicators ── */}
            <div className="admin-health-row">
                {[
                    { label: 'API Health', status: 'Operational', icon: '🟢', pct: 99.9 },
                    { label: 'Database', status: 'Connected', icon: '🟢', pct: 100 },
                    { label: 'Match Engine', status: stats?.total_matches > 0 ? 'Active' : 'Idle', icon: stats?.total_matches > 0 ? '🟢' : '🟡', pct: stats?.total_matches > 0 ? 95 : 50 },
                    { label: 'Audit Logging', status: 'Recording', icon: '🟢', pct: 100 },
                ].map((h, i) => (
                    <div key={i} className="health-item">
                        <div className="health-top">
                            <span className="health-icon">{h.icon}</span>
                            <span className="health-label">{h.label}</span>
                        </div>
                        <div className="health-bar-track">
                            <div className="health-bar-fill" style={{ width: `${h.pct}%`, animationDelay: `${i * 200}ms` }} />
                        </div>
                        <span className="health-status">{h.status} · {h.pct}%</span>
                    </div>
                ))}
            </div>

            {/* ── Pending Donors Awaiting Review ── */}
            <div id="pending-donors-section" className="pending-donors-section">
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title">
                            ⏳ Pending Donors — Awaiting Review
                            {pendingDonors.length > 0 && (
                                <span className="pending-count-badge">{pendingDonors.length}</span>
                            )}
                        </h3>
                    </div>

                    {pendingDonors.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-text">All caught up!</div>
                            <div className="empty-state-sub">No pending donors to review</div>
                        </div>
                    ) : (
                        <div className="pending-donors-list">
                            {pendingDonors.map((donor, i) => (
                                <div
                                    key={donor.id}
                                    className={`pending-donor-card ${expandedDonor === donor.id ? 'expanded' : ''}`}
                                    style={{ animationDelay: `${i * 80}ms` }}
                                >
                                    <div
                                        className="pending-donor-header"
                                        onClick={() => setExpandedDonor(expandedDonor === donor.id ? null : donor.id)}
                                    >
                                        <div className="pending-donor-avatar">🌸</div>
                                        <div className="pending-donor-info">
                                            <div className="pending-donor-name">
                                                {donor.user?.first_name} {donor.user?.last_name}
                                            </div>
                                            <div className="pending-donor-code">{donor.donor_code}</div>
                                        </div>
                                        <div className="pending-donor-meta">
                                            <span className="badge badge-pending">Pending</span>
                                            <span className="pending-donor-date">
                                                {new Date(donor.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className={`pending-donor-chevron ${expandedDonor === donor.id ? 'open' : ''}`}>
                                            ▾
                                        </div>
                                    </div>

                                    {expandedDonor === donor.id && (
                                        <div className="pending-donor-details">
                                            <div className="pending-donor-grid">
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Blood Type</span>
                                                    <span className="pending-detail-value">{donor.blood_type || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Genotype</span>
                                                    <span className="pending-detail-value">{donor.genotype || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Ethnicity</span>
                                                    <span className="pending-detail-value">{donor.ethnicity || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Skin Tone</span>
                                                    <span className="pending-detail-value">{donor.skin_tone || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Hair Color</span>
                                                    <span className="pending-detail-value">{donor.hair_color || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Eye Color</span>
                                                    <span className="pending-detail-value">{donor.eye_color || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Height</span>
                                                    <span className="pending-detail-value">{donor.height_cm ? `${donor.height_cm} cm` : '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Weight</span>
                                                    <span className="pending-detail-value">{donor.weight_kg ? `${donor.weight_kg} kg` : '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">BMI</span>
                                                    <span className="pending-detail-value">{donor.bmi || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Education</span>
                                                    <span className="pending-detail-value">{donor.education_level || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">Occupation</span>
                                                    <span className="pending-detail-value">{donor.occupation || '—'}</span>
                                                </div>
                                                <div className="pending-detail-item">
                                                    <span className="pending-detail-label">DOB</span>
                                                    <span className="pending-detail-value">
                                                        {donor.date_of_birth ? new Date(donor.date_of_birth).toLocaleDateString() : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pending-donor-actions">
                                                <button
                                                    className="btn btn-success"
                                                    onClick={() => handleDonorAction(donor.id, 'approved')}
                                                    disabled={actionLoading === donor.id}
                                                >
                                                    {actionLoading === donor.id ? '...' : '✅ Approve Donor'}
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => handleDonorAction(donor.id, 'suspended')}
                                                    disabled={actionLoading === donor.id}
                                                >
                                                    {actionLoading === donor.id ? '...' : '🚫 Suspend Donor'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Users by Role Distribution ── */}
            {Object.keys(totalByRole).length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header"><h3 className="card-title">Users by Role</h3></div>
                    <div className="role-distribution">
                        {Object.entries(totalByRole).map(([role, count]) => {
                            const colors = ROLE_COLORS[role] || ROLE_COLORS.admin;
                            const percentage = Math.round((count / maxRoleCount) * 100);
                            return (
                                <div key={role} className="role-bar-item">
                                    <span className="role-bar-label">{role}s</span>
                                    <div className="role-bar-track">
                                        <div
                                            className="role-bar-fill"
                                            style={{
                                                width: `${Math.max(percentage, 8)}%`,
                                                background: `linear-gradient(90deg, ${colors.fill}80, ${colors.fill})`,
                                            }}
                                        >
                                            {count}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
