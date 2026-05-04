function clampProgress(progress) {
    return Math.min(1, Math.max(0, progress));
}

export default function RadialProgress ({
    size,
    strokeWidth,
    progress,
    trackColor = 'rgba(255, 255, 255, 0.15)',
    progressGradientStart = '#fff3f3',
    progressGradientEnd = '#098aff',
}) {
    const safeProgress = clampProgress(progress);
    const center = size / 2;
    const radius = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - safeProgress);

    return (
        <svg width={size} height={size} className="pomodoro-radial-svg" role="img" aria-hidden="true">
            <defs>
                <linearGradient id="pomodoro-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={progressGradientStart} />
                    <stop offset="100%" stopColor={progressGradientEnd} />
                </linearGradient>
            </defs>

            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={trackColor}
                strokeWidth={strokeWidth}
            />

            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#pomodoro-progress-gradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
            />
        </svg>
    );
}
