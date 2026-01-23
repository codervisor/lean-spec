declare module 'ai' {
  export function streamText(...args: any[]): any;
  export function stepCountIs(...args: any[]): any;
  export function tool(...args: any[]): any;
}

declare module '@ai-sdk/openai' {
  export function createOpenAI(...args: any[]): any;
}

declare module '@ai-sdk/anthropic' {
  export function createAnthropic(...args: any[]): any;
}

declare module '@ai-sdk/google' {
  export function createGoogleGenerativeAI(...args: any[]): any;
}

declare module 'chokidar' {
  export type FSWatcher = any;
  const chokidar: any;
  export default chokidar;
}

declare module 'zod' {
  export const z: any;
  export namespace z {
    type infer<T> = any;
  }
}

declare module 'fs';
declare module 'os';
declare module 'path';
declare module 'readline';

declare const process: any;
