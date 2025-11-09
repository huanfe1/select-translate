import { GM_xmlhttpRequest, unsafeWindow } from '$';

let translate = null;

if ('Translator' in self) {
    const translator = await unsafeWindow.Translator.create({
        sourceLanguage: 'en',
        targetLanguage: 'zh',
    });
    translate = translator.translate;
}

translate = (text: string) => {
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

export { translate };
