import { useState, useRef } from 'react';
import './TabSlider.css';

/**
 * TabSlider — swipable horizontal tab bar (iOS segmented control style).
 * Props:
 *   tabs      — [{ key: string, label: string }]
 *   active    — currently active tab key
 *   onChange  — (key) => void
 */
export default function TabSlider({ tabs, active, onChange }) {
    const containerRef = useRef(null);
    const [drag, setDrag] = useState({ active: false, startX: 0, scrollStart: 0 });

    const onTouchStart = (e) => {
        setDrag({ active: true, startX: e.touches[0].clientX, scrollStart: containerRef.current.scrollLeft });
    };

    const onTouchMove = (e) => {
        if (!drag.active) return;
        const dx = drag.startX - e.touches[0].clientX;
        containerRef.current.scrollLeft = drag.scrollStart + dx;
    };

    const onTouchEnd = () => setDrag({ ...drag, active: false });

    return (
        <div
            className="tab-slider"
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="tab-slider-track">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab-slider-tab ${active === tab.key ? 'active' : ''}`}
                        onClick={() => onChange(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
