import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { translate } from '../utils/translate';

interface PanelProps {
    text: string;
    style?: CSSProperties;
}

export default function Panel({ text, style }: PanelProps) {
    const [translation, setTranslation] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isFavorite, setIsFavorite] = useState<boolean>(false);
    const textRef = useRef<string>('');

    useEffect(() => {
        if (textRef.current === text) return;
        textRef.current = text;
        setTranslation('');
        setError('');
        translateText(text);
    }, [text]);

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

    const handleFavorite = () => {
        setIsFavorite(!isFavorite);
    };

    return (
        <div className="fixed z-50 w-80 rounded-lg bg-gray-100" style={style}>
            {/* 主要内容区域 */}
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
                        <div className="opacity-50">{text}</div>
                        <div className="text-lg">{translation}</div>
                    </div>
                ) : (
                    <div className="py-4 text-gray-400">等待翻译...</div>
                )}
            </div>

            <div className="border-t border-gray-200"></div>

            <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs text-gray-400">Microsoft Translator</div>

                <div className="flex items-center gap-3">
                    <button onClick={() => translateText(text)} className="text-gray-400 transition-colors hover:text-gray-600" disabled={loading} aria-label="重新翻译">
                        <span className="i-mingcute-translate-2-line text-lg"></span>
                    </button>
                    <button onClick={handleFavorite} className={`transition-colors ${isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`} aria-label="收藏">
                        <span className="i-mingcute-star-line text-lg"></span>
                    </button>
                    <button onClick={handleCopy} className="text-gray-400 transition-colors hover:text-gray-600" disabled={loading || !translation} aria-label="复制">
                        <span className="i-mingcute-copy-line text-lg"></span>
                    </button>
                </div>
            </div>
        </div>
    );
}
