import { useEffect, useRef, useState } from 'react';

export default function ConfirmPopoverButton ({
    buttonClassName = '',
    buttonLabel,
    cancelLabel = 'Cancel',
    confirmLabel = 'Delete',
    confirmTone = 'danger',
    disabled = false,
    message,
    onConfirm,
    popoverClassName = '',
    title = 'Confirm action',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleConfirm = async () => {
        await onConfirm?.();
        setIsOpen(false);
    };

    return (
        <span className="confirm-popover-wrap" ref={wrapperRef}>
            <button
                type="button"
                className={buttonClassName}
                onClick={() => setIsOpen((prev) => !prev)}
                disabled={disabled}
                aria-expanded={isOpen}
            >
                {buttonLabel}
            </button>

            {isOpen && (
                <span className={`confirm-popover ${popoverClassName}`.trim()} role="dialog" aria-label={title}>
                    <span className="confirm-popover-title">{title}</span>
                    <span className="confirm-popover-message">{message}</span>
                    <span className="confirm-popover-actions">
                        <button
                            type="button"
                            className="confirm-popover-button confirm-popover-button-secondary"
                            onClick={() => setIsOpen(false)}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            className={`confirm-popover-button confirm-popover-button-${confirmTone}`}
                            onClick={handleConfirm}
                        >
                            {confirmLabel}
                        </button>
                    </span>
                </span>
            )}
        </span>
    );
}
