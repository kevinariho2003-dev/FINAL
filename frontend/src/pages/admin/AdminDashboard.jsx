import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import '../Dashboard.css';
import './AdminDashboard.css';

const ROLE_META = {
    admin: { label: 'Admins', color: '#f59e0b', icon: 'settings' },
    clinician: { label: 'Clinicians', color: '#06b6d4', icon: 'stethoscope' },
    donor: { label: 'Donors', color: '#ec4899', icon: 'heart' },
    recipient: { label: 'Recipients', color: '#8b5cf6', icon: 'users' },
};

function SvgIcon({ name, className = '' }) {
    const paths = {
        users: 'M17 21a5 5 0 0 0-10 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm5-1a3 3 0 1 0 0-6m3 15a4 4 0 0 0-3-3.87',
        heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
        link: 'M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14',
        check: 'M20 6 9 17l-5-5',
        stethoscope: 'M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4m-2 8v3a4 4 0 0 0 8 0v-1a2 2 0 1 0-2 2',
        settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.5 19.3a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.7 8.5a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.8 1.8 0 0 0 15.5 4.7a1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.8 1.8 0 0 0 19.4 9c0 .4.22.77.6 1 .3.22.7.4 1.1.4H21a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15z',
        chart: 'M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7',
        shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        activity: 'M3 12h4l3-8 4 16 3-8h4',
        card: 'M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 4h18',
        arrow: 'M5 12h14m-6-6 6 6-6 6',
    };
    return (
        <svg className={`admin-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await api.get('/admin/statistics');
                setStats(statsRes.data);
            } catch {
                /* ignore */
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="page admin-page-custom-bg admin-modern-page">
            <section className="admin-modern-hero" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <div className="spinner"></div>
            </section>
        </div>
    );

    const usersByRole = stats?.users_by_role || {};
    const totalRoleUsers = Object.values(usersByRole).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
    const matchRate = stats?.total_matches ? Math.round((stats.approved_matches / stats.total_matches) * 100) : 0;
    const cycleRate = stats?.total_donation_cycles ? Math.round((stats.successful_cycles / stats.total_donation_cycles) * 100) : 0;

    const cards = [
        { label: 'Total Users', value: stats?.total_users || 0, sub: 'Registered accounts', icon: 'users', color: '#6366f1', to: '/admin/users' },
        { label: 'Approved Donors', value: stats?.approved_donors || 0, sub: `${stats?.pending_donors || 0} pending review`, icon: 'heart', color: '#ec4899', to: '/admin/users', state: { filter: 'donor' } },
        { label: 'Recipients', value: stats?.total_recipients || 0, sub: 'Recipient profiles', icon: 'users', color: '#8b5cf6', to: '/admin/users', state: { filter: 'recipient' } },
        { label: 'Matches', value: stats?.total_matches || 0, sub: `${stats?.approved_matches || 0} approved`, icon: 'link', color: '#06b6d4', to: '/admin/matching-config' },
        { label: 'Donation Cycles', value: stats?.total_donation_cycles || 0, sub: `${stats?.active_cycles || 0} active`, icon: 'activity', color: '#10b981', to: '/admin/audit-logs' },
        { label: 'Payments', value: stats?.total_payments || 0, sub: `${stats?.completed_payments || 0} completed`, icon: 'card', color: '#f59e0b', to: '/admin/audit-logs' },
    ];

    return (
        <div className="page admin-page-custom-bg admin-modern-page">
            <section className="admin-modern-hero">
                <div>
                    <p className="admin-kicker">System administration</p>
                    <h1>Welcome back, {user?.first_name || 'Admin'}</h1>
                    <p>Live operational overview for users, matching, cycles, payments, and security activity.</p>
                </div>
                <div className="admin-hero-actions">
                    <Link to="/admin/users" className="admin-modern-btn"><SvgIcon name="users" /> Manage Users</Link>
                    <Link to="/admin/audit-logs" className="admin-modern-btn secondary"><SvgIcon name="shield" /> Audit Trail</Link>
                </div>
            </section>

            <section className="admin-modern-stats">
                {cards.map(card => (
                    <Link key={card.label} to={card.to} state={card.state} className="admin-modern-stat" style={{ '--accent': card.color }}>
                        <span className="admin-stat-icon"><SvgIcon name={card.icon} /></span>
                        <span className="admin-stat-label">{card.label}</span>
                        <strong><AnimatedCounter target={card.value} /></strong>
                        <small>{card.sub}</small>
                    </Link>
                ))}
            </section>

            {/* ── Admin Action Items ── */}
            {(() => {
                const actionItems = [];
                if (stats?.pending_donors > 0) {
                    actionItems.push({ icon: 'heart', title: `${stats.pending_donors} Donor(s) Awaiting Review`, desc: 'New donor profiles need clinician review before they can be matched.', to: '/admin/users', state: { filter: 'donor' }, color: '#ec4899' });
                }
                if (stats?.proposed_matches > 0) {
                    actionItems.push({ icon: 'link', title: `${stats.proposed_matches} Match(es) Pending Approval`, desc: 'Proposed matches are awaiting clinical review and approval.', to: '/admin/matching-config', color: '#06b6d4' });
                }
                if (stats?.pending_payments > 0) {
                    actionItems.push({ icon: 'card', title: `${stats.pending_payments} Payment(s) Pending`, desc: 'Payments are awaiting processing or clinical confirmation.', to: '/admin/audit-logs', color: '#f59e0b' });
                }
                if (stats?.active_cycles > 0) {
                    actionItems.push({ icon: 'activity', title: `${stats.active_cycles} Active Donation Cycle(s)`, desc: 'Donation cycles are in progress and may need monitoring.', to: '/admin/audit-logs', color: '#10b981' });
                }

                return (
                    <section className="admin-modern-panel" style={{ marginBottom: '1.5rem' }}>
                        <div className="admin-panel-head">
                            <div>
                                <h2>Action Items</h2>
                                <p>{actionItems.length > 0 ? 'Items that need attention across the system' : 'No outstanding items — the system is running smoothly'}</p>
                            </div>
                            <SvgIcon name="check" />
                        </div>
                        {actionItems.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {actionItems.map((item, idx) => (
                                    <Link key={idx} to={item.to} state={item.state} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                                        background: `${item.color}08`, border: `1px solid ${item.color}25`, borderRadius: '12px',
                                        borderLeft: `4px solid ${item.color}`, textDecoration: 'none', color: 'inherit',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                    }}>
                                        <span style={{ color: item.color }}><SvgIcon name={item.icon} /></span>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.title}</strong>
                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                                        </div>
                                        <SvgIcon name="arrow" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '1.4rem' }}>✅</span>
                                <div>
                                    <strong style={{ color: '#065f46' }}>All Clear!</strong>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#047857' }}>No pending reviews, no outstanding payments, and all cycles are running smoothly.</p>
                                </div>
                            </div>
                        )}
                    </section>
                );
            })()}


            <section className="admin-modern-grid">
                <div className="admin-modern-panel role-panel">
                    <div className="admin-panel-head">
                        <div>
                            <h2>User Role Distribution</h2>
                            <p>Real counts from registered platform users.</p>
                        </div>
                        <SvgIcon name="chart" />
                    </div>
                    <div className="role-donut-layout">
                        <div className="role-donut" style={{
                            background: `conic-gradient(
                                #f59e0b 0 ${(usersByRole.admin || 0) / totalRoleUsers * 100}%,
                                #06b6d4 0 ${((usersByRole.admin || 0) + (usersByRole.clinician || 0)) / totalRoleUsers * 100}%,
                                #ec4899 0 ${((usersByRole.admin || 0) + (usersByRole.clinician || 0) + (usersByRole.donor || 0)) / totalRoleUsers * 100}%,
                                #8b5cf6 0 100%
                            )`,
                        }}>
                            <div>
                                <strong>{totalRoleUsers}</strong>
                                <span>users</span>
                            </div>
                        </div>
                        <div className="role-list-modern">
                            {Object.entries(ROLE_META).map(([role, meta]) => {
                                const count = usersByRole[role] || 0;
                                const pct = Math.round((count / totalRoleUsers) * 100);
                                return (
                                    <div className="role-row-modern" key={role}>
                                        <span className="role-dot" style={{ background: meta.color }} />
                                        <SvgIcon name={meta.icon} />
                                        <div>
                                            <strong>{meta.label}</strong>
                                            <small>{pct}% of users</small>
                                        </div>
                                        <b>{count}</b>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="admin-modern-panel">
                    <div className="admin-panel-head">
                        <div>
                            <h2>Operational Scores</h2>
                            <p>Approval and completion signals from system data.</p>
                        </div>
                        <SvgIcon name="activity" />
                    </div>
                    <div className="score-list">
                        <Score label="Match Approval Rate" value={matchRate} color="#06b6d4" />
                        <Score label="Cycle Success Rate" value={cycleRate} color="#10b981" />
                        <Score label="Completed Payments" value={stats?.total_payments ? Math.round((stats.completed_payments / stats.total_payments) * 100) : 0} color="#f59e0b" />
                    </div>
                </div>
            </section>

            <section className="admin-actions-row">
                {[
                    { to: '/admin/users', title: 'User Management', desc: 'Review accounts, status, and clinician creation.', icon: 'users' },
                    { to: '/admin/matching-config', title: 'Matching Configuration', desc: 'Tune criteria weights for match scoring.', icon: 'settings' },
                    { to: '/admin/audit-logs', title: 'Audit Logs', desc: 'Monitor security and system events.', icon: 'shield' },
                ].map(action => (
                    <Link to={action.to} className="admin-action-card" key={action.title}>
                        <SvgIcon name={action.icon} />
                        <div>
                            <strong>{action.title}</strong>
                            <span>{action.desc}</span>
                        </div>
                        <SvgIcon name="arrow" />
                    </Link>
                ))}
            </section>
        </div>
    );
}

function Score({ label, value, color }) {
    return (
        <div className="admin-score-row" style={{ '--score-color': color }}>
            <div>
                <strong>{label}</strong>
                <span>{value}%</span>
            </div>
            <div className="admin-score-track"><span style={{ width: `${Math.min(value, 100)}%` }} /></div>
        </div>
    );
}
