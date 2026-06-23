/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
//// <reference types="vite-plugin-monkey/global" />
/// <reference types="vite-plugin-monkey/style" />

type TranslatorAvailability = 'available' | 'downloadable' | 'unavailable';

interface DownloadProgressEvent {
    loaded: number;
}

interface CreateMonitor {
    addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
}

interface TranslatorInstance {
    translate(text: string): Promise<string>;
    destroy?(): void;
}

interface TranslatorConstructor {
    availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorAvailability>;
    create(options: {
        sourceLanguage: string;
        targetLanguage: string;
        monitor?: (monitor: CreateMonitor) => void;
    }): Promise<TranslatorInstance>;
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
    availability(): Promise<TranslatorAvailability>;
    create(options?: {
        expectedInputLanguages?: string[];
        monitor?: (monitor: CreateMonitor) => void;
    }): Promise<LanguageDetectorInstance>;
}

interface Window {
    Translator: TranslatorConstructor;
    LanguageDetector: LanguageDetectorConstructor;
}
