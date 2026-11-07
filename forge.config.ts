import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { join } from 'node:path';
import { adHocSignApp } from './scripts/ad-hoc-sign-app.mjs';

/**
 * Runtime packages Vite leaves external (ACP adapters spawned via `node <bin>`).
 * Forge's Vite plugin ignores all of `node_modules` by default, so these must be
 * allowlisted or adapter spawns fail in the packaged app.
 */
const runtimeNodeModules = [
  '@agentclientprotocol',
  '@anthropic-ai',
  '@openai',
  'pi-acp',
  'diff',
  'zod',
  'open',
  'vscode-jsonrpc',
  'cross-spawn',
  'isexe',
  'path-key',
  'shebang-command',
  'shebang-regex',
  'which',
  'default-browser',
  'default-browser-id',
  'bundle-name',
  'run-applescript',
  'is-docker',
  'is-wsl',
  'is-inside-container',
  'define-lazy-prop',
  'wsl-utils',
];

/**
 * Never shipped: the Claude Code and Codex CLIs (~550 MB) come from the user's own installs.
 */
const excludedPathPrefixes = [
  '/node_modules/@anthropic-ai/claude-agent-sdk-',
  '/node_modules/@openai/codex-',
];

function keepPackagedPath(file: string): boolean {
  if (!file || file === '/package.json') return true;
  if (excludedPathPrefixes.some((prefix) => file.startsWith(prefix))) return false;
  if (file.startsWith('/.vite')) return true;
  if (file === '/node_modules') return true;
  return runtimeNodeModules.some((name) => {
    const base = `/node_modules/${name}`;
    return file === base || file.startsWith(`${base}/`);
  });
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      // System `node` cannot read asar; adapters are spawned as child processes.
      unpack: `**/node_modules/{${runtimeNodeModules.join(',')}}/**`,
    },
    // Override Vite plugin's ".vite only" ignore so externalized deps ship too.
    ignore: (file) => !keepPackagedPath(file),
    name: "Switcheroo",
    icon: "./assets/icon",
    extraResource: ["./assets/icon.png"],
  },
  rebuildConfig: {},
  hooks: {
    postPackage: async (_config, { platform, outputPaths }) => {
      if (platform !== 'darwin') return;
      // No custom Finder icon here: its `Icon\r` file and FinderInfo xattr can't be
      // code-signed, and an unsigned bundle opens as "damaged" once downloaded.
      for (const outputPath of outputPaths) {
        adHocSignApp(join(outputPath, 'Switcheroo.app'));
      }
    },
  },
  makers: [
    new MakerDMG({
      icon: './assets/icon.icns',
    }, ['darwin']),
    new MakerDeb({
      options: {
        // Matches `packagerConfig.name`; the maker defaults to the lowercase package name.
        bin: 'Switcheroo',
        icon: './assets/icon.png',
      },
    }, ['linux']),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
