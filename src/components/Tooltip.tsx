import { type CSSProperties, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string | React.ReactNode;
    children: React.ReactElement;
    delay?: number;
}

export default function Tooltip({ content, children, delay = 0 }: TooltipProps) {
    const transitionDuration = 150;
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({});

    const showTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();

        let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
        if (e.clientY < 100) position = 'bottom';
        if (e.clientX < 100) position = 'left';
        if (e.clientX > window.innerWidth - 100) position = 'right';

        if (position === 'top') {
            setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, left: rect.left + rect.width / 2, top: rect.top - rect.height * 2.5 }));
        }
        if (position === 'bottom') {
            setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, left: rect.left + rect.width / 2, top: rect.top + rect.height * 2 }));
        }
        if (position === 'left') {
            setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, left: rect.left, top: rect.top - rect.height / 2, transform: 'translateX(50%)' }));
        }
        if (position === 'right') {
            setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, left: rect.left, top: rect.top - rect.height / 2, transform: 'translateX(-50%)' }));
        }
        if (position === 'top' || position === 'bottom') {
            setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, transform: 'translateX(-50%)' }));
        }

        setIsVisible(true);
        setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, opacity: 0, transitionDuration: `${transitionDuration}ms` }));
        setTimeout(() => setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, opacity: 1 })), delay);
    };

    const hideTooltip = () => {
        setTooltipStyle(tooltipStyle => ({ ...tooltipStyle, opacity: 0 }));
        setTimeout(() => setIsVisible(false), transitionDuration);
    };

    return (
        <>
            <div onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
                {children}
            </div>
            {isVisible &&
                createPortal(
                    <div className="fixed z-50 max-w-xs text-nowrap rounded-md bg-gray-900 px-3 py-2 text-sm text-white shadow-lg transition-opacity" style={tooltipStyle}>
                        {content}
                    </div>,
                    document.querySelector('#select-translate')?.shadowRoot as unknown as DocumentFragment,
                )}
        </>
    );
}
