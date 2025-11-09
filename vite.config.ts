import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        monkey({
            entry: 'src/main.tsx',
            userscript: {
                name: '划词翻译',
                author: 'huanfei',
                icon: 'https://vitejs.dev/logo.svg',
                namespace: 'https://www.github.com/huanfe1/',
                match: ['*://*/*'],
                connect: ['translate.googleapis.com'],
                description: '划词翻译，支持选中英文文本后快速翻译成中文。',
                license: 'MIT',
                'run-at': 'document-end',
            },
            build: {
                externalGlobals: {
                    react: cdn.jsdelivr('React', 'umd/react.production.min.js'),
                    'react-dom': cdn.jsdelivr('ReactDOM', 'umd/react-dom.production.min.js'),
                },
            },
        }),
    ],
});
