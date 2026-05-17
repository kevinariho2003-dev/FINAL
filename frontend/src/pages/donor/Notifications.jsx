import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Bell, Calendar, Pill, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/donor/notifications')
            .then(res => setNotifications(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'medication': return <Pill size={18} color="#ec4899" />;
            case 'appointment': return <Calendar size={18} color="#06b6d4" />;
            case 'verification': return <CheckCircle size={18} color="#10b981" />;
            default: return <Bell size={18} />;
        }
    };

    return (
        <div className="page fade-in">
            <div className="donor-welcome-banner">
                <h1>Notifications & Reminders</h1>
                <p>Stay updated with your donation journey milestones.</p>
            </div>

            <div className="donor-journey-section">
                {notifications.length > 0 ? (
                    notifications.map((n) => (
                        <div key={n.id} className={`stage-inner notification-card ${n.is_read ? 'read' : 'unread'}`} 
                             style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'start' }}>
                            <div className="notification-icon-wrapper">
                                {getIcon(n.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{n.title}</h4>
                                    <small style={{ color: 'var(--text-secondary)' }}>
                                        <Clock size={12} /> {n.time_ago}
                                    </small>
                                </div>
                                <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {n.message}
                                </p>
                                {n.action_link && (
                                    <button className="btn-edit-toggle" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                                        View Details
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center" style={{ padding: '4rem' }}>
                        <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p>All caught up! No new notifications.</p>
                    </div>
                )}
            </div>
        </div>
    );
}