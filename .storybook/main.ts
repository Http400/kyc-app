import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: [
    '../DS/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../frontend/src/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(config) {
    config.resolve = {
      ...config.resolve,
      dedupe: ['react', 'react-dom'],
      alias: {
        '@kyc/ui': fileURLToPath(new URL('../DS/index.ts', import.meta.url)),
      },
    }
    // Ensure the browser receives an ESM wrapper for React on cold starts.
    config.optimizeDeps = {
      ...config.optimizeDeps,
      include: [...(config.optimizeDeps?.include ?? []), 'react'],
    }
    return config
  },
}

export default config
