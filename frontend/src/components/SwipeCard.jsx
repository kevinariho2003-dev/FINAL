import { useState, useRef, useEffect } from 'react';
import './SwipeCard.css';

/**
 * SwipeCard — Tinder-like swipe gesture component.
 * Props:
 *   onSwipeLeft()  — called when swiped left past threshold
 *   onSwipeRight() — called when swiped right past threshold
 *   leftLabel      — overlay text for left swipe (default: "REJECT")
 *   rightLabel     — overlay text for right swipe (default: "APPROVE")
 *   disabled       — disallow swiping
 *   children       — card content
 */
export default function SwipeCard({ onSwipeLeft, onSwipeRight, leftLabel = 'REJECT', rightLabel = 'APPROVE', disabled = false, children }) {
    const cardRef = useRef(null);
    const [drag, setDrag] = useState({ active: false, startX: 0, x: 0 });
    const [exiting, setExiting] = useState(null); // 'left' | 'right'

    const threshold = 120;

    const handleStart = (clientX) => {
        if (disabled) return;
        setDrag({ active: true, startX: clientX, x: 0 });
    };

    const handleMove = (clientX) => {
        if (!drag.active) return;
        setDrag(d => ({ ...d, x: clientX - d.startX }));
    };

    const handleEnd = () => {
        if (!drag.active) return;
        if (drag.x > threshold) {
            setExiting('right');
            setTimeout(() => { onSwipeRight?.(); setExiting(null); setDrag({ active: false, startX: 0, x: 0 }); }, 300);
        } else if (drag.x < -threshold) {
            setExiting('left');
            setTimeout(() => { onSwipeLeft?.(); setExiting(null); setDrag({ active: false, startX: 0, x: 0 }); }, 300);
        } else {
            setDrag({ active: false, startX: 0, x: 0 });
        }
    };

    // Mouse events
    const onMouseDown = (e) => handleStart(e.clientX);
    const onMouseMove = (e) => { if (drag.active) { e.preventDefault(); handleMove(e.clientX); } };
    const onMouseUp = () => handleEnd();

    // Touch events
    const onTouchStart = (e) => handleStart(e.touches[0].clientX);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    useEffect(() => {
        if (drag.active) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
        }
    }, [drag.active, drag.startX]);

    const rotation = drag.x * 0.08;
    const opacity = Math.min(Math.abs(drag.x) / threshold, 1);

    const style = exiting ? {
        transform: `translateX(${exiting === 'right' ? '120%' : '-120%'}) rotate(${exiting === 'right' ? 15 : -15}deg)`,
        opacity: 0,
        transition: 'all 0.3s ease-out',
    } : {
        transform: `translateX(${drag.x}px) rotate(${rotation}deg)`,
        transition: drag.active ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: disabled ? 'default' : 'grab',
    };

    return (
        <div className="swipe-card-wrapper">
            <div
                ref={cardRef}
                className={`swipe-card ${drag.active ? 'dragging' : ''}`}
                style={style}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Left overlay (reject) */}
                <div className="swipe-overlay swipe-overlay-left" style={{ opacity: drag.x < 0 ? opacity : 0 }}>
                    <span>{leftLabel}</span>
                </div>
                {/* Right overlay (approve) */}
                <div className="swipe-overlay swipe-overlay-right" style={{ opacity: drag.x > 0 ? opacity : 0 }}>
                    <span>{rightLabel}</span>
                </div>
                {children}
            </div>
        </div>
    );
}
