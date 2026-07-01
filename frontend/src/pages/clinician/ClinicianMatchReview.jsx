import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../Dashboard.css';
import './MatchReview.css';

const TABS = [
    { key: 'proposed', label: 'Awaiting Review', icon: 'clock' },
    { key: 'approved', label: 'Approved', icon: 'check' },
    { key: 'rejected', label: 'Rejected', icon: 'x' },
    { key: '', label: 'All', icon: 'list' },
];

const TRACKER_STEPS = [
    { label: 'Recipient approved', state: 'done', icon: 'userCheck' },
    { label: 'Matching engine run', state: 'done', icon: 'spark' },
    { label: 'Review matches', state: 'active', icon: 'review' },
    { label: 'Create donation cycle', state: 'pending', icon: 'cycle' },
];

function Icon({ name, size = 18 }) {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
    };

    const paths = {
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        check: <path d="M20 6 9 17l-5-5" />,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
        userCheck: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></>,
        spark: <><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="M19 17v4" /><path d="M21 19h-4" /></>,
        review: <><path d="M9 11h6" /><path d="M9 15h4" /><path d="M5 4h14v16H5z" /><path d="M8 4V2" /><path d="M16 4V2" /></>,
        cycle: <><path d="M20 11a8 8 0 0 0-14.9-4" /><path d="M4 5v5h5" /><path d="M4 13a8 8 0 0 0 14.9 4" /><path d="M20 19v-5h-5" /></>,
        microscope: <><path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 0 0 7-7h-7" /><path d="M9 14 4 9l4-4 5 5" /><path d="m10 12 6-6" /><path d="m14 4 3 3" /></>,
        droplet: <path d="M12 2.5S6 9 6 14a6 6 0 0 0 12 0c0-5-6-11.5-6-11.5Z" />,
        dna: <><path d="M7 3c5 4 5 14 10 18" /><path d="M17 3C12 7 12 17 7 21" /><path d="M8.5 7h7" /><path d="M8.5 17h7" /><path d="M10 12h4" /></>,
        chart: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>,
        profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
        chevron: <path d="m9 18 6-6-6-6" />,
    };

    return <svg className="mr-svg" {...common}>{paths[name]}</svg>;
}

function ScoreRing({ score }) {
    const r = 30, circ = 2 * Math.PI * r;
    const pct = Math.min(Math.max(score || 0, 0), 100);
    const offset = circ - (circ * pct) / 100;
    const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

    return (
        <div className="mr-score-ring-wrap">
            <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
                <circle cx="38" cy="38" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
                <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    transform="rotate(-90 38 38)"
                    style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                />
            </svg>
            <div className="mr-score-inner">
                <span className="mr-score-num" style={{ color }}>{Math.round(pct)}</span>
                <span className="mr-score-label">score</span>
            </div>
        </div>
    );
}

function BreakdownBar({ label, value }) {
    const pct = Math.round((value?.raw_score || 0) * 100);
    const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#94a3b8';

    return (
        <div className="mr-breakdown-row">
            <span className="mr-breakdown-label">{label.replace(/_/g, ' ')}</span>
            <div className="mr-breakdown-track">
                <div className="mr-breakdown-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="mr-breakdown-pct" style={{ color }}>{pct}%</span>
        </div>
    );
}

