import { GM_getValue, GM_setValue } from '$';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { translate } from '../utils/translate';
import { MingcuteAlertLine, MingcuteCopyLine, MingcuteLoadingLine, MingcuteTranslate2Line } from './Icon';

interface PanelProps {
    text: string;
    style?: CSSProperties;
}

export default function Panel({ text, style: initialStyle }: PanelProps) {
    const GAP = 10;

    const [style, setStyle] = useState<CSSProperties>(initialStyle || {});
    const [translation, setTranslation] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const [rawTextVisible, setRawTextVisible] = useState<boolean>(GM_getValue('rawTextVisible', false));

    const panelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

    useEffect(() => {
        if (!text.trim()) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setTranslation('');
        setError('');

        let cancelled = false;

        translate(text)
            .then(result => {
                if (!cancelled) setTranslation(result);
            })
            .catch(err => {
                if (!cancelled) {
                    setError('翻译失败，请稍后重试');
                    console.error('翻译错误:', err);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [text]);

    useEffect(() => GM_setValue('rawTextVisible', rawTextVisible), [rawTextVisible]);

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
                        <MingcuteLoadingLine width={20} height={20} className="animate-spin" />
                        <span>翻译中...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 py-4 text-red-500">
                        <MingcuteAlertLine width={20} height={20} />
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="space-y-2 text-sm leading-relaxed text-gray-800">
                        {rawTextVisible && <div className="opacity-50">{text}</div>}
                        <div className="text-lg">{translation}</div>
                    </div>
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
                        <MingcuteTranslate2Line width={20} height={20} />
                    </button>
                    <button title="复制文本" onClick={handleCopy} className="flex items-center text-gray-400 transition-colors hover:text-gray-600">
                        <MingcuteCopyLine width={20} height={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
