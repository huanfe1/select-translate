import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import Panel from './components/Panel';

function App() {
    const [iconPosition, setIconPosition] = useState<CSSProperties | undefined>(undefined);
    const [panelText, setPanelText] = useState<string>('');
    // const [panelVisible, setPanelVisible] = useState<boolean>(false);
    const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>(undefined);

    const iconClick = (e: React.MouseEvent<HTMLDivElement>) => {
        setPanelStyle({ left: e.clientX + 5, top: e.clientY + 20 });
    };

    useEffect(() => {
        const handleSelection = (e: MouseEvent) => {
            requestAnimationFrame(() => {
                if (panelStyle) setPanelStyle(undefined);

                const selection = window.getSelection()?.toString();
                if (!selection || !/[a-zA-Z]/.test(selection)) {
                    setIconPosition(undefined);
                    return;
                }

                setIconPosition({ left: e.clientX + 5, top: e.clientY + 20 });
                setPanelText(selection);
            });
        };
        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, [iconPosition, panelStyle]);

    return (
        <>
            {iconPosition && (
                <div
                    onClick={iconClick}
                    className="fixed flex cursor-pointer items-center justify-center rounded-lg bg-gray-200 p-1.5 shadow-lg hover:bg-gray-300"
                    style={iconPosition}
                >
                    <span className="i-mingcute-translate-2-line text-2xl"></span>
                </div>
            )}
            {panelStyle && <Panel text={panelText} style={panelStyle} />}
        </>
    );
}

export default App;
