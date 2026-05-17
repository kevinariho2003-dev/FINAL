import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { 
    Calendar, CheckCircle, Clock, User, FileText, 
    Video, Phone, MapPin, ChevronRight, Activity, CreditCard, ClipboardList, AlertCircle 
} from 'lucide-react';
import '../Dashboard.css';
import './DonorDashboard.css';


const STAGES = [
    { id: 1, label: 'Consultation', key: 'pre_consultation' },
    { id: 2, label: 'Consents', key: 'signing_consents', link: '/donor/consents' },
    { id: 3, label: 'Profile Completion', key: 'profile_completion', link: '/donor/profile' },
    { id: 4, label: 'Physical Appointment', key: 'physical_appointment' },
    { id: 5, label: 'Initial Payment', key: 'initial_payment' }, // Added after Physical
    { id: 6, label: 'Medication Phase', key: 'injection_phase' },
    { id: 7, label: 'Egg Retrieval', key: 'retrieval' },
    { id: 8, label: 'Final Payment', key: 'final_payment' }, // Replaces Completed
];

export default function DonorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeStage, setActiveStage] = useState(1);
    const [consultType, setConsultType] = useState('');

    useEffect(() => {
        const fetchDonorData = async () => {
            try {
                const res = await api.get('/donors');
                const donorData = res.data;
                setProfile(donorData);
                const currentStageIndex = STAGES.findIndex(s => s.key === donorData.status);
                setActiveStage(currentStageIndex !== -1 ? currentStageIndex + 1 : 1);
            } catch (err) {
                console.error("Dashboard data fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDonorData();
    }, []);

    const handleQuestionnaireSubmit = () => {
        console.log("Submit clicked");
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page donor-page-custom-bg">
            <div className="donor-welcome-banner">
                <div className="donor-welcome-info">
                    <h1>Welcome back, {user?.first_name} <span className="badge badge-primary">Donor</span></h1>
                    <p>Current Status: <strong>{profile?.status?.replace('_', ' ').toUpperCase() || 'INITIAL'}</strong></p>
                </div>
                <div className="donor-quick-stat-value" style={{ color: 'var(--accent)' }}>
                    🧬 {profile?.donor_code || 'DX-PENDING'}
                </div>
            </div>

            <div className="donor-progress-section">
                <div className="donor-journey-title">
                    <ClipboardList size={20} /> Your Progress Tracker
                </div>
                <div className="donor-progress-ring-wrapper pipeline-header">
                    {STAGES.map((stage, index) => {
                        const isComplete = activeStage > stage.id;
                        const isActive = activeStage === stage.id;
                        const isWaiting = stage.id === 4 && profile?.is_submitted && profile?.status === 'pending';

                        return (
                            <div key={stage.id} className="pipeline-node">
                                <div className={`node-circle ${isComplete ? 'complete' : isActive ? 'active' : ''} ${isWaiting ? 'waiting' : ''}`}>
                                    <span className="node-text">{stage.label}</span>
                                    {isComplete && <CheckCircle className="check-icon" size={16} />}
                                    {isWaiting && <Clock className="check-icon" size={16} />}
                                </div>
                                
                                {index < STAGES.length - 1 && (
                                    <div className={`node-line ${isComplete ? 'complete' : ''}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="donor-journey-section fade-in">
                {activeStage === 1 && (
                    <div className="stage-inner">
                        <h3 className="donor-journey-title"><Calendar /> Stage 1: Clinician Consultation</h3>
                        <p className="donor-step-content" style={{ marginBottom: '1.5rem' }}>
                            Before proceeding, you must schedule an initial consultation with a clinician. 
                            Choose your preferred method below:
                        </p>
                        
                        <div className="donor-quick-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <button onClick={() => setConsultType('call')} className={`donor-quick-stat ${consultType === 'call' ? 'active-border' : ''}`}>
                                <Phone size={24} /> <div>Call</div>
                            </button>
                            <button onClick={() => setConsultType('virtual')} className={`donor-quick-stat ${consultType === 'virtual' ? 'active-border' : ''}`}>
                                <Video size={24} /> <div>Virtual</div>
                            </button>
                            <button onClick={() => setConsultType('clinic')} className={`donor-quick-stat ${consultType === 'clinic' ? 'active-border' : ''}`}>
                                <MapPin size={24} /> <div>At Clinic</div>
                            </button>
                        </div>

                        {consultType && (
                            <div className="donor-welcome-banner" style={{ marginTop: '1.5rem', display: 'block', padding: '1.5rem' }}>
                                <div className="donor-quick-stats" style={{ marginBottom: '1rem' }}>
                                    <div className="input-group">
                                        <label className="donor-quick-stat-label">Preferred Date</label>
                                        <input type="date" className="form-input" style={{ width: '100%' }} />
                                    </div>
                                    <div className="input-group">
                                        <label className="donor-quick-stat-label">Preferred Time</label>
                                        <input type="time" className="form-input" style={{ width: '100%' }} />
                                    </div>
                                </div>
                                {consultType === 'call' && (
                                    <div className="input-group">
                                        <label className="donor-quick-stat-label">Number to be called on</label>
                                        <input type="tel" placeholder="+256..." className="form-input" style={{ width: '100%' }} />
                                    </div>
                                )}
                                <button className="btn-edit-toggle" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}>
                                    Request Consultation
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeStage === 2 && (
                    <div className="stage-inner text-center" style={{ padding: '2rem' }}>
                        <FileText size={48} color="var(--accent)" />
                        <h3 style={{ margin: '1rem 0' }}>Signing Consents</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Legal authorization is required before medical data collection.</p>
                        <Link to="/donor/consents" className="btn-edit-toggle" style={{ padding: '0.8rem 2rem' }}>Go to Consent Forms</Link>
                    </div>
                )}

                {activeStage === 3 && (
                    <div className="stage-inner text-center" style={{ padding: '2rem' }}>
                        <User size={48} color="var(--accent)" />
                        <h3 style={{ margin: '1rem 0' }}>Complete Your Donor Profile</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Provide your phenotypic and medical history details.</p>
                        <Link to="/donor/profile" className="btn-edit-toggle" style={{ padding: '0.8rem 2rem' }}>Go to My Profile</Link>
                    </div>
                )}

                {activeStage === 4 && (
                    <div className="stage-inner">
                        <h3 className="donor-journey-title">
                            <Activity /> Stage 4: Medical Verification
                        </h3>

                        {profile?.status === 'pending' ? (
                            <div className="text-center" style={{ padding: '2rem' }}>
                                <div className="verification-wait-icon" style={{ marginBottom: '1.5rem' }}>
                                    <Clock size={60} color="var(--accent)" className="spin-slow" />
                                </div>
                                <h4>Waiting for Clinician Verification</h4>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '1rem auto' }}>
                                    Your medical questionnaire and profile have been submitted successfully. 
                                    A clinician is currently reviewing your details to ensure eligibility.
                                </p>
                                <div className="donor-welcome-banner" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid #ffc107' }}>
                                    <p style={{ color: '#856404', fontSize: '0.9rem', marginBottom: 0 }}>
                                        <strong>Note:</strong> You will be notified via email once your profile is approved to book your Physical Appointment.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="donor-quick-stats" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1rem' }}>
                                    <div className="donor-quick-stat">🧬 Fertility & Reproductive History</div>
                                    <div className="donor-quick-stat">🩺 Medical Information</div>
                                    <div className="donor-quick-stat">👤 Physical Characteristics</div>
                                    <div className="donor-quick-stat">🌱 Lifestyle & Social Info</div>
                                </div>
                                <div className="donor-welcome-banner" style={{ marginTop: '1.5rem', backgroundColor: 'var(--bg-input)' }}>
                                    <p style={{ fontSize: '0.85rem' }}>
                                        <AlertCircle size={14} /> Please ensure all answers are accurate to avoid delays in verification.
                                    </p>
                                    <button className="btn-edit-toggle" onClick={handleQuestionnaireSubmit}>
                                        Submit for Clinician Review
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeStage === 5 && (
                    <div className="stage-inner">
                        <h3 className="donor-journey-title"><MapPin /> Stage 5: Physical Clinic Appointment</h3>
                        <div className="donor-welcome-banner" style={{ display: 'block', textAlign: 'center' }}>
                            <p><strong>Identity Verification & Medical Screening</strong></p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                                <div style={{ color: 'var(--success)' }}>✅ Approved<br/><small>Receive Initial Compensation</small></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeStage >= 6 && (
                    <div className="stage-inner">
                        <h3 className="donor-journey-title"><CreditCard /> Cycle & Payments</h3>
                        <div className="donor-quick-stats" style={{ gridTemplateColumns: '1fr' }}>
                            <div className={`donor-quick-stat ${activeStage === 6 ? 'active' : ''}`}>💵 Initial Compensation (Processing)</div>
                            <div className={`donor-quick-stat ${activeStage === 7 ? 'active' : ''}`}>💉 Ovulation / Fertility Injection Phase</div>
                            <div className={`donor-quick-stat ${activeStage === 8 ? 'active' : ''}`}>🏥 Egg Retrieval Phase</div>
                            <div className={`donor-quick-stat ${activeStage === 9 ? 'active' : ''}`}>💰 Final Compensation & Completion</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}