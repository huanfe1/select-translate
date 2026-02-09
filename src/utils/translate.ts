import { GM_getValue, GM_setValue, GM_xmlhttpRequest, unsafeWindow } from '$';

interface Translate {
    (text: string): Promise<string>;
}

function toShortLangTag(bcp47: string): string {
    const primary = bcp47.split('-')[0].toLowerCase();
    return primary === 'und' ? '' : primary;
}

async function detectLanguage(text: string): Promise<string> {
    const win = unsafeWindow as Window;
    if (!('LanguageDetector' in win)) return '';
    try {
        const detector = await win.LanguageDetector.create({
            expectedInputLanguages: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'ar', 'pt'],
        });
        const results = await detector.detect(text);
        detector.destroy();
        const top = results[0];
        if (!top || top.detectedLanguage === 'und' || top.confidence < 0.1) return '';
        return toShortLangTag(top.detectedLanguage);
    } catch {
        return '';
    }
}

const googleTranslate: Translate = async text => {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`,
            method: 'GET',
            onload: response => {
                try {
                    const data = JSON.parse(response.responseText);
                    const translatedText = data[0]?.map((item: any[]) => item[0]).join('') || text;
                    resolve(translatedText);
                } catch (err) {
                    reject(new Error('解析翻译结果失败'));
                }
            },
            onerror: () => {
                reject(new Error('翻译请求失败'));
            },
        });
    });
};

const TARGET_LANG = 'zh';

const chromeTranslate: Translate = async text => {
    const win = unsafeWindow as Window;
    if (!('Translator' in win)) throw new Error('Translator not found');

    let sourceLanguage = await detectLanguage(text);
    let targetLanguage = TARGET_LANG;

    if (!sourceLanguage) sourceLanguage = 'en';
    if (sourceLanguage === 'zh') {
        sourceLanguage = 'zh';
        targetLanguage = 'en';
    }

    const translator = await win.Translator.create({
        sourceLanguage,
        targetLanguage,
    });
    return translator.translate(text);
};

type Translator = 'google' | 'chrome';

function translate(text: string, translator: Translator = 'chrome') {
    text = text.trim();
    const cache = GM_getValue('cache') || {};
    if (cache[text]) return Promise.resolve(cache[text]);
    switch (translator) {
        case 'google':
            return googleTranslate(text).then(res => {
                GM_setValue('cache', { ...cache, [text]: res });
                return res;
            });
        case 'chrome':
            return chromeTranslate(text).then(res => {
                GM_setValue('cache', { ...cache, [text]: res });
                return res;
            });
    }
}

export { translate };
