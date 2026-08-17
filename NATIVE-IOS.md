# VTA Copilot – Native iOS

This repository keeps the browser/PWA application as the single web core and packages the same runtime as a native iOS application with Capacitor.

## Current state

- Web/PWA source of truth: repository root + `js/`, `images/`, `products/`
- Native web bundle: generated `dist/` (never edit directly)
- Native runtime: Capacitor 8
- Native iOS project: committed in `ios/`
- Locked JavaScript/native dependencies: `package-lock.json`
- Provisional Bundle Identifier: `de.vta.copilot`
- Display name: `VTA Copilot`
- iOS project has already passed an unsigned iPhone Simulator `xcodebuild` in GitHub Actions

The normal GitHub Pages/PWA build is not replaced by this setup.

## Local requirements

- macOS
- Node.js 22 or newer (`.nvmrc` is provided)
- current Xcode suitable for the required iOS SDK
- Apple Account signed in to Xcode for device testing

## First run on the Mac

From the repository root on branch `develop`:

```bash
git pull
npm ci
npm run native:doctor
npm run test:native-scaffold
npm run ios:sync
npm run ios:open
```

The iOS project is already versioned in the repository, so **do not run `ios:add` during normal setup**. `ios:add` remains available only as a recovery/bootstrap command if the native project has intentionally been removed.

`ios:sync` always rebuilds `dist/` first and then synchronizes the web bundle and installed Capacitor plugins to iOS.

## First Xcode run

1. Run `npm run ios:open` or open `ios/App/App.xcodeproj` in Xcode.
2. Select the **App** target.
3. Open **Signing & Capabilities**.
4. Keep **Automatically manage signing** enabled.
5. Select your Apple **Team / Personal Team**.
6. Confirm the bundle identifier. `de.vta.copilot` is provisional and can be changed before registration/distribution.
7. Connect the iPhone, trust the Mac if requested, select the iPhone as run destination and press **Run**.
8. Enable Developer Mode on the iPhone if iOS requests it.

## Native regression checklist

Before adding production Push or CallKit, validate on a physical iPhone:

- Firebase login and local fallback
- plants and plant switching
- customer status and supply forecast
- calculators
- tasks and appointments
- documents/PDFs
- MapLibre/OpenFreeMap
- local storage / IndexedDB persistence after app restart
- navigation links, `tel:` links and external URLs
- camera/file inputs already used by the web UI
- portrait/landscape behavior and safe-area layout

## Native feature roadmap

### Phase 1 – wrapper validation

The first goal is deliberately conservative: the existing Copilot must behave the same inside the iOS container. The CI simulator compilation is green; the remaining validation is the real-device runtime pass above.

### Phase 2 – native UX

Official Capacitor plugins are already locked for:

- App lifecycle
- Camera
- Filesystem
- Local Notifications
- Push Notifications
- Share Sheet
- Splash Screen
- Status Bar

The iOS `Info.plist` already contains purpose strings for Camera, Photo Library and Face ID. Native features can therefore be wired into the web core incrementally without rewriting the application in Swift.

### Phase 3 – supply notifications

Two notification paths are planned:

1. **Local notification** – the app calculates a future reorder date and schedules a reminder directly on the device.
2. **Remote push** – synchronized supply/customer data is evaluated in Firebase/backend and delivered through FCM/APNs even when the app has not recently been opened.

Remote push still needs Apple Push Notifications capability, Firebase iOS configuration and APNs credentials. Those are intentionally not committed as secrets.

### Phase 4 – biometrics and phone integration

- Face ID / Keychain: add a small native Capacitor plugin or vetted native dependency after the wrapper regression is clean.
- Caller ID: add an iOS Call Directory extension later. This will be a separate native target and should consume synchronized CRM phone numbers.
- Normal cellular call history is not treated as a data source; the CRM workflow should document calls instead.

## Build model

`scripts/build-native.mjs` intentionally creates a dedicated native bundle. It copies only runtime assets:

- root HTML/CSS/manifests/images
- `js/`
- `images/`
- `products/`

Development files, Preview, tests, release notes, Firestore rules and the PWA service worker are not packaged into the native application.

The build injects `js/native-runtime.js` before the main application module. The source `index.html` remains untouched, so GitHub Pages/PWA behavior is preserved.

Generated web content under `ios/App/App/public/` is ignored because it is recreated by `npm run ios:sync`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run native:doctor` | Check local native toolchain/scaffold |
| `npm run native:build` | Generate clean `dist/` |
| `npm run test:native-scaffold` | Validate native configuration |
| `npm run ios:copy` | Rebuild and copy web assets to iOS |
| `npm run ios:sync` | Rebuild, copy assets and synchronize plugins |
| `npm run ios:open` | Open the iOS project in Xcode |
| `npm run ios:run` | Sync and then open Xcode |
| `npm run ios:add` | Recovery/bootstrap only if `ios/` was intentionally removed |

## CI safeguards

Two GitHub Actions workflows protect the native layer:

- `native scaffold`: installs the locked dependency graph with `npm ci`, runs scaffold tests, builds `dist/`, runs the doctor and verifies that Preview/service-worker files are excluded.
- `ios bootstrap`: runs on macOS, synchronizes Capacitor and compiles the **App** scheme for the iPhone Simulator with code signing disabled.

## Distribution

For early personal-device testing, select the available Team/Personal Team in Xcode. TestFlight, App Store/managed business distribution and production Push are configured only when the long-term Apple Developer team is decided.

Do not commit Apple signing certificates, provisioning profiles, APNs private keys or Firebase service credentials to this repository.
