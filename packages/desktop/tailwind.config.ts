import type { Config } from 'tailwindcss';
import uiViteConfig from '../ui-vite/tailwind.config';

const config: Config = {
  ...uiViteConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../ui-vite/src/**/*.{js,ts,jsx,tsx}',
    '../ui-components/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
