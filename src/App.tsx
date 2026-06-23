import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { MingcuteTranslate2Line } from './components/Icon';
import Panel from './components/Panel';
import { createTranslateTask, type TranslateTask } from './utils/translate';

function App() {
    const [iconStyle, setIconStyle] = useState<CSSProperties | undefined>(undefined);
    const [panelText, setPanelText] = useState<string>('');
    const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>(undefined);
    const [translateTask, setTranslateTask] = useState<TranslateTask | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    const iconClick = (e: React.MouseEvent<HTMLDivElement>) => {
        setIconStyle(undefined);
        setPanelStyle({ left: e.clientX - 160, top: e.clientY - 50, width: 320 });
        // 必须在点击回调中立即发起翻译，以满足 Chrome 模型下载所需的 user activation
        setTranslateTask(createTranslateTask(panelText));
        e.stopPropagation();
    };

    useEffect(() => {
        const handleSelection = (e: MouseEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(e.composedPath()[0] as Node)) return;
            requestAnimationFrame(() => {
                if (panelStyle) {
                    setPanelStyle(undefined);
                    setTranslateTask(null);
                }

                const selection = window.getSelection()?.toString();
                if (!selection) {
                    setIconStyle(undefined);
                    return;
                }
                // 去除符号和空白后的文本
                const textWithoutSymbols = selection.replace(/[\s\W_]/g, '');
                if (!textWithoutSymbols) {
                    setIconStyle(undefined);
                    return;
                }
                const chineseCount = selection.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
                if (chineseCount / textWithoutSymbols.length > 0.7) {
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
            {panelStyle && translateTask && <Panel text={panelText} style={panelStyle} translateTask={translateTask} />}
        </div>
    );
}

export default App;
