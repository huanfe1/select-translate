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

interface LanguageDetectorResult {
    detectedLanguage: string;
    confidence: number;
}

interface LanguageDetectorInstance {
    detect(text: string): Promise<LanguageDetectorResult[]>;
    destroy(): void;
}

interface LanguageDetectorConstructor {
    create(options?: { expectedInputLanguages?: string[] }): Promise<LanguageDetectorInstance>;
}

interface Window {
    Translator: TranslatorConstructor;
    LanguageDetector: LanguageDetectorConstructor;
}
