import UIKit
import Capacitor
import EventKit

@objc(VTANativeIntegrationPlugin)
public class VTANativeIntegrationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VTANativeIntegrationPlugin"
    public let jsName = "VTANativeIntegration"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "calendarPermissionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestCalendarAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "upsertCalendarEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteCalendarEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise)
    ]

    private let eventStore = EKEventStore()

    private func permissionStatus() -> String {
        let status = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) {
            switch status {
            case .fullAccess: return "full"
            case .writeOnly: return "write-only"
            case .authorized: return "authorized"
            case .denied: return "denied"
            case .restricted: return "restricted"
            case .notDetermined: return "not-determined"
            @unknown default: return "unknown"
            }
        }
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "not-determined"
        default: return "unknown"
        }
    }

    private func resolvePermission(_ call: CAPPluginCall, granted: Bool? = nil) {
        call.resolve([
            "status": permissionStatus(),
            "granted": granted ?? ["full", "authorized"].contains(permissionStatus())
        ])
    }

    @objc func calendarPermissionStatus(_ call: CAPPluginCall) {
        resolvePermission(call)
    }

    @objc func requestCalendarAccess(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents { [weak self] granted, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let error {
                        call.reject("Kalenderzugriff konnte nicht angefordert werden.", "CALENDAR_PERMISSION", error)
                        return
                    }
                    self.resolvePermission(call, granted: granted)
                }
            }
        } else {
            eventStore.requestAccess(to: .event) { [weak self] granted, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let error {
                        call.reject("Kalenderzugriff konnte nicht angefordert werden.", "CALENDAR_PERMISSION", error)
                        return
                    }
                    self.resolvePermission(call, granted: granted)
                }
            }
        }
    }

    private func parseISODate(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let standard = ISO8601DateFormatter()
        standard.formatOptions = [.withInternetDateTime]
        return standard.date(from: value)
    }

    private func ensureFullAccess(_ call: CAPPluginCall) -> Bool {
        let status = permissionStatus()
        guard status == "full" || status == "authorized" else {
            call.reject("VTA Copilot benötigt vollständigen Kalenderzugriff, um Termine anzulegen, zu aktualisieren und zu löschen.", "CALENDAR_ACCESS")
            return false
        }
        return true
    }

    @objc func upsertCalendarEvent(_ call: CAPPluginCall) {
        guard ensureFullAccess(call) else { return }
        guard
            let title = call.options["title"] as? String,
            let startRaw = call.options["start"] as? String,
            let endRaw = call.options["end"] as? String,
            let startDate = parseISODate(startRaw),
            let endDate = parseISODate(endRaw),
            endDate > startDate
        else {
            call.reject("Ungültige Kalenderdaten.", "CALENDAR_DATA")
            return
        }

        let requestedIdentifier = (call.options["eventIdentifier"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let event: EKEvent
        let created: Bool
        if !requestedIdentifier.isEmpty, let existing = eventStore.event(withIdentifier: requestedIdentifier) {
            event = existing
            created = false
        } else {
            event = EKEvent(eventStore: eventStore)
            guard let calendar = eventStore.defaultCalendarForNewEvents else {
                call.reject("Auf dem iPhone ist kein Standardkalender für neue Termine verfügbar.", "CALENDAR_DEFAULT")
                return
            }
            event.calendar = calendar
            created = true
        }

        event.title = title
        event.startDate = startDate
        event.endDate = endDate
        event.location = call.options["location"] as? String
        event.notes = call.options["notes"] as? String

        let alarmValues = call.options["alarms"] as? [NSNumber] ?? []
        event.alarms = alarmValues
            .map { max(0, $0.intValue) }
            .filter { $0 > 0 }
            .map { EKAlarm(relativeOffset: TimeInterval(-$0 * 60)) }

        do {
            try eventStore.save(event, span: .thisEvent, commit: true)
            call.resolve([
                "eventIdentifier": event.eventIdentifier ?? requestedIdentifier,
                "created": created,
                "status": "saved"
            ])
        } catch {
            call.reject("Der Termin konnte nicht im iOS-Kalender gespeichert werden.", "CALENDAR_SAVE", error)
        }
    }

    @objc func deleteCalendarEvent(_ call: CAPPluginCall) {
        guard ensureFullAccess(call) else { return }
        guard let identifier = call.options["eventIdentifier"] as? String, !identifier.isEmpty else {
            call.reject("Kalender-ID fehlt.", "CALENDAR_ID")
            return
        }
        guard let event = eventStore.event(withIdentifier: identifier) else {
            call.resolve(["removed": false, "missing": true])
            return
        }
        do {
            try eventStore.remove(event, span: .thisEvent, commit: true)
            call.resolve(["removed": true])
        } catch {
            call.reject("Der Termin konnte nicht aus dem iOS-Kalender entfernt werden.", "CALENDAR_DELETE", error)
        }
    }

    @objc func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Die iOS-Einstellungen konnten nicht geöffnet werden.")
                return
            }
            UIApplication.shared.open(url, options: [:]) { success in
                call.resolve(["opened": success])
            }
        }
    }
}

class VTABridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(VTANativeIntegrationPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = VTABridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
