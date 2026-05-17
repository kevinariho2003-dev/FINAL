import React, { useState } from 'react';
import axios from 'axios';

const DonorQuestionnaire = () => {
    const [phase, setPhase] = useState(1);
    const [formData, setFormData] = useState({
        // Phase 1: Biodata
        full_name: '', dob: '', 
        // Phase 2: Fertility
        last_period: '', previous_pregnancies: '',
        // Phase 3: Medical
        blood_group: '', allergies: '',
        // Phase 4: Physical
        eye_color: '', hair_color: '', height_cm: '',
        // Phase 5: Lifestyle
        smoking: false, education_level: ''
    });

    const nextPhase = () => setPhase(phase + 1);
    const prevPhase = () => setPhase(phase - 1);

    const handleSubmit = async () => {
        try {
            await axios.put(`/api/donors/update-profile`, formData);
            alert("Questionnaire submitted for clinician review!");
            // Redirect to dashboard where status will be "Pending Review"
        } catch (error) {
            console.error("Submission failed", error);
        }
    };

    return (
        <div>
            <div className="flex justify-between mb-8">
                {[1, 2, 3, 4, 5].map(p => (
                    <div key={p} className={`h-2 w-16 rounded ${phase >= p ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                ))}
            </div>

            {phase === 1 && (
                <section>
                    <h3 className="font-bold text-lg mb-4">Phase 1: Biodata Information</h3>
                    <input type="text" placeholder="Full Name" className="w-full border mb-2 p-2" onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    <button onClick={nextPhase} className="bg-blue-600 text-white px-4 py-2">Next</button>
                </section>
            )}

            {phase === 2 && (
                <section>
                    <h3 className="font-bold text-lg mb-4">Phase 2: Fertility & Reproductive History</h3>
                    <input type="date" placeholder="Last Period" className="w-full border mb-2 p-2" onChange={e => setFormData({...formData, last_period: e.target.value})} />
                    <div className="flex gap-2">
                        <button onClick={prevPhase} className="bg-gray-400 text-white px-4 py-2">Back</button>
                        <button onClick={nextPhase} className="bg-blue-600 text-white px-4 py-2">Next</button>
                    </div>
                </section>
            )}

            {/* Repeat similar sections for Phase 3 & 4... */}

            {phase === 5 && (
                <section>
                    <h3 className="font-bold text-lg mb-4">Phase 5: Lifestyle / Social Information</h3>
                    <select className="w-full border mb-4 p-2" onChange={e => setFormData({...formData, education_level: e.target.value})}>
                        <option value="degree">University Degree</option>
                        <option value="diploma">Diploma</option>
                    </select>
                    <div className="flex gap-2">
                        <button onClick={prevPhase} className="bg-gray-400 text-white px-4 py-2">Back</button>
                        <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2">Submit Questionnaire</button>
                    </div>
                </section>
            )}
        </div>
    );
};

export default DonorQuestionnaire;