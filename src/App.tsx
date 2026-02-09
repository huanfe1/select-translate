import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { MingcuteTranslate2Line } from './components/Icon';
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
                if (!selection) {
                    setIconStyle(undefined);
                    return;
                }
                const chineseCount = selection.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
                if (chineseCount / selection.length > 0.7) {
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
        <div ref={containerRef} style={{ all: 'initial' }} translate="no">
            {iconStyle && (
                <div
                    onClick={iconClick}
                    className="fixed z-[99999] flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-gray-200 p-1.5 text-black shadow-sm hover:bg-gray-300"
                    style={iconStyle}
                >
                    <MingcuteTranslate2Line />
                </div>
            )}
            {panelStyle && <Panel text={panelText} style={panelStyle} />}
        </div>
    );
}

export default App;
