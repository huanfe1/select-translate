import { getIconCollections, iconsPlugin } from '@egoist/tailwindcss-icons';
import type { Config } from 'tailwindcss';
import remToPx from 'tailwindcss-rem-to-px';

const config: Config = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [iconsPlugin({ collections: getIconCollections(['mingcute']) }), remToPx()],
};

export default config;
