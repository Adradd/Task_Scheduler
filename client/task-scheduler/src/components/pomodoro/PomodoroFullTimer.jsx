import { useEffect, useMemo } from 'react';
import { usePomodoro } from './pomodoroContext.js';
import RadialProgress from './RadialProgress.jsx';

const PHASE_LABELS = {
    focus: 'Focus Session',
    short_break: 'Short Break',
    long_break: 'Long Break',
};

function formatClock(ms) {
    const safeMs = Math.max(0, ms);
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PomodoroFullTimer () {
    const {
        phase,
        remainingMs,
        durationMs,
        completedFocusCount,
        focusPerLongBreak,
        isRunning,
        start,
        pause,
        resetPhase,
        skipPhase,
        expanded,
        setExpanded,
    } = usePomodoro();

    const progress = useMemo(() => {
        if (!durationMs) {
            return 0;
        }
        return 1 - remainingMs / durationMs;
    }, [durationMs, remainingMs]);

    const cycleIndex = phase === 'focus' ? completedFocusCount + 1 : completedFocusCount;

    useEffect(() => {
        if (!expanded) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setExpanded(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [expanded, setExpanded]);

    if (!expanded) {
        return null;
    }

    return (
        <div className="pomodoro-panel-shell">
            <section
                id="pomodoro-expanded-panel"
                className="pomodoro-card pomodoro-card-expanded"
                role="dialog"
                aria-modal="false"
                aria-label="Pomodoro timer"
            >
                <header className="pomodoro-card-header">
                    <h2>Pomodoro</h2>
                    <button
                        type="button"
                        className="pomodoro-close"
                        onClick={() => setExpanded(false)}
                        aria-label="Close Pomodoro timer"
                    >
                        x
                    </button>
                </header>

                <div className="pomodoro-radial-wrap">
                    <RadialProgress size={240} strokeWidth={14} progress={progress} />
                    <div className="pomodoro-radial-text">
                        <div className="pomodoro-time-value">{formatClock(remainingMs)}</div>
                        <div className="pomodoro-phase-value">{PHASE_LABELS[phase]}</div>
                    </div>
                </div>

                <p className="pomodoro-cycle-note">Pomodoro {Math.max(1, cycleIndex)} of {focusPerLongBreak}</p>

                <div className="pomodoro-actions-row">
                    <button type="button" className="pomodoro-button pomodoro-button-primary" onClick={isRunning ? pause : start}>
                        {isRunning ? 'Pause' : 'Start'}
                    </button>
                    <button type="button" className="pomodoro-button" onClick={resetPhase}>Reset</button>
                    <button type="button" className="pomodoro-button" onClick={skipPhase}>Skip</button>
                </div>
            </section>
        </div>
    );
}
