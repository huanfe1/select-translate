import { GM_addElement } from '$';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import tailwindcss from './styles/tailwind.css?inline';

const sheet = new CSSStyleSheet();
sheet.replaceSync(tailwindcss);

if (import.meta.hot) {
    import.meta.hot.accept('./styles/tailwind.css?inline', module => {
        console.log('检测到样式文件更新，更新样式');
        sheet.replaceSync(module?.default);
    });
}

const host = GM_addElement(document.body, 'div', { id: 'select-translate' });
const shadow = host.attachShadow({ mode: 'open' });
shadow.adoptedStyleSheets = [sheet];
ReactDOM.createRoot(shadow).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
