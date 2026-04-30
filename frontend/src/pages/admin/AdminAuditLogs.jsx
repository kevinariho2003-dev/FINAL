import { useState, useEffect } from 'react';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import '../Dashboard.css';
import './AdminDashboard.css';

const ACTION_COLORS = {
    create: '#10b981',
    update: '#6366f1',
    delete: '#ef4444',
    login: '#06b6d4',
    approve: '#10b981',
    reject: '#ef4444',
    default: '#8b5cf6',
};

const FILTER_TABS = [
    { key: '', label: 'All Actions' },
    { key: 'create', label: '➕ Create' },
    { key: 'update', label: '✏️ Update' },
    { key: 'delete', label: '🗑 Delete' },
    { key: 'login', label: '🔑 Login' },
];

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => { fetchLogs(); }, [filter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter) params.action = filter;
            const res = await api.get('/admin/audit-logs', { params });
            setLogs(res.data?.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const getActionColor = (action) => {
        const key = Object.keys(ACTION_COLORS).find(k => action?.toLowerCase().includes(k));
        return ACTION_COLORS[key] || ACTION_COLORS.default;
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Audit Logs 📋</h1>
                <p className="page-subtitle">System activity trail</p>
            </div>

            <TabSlider tabs={FILTER_TABS} active={filter} onChange={setFilter} />

            {logs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">No logs found</div>
                    <div className="empty-state-sub">Activity will appear here as users interact with the system</div>
                </div>
            ) : (
                <div className="timeline">
                    {logs.map((log, i) => {
                        const color = getActionColor(log.action);
                        return (
                            <div key={log.id} className="timeline-item" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="timeline-dot" style={{ background: color, boxShadow: `0 0 8px ${color}40` }} />
                                <div className="timeline-card">
                                    <div className="timeline-time">
                                        {new Date(log.created_at).toLocaleString()}
                                    </div>
                                    <div className="timeline-action">
                                        <span className="badge" style={{ background: `${color}20`, color }}>
                                            {log.action}
                                        </span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {log.user?.first_name || 'System'} {log.user?.last_name || ''}
                                        </span>
                                    </div>
                                    <div className="timeline-resource">
                                        {log.resource_type} #{log.resource_id}
                                        {log.ip_address && <span style={{ marginLeft: '1rem', opacity: 0.5 }}>IP: {log.ip_address}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
