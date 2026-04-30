import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../Dashboard.css';
import './AdminDashboard.css';

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
            } catch { /* ignore */ }
            finally { setLoading(false); }
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
            setSuccess('Weights updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch { /* ignore */ }
        finally { setSaving(false); }
    };

    const safeWeights = Array.isArray(weights) ? weights : [];
    const totalWeight = safeWeights.reduce((sum, w) => sum + (parseFloat(w.weight) || 0), 0);

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Matching Configuration ⚖️</h1>
                <p className="page-subtitle">Configure MCDA matching weights (0.0 – 1.0). Higher = more important.</p>
            </div>

            {success && <div className="save-success-indicator">✅ {success}</div>}

            {/* Total weight summary */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Weight Sum</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: totalWeight > 1.05 ? 'var(--warning)' : 'var(--accent)' }}>
                        {totalWeight.toFixed(2)}
                    </div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving} style={{ minWidth: '160px' }}>
                    {saving ? (
                        <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> Saving...</>
                    ) : '💾 Save Weights'}
                </button>
            </div>

            {/* Weight cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {safeWeights.map((w, i) => (
                    <div key={w.id} className="weight-card" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="weight-card-header">
                            <span className="weight-card-name">{w.criterion_name?.replace(/_/g, ' ') || 'Unknown'}</span>
                            <span className={`badge ${w.is_hard_filter ? 'badge-pending' : 'badge-active'}`}>
                                {w.is_hard_filter ? 'Hard Filter' : 'Soft Score'}
                            </span>
                        </div>
                        <div className="weight-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={w.weight}
                                onChange={e => handleWeightChange(w.id, e.target.value)}
                            />
                        </div>
                        <div className="weight-value-display">{Number(w.weight || 0).toFixed(2)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
