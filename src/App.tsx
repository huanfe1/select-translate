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
        setPanelStyle({ left: e.clientX + 5, top: e.clientY + 20 });
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
                    className="fixed flex cursor-pointer items-center justify-center rounded-xl border bg-gray-100 p-1.5 shadow hover:bg-gray-200"
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
