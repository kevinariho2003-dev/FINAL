import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../Dashboard.css';
import './AdminDashboard.css';

const CRITERION_META = {
    blood_type: { icon: 'drop', color: '#ef4444' },
    genotype: { icon: 'dna', color: '#8b5cf6' },
    ethnicity: { icon: 'globe', color: '#f59e0b' },
    skin_tone: { icon: 'palette', color: '#ec4899' },
    hair_color: { icon: 'spark', color: '#06b6d4' },
    eye_color: { icon: 'eye', color: '#10b981' },
    height: { icon: 'ruler', color: '#6366f1' },
    weight: { icon: 'scale', color: '#f97316' },
    bmi: { icon: 'chart', color: '#14b8a6' },
    education_level: { icon: 'graduation', color: '#a855f7' },
    default: { icon: 'settings', color: '#64748b' },
};

function SvgIcon({ name, className = '' }) {
    const paths = {
        drop: 'M12 2s7 7.2 7 12a7 7 0 1 1-14 0c0-4.8 7-12 7-12z',
        dna: 'M7 3c6 3 4 15 10 18M17 3C11 6 13 18 7 21M8 7h8M8 12h8M8 17h8',
        globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm-9-10h18M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20',
        palette: 'M12 22a10 10 0 1 1 10-10c0 2-1 3-3 3h-1.5a1.5 1.5 0 0 0 0 3H19c-1.8 2.5-4.2 4-7 4zM7 10h.01M10 7h.01M14 7h.01M17 10h.01',
        spark: 'M12 2l1.9 5.7L20 10l-6.1 2.3L12 18l-1.9-5.7L4 10l6.1-2.3L12 2z',
        eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        ruler: 'M4 19 19 4l1 1-15 15-1-1zm4-3 2 2m1-5 2 2m1-5 2 2',
        scale: 'M12 3v18M5 7h14M6 7l-3 6h6L6 7zm12 0-3 6h6l-3-6z',
        chart: 'M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7',
        graduation: 'm22 10-10-5-10 5 10 5 10-5-10-5zm-6 3v4c0 1.5-2 3-4 3s-4-1.5-4-3v-4',
        settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z M19 12h2M3 12h2M12 3v2M12 19v2',
        save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM7 21v-8h10v8M7 3v5h8',
        alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
        check: 'M20 6 9 17l-5-5',
    };
    return (
        <svg className={`admin-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function AdminMatchingConfig() {
    const [weights, setWeights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchWeights = async () => {
            try {
                const res = await api.get('/admin/matching-weights');
                setWeights(res.data);
            } catch {
                /* ignore */
            } finally {
                setLoading(false);
            }
        };
        fetchWeights();
    }, []);

    const handleWeightChange = (id, value) => {
        const safeWeights = Array.isArray(weights) ? weights : [];
        setWeights(safeWeights.map(w => w.id === id ? { ...w, weight: parseFloat(value) || 0 } : w));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const safeWeightsToSave = Array.isArray(weights) ? weights : [];
            const payload = safeWeightsToSave.map(w => ({ id: w.id, weight: w.weight }));
            await api.put('/admin/matching-weights', { weights: payload });
            setSuccess('Weights updated successfully.');
            setTimeout(() => setSuccess(''), 3000);
        } catch {
            /* ignore */
        } finally {
            setSaving(false);
        }
    };

    const safeWeights = Array.isArray(weights) ? weights : [];
    const totalWeight = safeWeights.reduce((sum, w) => sum + (parseFloat(w.weight) || 0), 0);
    const isOverweight = totalWeight > 1.05;

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page admin-page-custom-bg admin-config-page">
            <section className="admin-list-hero">
                <div>
                    <p className="admin-kicker">Matching engine</p>
                    <h1>Matching Configuration</h1>
                    <p>Set how EDRMS ranks donor-recipient compatibility so clinicians review matches using your approved clinical priorities.</p>
                </div>
                <button className="admin-modern-btn" onClick={handleSave} disabled={saving}>
                    <SvgIcon name="save" /> {saving ? 'Saving...' : 'Save All Weights'}
                </button>
            </section>

            {success && <div className="save-success-indicator"><SvgIcon name="check" /> {success}</div>}

            <section className={`admin-weight-summary ${isOverweight ? 'warning' : ''}`}>
                <div className="admin-weight-icon">
                    <SvgIcon name={isOverweight ? 'alert' : 'chart'} />
                </div>
                <div>
                    <span>Total Weight Sum</span>
                    <strong>{totalWeight.toFixed(2)}</strong>
                    <p>{safeWeights.length} criteria - {safeWeights.filter(w => w.is_hard_filter).length} hard filters</p>
                </div>
                <div className="admin-weight-meter">
                    <span style={{ width: `${Math.min(totalWeight * 100, 100)}%` }} />
                </div>
            </section>

            <section className="admin-weight-grid">
                {safeWeights.map((w, index) => {
                    const key = w.criterion_name?.toLowerCase() || 'default';
                    const meta = CRITERION_META[key] || CRITERION_META.default;
                    const pct = Math.round((w.weight || 0) * 100);
                    return (
                        <article key={w.id} className="weight-card admin-weight-card-modern" style={{ '--criterion-color': meta.color, animationDelay: `${index * 45}ms` }}>
                            <div className="weight-card-header">
                                <div className="admin-weight-title">
                                    <span><SvgIcon name={meta.icon} /></span>
                                    <div>
                                        <strong>{w.criterion_name?.replace(/_/g, ' ') || 'Unknown'}</strong>
                                        <small>{w.is_hard_filter ? 'Hard filter' : 'Weighted score'}</small>
                                    </div>
                                </div>
                                <b>{Number(w.weight || 0).toFixed(2)}</b>
                            </div>
                            <div className="admin-weight-progress"><span style={{ width: `${pct}%` }} /></div>
                            <div className="weight-slider-container">
                                <input type="range" min="0" max="1" step="0.05" value={w.weight} onChange={e => handleWeightChange(w.id, e.target.value)} />
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
