import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../Dashboard.css';

export default function RecipientMatchList() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [actioning, setActioning] = useState(false);

    useEffect(() => {
        const checkStatusAndFetch = async () => {
            try {
                // 1. Check profile exists
                const profileRes = await api.get('/recipients');
                if (!profileRes.data?.id) {
                    window.location.href = '/recipient/dashboard?warning=setup_profile_first';
                    return;
                }
                
                // 2. Check consents
                const consentsRes = await api.get('/consents');
                const activeConsents = consentsRes.data || [];
                const hasMatchingConsent = activeConsents.some(c => c.consent_type === 'recipient_matching' && c.status === 'granted');
                if (!hasMatchingConsent) {
                    window.location.href = '/recipient/dashboard?warning=grant_consent_first';
                    return;
                }

                // 3. Fetch matches
                await fetchMatches();
            } catch (err) {
                window.location.href = '/recipient/dashboard?warning=setup_profile_first';
            }
        };
        checkStatusAndFetch();
    }, []);

    const fetchMatches = async () => {
        try {
            const res = await api.get('/matches');
            const allMatches = res.data?.data || res.data || [];
            // Filter to display only approved or completed matches to the recipient
            setMatches(allMatches.filter(m => ['approved', 'completed'].includes(m.status)));
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const toggleExpand = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    const handleRecipientReview = async (e, matchId, status) => {
        e.stopPropagation();
        setActioning(true);
        try {
            await api.patch(`/matches/${matchId}/recipient-review`, { recipient_status: status });
            await fetchMatches();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setActioning(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>My Matches</h1>
                <p className="page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
                    {matches.length === 0
                        ? 'No approved matches yet — your clinician will generate matches for you'
                        : `You have ${matches.length} approved match${matches.length !== 1 ? 'es' : ''} to review.`
                    }
                </p>
            </div>

            {matches.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🔍</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Matches Yet</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto', fontSize: '0.9rem' }}>
                        Once your clinician runs the matching engine and approves matches, they will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {matches.map((match, index) => {
                        const isExpanded = expanded === match.id;
                        const breakdown = match.score_breakdown || {};
                        const donor = match.donor || {};

                        // Image source resolution
                        const donorPhoto = donor.photo_path
                            ? (donor.photo_path.startsWith('http') ? donor.photo_path : `http://127.0.0.1:8000/${donor.photo_path}`)
                            : '/assets/avatars/donor_default.png';

                        return (
                            <div className="card" key={match.id} style={{ cursor: 'pointer', borderRadius: '16px', border: match.recipient_status === 'accepted' ? '2px solid #10b981' : '1px solid var(--border)', transition: 'all 0.3s ease', overflow: 'hidden', padding: 0 }} onClick={() => toggleExpand(match.id)}>
                                {/* Card header always visible */}
                                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>#{index + 1}</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Donor {donor.donor_code || '—'}</span>
                                            {match.recipient_status === 'accepted' && <span className="badge badge-success" style={{ background: '#10b981', color: '#fff' }}>Accepted</span>}
                                            {match.recipient_status === 'rejected' && <span className="badge badge-danger" style={{ background: '#ef4444', color: '#fff' }}>Rejected</span>}
                                            {match.recipient_status === 'pending' && <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#fff' }}>Awaiting Your Review</span>}
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                            Matched on {new Date(match.created_at).toLocaleDateString()}
                                            {match.reviewer && ` · Recommended by Dr. ${match.reviewer.last_name}`}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '1.85rem', fontWeight: 800,
                                                background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
                                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            }}>
                                                {typeof match.match_score === 'number' ? match.match_score.toFixed(1) : match.match_score}%
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compatibility</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded profile review area */}
                                {isExpanded && (
                                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                            {/* Left Column: Photo */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <img 
                                                    src={donorPhoto} 
                                                    alt={`Donor ${donor.donor_code}`} 
                                                    onError={(e) => { e.target.src = '/assets/avatars/donor_default.png'; }}
                                                    style={{ width: '130px', height: '130px', borderRadius: '16px', objectFit: 'cover', border: '3px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                                />
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>DONOR PHOTO</div>
                                            </div>

                                            {/* Right Column: Attributes */}
                                            <div>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>Physical Characteristics</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>BLOOD TYPE / GENOTYPE</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.blood_type || '—'} / {donor.genotype || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ETHNICITY</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.ethnicity || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEIGHT / WEIGHT</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.height_cm ? `${donor.height_cm} cm` : '—'} / {donor.weight_kg ? `${donor.weight_kg} kg` : '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>SKIN TONE</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.skin_tone || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>HAIR COLOR / TEXTURE</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.hair_color || '—'} ({donor.hair_texture || '—'})</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>EYE COLOR</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.eye_color || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>EDUCATION</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.education_level || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>OCCUPATION</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{donor.occupation || '—'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score breakdown */}
                                        {Object.keys(breakdown).length > 0 && (
                                            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compatibility Breakdown</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                                    {Object.entries(breakdown).map(([criterion, data]) => (
                                                        <div key={criterion} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>{criterion.replace(/_/g, ' ')}</span>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: data.raw_score >= 0.7 ? '#10b981' : data.raw_score >= 0.4 ? '#f59e0b' : '#ef4444' }}>{(data.raw_score * 100).toFixed(0)}%</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.details}</div>
                                                            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginTop: '0.4rem' }}>
                                                                <div style={{ height: '100%', borderRadius: '2px', width: `${data.raw_score * 100}%`, background: data.raw_score >= 0.7 ? '#10b981' : data.raw_score >= 0.4 ? '#f59e0b' : '#ef4444' }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {match.review_notes && (
                                            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.15)' }}>
                                                <strong style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Clinician Notes: </strong>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{match.review_notes}</span>
                                            </div>
                                        )}

                                        {/* Action buttons or status */}
                                        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            {match.recipient_status === 'pending' ? (
                                                <>
                                                    <button 
                                                        className="btn btn-ghost" 
                                                        disabled={actioning}
                                                        onClick={(e) => handleRecipientReview(e, match.id, 'rejected')}
                                                        style={{ color: '#ef4444', borderColor: '#ef4444', background: 'transparent' }}
                                                    >
                                                        Reject Match
                                                    </button>
                                                    <button 
                                                        className="btn btn-primary" 
                                                        disabled={actioning}
                                                        onClick={(e) => handleRecipientReview(e, match.id, 'accepted')}
                                                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                                                    >
                                                        Approve & Accept Match
                                                    </button>
                                                </>
                                            ) : (
                                                <div style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '12px', background: match.recipient_status === 'accepted' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: match.recipient_status === 'accepted' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)', color: match.recipient_status === 'accepted' ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.88rem' }}>
                                                    {match.recipient_status === 'accepted' 
                                                        ? '✓ You have accepted this donor match. The clinic is preparing your treatment cycle next.' 
                                                        : '✗ You rejected this match. Your clinician will find and recommend alternative donor matches.'
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.75rem 1.5rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontWeight: 600 }}>
                                    {isExpanded ? '▲ Click to collapse details' : '▼ Click to expand and review donor profile'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

