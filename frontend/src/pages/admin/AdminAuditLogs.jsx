import { useState, useEffect } from 'react';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import '../Dashboard.css';
import './AdminDashboard.css';

const ACTION_META = {
    create: { color: '#10b981', icon: 'plus' },
    update: { color: '#6366f1', icon: 'edit' },
    delete: { color: '#ef4444', icon: 'trash' },
    login: { color: '#06b6d4', icon: 'key' },
    logout: { color: '#64748b', icon: 'logout' },
    approve: { color: '#10b981', icon: 'check' },
    reject: { color: '#ef4444', icon: 'x' },
    suspend: { color: '#f59e0b', icon: 'pause' },
    register: { color: '#8b5cf6', icon: 'file' },
    report: { color: '#f59e0b', icon: 'download' },
    default: { color: '#8b5cf6', icon: 'pin' },
};

const FILTER_TABS = [
    { key: '', label: 'All Actions' },
    { key: 'create', label: 'Create' },
    { key: 'update', label: 'Update' },
    { key: 'delete', label: 'Delete' },
    { key: 'login', label: 'Login' },
    { key: 'match', label: 'Match' },
    { key: 'report', label: 'Report' },
];

function SvgIcon({ name, className = '' }) {
    const paths = {
        plus: 'M12 5v14M5 12h14',
        edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
        trash: 'M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14',
        key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-2.8-2.8A5.5 5.5 0 0 1 11.4 11.6zM13 9l8-8',
        logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
        check: 'M20 6 9 17l-5-5',
        x: 'M18 6 6 18M6 6l12 12',
        pause: 'M8 5v14M16 5v14',
        file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 0v6h6',
        pin: 'M12 17v5M9 3h6l1 7 3 3v2H5v-2l3-3 1-7z',
        shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm-9-10h18',
        download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3',
        calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    };
    return (
        <svg className={`admin-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [showReportPanel, setShowReportPanel] = useState(false);

    useEffect(() => { fetchLogs(); }, [filter, dateFrom, dateTo]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter) params.action = filter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            const res = await api.get('/admin/audit-logs', { params });
            setLogs(res.data?.data || []);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        try {
            setReportLoading(true);
            const params = {};
            if (filter) params.action = filter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const res = await api.get('/admin/audit-logs/report', {
                params,
                responseType: 'blob',
            });

            // Create a download link from the blob
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from Content-Disposition or use default
            const disposition = res.headers['content-disposition'];
            const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
            link.download = filenameMatch?.[1] || `EDRMS_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to generate report. Please try again.');
            console.error('Report download error:', err);
        } finally {
            setReportLoading(false);
        }
    };

    const getMeta = (action) => {
        const key = Object.keys(ACTION_META).find(k => action?.toLowerCase().includes(k));
        return ACTION_META[key] || ACTION_META.default;
    };

    const formatTimeAgo = (dateStr) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMins = Math.floor((now - date) / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page admin-page-custom-bg admin-audit-page">
            <section className="admin-list-hero">
                <div>
                    <p className="admin-kicker">Security trail</p>
                    <h1>Audit Logs</h1>
                    <p>Complete system activity log for account, matching, payment, and security events.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="admin-audit-total">
                        <span>Total Events</span>
                        <strong>{logs.length}</strong>
                    </div>
                    <button
                        className="audit-report-btn"
                        onClick={() => setShowReportPanel(!showReportPanel)}
                        title="Generate Report"
                    >
                        <SvgIcon name="download" />
                        Generate Report
                    </button>
                </div>
            </section>

            {/* Report Generation Panel */}
            {showReportPanel && (
                <section className="audit-report-panel">
                    <div className="audit-report-panel-header">
                        <SvgIcon name="file" />
                        <h3>Generate Audit Report</h3>
                    </div>
                    <p className="audit-report-panel-desc">
                        Export audit logs as a CSV file. Use the filters below to narrow the report scope.
                        The current action filter ({filter || 'All Actions'}) will be applied.
                    </p>
                    <div className="audit-report-filters">
                        <div className="audit-report-field">
                            <label htmlFor="report-date-from">
                                <SvgIcon name="calendar" /> From Date
                            </label>
                            <input
                                id="report-date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="audit-report-field">
                            <label htmlFor="report-date-to">
                                <SvgIcon name="calendar" /> To Date
                            </label>
                            <input
                                id="report-date-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <button
                            className="audit-report-download-btn"
                            onClick={handleDownloadReport}
                            disabled={reportLoading}
                        >
                            {reportLoading ? (
                                <><span className="btn-spinner"></span> Generating...</>
                            ) : (
                                <><SvgIcon name="download" /> Download CSV Report</>
                            )}
                        </button>
                    </div>
                    {dateFrom || dateTo ? (
                        <p className="audit-report-range-info">
                            Report range: {dateFrom || 'Beginning'} → {dateTo || 'Now'}
                            {filter && ` · Filtered by: "${filter}"`}
                        </p>
                    ) : (
                        <p className="audit-report-range-info">
                            No date range set — all records will be exported.
                            {filter && ` Filtered by: "${filter}"`}
                        </p>
                    )}
                </section>
            )}

            <TabSlider tabs={FILTER_TABS} active={filter} onChange={setFilter} />

            {logs.length === 0 ? (
                <div className="empty-state admin-empty">
                    <div className="empty-state-icon"><SvgIcon name="shield" /></div>
                    <div className="empty-state-text">No logs found</div>
                    <div className="empty-state-sub">Activity will appear here as users interact with the system.</div>
                </div>
            ) : (
                <section className="admin-audit-list">
                    {logs.map((log, index) => {
                        const meta = getMeta(log.action);
                        return (
                            <article key={log.id} className="admin-audit-item" style={{ '--event-color': meta.color, animationDelay: `${index * 30}ms` }}>
                                <span className="admin-audit-icon"><SvgIcon name={meta.icon} /></span>
                                <div className="admin-audit-main">
                                    <div className="admin-audit-top">
                                        <span className="admin-event-pill">{log.action}</span>
                                        <time>{formatTimeAgo(log.created_at)}</time>
                                    </div>
                                    <div className="admin-audit-user">
                                        <span>{(log.user?.first_name?.[0] || 'S')}{(log.user?.last_name?.[0] || '')}</span>
                                        <strong>{log.user?.first_name || 'System'} {log.user?.last_name || ''}</strong>
                                        {log.user?.role && <em>{log.user.role}</em>}
                                    </div>
                                    <div className="admin-audit-meta">
                                        <span>{log.resource_type} #{log.resource_id}</span>
                                        {log.ip_address && <span><SvgIcon name="globe" /> {log.ip_address}</span>}
                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
