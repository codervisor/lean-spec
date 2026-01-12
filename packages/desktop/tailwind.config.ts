import type { Config } from 'tailwindcss';
import uiConfig from '../ui/tailwind.config';

const config: Config = {
  ...uiConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../ui/src/**/*.{js,ts,jsx,tsx}',
    '../ui-components/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default config;
