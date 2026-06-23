import { GM_getValue, GM_setValue } from '$';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { formatEngineLabel, type TranslateTask } from '../utils/translate';
import { MingcuteAlertLine, MingcuteCopyLine, MingcuteLoadingLine, MingcuteTranslate2Line } from './Icon';

interface PanelProps {
    text: string;
    style?: CSSProperties;
    translateTask: TranslateTask;
}

export default function Panel({ text, style: initialStyle, translateTask }: PanelProps) {
    const GAP = 10;

    const [style, setStyle] = useState<CSSProperties>(initialStyle || {});
    const [translation, setTranslation] = useState<string>('');
    const [footerLabel, setFooterLabel] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingStatus, setLoadingStatus] = useState<string>('翻译中...');
    const [loadingProgress, setLoadingProgress] = useState<number | undefined>();
    const [error, setError] = useState<string>('');

    const stageLabel = { detect: '语言检测模型', translate: '翻译模型' } as const;

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
        setFooterLabel('');
        setLoadingStatus('翻译中...');
        setLoadingProgress(undefined);
        setError('');

        let cancelled = false;

        translateTask.onProgress(progress => {
            if (cancelled) return;

            if (progress.status === 'loading') {
                setLoadingStatus(`正在下载${stageLabel[progress.stage]}...`);
                setLoadingProgress(progress.progress);
                return;
            }

            if (progress.status === 'extracting') {
                setLoadingProgress(undefined);
                setLoadingStatus(`正在加载${stageLabel[progress.stage]}到内存...`);
                return;
            }

            setLoadingProgress(undefined);
            setLoadingStatus(progress.stage === 'detect' ? '正在检测语言...' : '正在翻译...');
        });

        translateTask.promise
            .then(result => {
                if (!cancelled) {
                    setTranslation(result.text);
                    setFooterLabel(formatEngineLabel(result));
                }
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
    }, [text, translateTask]);

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
                    <div className="flex flex-col items-center gap-3 py-4 text-gray-500">
                        <div className="flex items-center gap-2">
                            <MingcuteLoadingLine width={20} height={20} className="animate-spin" />
                            <span>{loadingStatus}</span>
                        </div>
                        {loadingProgress !== undefined && (
                            <div className="w-full px-2">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${loadingProgress}%` }}
                                    />
                                </div>
                                <div className="mt-1 text-center text-xs text-gray-400">{loadingProgress}%</div>
                            </div>
                        )}
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
                <div className="text-xs text-gray-500">{footerLabel || loadingStatus}</div>
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
