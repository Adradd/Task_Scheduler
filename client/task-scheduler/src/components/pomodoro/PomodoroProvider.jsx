import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { PomodoroContext } from './pomodoroContext.js';

const DEFAULT_CONFIG = {
    focusDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 20,
    focusPerLongBreak: 4,
};

const PHASE_LABELS = {
    focus: 'focus',
    short_break: 'short_break',
    long_break: 'long_break',
};

function toMs(minutes) {
    return minutes * 60 * 1000;
}

function normalizeConfig(config) {
    return {
        focusDurationMinutes: config?.focusDurationMinutes ?? DEFAULT_CONFIG.focusDurationMinutes,
        shortBreakMinutes: config?.shortBreakMinutes ?? DEFAULT_CONFIG.shortBreakMinutes,
        longBreakMinutes: config?.longBreakMinutes ?? DEFAULT_CONFIG.longBreakMinutes,
        focusPerLongBreak: config?.focusPerLongBreak ?? DEFAULT_CONFIG.focusPerLongBreak,
    };
}

function getDurationMsForPhase(phase, config) {
    if (phase === PHASE_LABELS.focus) {
        return toMs(config.focusDurationMinutes);
    }
    if (phase === PHASE_LABELS.short_break) {
        return toMs(config.shortBreakMinutes);
    }
    return toMs(config.longBreakMinutes);
}

function getNextPhaseState(currentState, config) {
    if (currentState.phase === PHASE_LABELS.focus) {
        const nextCompleted = currentState.completedFocusCount + 1;

        if (nextCompleted >= config.focusPerLongBreak) {
            const durationMs = getDurationMsForPhase(PHASE_LABELS.long_break, config);
            return {
                nextState: {
                    ...currentState,
                    phase: PHASE_LABELS.long_break,
                    remainingMs: durationMs,
                    durationMs,
                    completedFocusCount: 0,
                    isRunning: false,
                },
                phaseChangedTo: PHASE_LABELS.long_break,
                cycleComplete: true,
            };
        }

        const durationMs = getDurationMsForPhase(PHASE_LABELS.short_break, config);
        return {
            nextState: {
                ...currentState,
                phase: PHASE_LABELS.short_break,
                remainingMs: durationMs,
                durationMs,
                completedFocusCount: nextCompleted,
                isRunning: false,
            },
            phaseChangedTo: PHASE_LABELS.short_break,
            cycleComplete: false,
        };
    }

    const durationMs = getDurationMsForPhase(PHASE_LABELS.focus, config);
    return {
        nextState: {
            ...currentState,
            phase: PHASE_LABELS.focus,
            remainingMs: durationMs,
            durationMs,
            isRunning: false,
        },
        phaseChangedTo: PHASE_LABELS.focus,
        cycleComplete: false,
    };
}

export function PomodoroProvider({ children, config, onPhaseChange, onCycleComplete }) {
    const normalizedConfig = useMemo(() => normalizeConfig(config), [config]);
    const initialDurationMs = getDurationMsForPhase(PHASE_LABELS.focus, normalizedConfig);

    const [state, setState] = useState({
        phase: PHASE_LABELS.focus,
        remainingMs: initialDurationMs,
        durationMs: initialDurationMs,
        completedFocusCount: 0,
        isRunning: false,
        expanded: false,
    });

    const startTimestampRef = useRef(0);
    const remainingAtLastStartRef = useRef(initialDurationMs);
    const phaseTransitionLockRef = useRef(false);

    const advancePhase = useCallback(() => {
        setState((prev) => {
            const { nextState, phaseChangedTo, cycleComplete } = getNextPhaseState(prev, normalizedConfig);

            if (onPhaseChange) {
                onPhaseChange(phaseChangedTo);
            }
            if (cycleComplete && onCycleComplete) {
                onCycleComplete();
            }

            return nextState;
        });

        startTimestampRef.current = 0;
        remainingAtLastStartRef.current = 0;
    }, [normalizedConfig, onCycleComplete, onPhaseChange]);

    useEffect(() => {
        if (!state.isRunning) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            const elapsed = Date.now() - startTimestampRef.current;
            const nextRemaining = remainingAtLastStartRef.current - elapsed;

            if (nextRemaining > 0) {
                setState((prev) => ({ ...prev, remainingMs: nextRemaining }));
                return;
            }

            if (!phaseTransitionLockRef.current) {
                phaseTransitionLockRef.current = true;
                advancePhase();
            }
        }, 250);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [advancePhase, state.isRunning]);

    const start = useCallback(() => {
        setState((prev) => {
            if (prev.isRunning) {
                return prev;
            }

            startTimestampRef.current = Date.now();
            remainingAtLastStartRef.current = prev.remainingMs;
            phaseTransitionLockRef.current = false;

            return {
                ...prev,
                isRunning: true,
            };
        });
    }, []);

    const pause = useCallback(() => {
        setState((prev) => {
            if (!prev.isRunning) {
                return prev;
            }

            const elapsed = Date.now() - startTimestampRef.current;
            const nextRemaining = Math.max(0, remainingAtLastStartRef.current - elapsed);
            startTimestampRef.current = 0;
            remainingAtLastStartRef.current = nextRemaining;
            phaseTransitionLockRef.current = false;

            return {
                ...prev,
                isRunning: false,
                remainingMs: nextRemaining,
            };
        });
    }, []);

    const resetPhase = useCallback(() => {
        setState((prev) => {
            const nextDurationMs = getDurationMsForPhase(prev.phase, normalizedConfig);
            startTimestampRef.current = 0;
            remainingAtLastStartRef.current = nextDurationMs;
            phaseTransitionLockRef.current = false;

            return {
                ...prev,
                isRunning: false,
                durationMs: nextDurationMs,
                remainingMs: nextDurationMs,
            };
        });
    }, [normalizedConfig]);

    const skipPhase = useCallback(() => {
        phaseTransitionLockRef.current = true;
        advancePhase();
    }, [advancePhase]);

    const setExpanded = useCallback((value) => {
        setState((prev) => ({
            ...prev,
            expanded: value,
        }));
    }, []);

    const value = useMemo(() => {
        return {
            ...state,
            focusPerLongBreak: normalizedConfig.focusPerLongBreak,
            start,
            pause,
            resetPhase,
            skipPhase,
            setExpanded,
        };
    }, [normalizedConfig.focusPerLongBreak, pause, resetPhase, setExpanded, skipPhase, start, state]);

    return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
