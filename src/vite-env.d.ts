/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
//// <reference types="vite-plugin-monkey/global" />
/// <reference types="vite-plugin-monkey/style" />

interface TranslatorInstance {
    translate(text: string): Promise<string>;
}

interface TranslatorConstructor {
    create(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorInstance>;
}

interface Window {
    Translator: TranslatorConstructor;
}
