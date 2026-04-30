import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../Dashboard.css';

export default function RecipientMatchList() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { fetchMatches(); }, []);

    const fetchMatches = async () => {
        try {
            const res = await api.get('/matches');
            setMatches(res.data?.data || res.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const toggleExpand = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">My Matches 💜</h1>
                <p className="page-subtitle">
                    {matches.length === 0
                        ? 'No approved matches yet — your clinician will generate matches for you'
                        : `${matches.length} approved match${matches.length !== 1 ? 'es' : ''} found`
                    }
                </p>
            </div>

            {matches.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No Matches Yet</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                        Once your clinician runs the matching engine and approves matches, they will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {matches.map((match, index) => {
                        const isExpanded = expanded === match.id;
                        const breakdown = match.score_breakdown || {};

                        return (
                            <div className="card" key={match.id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(match.id)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>#{index + 1}</span>
                                            <span style={{ fontWeight: 600 }}>Donor {match.donor?.donor_code || '—'}</span>
                                            <span className={`badge badge-${match.status}`}>{match.status}</span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Matched on {new Date(match.created_at).toLocaleDateString()}
                                            {match.reviewer && ` · Reviewed by Dr. ${match.reviewer.last_name}`}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '1.75rem', fontWeight: 700,
                                            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                        }}>
                                            {typeof match.match_score === 'number' ? match.match_score.toFixed(1) : match.match_score}%
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Match Score</div>
                                    </div>
                                </div>

                                {isExpanded && Object.keys(breakdown).length > 0 && (
                                    <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Score Breakdown
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                            {Object.entries(breakdown).map(([criterion, data]) => (
                                                <div key={criterion} style={{
                                                    padding: '0.75rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid var(--border)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                                            {criterion.replace(/_/g, ' ')}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.8rem', fontWeight: 700,
                                                            color: data.raw_score >= 0.7 ? 'var(--success)' : data.raw_score >= 0.4 ? 'var(--warning)' : 'var(--danger)',
                                                        }}>
                                                            {(data.raw_score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.details}</div>
                                                    {/* Score bar */}
                                                    <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginTop: '0.4rem' }}>
                                                        <div style={{
                                                            height: '100%', borderRadius: '2px',
                                                            width: `${data.raw_score * 100}%`,
                                                            background: data.raw_score >= 0.7 ? 'var(--success)' : data.raw_score >= 0.4 ? 'var(--warning)' : 'var(--danger)',
                                                        }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {match.review_notes && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--info)' }}>Clinician Notes: </span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{match.review_notes}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                                    {isExpanded ? '▲ Click to collapse' : '▼ Click to expand details'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
