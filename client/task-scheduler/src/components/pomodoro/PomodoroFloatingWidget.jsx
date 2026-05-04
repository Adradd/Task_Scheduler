import { usePomodoro } from './pomodoroContext.js';

const PHASE_HINTS = {
    focus: 'Focus',
    short_break: 'Short Break',
    long_break: 'Long Break',
};

function formatClock(ms) {
    const safeMs = Math.max(0, ms);
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PomodoroFloatingWidget () {
    const { phase, remainingMs, expanded, setExpanded } = usePomodoro();
    const handleWidgetClick = () => {
        if (expanded) {
            setExpanded(false);
            return;
        }

        setExpanded(true);
    };

    return (
        <button
            type="button"
            className={`pomodoro-floating-widget ${expanded ? 'is-expanded' : ''}`}
            onClick={handleWidgetClick}
            aria-label={expanded ? 'Close Pomodoro timer' : 'Open Pomodoro timer'}
            aria-expanded={expanded}
            aria-controls="pomodoro-expanded-panel"
        >
            <span className="pomodoro-floating-time">{formatClock(remainingMs)}</span>
            <span className="pomodoro-floating-meta">
                <span className="pomodoro-floating-phase">{PHASE_HINTS[phase]}</span>
            </span>
        </button>
    );
}
