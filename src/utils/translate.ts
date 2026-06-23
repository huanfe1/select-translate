import { GM_getValue, GM_setValue, GM_xmlhttpRequest, unsafeWindow } from '$';

interface Translate {
    (text: string): Promise<string>;
}

function toShortLangTag(bcp47: string): string {
    const primary = bcp47.split('-')[0].toLowerCase();
    return primary === 'und' ? '' : primary;
}

function detectLanguageHeuristic(text: string): string {
    const withoutSymbols = text.replace(/[\s\W_]/g, '');
    if (!withoutSymbols) return 'en';

    const ratio = (count: number) => count / withoutSymbols.length;
    const chineseCount = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    if (ratio(chineseCount) > 0.5) return 'zh';

    const japaneseCount = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g)?.length ?? 0;
    if (ratio(japaneseCount) > 0.3) return 'ja';

    const koreanCount = text.match(/[\uac00-\ud7af]/g)?.length ?? 0;
    if (ratio(koreanCount) > 0.3) return 'ko';

    return 'en';
}

const DETECT_TIMEOUT_MS = 2000;
const CHROME_TRANSLATE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timeout`)), ms);
        }),
    ]);
}

async function detectLanguageWithChrome(text: string): Promise<string> {
    const win = unsafeWindow as Window;
    if (!('LanguageDetector' in win)) return '';

    const detector = await win.LanguageDetector.create({
        expectedInputLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'ar', 'pt'],
    });
    try {
        const results = await detector.detect(text);
        const top = results[0];
        if (top && top.detectedLanguage !== 'und' && top.confidence >= 0.1) {
            return toShortLangTag(top.detectedLanguage);
        }
        return '';
    } finally {
        detector.destroy();
    }
}

async function detectLanguage(text: string): Promise<string> {
    try {
        const detected = await withTimeout(detectLanguageWithChrome(text), DETECT_TIMEOUT_MS, 'LanguageDetector');
        if (detected) return detected;
    } catch {
        // Chrome API unavailable, slow, or timed out
    }
    return detectLanguageHeuristic(text);
}

const TARGET_LANG = 'zh';

function resolveLanguages(sourceLanguage: string): { sourceLanguage: string; targetLanguage: string } {
    if (sourceLanguage === 'zh') {
        return { sourceLanguage: 'zh', targetLanguage: 'en' };
    }
    return { sourceLanguage, targetLanguage: TARGET_LANG };
}

const googleTranslate: Translate = async text => {
    const { targetLanguage } = resolveLanguages(detectLanguageHeuristic(text));
    const tl = targetLanguage === 'zh' ? 'zh-CN' : targetLanguage;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('翻译请求超时')), 15000);

        GM_xmlhttpRequest({
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`,
            method: 'GET',
            onload: response => {
                clearTimeout(timer);
                try {
                    const data = JSON.parse(response.responseText);
                    const translatedText = data[0]?.map((item: any[]) => item[0]).join('') || text;
                    resolve(translatedText);
                } catch {
                    reject(new Error('解析翻译结果失败'));
                }
            },
            onerror: () => {
                clearTimeout(timer);
                reject(new Error('翻译请求失败'));
            },
        });
    });
};

const chromeTranslate: Translate = async text => {
    const win = unsafeWindow as Window;
    if (!('Translator' in win)) throw new Error('Translator not found');

    const sourceLanguage = await detectLanguage(text);
    const { sourceLanguage: source, targetLanguage } = resolveLanguages(sourceLanguage);

    const translator = await win.Translator.create({
        sourceLanguage: source,
        targetLanguage,
    });
    return translator.translate(text);
};

type Translator = 'google' | 'chrome';

function saveToCache(text: string, result: string) {
    const cache = GM_getValue('cache') || {};
    GM_setValue('cache', { ...cache, [text]: result });
    return result;
}

function translate(text: string, translator: Translator = 'google') {
    text = text.trim();
    const cache = GM_getValue('cache') || {};
    if (cache[text]) return Promise.resolve(cache[text]);

    const runGoogle = () => googleTranslate(text).then(res => saveToCache(text, res));
    const runChrome = () =>
        withTimeout(chromeTranslate(text), CHROME_TRANSLATE_TIMEOUT_MS, 'Translator')
            .then(res => saveToCache(text, res))
            .catch(() => runGoogle());

    switch (translator) {
        case 'google':
            return runGoogle();
        case 'chrome':
            return runChrome();
    }
}

export { translate };
