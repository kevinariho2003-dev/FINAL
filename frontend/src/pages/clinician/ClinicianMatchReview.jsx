import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import SwipeCard from '../../components/SwipeCard';
import { IconDNA, IconFlower, IconHeartPulse, IconNew, IconCheckCircle, IconXCircle, IconParty } from '../../components/Icons';
import '../Dashboard.css';
import './ClinicianDashboard.css';
import './MatchReview.css';

/* Animated SVG Score Ring */
const ScoreRing = ({ score, size = 80 }) => {
    const radius = (size - 8) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (circ * Math.min(score, 100)) / 100;
    return (
        <div className="match-score-large" style={{ width: size, height: size }}>
            <svg className="match-score-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                </defs>
                <circle className="match-score-ring-bg" cx={size / 2} cy={size / 2} r={radius} />
                <circle className="match-score-ring-fill" cx={size / 2} cy={size / 2} r={radius}
                    strokeDasharray={circ} strokeDashoffset={offset} />
            </svg>
            <div className="match-score-inner">
                <span className="score-num">{Math.round(score)}</span>
                <span className="score-lbl">score</span>
            </div>
        </div>
    );
};

const STATUS_TABS = [
    { key: 'proposed', label: 'Proposed' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: '', label: 'All' },
];

export default function ClinicianMatchReview() {
    const { user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('proposed');
    const [reviewNotes, setReviewNotes] = useState('');
    const [toast, setToast] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => { fetchMatches(); }, [filter]);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const params = filter ? { status: filter } : {};
            const res = await api.get('/matches', { params });
            setMatches(res.data?.data || res.data || []);
            setCurrentIndex(0);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const reviewMatch = async (matchId, status) => {
        try {
            await api.patch(`/matches/${matchId}/review`, { status, review_notes: reviewNotes });
            setReviewNotes('');
            setToast({ type: 'success', msg: `Match ${status}!` });
            // remove from list
            setMatches(prev => prev.filter(m => m.id !== matchId));
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Review failed' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleSwipeRight = (match) => {
        reviewMatch(match.id, 'approved');
    };

    const handleSwipeLeft = (match) => {
        reviewMatch(match.id, 'rejected');
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const currentMatch = matches[currentIndex];
    const nextMatch = matches[currentIndex + 1];
    const thirdMatch = matches[currentIndex + 2];

    return (
        <div className="page match-review-page">
            {/* ── Avatar Background ── */}
            {user?.avatar_url && (
                <div className="clin-avatar-bg">
                    <img src={user.avatar_url} alt="" className="clin-avatar-bg-img" />
                    <div className="clin-avatar-bg-overlay" />
                </div>
            )}

            {/* ── Moving Background Images ── */}
            <div className="mr-bg-slider">
                <div className="mr-bg-track">
                    <img src="/images/hero/1.png" alt="" className="mr-bg-img" />
                    <img src="/images/hero/3.png" alt="" className="mr-bg-img" />
                    <img src="/images/hero/4.png" alt="" className="mr-bg-img" />
                    <img src="/images/hero/2.png" alt="" className="mr-bg-img" />
                    <img src="/images/hero/1.png" alt="" className="mr-bg-img" aria-hidden="true" />
                    <img src="/images/hero/3.png" alt="" className="mr-bg-img" aria-hidden="true" />
                    <img src="/images/hero/4.png" alt="" className="mr-bg-img" aria-hidden="true" />
                    <img src="/images/hero/2.png" alt="" className="mr-bg-img" aria-hidden="true" />
                </div>
                <div className="mr-bg-overlay" />
            </div>

            <div className="page-header">
                <h1 className="page-title">Match Review <IconDNA size={24} color="#10b981" style={{ verticalAlign: 'middle' }} /></h1>
                <p className="page-subtitle">Review and approve/reject donor-recipient matches</p>
            </div>

            <TabSlider tabs={STATUS_TABS} active={filter} onChange={setFilter} />

            {matches.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><IconParty size={48} color="#10b981" /></div>
                    <div className="empty-state-text">No matches to review</div>
                    <div className="empty-state-sub">All caught up! Generate new matches from the Recipients page.</div>
                </div>
            ) : filter === 'proposed' ? (
                /* ── Swipe Card Deck Mode ── */
                <div>
                    <div className="match-deck">
                        {/* Stacked background cards */}
                        {thirdMatch && (
                            <div className="match-deck-card" style={{ zIndex: 0 }}>
                                <div className="match-face" style={{ opacity: 0.3, transform: 'scale(0.9) translateY(24px)' }}></div>
                            </div>
                        )}
                        {nextMatch && (
                            <div className="match-deck-card" style={{ zIndex: 1 }}>
                                <div className="match-face" style={{ opacity: 0.5, transform: 'scale(0.95) translateY(12px)' }}>
                                    <div className="match-face-header">
                                        <ScoreRing score={nextMatch.match_score} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Active swipable card */}
                        {currentMatch && (
                            <div className="match-deck-card" style={{ zIndex: 10 }}>
                                <SwipeCard
                                    onSwipeRight={() => handleSwipeRight(currentMatch)}
                                    onSwipeLeft={() => handleSwipeLeft(currentMatch)}
                                    rightLabel="APPROVE ✓"
                                    leftLabel="REJECT ✗"
                                >
                                    <div className="match-face">
                                        <div className="match-face-header">
                                            <ScoreRing score={currentMatch.match_score} />
                                            <div className="match-pair-info">
                                                <div className="match-pair-names">
                                                    <img src="/assets/avatars/donor_default.png" alt="D" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} /> {currentMatch.donor?.user?.first_name || 'Donor'} → <img src="/assets/avatars/recipient_default.png" alt="R" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} /> {currentMatch.recipient?.user?.first_name || 'Recipient'}
                                                </div>
                                                <div className="match-pair-codes">
                                                    {currentMatch.donor?.donor_code} · {currentMatch.recipient?.recipient_code}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Breakdown */}
                                        {currentMatch.score_breakdown && (
                                            <div className="match-breakdown-mini">
                                                {Object.entries(currentMatch.score_breakdown).map(([key, val]) => (
                                                    <div key={key} className="breakdown-row">
                                                        <span className="breakdown-name">{key.replace(/_/g, ' ')}</span>
                                                        <div className="breakdown-track">
                                                            <div className="breakdown-bar" style={{ width: `${(val.raw_score || 0) * 100}%` }} />
                                                        </div>
                                                        <span className="breakdown-pct">{((val.raw_score || 0) * 100).toFixed(0)}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Notes & Manual Buttons */}
                                        <div className="match-notes-area">
                                            <input
                                                className="form-input"
                                                placeholder="Optional review notes..."
                                                value={reviewNotes}
                                                onChange={e => setReviewNotes(e.target.value)}
                                                style={{ marginBottom: '0.75rem' }}
                                            />
                                            <div className="match-actions-row">
                                                <button className="btn btn-danger" onClick={() => handleSwipeLeft(currentMatch)}>
                                                    <IconXCircle size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Reject
                                                </button>
                                                <button className="btn btn-success" onClick={() => handleSwipeRight(currentMatch)}>
                                                    <IconCheckCircle size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </SwipeCard>
                            </div>
                        )}
                    </div>
                    <div className="match-swipe-hint">
                        ← Swipe left to reject · Swipe right to approve →
                        <br />
                        <span className="match-counter-pill">{matches.length} match{matches.length !== 1 ? 'es' : ''} remaining</span>
                    </div>
                </div>
            ) : (
                /* ── List Mode for reviewed matches ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {matches.map((match, i) => (
                        <div key={match.id} className="match-list-card" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="match-list-score">
                                <span className="score-num">{Math.round(match.match_score)}</span>
                                <span className="score-lbl">score</span>
                            </div>
                            <div className="match-list-body">
                                <div className="match-list-pair">
                                    <img src="/assets/avatars/donor_default.png" alt="D" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} /> {match.donor?.user?.first_name || 'Donor'} → <img src="/assets/avatars/recipient_default.png" alt="R" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} /> {match.recipient?.user?.first_name || 'Recipient'}
                                </div>
                                <div className="match-list-codes">
                                    {match.donor?.donor_code} · {match.recipient?.recipient_code}
                                </div>
                                {match.reviewer && (
                                    <div className="match-list-reviewer">
                                        Reviewed by {match.reviewer.first_name} {match.reviewer.last_name}
                                        {match.review_notes && ` · "${match.review_notes}"`}
                                    </div>
                                )}
                            </div>
                            <span className={`badge badge-${match.status === 'proposed' ? 'pending' : match.status}`}>
                                {match.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
