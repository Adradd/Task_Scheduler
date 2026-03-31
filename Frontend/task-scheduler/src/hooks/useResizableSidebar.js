import { useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function useResizableSidebar({
    defaultWidth = 320,
    minWidth = 240,
    maxWidth = 520,
} = {}) {
    const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);
    const dragStateRef = useRef({
        pointerId: null,
        startX: 0,
        startWidth: defaultWidth,
    });

    useEffect(() => {
        if (!isResizing) {
            return undefined;
        }

        const handlePointerMove = (event) => {
            const maxAllowedWidth = Math.min(maxWidth, Math.floor(window.innerWidth * 0.5));
            const nextWidth = dragStateRef.current.startWidth + (event.clientX - dragStateRef.current.startX);
            setSidebarWidth(clamp(nextWidth, minWidth, maxAllowedWidth));
        };

        const stopResizing = () => {
            setIsResizing(false);
            dragStateRef.current.pointerId = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopResizing);
        window.addEventListener('pointercancel', stopResizing);

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopResizing);
            window.removeEventListener('pointercancel', stopResizing);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, maxWidth, minWidth]);

    const startResizing = (event) => {
        if (window.matchMedia('(max-width: 768px)').matches) {
            return;
        }

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: sidebarWidth,
        };
        setIsResizing(true);
    };

    return {
        isResizing,
        sidebarWidth,
        startResizing,
    };
}

export default useResizableSidebar;
