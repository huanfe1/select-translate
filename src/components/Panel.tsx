import { GM_getValue, GM_setValue } from '$';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { translate } from '../utils/translate';

interface PanelProps {
    text: string;
    style?: CSSProperties;
}

export default function Panel({ text, style: initialStyle }: PanelProps) {
    const GAP = 10;

    const [style, setStyle] = useState<CSSProperties>(initialStyle || {});
    const [translation, setTranslation] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const textRef = useRef<string>('');

    const [rawTextVisible, setRawTextVisible] = useState<boolean>(GM_getValue('rawTextVisible', false));

    const panelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

    useEffect(() => {
        if (textRef.current === text) return;
        textRef.current = text;
        setTranslation('');
        setError('');
        translateText(text);
    }, [text]);

    useEffect(() => GM_setValue('rawTextVisible', rawTextVisible), [rawTextVisible]);

    const translateText = async (textToTranslate: string) => {
        if (!textToTranslate.trim()) return;

        setLoading(true);
        setError('');

        try {
            const translatedText = await translate(textToTranslate);
            setTranslation(translatedText);
        } catch (err) {
            setError('翻译失败，请稍后重试');
            console.error('翻译错误:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(translation || text);
    };

    // 拖拽处理
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragOffsetRef.current) return;

            const newX = e.clientX - dragOffsetRef.current.offsetX;
            const newY = e.clientY - dragOffsetRef.current.offsetY;
            setStyle(style => ({ ...style, left: newX, top: newY }));
        };

        const handleMouseUp = () => {
            adjustPosition();
            setIsDragging(false);
            dragOffsetRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!panelRef.current) return;

        const rect = panelRef.current.getBoundingClientRect();
        dragOffsetRef.current = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
        setIsDragging(true);
        e.preventDefault();
        e.stopPropagation();
    };

    const adjustPosition = () => {
        requestAnimationFrame(() => {
            const rect = panelRef.current?.getBoundingClientRect();
            if (!rect) return;
            setStyle(style => {
                const clientHeight = document.documentElement.clientHeight;
                const clientWidth = document.documentElement.clientWidth;
                let newStyle = { ...style };
                if (rect.top < GAP) newStyle.top = GAP;
                if (rect.top + rect.height > clientHeight) newStyle.top = clientHeight - rect.height - GAP;
                if (rect.left < GAP) newStyle.left = GAP;
                if (rect.right > clientWidth - GAP) newStyle.left = clientWidth - rect.width - GAP;
                return newStyle;
            });
        });
    };

    useEffect(() => {
        if (translation) adjustPosition();
    }, [translation]);

    return (
        <div
            ref={panelRef}
            className={`fixed z-[99999] w-80 overflow-hidden rounded-lg border bg-white shadow ${!isDragging && 'transition-all'}`}
            style={style}
            onClick={e => e.stopPropagation()}
        >
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
                        <span className="i-mingcute-loading-line animate-spin text-lg"></span>
                        <span>翻译中...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 py-4 text-red-500">
                        <span className="i-mingcute-alert-line text-lg"></span>
                        <span>{error}</span>
                    </div>
                ) : translation ? (
                    <div className="space-y-2 text-sm leading-relaxed text-gray-800">
                        {rawTextVisible && <div className="opacity-50">{text}</div>}
                        <div className="text-lg">{translation}</div>
                    </div>
                ) : (
                    <div className="py-4 text-gray-400">等待翻译...</div>
                )}
            </div>

            <div className="flex cursor-grab items-center justify-between border-t border-gray-200 bg-gray-100 px-4 py-3 active:cursor-grabbing" onMouseDown={handleMouseDown}>
                <div className="text-xs text-gray-500">Google Translator</div>
                <div className="flex items-center gap-3">
                    <button
                        title="是否显示原始文本"
                        className="flex items-center text-gray-400 transition-colors hover:text-gray-600"
                        onClick={() => setRawTextVisible(!rawTextVisible)}
                    >
                        <span className="i-mingcute-translate-2-line text-lg"></span>
                    </button>
                    <button title="复制文本" onClick={handleCopy} className="flex items-center text-gray-400 transition-colors hover:text-gray-600">
                        <span className="i-mingcute-copy-line text-lg"></span>
                    </button>
                </div>
            </div>
        </div>
    );
}