export default function ClinicianMatchReview() {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('proposed');
    const [notes, setNotes] = useState({});
    const [reviewing, setReviewing] = useState(null);
    const [toast, setToast] = useState(null);
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { fetchMatches(); }, [filter]);

    const flash = (type, msg, action) => {
        setToast({ type, msg, action });
        setTimeout(() => setToast(null), 6000);
    };

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const params = filter ? { status: filter } : {};
            const res = await api.get('/matches', { params });
            setMatches(res.data?.data || res.data || []);
        } catch { /* keep page usable if the request fails */ }
        finally { setLoading(false); }
    };

    const reviewMatch = async (matchId, status) => {
        setReviewing(matchId);
        try {
            await api.patch(`/matches/${matchId}/review`, {
                status,
                review_notes: notes[matchId] || '',
            });
            setNotes(n => { const c = { ...n }; delete c[matchId]; return c; });
            setMatches(prev => prev.filter(m => m.id !== matchId));
            if (status === 'approved') {
                flash('success', 'Match approved. It is ready for a donation cycle.', {
                    label: 'Open Cycles',
                    onClick: () => navigate('/clinician/cycles'),
                });
            } else {
                flash('info', 'Match rejected and removed from the review queue.');
            }
        } catch (err) {
            flash('error', err.response?.data?.message || 'Review action failed');
        } finally {
            setReviewing(null);
        }
    };

    const proposedCount = matches.filter(m => m.status === 'proposed').length;

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    return (
        <div className="page mr-page">
            <div className="mr-header">
                <div>
                    <p className="mr-kicker">Clinical matching</p>
                    <h1 className="mr-title">Match Review</h1>
                    <p className="mr-subtitle">
                        Review donor-recipient pairings proposed by the matching engine before clinical approval.
                    </p>
                </div>
                {filter === 'proposed' && matches.length > 0 && (
                    <div className="mr-queue-badge">{matches.length} awaiting review</div>
                )}
            </div>

            <div className="mr-workflow-strip" aria-label="Match review progress">
                {TRACKER_STEPS.map((step, index) => (
                    <div className={`mr-wf-step mr-wf-${step.state}`} key={step.label}>
                        <span className="mr-wf-dot"><Icon name={step.icon} size={15} /></span>
                        <span className="mr-wf-copy">
                            <span className="mr-wf-number">Step {index + 1}</span>
                            <strong>{step.label}</strong>
                        </span>
                    </div>
                ))}
            </div>

            <div className="mr-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`mr-tab ${filter === t.key ? 'mr-tab-active' : ''}`}
                        onClick={() => setFilter(t.key)}
                    >
                        <Icon name={t.icon} size={16} />
                        {t.label}
                        {t.key === 'proposed' && proposedCount > 0 && (
                            <span className="mr-tab-count">{proposedCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {matches.length === 0 ? (
                <div className="mr-empty">
                    <div className="mr-empty-visual"><Icon name="microscope" size={46} /></div>
                    <div>
                        <div className="mr-empty-title">
                            {filter === 'proposed' ? 'No matches awaiting review' : 'No matches found'}
                        </div>
                        <div className="mr-empty-sub">
                            {filter === 'proposed'
                                ? 'Approve a recipient, run matching, and proposed donor pairings will appear here for clinical review.'
                                : 'There are no records for this filter yet.'}
                        </div>
                    </div>
                    {filter === 'proposed' && (
                        <Link to="/clinician/recipients" className="mr-empty-link">
                            Go to Recipients
                            <Icon name="chevron" size={16} />
                        </Link>
                    )}
                </div>
            ) : (
                <div className="mr-list">
                    {matches.map((match, i) => {
                        const isExpanded = expanded === match.id;
                        const isReviewing = reviewing === match.id;
                        const scoreColor = match.match_score >= 75 ? '#16a34a'
                            : match.match_score >= 50 ? '#d97706' : '#dc2626';
                        const scoreLabel = match.match_score >= 75 ? 'Strong match'
                            : match.match_score >= 50 ? 'Moderate match' : 'Needs review';

                        return (
                            <div key={match.id} className={`mr-card ${isExpanded ? 'mr-card-open' : ''}`}
                                style={{ animationDelay: `${i * 50}ms`, borderLeft: `4px solid ${scoreColor}` }}>
                                <div className="mr-card-main" onClick={() => setExpanded(isExpanded ? null : match.id)}>
                                    <ScoreRing score={match.match_score} />

                                    <div className="mr-pair">
                                        <div className="mr-pair-row">
                                            <div className="mr-person mr-donor">
                                                <div className="mr-person-avatar mr-donor-av">
                                                    {((match.donor?.user?.first_name?.[0] || '') + (match.donor?.user?.last_name?.[0] || '')).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="mr-person-name">{match.donor?.user?.first_name} {match.donor?.user?.last_name}</div>
                                                    <div className="mr-person-code">{match.donor?.donor_code}</div>
                                                </div>
                                            </div>

                                            <div className="mr-pair-arrow">
                                                <div className="mr-pair-arrow-line" />
                                                <span>matches</span>
                                                <div className="mr-pair-arrow-line" />
                                            </div>

                                            <div className="mr-person mr-recipient">
                                                <div className="mr-person-avatar mr-recip-av">
                                                    {((match.recipient?.user?.first_name?.[0] || '') + (match.recipient?.user?.last_name?.[0] || '')).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="mr-person-name">{match.recipient?.user?.first_name} {match.recipient?.user?.last_name}</div>
                                                    <div className="mr-person-code">{match.recipient?.recipient_code}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mr-chips">
                                            {match.donor?.blood_type && (
                                                <span className="mr-chip mr-chip-blue"><Icon name="droplet" size={13} /> {match.donor.blood_type}</span>
                                            )}
                                            {match.donor?.genotype && (
                                                <span className="mr-chip mr-chip-purple"><Icon name="dna" size={13} /> {match.donor.genotype}</span>
                                            )}
                                            <span className="mr-chip" style={{
                                                background: scoreColor + '15',
                                                color: scoreColor,
                                            }}>
                                                <Icon name={match.match_score >= 75 ? 'check' : 'review'} size={13} /> {scoreLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mr-card-right">
                                        <span className={`mr-status-tag mr-status-${match.status}`}>
                                            <Icon name={match.status === 'proposed' ? 'clock' : match.status === 'approved' ? 'check' : 'x'} size={13} />
                                            {match.status === 'proposed' ? 'Pending' : match.status === 'approved' ? 'Approved' : 'Rejected'}
                                        </span>
                                        <span className={`mr-expand-icon ${isExpanded ? 'is-open' : ''}`}><Icon name="chevron" size={16} /></span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mr-card-detail">
                                        {match.score_breakdown && Object.keys(match.score_breakdown).length > 0 && (
                                            <div className="mr-detail-section">
                                                <h4 className="mr-section-title"><Icon name="chart" size={15} /> Compatibility Breakdown</h4>
                                                <div className="mr-breakdown-list">
                                                    {Object.entries(match.score_breakdown).map(([key, val]) => (
                                                        <BreakdownBar key={key} label={key} value={val} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mr-detail-section">
                                            <h4 className="mr-section-title"><Icon name="profile" size={15} /> Donor Profile Snapshot</h4>
                                            <div className="mr-snapshot-grid">
                                                {[
                                                    ['Blood Type', match.donor?.blood_type],
                                                    ['Genotype', match.donor?.genotype],
                                                    ['Ethnicity', match.donor?.ethnicity],
                                                    ['Age', match.donor?.age ? `${match.donor.age} yrs` : null],
                                                    ['BMI', match.donor?.bmi],
                                                    ['Education', match.donor?.education_level],
                                                ].filter(([, v]) => v).map(([label, val]) => (
                                                    <div className="mr-snapshot-item" key={label}>
                                                        <span className="mr-snap-label">{label}</span>
                                                        <span className="mr-snap-val">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mr-detail-section">
                                            <h4 className="mr-section-title"><Icon name="target" size={15} /> Recipient Preferences</h4>
                                            <div className="mr-snapshot-grid">
                                                {[
                                                    ['Blood Type', match.recipient?.preferred_blood_type || 'Any'],
                                                    ['Genotype', match.recipient?.preferred_genotype || 'Any'],
                                                    ['Ethnicity', match.recipient?.preferred_ethnicity || 'Any'],
                                                    ['Age Range', `${match.recipient?.preferred_age_min || 18}-${match.recipient?.preferred_age_max || 45} yrs`],
                                                    ['Education', match.recipient?.preferred_education_level || 'Any'],
                                                    ['Diagnosis', match.recipient?.diagnosis?.slice(0, 40) || '-'],
                                                ].map(([label, val]) => (
                                                    <div className="mr-snapshot-item" key={label}>
                                                        <span className="mr-snap-label">{label}</span>
                                                        <span className="mr-snap-val">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {match.reviewer && (
                                            <div className="mr-reviewed-by">
                                                Reviewed by <strong>{match.reviewer.first_name} {match.reviewer.last_name}</strong>
                                                {match.review_notes && <span> - "{match.review_notes}"</span>}
                                            </div>
                                        )}

                                        {match.status === 'proposed' && (
                                            <div className="mr-action-area">
                                                <input
                                                    className="mr-notes-input"
                                                    placeholder="Optional clinical notes before deciding..."
                                                    value={notes[match.id] || ''}
                                                    onChange={e => setNotes(n => ({ ...n, [match.id]: e.target.value }))}
                                                />
                                                <div className="mr-action-btns">
                                                    <button
                                                        className="mr-btn mr-btn-reject"
                                                        onClick={() => reviewMatch(match.id, 'rejected')}
                                                        disabled={isReviewing}
                                                    >
                                                        {isReviewing ? 'Working...' : <><Icon name="x" size={16} /> Reject Match</>}
                                                    </button>
                                                    <button
                                                        className="mr-btn mr-btn-approve"
                                                        onClick={() => reviewMatch(match.id, 'approved')}
                                                        disabled={isReviewing}
                                                    >
                                                        {isReviewing ? 'Working...' : <><Icon name="check" size={16} /> Approve Match</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {toast && (
                <div className={`mr-toast mr-toast-${toast.type}`}>
                    <span>{toast.msg}</span>
                    {toast.action && (
                        <button className="mr-toast-action" onClick={toast.action.onClick}>
                            {toast.action.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
