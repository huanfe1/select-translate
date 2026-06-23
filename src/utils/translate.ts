import { GM_getValue, GM_setValue, GM_xmlhttpRequest, unsafeWindow } from '$';

import { getTranslateEngine, type TranslateEngine } from './settings';

interface Translate {
    (text: string, source: string, target: string, onProgress?: TranslateProgressCallback): Promise<string>;
}

export type TranslateProgress = {
    stage: 'detect' | 'translate';
    status: 'loading' | 'processing' | 'extracting';
    progress?: number;
};

export type TranslateProgressCallback = (progress: TranslateProgress) => void;

export type TranslateResult = {
    text: string;
    engine: 'chrome' | 'bing' | 'google';
    sourceLanguage: string;
    targetLanguage: string;
};

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

const CHROME_TRANSLATE_TIMEOUT_MS = 300_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timeout`)), ms);
        }),
    ]);
}

function getPageWindow(): Window {
    return unsafeWindow as Window;
}

function isChromeTranslateAvailable(): boolean {
    return 'Translator' in getPageWindow();
}

function isChromeLanguageDetectorAvailable(): boolean {
    return 'LanguageDetector' in getPageWindow();
}

function createProgressMonitor(stage: TranslateProgress['stage'], onProgress?: TranslateProgressCallback) {
    return (monitor: CreateMonitor) => {
        monitor.addEventListener('downloadprogress', e => {
            const progress = Math.round(e.loaded * 100);
            if (progress >= 100) {
                onProgress?.({ stage, status: 'extracting' });
                return;
            }
            onProgress?.({
                stage,
                status: 'loading',
                progress,
            });
        });
    };
}

async function detectLanguageWithChrome(text: string, onProgress?: TranslateProgressCallback): Promise<string> {
    if (!isChromeLanguageDetectorAvailable()) return '';

    onProgress?.({ stage: 'detect', status: 'processing' });

    const detector = await getPageWindow().LanguageDetector.create({
        expectedInputLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'ar', 'pt'],
        monitor: createProgressMonitor('detect', onProgress),
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

async function detectLanguage(text: string, onProgress: TranslateProgressCallback | undefined, preferChrome: boolean): Promise<string> {
    if (preferChrome) {
        try {
            const detected = await detectLanguageWithChrome(text, onProgress);
            if (detected) return detected;
        } catch {
            // Chrome API unavailable or failed
        }
    }
    return detectLanguageHeuristic(text);
}

const TARGET_LANG = 'zh';

const LANG_NAMES: Record<string, string> = {
    zh: '中文',
    en: '英文',
    ja: '日文',
    ko: '韩文',
    fr: '法文',
    de: '德文',
    es: '西班牙文',
    ru: '俄文',
    ar: '阿拉伯文',
    pt: '葡萄牙文',
};

function formatLang(code: string): string {
    return LANG_NAMES[code] ?? code.toUpperCase();
}

export function formatEngineLabel(result: Pick<TranslateResult, 'engine' | 'sourceLanguage' | 'targetLanguage'>): string {
    const engine = result.engine === 'chrome' ? 'Chrome' : result.engine === 'bing' ? 'Bing' : 'Google';
    return `${engine} · ${formatLang(result.sourceLanguage)} → ${formatLang(result.targetLanguage)}`;
}

function resolveLanguages(sourceLanguage: string): { sourceLanguage: string; targetLanguage: string } {
    if (sourceLanguage === 'zh') {
        return { sourceLanguage: 'zh', targetLanguage: 'en' };
    }
    return { sourceLanguage, targetLanguage: TARGET_LANG };
}

const googleTranslate: Translate = async (text, _source, target, onProgress) => {
    onProgress?.({ stage: 'translate', status: 'processing' });

    const tl = target === 'zh' ? 'zh-CN' : target;

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

const BING_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0';
const BING_MAX_TEXT_LEN = 1000;

type BingConfig = {
    IG: string;
    IID: string;
    subdomain: string;
    key: number;
    token: string;
    tokenTs: number;
    tokenExpiryInterval: number;
};

let bingConfig: BingConfig | null = null;
let bingConfigPromise: Promise<BingConfig> | null = null;

function bingHost(subdomain: string): string {
    return subdomain ? `https://${subdomain}.bing.com` : 'https://www.bing.com';
}

