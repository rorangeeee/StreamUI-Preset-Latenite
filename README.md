# StreamUI-Preset-Latenite

Independent source preset for [StreamUICore](https://github.com/rorangeeee/StreamUICore), SDK 1. Includes 3840 × 2160 ultrawide, fullscreen and away views, a shared persistent runtime, pixel transitions, chat, audio displays and media labels.

Clone to '<Core>/presets/latenite', then run:

~~~powershell
npm ci
npm run build
npm test
~~~

The result stays in this independent preset's 'ui/' folder. Core does not build or embed this preset. Install and build its two independent source dependencies before applying it:

- https://github.com/rorangeeee/StreamUI-Plugin-DesktopAudio
- https://github.com/rorangeeee/StreamUI-Plugin-SystemMedia

The preset uses the runtime SDK at '/sdk/streamui.js' and vendors only the public SDK 1 TypeScript definitions. It does not import Core source files.

Choose LATENITE in the Core Preview page and apply it. Use the scene selector for 21:9 and 16:9 and the separate away switch. Author defaults remain in 'defaults.json'; personal parameters and connection secrets remain in the Core data directory.

For original typography, install the same local Retro Pixel, 405 SS, Blue Screen Personal Use and JetBrains Mono fonts. Fonts are not redistributed here. Transparent render roots use 'color-scheme: normal'.
