import { GM_getValue, GM_setValue, GM_xmlhttpRequest, unsafeWindow } from '$';

interface Translate {
    (text: string): Promise<string>;
}

const googleTranslate: Translate = async text => {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`,
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

const chromeTranslate: Translate = async text => {
    if (!('Translator' in self)) throw new Error('Translator not found');
    const translator = await unsafeWindow.Translator.create({
        sourceLanguage: 'en',
        targetLanguage: 'zh',
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
