import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Pill, Clock, Calendar, Info } from 'lucide-react';

export default function Medications() {
    const [meds, setMeds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/donor/medications')
            .then(res => setMeds(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page fade-in">
            <div className="donor-welcome-banner">
                <h1>My Medication Schedule</h1>
                <p>Plan provided by your attending clinician.</p>
            </div>

            <div className="donor-journey-section">
                {meds.length > 0 ? (
                    meds.map((med) => (
                        <div key={med.id} className="stage-inner" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}><Pill size={18} /> {med.name}</h3>
                                    <small style={{ color: 'var(--text-secondary)' }}>Type: {med.type}</small>
                                </div>
                                <div className="badge badge-primary">{med.dosage}</div>
                            </div>
                            <hr style={{ margin: '1rem 0', opacity: 0.1 }} />
                            <div className="donor-quick-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div><Calendar size={14} /> Start: {med.start_date}</div>
                                <div><Clock size={14} /> Frequency: {med.frequency}</div>
                            </div>
                            {med.instructions && (
                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    <Info size={14} /> Instructions: {med.instructions}
                                </p>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center" style={{ padding: '3rem' }}>
                        <Pill size={48} style={{ opacity: 0.2 }} />
                        <p>No medications have been scheduled yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}