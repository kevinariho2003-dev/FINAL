import { useState, useEffect, useRef } from 'react';

/**
 * AnimatedCounter — smoothly counts from 0 to `target` on mount.
 * Props:
 *   target   — number to count up to
 *   duration — animation duration in ms (default: 1500)
 *   suffix   — optional suffix string (e.g. '+', '%')
 *   prefix   — optional prefix string (e.g. '$')
 */
export default function AnimatedCounter({ target, duration = 1500, suffix = '', prefix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const startTime = performance.now();
                const step = (now) => {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                    setCount(Math.round(eased * target));
                    if (progress < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
                observer.disconnect();
            }
        }, { threshold: 0.3 });

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration]);

    return <span ref={ref}>{prefix}{count}{suffix}</span>;
}
