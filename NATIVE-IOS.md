# VTA Copilot – Native iOS

This repository keeps the browser/PWA application as the single web core and packages the same runtime as a native iOS application with Capacitor.

## Architecture

- Web/PWA source of truth: repository root + `js/`, `images/`, `products/`
- Native web bundle: generated `dist/` (never edit directly)
- Native runtime: Capacitor 8
- Native iOS project: generated once in `ios/` and then committed
- Provisional Bundle Identifier: `de.vta.copilot`

The normal GitHub Pages/PWA build is not replaced by this setup.

## Local requirements

- macOS
- Node.js 22 or newer (`.nvmrc` is provided)
- current Xcode suitable for the required iOS SDK
- Apple Account signed in to Xcode for device testing

## First bootstrap on the Mac

From the repository root on branch `develop`:

```bash
npm install
npm run native:doctor
npm run test:native-scaffold
npm run native:build
npm run ios:add
npm run ios:open
```

`npm run ios:add` is a one-time command. It creates the `ios/` Xcode project.

After the iOS project exists, use this for normal development:

```bash
npm run ios:sync
npm run ios:open
```

`ios:sync` always rebuilds `dist/` first and then synchronizes the web bundle and installed Capacitor plugins to iOS.

## First Xcode run

1. Open `ios/App/App.xcworkspace` (normally via `npm run ios:open`).
2. Select the **App** target.
3. Open **Signing & Capabilities**.
4. Keep **Automatically manage signing** enabled.
5. Select your Apple **Team / Personal Team**.
6. Confirm the bundle identifier. `de.vta.copilot` is provisional and can be changed before registration/distribution.
7. Connect the iPhone, trust the Mac if requested, select the iPhone as run destination and press **Run**.
8. Enable Developer Mode on the iPhone if iOS requests it.

## Native feature roadmap

### Phase 1 – wrapper validation

The first goal is deliberately conservative: the existing Copilot must behave the same inside the iOS container.

Validate at minimum:

- Firebase login and local fallback
- plants and plant switching
- customer status and supply forecast
- calculators
- tasks and appointments
- documents/PDFs
- MapLibre/OpenFreeMap
- local storage / IndexedDB persistence
- navigation links, `tel:` links and external URLs
- camera/file inputs already used by the web UI

Do not enable Push/CallKit until this regression pass is clean.

### Phase 2 – native UX

Official Capacitor plugins are already declared for:

- App lifecycle
- Camera
- Filesystem
- Local Notifications
- Push Notifications
- Share Sheet
- Splash Screen
- Status Bar

They can be wired into the web core incrementally without rewriting the application in Swift.

### Phase 3 – supply notifications

Two notification paths are planned:

1. **Local notification** – the app calculates a future reorder date and schedules a reminder directly on the device.
2. **Remote push** – synchronized supply/customer data is evaluated in Firebase/backend and delivered through FCM/APNs even when the app has not recently been opened.

Remote push requires Apple Push Notifications capability, an Apple Developer Program team for distribution, Firebase iOS configuration and APNs credentials.

### Phase 4 – biometrics and phone integration

- Face ID / Keychain: add a small native Capacitor plugin or a vetted native dependency after the wrapper is stable.
- Caller ID: add an iOS Call Directory extension later. This is a separate native target and should use synchronized CRM phone numbers.
- Normal cellular call history is not exposed freely to third-party apps; the CRM workflow should therefore document calls rather than rely on reading the iPhone call log.

## Build model

`scripts/build-native.mjs` intentionally creates a dedicated native bundle. It copies only runtime assets:

- root HTML/CSS/manifests/images
- `js/`
- `images/`
- `products/`

Development files, Preview, tests, release notes and Firebase rules are not packaged into the native application.

The build also injects `js/native-runtime.js` before the main application module. The source `index.html` remains untouched, so GitHub Pages/PWA behavior is preserved.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run native:doctor` | Check local native toolchain/scaffold |
| `npm run native:build` | Generate clean `dist/` |
| `npm run test:native-scaffold` | Validate native configuration |
| `npm run ios:add` | Generate iOS project once |
| `npm run ios:copy` | Rebuild and copy web assets to iOS |
| `npm run ios:sync` | Rebuild, copy assets and synchronize plugins |
| `npm run ios:open` | Open the iOS project in Xcode |
| `npm run ios:run` | Sync and then open Xcode |

## Files that should be committed after first bootstrap

Commit the generated `ios/` project so signing settings, native targets, capabilities and future Swift/CallKit work are versioned. Generated web content under `ios/App/App/public/` is ignored because it is recreated by `npm run ios:sync`.

## Distribution

For early personal-device testing, Xcode can use a Personal Team. TestFlight/App Store/managed business distribution and advanced production capabilities should use an Apple Developer Program account. Before that step, decide whether the long-term owner of the app will be an individual account or the VTA organization account.
