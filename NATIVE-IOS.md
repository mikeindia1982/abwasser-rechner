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
- Native-only runtime/UI/integration files are injected by `scripts/build-native.mjs`; the normal Web/PWA `index.html` is not changed

## iPhone Integration v1

The native build now adds a dedicated device integration layer on top of the existing web core:

- normal `tel:` and `mailto:` workflows remain available from the existing application UI
- navigation offers Apple Maps or Google Maps on iPhone
- VTA appointments can be linked to iOS Calendar through a small in-app EventKit Capacitor plugin
- linked calendar events are updated when the corresponding VTA appointment changes and removed when the VTA appointment is deleted
- iOS Calendar remains a downstream view: VTA Copilot is the leading system; changes made only inside Apple Calendar are not written back to VTA
- linked events receive a 30-minute Calendar reminder
- Capacitor Local Notifications schedules reminders for upcoming unlinked visits, due tasks and future 45-day sales/order reminders
- notification taps restore the relevant plant/page context
- the visit photo action uses the native Camera/Photos plugins when available
- visit photos are normalized to JPEG, maximum 1600 px edge and approximately 78% JPEG quality; oversized images are recompressed below the existing 1.5 MB compatibility threshold where possible
- optimized visit photos are additionally archived in the iOS app filesystem while the existing visit-photo payload is retained for compatibility with the current local backup/data model
- Share Sheet support is available from the active visit
- the native Settings view exposes permission and resynchronization controls

The current visit data model still limits a visit to six photos. Raising that limit is intentionally deferred until the photo payload is migrated fully away from the legacy Base64 visit record.

## Calendar architecture

Calendar access is implemented without an extra third-party calendar dependency. `ios/App/App/SceneDelegate.swift` contains `VTANativeIntegrationPlugin`, which uses Apple EventKit and is registered from a `CAPBridgeViewController` subclass.

Because VTA Copilot must be able to update and delete calendar entries it previously created, the app requests full Calendar access. The iOS project declares both `NSCalendarsFullAccessUsageDescription` for iOS 17+ and `NSCalendarsUsageDescription` for iOS 15–16.

Calendar links are stored locally as VTA visit ID ↔ EventKit event identifier mappings. They are device-local by design and are not part of the portable plant JSON backup.

## Notifications

Local notifications are device-local. They are recalculated from the current local plant data when the app detects relevant local data changes. Permission is not requested silently at app startup; the user can activate it from the native integration section or when explicitly synchronizing native features.

Remote push still requires APNs/FCM/backend work and is not part of iPhone Integration v1.

## Local requirements

- macOS
- Node.js 22 or newer (`.nvmrc` is provided)
- current Xcode suitable for the required iOS SDK
- Apple Account signed in to Xcode for device testing

## Update/run on the Mac

From the repository root on branch `develop`:

```bash
git pull origin develop
npm ci
npm run test:native-scaffold
npm run ios:sync
npm run native:doctor
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
7. Connect or select the paired iPhone as run destination and press **Run**.
8. Enable Developer Mode on the iPhone if iOS requests it.

## Real-device regression checklist

Validate on a physical iPhone after each native integration change:

- Firebase login and local fallback
- plants and plant switching
- customer status and supply forecast
- calculators
- tasks and appointments
- documents/PDFs
- MapLibre/OpenFreeMap
- local storage / IndexedDB persistence after app restart
- `tel:` / email actions
- Apple Maps and Google Maps navigation chooser
- create a VTA appointment → add to iOS Calendar → edit in VTA → verify Calendar update → remove Calendar link
- enable local notifications and confirm pending task/visit reminders
- open a notification and verify the relevant plant/page is restored
- take a visit photo with the rear camera
- choose several photos from Photos
- confirm optimized image quality remains sufficient for type plates, tanks, dosing equipment and overview documentation
- Share Sheet from an active visit
- portrait/landscape behavior, keyboard and safe-area layout

## Native feature roadmap

### Phase 1 – wrapper validation

Keep the Web/PWA source of truth stable while validating that the same functional core behaves correctly inside Capacitor.

### Phase 2 – iPhone Integration v1

Implemented native adapters:

- EventKit Calendar bridge
- Camera / Photos
- Filesystem photo archive
- Local Notifications
- Share Sheet
- Apple Maps / Google Maps selection

### Phase 3 – multi-device Firebase synchronization

Move plant, visit, task and commercial data from isolated per-device local storage to a conflict-safe offline-capable shared model. Device-only identifiers such as EventKit event IDs remain local and must not be synchronized between users.

Photo binaries should then move to Firebase Storage (or an equivalent managed object store), while Firestore stores only structured visit/photo metadata.

### Phase 4 – remote push

Two notification paths then coexist:

1. **Local notification** – calculated and scheduled directly on the device.
2. **Remote push** – synchronized supply/customer data is evaluated in Firebase/backend and delivered through FCM/APNs even when the app has not recently been opened.

Remote push needs Apple Push Notifications capability, Firebase iOS configuration and APNs credentials. Those are intentionally not committed as secrets.

### Phase 5 – biometrics and phone integration

- Face ID / Keychain: add a small native Capacitor plugin or vetted native dependency after the shared-data architecture is stable.
- Caller ID: add an iOS Call Directory extension later. This will be a separate native target and should consume synchronized CRM phone numbers.
- Normal cellular call history is not treated as a data source; the CRM workflow should document calls instead.

## Build model

`scripts/build-native.mjs` intentionally creates a dedicated native bundle. It copies only runtime assets:

- root HTML/CSS/manifests/images
- `js/`
- `images/`
- `products/`

Development files, Preview, tests, release notes, Firestore rules and the PWA service worker are not packaged into the native application.

The build injects, in order, the native runtime, UI hardening and iPhone integration scripts before the main application module. It also injects the native-only CSS layers. The source `index.html` remains untouched, so GitHub Pages/PWA behavior is preserved.

Generated web content under `ios/App/App/public/` is ignored because it is recreated by `npm run ios:sync`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run native:doctor` | Check local native toolchain/scaffold and required integration files |
| `npm run native:build` | Generate clean `dist/` |
| `npm run test:native-scaffold` | Validate native configuration/integration structure |
| `npm run ios:copy` | Rebuild and copy web assets to iOS |
| `npm run ios:sync` | Rebuild, copy assets and synchronize plugins |
| `npm run ios:open` | Open the iOS project in Xcode |
| `npm run ios:run` | Sync and then open Xcode |
| `npm run ios:add` | Recovery/bootstrap only if `ios/` was intentionally removed |

## CI safeguards

Two GitHub Actions workflows protect the native layer:

- `native scaffold`: syntax-checks the native integration runtime, installs the locked dependency graph, runs scaffold tests, builds `dist/`, runs the doctor and verifies all native-only runtime/CSS files.
- `ios bootstrap`: performs the same native JavaScript checks on macOS, synchronizes Capacitor and compiles the **App** scheme for the iPhone Simulator with code signing disabled. This is the compile gate for the EventKit bridge.

## Distribution

For early personal-device testing, select the available Team/Personal Team in Xcode. TestFlight, App Store/managed business distribution and production Push are configured only when the long-term Apple Developer team is decided.

Do not commit Apple signing certificates, provisioning profiles, APNs private keys or Firebase service credentials to this repository.
