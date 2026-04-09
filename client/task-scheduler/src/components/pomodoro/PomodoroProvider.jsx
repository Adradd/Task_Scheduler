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

const STORAGE_KEY = 'pomodoroTimerState';

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

function getDefaultState(config) {
    const initialDurationMs = getDurationMsForPhase(PHASE_LABELS.focus, config);

    return {
        phase: PHASE_LABELS.focus,
        remainingMs: initialDurationMs,
        durationMs: initialDurationMs,
        completedFocusCount: 0,
        isRunning: false,
        expanded: false,
    };
}

function readStoredState(config) {
    if (typeof window === 'undefined') {
        return {
            state: getDefaultState(config),
            startTimestamp: 0,
            remainingAtLastStart: getDurationMsForPhase(PHASE_LABELS.focus, config),
        };
    }

    const fallbackState = getDefaultState(config);

    try {
        const rawValue = window.localStorage.getItem(STORAGE_KEY);
        if (!rawValue) {
            return {
                state: fallbackState,
                startTimestamp: 0,
                remainingAtLastStart: fallbackState.remainingMs,
            };
        }

        const parsed = JSON.parse(rawValue);
        const phase = Object.values(PHASE_LABELS).includes(parsed?.phase) ? parsed.phase : PHASE_LABELS.focus;
        const durationMs = Number.isFinite(parsed?.durationMs)
            ? parsed.durationMs
            : getDurationMsForPhase(phase, config);
        const remainingMs = Number.isFinite(parsed?.remainingMs)
            ? Math.max(0, parsed.remainingMs)
            : durationMs;

        return {
            state: {
                phase,
                remainingMs,
                durationMs,
                completedFocusCount: Number.isInteger(parsed?.completedFocusCount) ? parsed.completedFocusCount : 0,
                isRunning: false,
                expanded: Boolean(parsed?.expanded),
            },
            startTimestamp: 0,
            remainingAtLastStart: remainingMs,
        };
    } catch {
        return {
            state: fallbackState,
            startTimestamp: 0,
            remainingAtLastStart: fallbackState.remainingMs,
        };
    }
}

function writeStoredState(state) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        phase: state.phase,
        remainingMs: state.remainingMs,
        durationMs: state.durationMs,
        completedFocusCount: state.completedFocusCount,
        expanded: state.expanded,
    }));
}

function persistAndReturnState(nextState) {
    writeStoredState(nextState);
    return nextState;
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
    const initialSnapshotRef = useRef(null);
    if (initialSnapshotRef.current === null) {
        initialSnapshotRef.current = readStoredState(normalizedConfig);
    }

    const [state, setState] = useState(() => initialSnapshotRef.current.state);

    const startTimestampRef = useRef(initialSnapshotRef.current.startTimestamp);
    const remainingAtLastStartRef = useRef(initialSnapshotRef.current.remainingAtLastStart);
    const phaseTransitionLockRef = useRef(false);

    useEffect(() => {
        writeStoredState(state);
    }, [state]);

    useEffect(() => {
        setState((prev) => {
            const nextDurationMs = getDurationMsForPhase(prev.phase, normalizedConfig);
            const nextRemainingMs = Math.min(prev.remainingMs, nextDurationMs);

            if (prev.durationMs === nextDurationMs && prev.remainingMs === nextRemainingMs) {
                return prev;
            }

            remainingAtLastStartRef.current = nextRemainingMs;

            return persistAndReturnState({
                ...prev,
                durationMs: nextDurationMs,
                remainingMs: nextRemainingMs,
            });
        });
    }, [normalizedConfig]);

    const advancePhase = useCallback(() => {
        setState((prev) => {
            const { nextState, phaseChangedTo, cycleComplete } = getNextPhaseState(prev, normalizedConfig);

            if (onPhaseChange) {
                onPhaseChange(phaseChangedTo);
            }
            if (cycleComplete && onCycleComplete) {
                onCycleComplete();
            }

            return persistAndReturnState(nextState);
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

            return persistAndReturnState({
                ...prev,
                isRunning: true,
            });
        });
    }, []);

    const pause = useCallback(() => {
        setState((prev) => {
            if (!prev.isRunning) {
                return prev;
            }

            const hasValidStartTimestamp = Number.isFinite(startTimestampRef.current) && startTimestampRef.current > 0;
            const elapsed = hasValidStartTimestamp ? Math.max(0, Date.now() - startTimestampRef.current) : 0;
            const baseRemaining = Number.isFinite(remainingAtLastStartRef.current) && remainingAtLastStartRef.current > 0
                ? remainingAtLastStartRef.current
                : prev.remainingMs;
            const computedRemaining = Math.max(0, baseRemaining - elapsed);
            const nextRemaining = hasValidStartTimestamp ? computedRemaining : Math.max(0, prev.remainingMs);
            startTimestampRef.current = 0;
            remainingAtLastStartRef.current = nextRemaining;
            phaseTransitionLockRef.current = false;

            return persistAndReturnState({
                ...prev,
                isRunning: false,
                remainingMs: nextRemaining,
            });
        });
    }, []);

    const resetPhase = useCallback(() => {
        setState((prev) => {
            const nextDurationMs = getDurationMsForPhase(prev.phase, normalizedConfig);
            startTimestampRef.current = 0;
            remainingAtLastStartRef.current = nextDurationMs;
            phaseTransitionLockRef.current = false;

            return persistAndReturnState({
                ...prev,
                isRunning: false,
                durationMs: nextDurationMs,
                remainingMs: nextDurationMs,
            });
        });
    }, [normalizedConfig]);

    const skipPhase = useCallback(() => {
        phaseTransitionLockRef.current = true;
        advancePhase();
    }, [advancePhase]);

    const setExpanded = useCallback((value) => {
        setState((prev) => persistAndReturnState({
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
