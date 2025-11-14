import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import Panel from './components/Panel';

function App() {
    const [iconStyle, setIconStyle] = useState<CSSProperties | undefined>(undefined);
    const [panelText, setPanelText] = useState<string>('');
    const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>(undefined);

    const containerRef = useRef<HTMLDivElement>(null);

    const iconClick = (e: React.MouseEvent<HTMLDivElement>) => {
        setIconStyle(undefined);
        setPanelStyle({ left: e.clientX - 160, top: e.clientY - 50, width: 320 });
    };

    useEffect(() => {
        const handleSelection = (e: MouseEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(e.composedPath()[0] as Node)) return;
            requestAnimationFrame(() => {
                if (panelStyle) setPanelStyle(undefined);

                const selection = window.getSelection()?.toString();
                if (!selection || !/[a-zA-Z]/.test(selection)) {
                    setIconStyle(undefined);
                    return;
                }

                setIconStyle({ left: e.clientX + 5, top: e.clientY + 20 });
                setPanelText(selection);
            });
        };
        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, [iconStyle]);

    return (
        <div ref={containerRef}>
            {iconStyle && (
                <div
                    onClick={iconClick}
                    className="fixed z-[99999] flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-gray-200 p-1.5 text-black shadow-sm hover:bg-gray-300"
                    style={iconStyle}
                >
                    <span className="i-mingcute-translate-2-line text-2xl"></span>
                </div>
            )}
            {panelStyle && <Panel text={panelText} style={panelStyle} />}
        </div>
    );
}

export default App;
