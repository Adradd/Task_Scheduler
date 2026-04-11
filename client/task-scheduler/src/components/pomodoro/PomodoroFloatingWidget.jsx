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

function PomodoroFloatingWidget() {
    const { phase, remainingMs, expanded, setExpanded } = usePomodoro();

    return (
        <button
            type="button"
            className={`pomodoro-floating-widget ${expanded ? 'is-expanded' : ''}`}
            onClick={() => setExpanded(true)}
            aria-label="Open Pomodoro timer"
        >
            <span className="pomodoro-floating-time">{formatClock(remainingMs)}</span>
            <span className="pomodoro-floating-meta">
                <span className="pomodoro-floating-phase">{PHASE_HINTS[phase]}</span>
            </span>
        </button>
    );
}

export default PomodoroFloatingWidget;
