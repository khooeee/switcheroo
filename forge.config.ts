import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

/**
 * Runtime packages Vite leaves external (native addons + ACP adapters spawned via
 * `node <bin>`). Forge's Vite plugin ignores all of `node_modules` by default, so
 * these must be allowlisted or `require()` / adapter spawns fail in the packaged app.
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
  'node-pty',
];

function keepPackagedPath(file: string): boolean {
  if (!file || file === '/package.json') return true;
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
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
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
