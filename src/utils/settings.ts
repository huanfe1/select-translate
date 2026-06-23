import { GM_getValue, GM_registerMenuCommand, GM_setValue, GM_unregisterMenuCommand } from '$';

export type TranslateEngine = 'auto' | 'chrome' | 'bing' | 'google';

const ENGINE_KEY = 'translateEngine';

export const ENGINE_OPTIONS: { value: TranslateEngine; label: string; desc: string }[] = [
    { value: 'auto', label: 'Chrome 优先', desc: '优先 Chrome 内置，失败时依次回退 Bing、Google' },
    { value: 'chrome', label: 'Chrome 内置', desc: '仅使用 Chrome 本地 AI 翻译' },
    { value: 'bing', label: 'Bing 翻译', desc: '使用 Bing 网页版免费接口，无需 API Key' },
    { value: 'google', label: 'Google 翻译', desc: '仅使用 Google 在线翻译' },
];

export function getTranslateEngine(): TranslateEngine {
    const value = GM_getValue(ENGINE_KEY, 'auto') as string;
    if (value === 'chrome' || value === 'bing' || value === 'google' || value === 'auto') return value;
    return 'auto';
}

export function setTranslateEngine(engine: TranslateEngine) {
    GM_setValue(ENGINE_KEY, engine);
}

const OVERLAY_ID = 'select-translate-settings-overlay';

export function openEngineSettingsDialog() {
    if (document.getElementById(OVERLAY_ID)) return;

    const current = getTranslateEngine();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);font-family:"PingFang SC","Microsoft YaHei",sans-serif';

    const panel = document.createElement('div');
    panel.style.cssText =
        'width:360px;max-width:calc(100vw - 32px);background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);overflow:hidden';

    const header = document.createElement('div');
    header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #eee;font-size:16px;font-weight:600;color:#111';
    header.textContent = '选择翻译引擎';

    const body = document.createElement('div');
    body.style.cssText = 'padding:12px 20px;display:flex;flex-direction:column;gap:8px';

    const inputs: HTMLInputElement[] = [];

    ENGINE_OPTIONS.forEach(option => {
        const item = document.createElement('label');
        item.style.cssText =
            'display:flex;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:border-color .15s,background .15s';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'translate-engine';
        input.value = option.value;
        input.checked = current === option.value;
        input.style.cssText = 'margin-top:3px;accent-color:#2563eb';
        inputs.push(input);

        const text = document.createElement('div');
        const title = document.createElement('div');
        title.style.cssText = 'font-size:14px;font-weight:500;color:#111';
        title.textContent = option.label;
        const desc = document.createElement('div');
        desc.style.cssText = 'margin-top:4px;font-size:12px;color:#6b7280;line-height:1.5';
        desc.textContent = option.desc;
        text.append(title, desc);

        const syncActive = () => {
            body.querySelectorAll('label').forEach(label => {
                const radio = label.querySelector('input');
                const active = radio?.checked;
                (label as HTMLLabelElement).style.borderColor = active ? '#2563eb' : '#e5e7eb';
                (label as HTMLLabelElement).style.background = active ? '#eff6ff' : '#fff';
            });
        };

        input.addEventListener('change', syncActive);
        item.addEventListener('mouseenter', () => {
            if (!input.checked) item.style.borderColor = '#cbd5e1';
        });
        item.addEventListener('mouseleave', () => {
            if (!input.checked) item.style.borderColor = '#e5e7eb';
        });

        item.append(input, text);
        body.append(item);
        syncActive();
    });

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 16px;border-top:1px solid #eee';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText =
        'padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;font-size:14px;cursor:pointer';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = '确定';
    confirmBtn.style.cssText =
        'padding:8px 16px;border:none;border-radius:6px;background:#2563eb;color:#fff;font-size:14px;cursor:pointer';

    const close = () => overlay.remove();

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => {
        if (e.target === overlay) close();
    });

    confirmBtn.addEventListener('click', () => {
        const selected = inputs.find(input => input.checked)?.value as TranslateEngine | undefined;
        if (selected) setTranslateEngine(selected);
        close();
    });

    footer.append(cancelBtn, confirmBtn);
    panel.append(header, body, footer);
    overlay.append(panel);
    document.body.appendChild(overlay);
}

let menuCommandId: number | null = null;

export function registerEngineMenu() {
    if (menuCommandId !== null) GM_unregisterMenuCommand(menuCommandId);
    menuCommandId = GM_registerMenuCommand('翻译引擎设置', openEngineSettingsDialog);
}