function toBingLang(code: string): string {
    if (code === 'zh') return 'zh-Hans';
    return code;
}

function parseBingConfig(body: string, finalUrl?: string): BingConfig {
    const IG = body.match(/IG:"([^"]+)"/)?.[1];
    const IID = body.match(/data-iid="([^"]+)"/)?.[1];
    const abuseParams = body.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/)?.[1];

    if (!IG || !IID || !abuseParams) {
        throw new Error('获取 Bing 翻译凭证失败');
    }

    const [key, token, tokenExpiryInterval] = JSON.parse(abuseParams) as [number, string, number];
    const subdomain = finalUrl?.match(/^https?:\/\/(\w+)\.bing\.com/)?.[1] ?? '';

    return { IG, IID, subdomain, key, token, tokenTs: key, tokenExpiryInterval };
}

function isBingTokenExpired(config: BingConfig): boolean {
    return Date.now() - config.tokenTs > config.tokenExpiryInterval;
}

async function fetchBingConfig(): Promise<BingConfig> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Bing 凭证请求超时')), 15000);

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${bingHost(bingConfig?.subdomain ?? '')}/translator`,
            headers: { 'User-Agent': BING_USER_AGENT },
            onload: response => {
                clearTimeout(timer);
                try {
                    resolve(parseBingConfig(response.responseText, response.finalUrl));
                } catch (err) {
                    reject(err instanceof Error ? err : new Error('解析 Bing 凭证失败'));
                }
            },
            onerror: () => {
                clearTimeout(timer);
                reject(new Error('Bing 凭证请求失败'));
            },
        });
    });
}

async function getBingConfig(): Promise<BingConfig> {
    if (bingConfig && !isBingTokenExpired(bingConfig)) return bingConfig;

    if (!bingConfigPromise) {
        bingConfigPromise = fetchBingConfig().finally(() => {
            bingConfigPromise = null;
        });
    }

    bingConfig = await bingConfigPromise;
    return bingConfig;
}

const bingTranslate: Translate = async (text, source, target, onProgress) => {
    if (text.length > BING_MAX_TEXT_LEN) {
        throw new Error(`Bing 翻译单次最多 ${BING_MAX_TEXT_LEN} 个字符`);
    }

    onProgress?.({ stage: 'translate', status: 'processing' });

    const config = await getBingConfig();
    const fromLang = source ? toBingLang(source) : 'auto-detect';
    const toLang = toBingLang(target);
    const requestUrl =
        `${bingHost(config.subdomain)}/ttranslatev3?isVertical=1&IG=${config.IG}&IID=${config.IID}`;

    const form = new URLSearchParams({
        fromLang,
        to: toLang,
        text,
        token: config.token,
        key: String(config.key),
        tryFetchingGenderDebiasedTranslations: 'true',
    });

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Bing 翻译请求超时')), 15000);

        GM_xmlhttpRequest({
            method: 'POST',
            url: requestUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': BING_USER_AGENT,
                Referer: `${bingHost(config.subdomain)}/translator`,
            },
            data: form.toString(),
            onload: response => {
                clearTimeout(timer);
                try {
                    const body = JSON.parse(response.responseText);
                    if (body.ShowCaptcha) {
                        reject(new Error('Bing 翻译触发验证码，请稍后再试'));
                        return;
                    }
                    if (body.StatusCode === 401 || response.status === 401) {
                        bingConfig = null;
                        reject(new Error('Bing 翻译请求受限，请稍后再试'));
                        return;
                    }
                    const translatedText = body[0]?.translations?.[0]?.text;
                    if (!translatedText) {
                        reject(new Error('解析 Bing 翻译结果失败'));
                        return;
                    }
                    resolve(translatedText);
                } catch {
                    reject(new Error('解析 Bing 翻译结果失败'));
                }
            },
            onerror: () => {
                clearTimeout(timer);
                reject(new Error('Bing 翻译请求失败'));
            },
        });
    });
};

const chromeTranslate: Translate = async (text, source, target, onProgress) => {
    if (!isChromeTranslateAvailable()) throw new Error('Translator not found');

    const availability = await getPageWindow().Translator.availability({ sourceLanguage: source, targetLanguage: target });
    if (availability === 'unavailable') throw new Error('Language pair unavailable');

    onProgress?.({ stage: 'translate', status: 'processing' });

    const translator = await getPageWindow().Translator.create({
        sourceLanguage: source,
        targetLanguage: target,
        monitor: createProgressMonitor('translate', onProgress),
    });
    try {
        return await translator.translate(text);
    } finally {
        translator.destroy?.();
    }
};

type CacheEntry = Pick<TranslateResult, 'text' | 'engine'>;

function cacheKey(text: string, preference: TranslateEngine): string {
    return `${preference}::${text}`;
}

function saveToCache(text: string, preference: TranslateEngine, result: TranslateResult) {
    const cache: Record<string, CacheEntry | string> = GM_getValue('cache') || {};
    GM_setValue('cache', { ...cache, [cacheKey(text, preference)]: { text: result.text, engine: result.engine } });
    return result;
}

function readCache(text: string, preference: TranslateEngine): CacheEntry | null {
    const cache: Record<string, CacheEntry | string> = GM_getValue('cache') || {};
    const entry = cache[cacheKey(text, preference)];
    if (!entry) {
        // 兼容旧版缓存（无引擎前缀）
        const legacy = cache[text];
        if (!legacy) return null;
        if (typeof legacy === 'string') return { text: legacy, engine: 'google' };
        return legacy;
    }
    if (typeof entry === 'string') return { text: entry, engine: 'google' };
    return entry;
}

async function runTranslate(
    text: string,
    preference: TranslateEngine,
    onProgress?: TranslateProgressCallback,
): Promise<TranslateResult> {
    const preferChrome = preference === 'chrome' || preference === 'auto';
    const sourceLanguage = await detectLanguage(text, onProgress, preferChrome);
    const { sourceLanguage: source, targetLanguage } = resolveLanguages(sourceLanguage);

    const tryChrome = preference === 'chrome' || preference === 'auto';
    const tryBing = preference === 'bing' || preference === 'auto';
    const tryGoogle = preference === 'google' || preference === 'auto';

    if (tryChrome && isChromeTranslateAvailable()) {
        try {
            const translated = await withTimeout(
                chromeTranslate(text, source, targetLanguage, onProgress),
                CHROME_TRANSLATE_TIMEOUT_MS,
                'Translator',
            );
            return { text: translated, engine: 'chrome', sourceLanguage: source, targetLanguage };
        } catch (err) {
            console.warn('[划词翻译] Chrome 翻译失败:', err);
            if (preference === 'chrome') throw err;
        }
    } else if (preference === 'chrome') {
        throw new Error('Chrome Translator 不可用');
    }

    if (tryBing) {
        try {
            const translated = await bingTranslate(text, source, targetLanguage, onProgress);
            return { text: translated, engine: 'bing', sourceLanguage: source, targetLanguage };
        } catch (err) {
            console.warn('[划词翻译] Bing 翻译失败:', err);
            if (preference === 'bing') throw err;
        }
    }

    if (tryGoogle) {
        const translated = await googleTranslate(text, source, targetLanguage, onProgress);
        return { text: translated, engine: 'google', sourceLanguage: source, targetLanguage };
    }

    throw new Error('无可用翻译引擎');
}

export type TranslateTask = {
    promise: Promise<TranslateResult>;
    onProgress: (callback: TranslateProgressCallback) => void;
};

/** 在用户点击等手势回调中调用，以满足 Chrome 模型下载所需的 user activation */
function createTranslateTask(text: string): TranslateTask {
    let progressCallback: TranslateProgressCallback | undefined;
    const promise = translate(text, progress => progressCallback?.(progress));
    return {
        promise,
        onProgress: callback => {
            progressCallback = callback;
        },
    };
}

function translate(text: string, onProgress?: TranslateProgressCallback): Promise<TranslateResult> {
    text = text.trim();
    const preference = getTranslateEngine();
    const cached = readCache(text, preference);
    if (cached) {
        const sourceLanguage = detectLanguageHeuristic(text);
        const { sourceLanguage: source, targetLanguage } = resolveLanguages(sourceLanguage);
        return Promise.resolve({
            text: cached.text,
            engine: cached.engine,
            sourceLanguage: source,
            targetLanguage,
        });
    }

    return runTranslate(text, preference, onProgress).then(result => saveToCache(text, preference, result));
}

export { translate, formatLang, createTranslateTask };
