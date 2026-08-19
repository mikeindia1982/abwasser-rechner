import SwiftUI
import WebKit
import UIKit
import Network

struct WebAppView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 238.0 / 255.0, green: 244.0 / 255.0, blue: 244.0 / 255.0, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor

        context.coordinator.loadBundledApp(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private var server: LocalWebServer?

        deinit {
            server?.stop()
        }

        func loadBundledApp(in webView: WKWebView) {
            guard let webRoot = Bundle.main.resourceURL?.appendingPathComponent("WebApp", isDirectory: true) else {
                showError("Die WebApp-Ressourcen wurden nicht im App-Bundle gefunden.", in: webView)
                return
            }

            let server = LocalWebServer(rootURL: webRoot)
            self.server = server
            server.start { [weak self, weak webView] result in
                DispatchQueue.main.async {
                    guard let self, let webView else { return }
                    switch result {
                    case .success(let baseURL):
                        webView.load(URLRequest(url: baseURL.appendingPathComponent("index.html")))
                    case .failure(let error):
                        self.showError(error.localizedDescription, in: webView)
                    }
                }
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if Self.isSystemURL(url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            guard navigationAction.targetFrame == nil,
                  let url = navigationAction.request.url else {
                return nil
            }

            if Self.isSystemURL(url) || Self.isExternalWebURL(url) {
                UIApplication.shared.open(url)
            } else {
                webView.load(navigationAction.request)
            }
            return nil
        }

        private func showError(_ message: String, in webView: WKWebView) {
            let safeMessage = message
                .replacingOccurrences(of: "&", with: "&amp;")
                .replacingOccurrences(of: "<", with: "&lt;")
                .replacingOccurrences(of: ">", with: "&gt;")
            let html = """
            <!doctype html>
            <html lang="de">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#eef4f4;color:#17353c;padding:32px;line-height:1.5}
                .card{max-width:640px;margin:80px auto;background:#fff;border-radius:20px;padding:24px;border:1px solid #d5e1e2}
              </style>
            </head>
            <body><div class="card"><h1>Abwasser Rechner konnte nicht gestartet werden</h1><p>\(safeMessage)</p><p>Bitte in Xcode den Build-Log der Phase „Bundle Web App“ prüfen.</p></div></body>
            </html>
            """
            webView.loadHTMLString(html, baseURL: nil)
        }

        private static func isSystemURL(_ url: URL) -> Bool {
            guard let scheme = url.scheme?.lowercased() else { return false }
            return ["mailto", "tel", "sms", "maps"].contains(scheme)
        }

        private static func isExternalWebURL(_ url: URL) -> Bool {
            guard let scheme = url.scheme?.lowercased() else { return false }
            return scheme == "http" || scheme == "https"
        }
    }
}

private final class LocalWebServer {
    enum ServerError: LocalizedError {
        case listenerFailed(String)

        var errorDescription: String? {
            switch self {
            case .listenerFailed(let message):
                return "Lokaler Webserver konnte nicht gestartet werden: \(message)"
            }
        }
    }

    static let port: NWEndpoint.Port = 43821
    static let baseURL = URL(string: "http://127.0.0.1:\(port.rawValue)/")!

    private let rootURL: URL
    private let queue = DispatchQueue(label: "de.abwasserrechner.local-web-server")
    private var listener: NWListener?
    private var didCompleteStart = false

    init(rootURL: URL) {
        self.rootURL = rootURL.standardizedFileURL
    }

    deinit {
        stop()
    }

    func start(completion: @escaping (Result<URL, Error>) -> Void) {
        do {
            let listener = try NWListener(using: .tcp, on: Self.port)
            self.listener = listener

            listener.stateUpdateHandler = { [weak self] state in
                guard let self else { return }
                switch state {
                case .ready:
                    guard !self.didCompleteStart else { return }
                    self.didCompleteStart = true
                    completion(.success(Self.baseURL))
                case .failed(let error):
                    guard !self.didCompleteStart else { return }
                    self.didCompleteStart = true
                    completion(.failure(ServerError.listenerFailed(error.localizedDescription)))
                default:
                    break
                }
            }

            listener.newConnectionHandler = { [weak self] connection in
                self?.handle(connection)
            }
            listener.start(queue: queue)
        } catch {
            completion(.failure(error))
        }
    }

    func stop() {
        listener?.cancel()
        listener = nil
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        receiveRequest(on: connection, buffer: Data())
    }

    private func receiveRequest(on connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
            guard let self else {
                connection.cancel()
                return
            }

            if let error {
                self.send(status: "500 Internal Server Error", body: Data(error.localizedDescription.utf8), contentType: "text/plain; charset=utf-8", on: connection)
                return
            }

            var nextBuffer = buffer
            if let data {
                nextBuffer.append(data)
            }

            if nextBuffer.range(of: Data("\r\n\r\n".utf8)) != nil || isComplete {
                self.respond(to: nextBuffer, on: connection)
            } else if nextBuffer.count < 256 * 1024 {
                self.receiveRequest(on: connection, buffer: nextBuffer)
            } else {
                self.send(status: "413 Payload Too Large", body: Data(), contentType: "text/plain", on: connection)
            }
        }
    }

    private func respond(to requestData: Data, on connection: NWConnection) {
        guard let request = String(data: requestData, encoding: .utf8),
              let firstLine = request.components(separatedBy: "\r\n").first else {
            send(status: "400 Bad Request", body: Data(), contentType: "text/plain", on: connection)
            return
        }

        let parts = firstLine.split(separator: " ")
        guard parts.count >= 2, parts[0] == "GET" || parts[0] == "HEAD" else {
            send(status: "405 Method Not Allowed", body: Data(), contentType: "text/plain", on: connection)
            return
        }

        let method = String(parts[0])
        let target = String(parts[1])
        guard let fileURL = resolve(target: target) else {
            send(status: "400 Bad Request", body: Data(), contentType: "text/plain", on: connection)
            return
        }

        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: fileURL.path, isDirectory: &isDirectory), !isDirectory.boolValue else {
            send(status: "404 Not Found", body: Data("Not found".utf8), contentType: "text/plain; charset=utf-8", on: connection)
            return
        }

        do {
            let fileData = try Data(contentsOf: fileURL)
            let body = method == "HEAD" ? Data() : fileData
            send(
                status: "200 OK",
                body: body,
                contentType: mimeType(for: fileURL.pathExtension),
                contentLength: fileData.count,
                cacheControl: fileURL.lastPathComponent == "service-worker.js" ? "no-cache" : "public, max-age=3600",
                on: connection
            )
        } catch {
            send(status: "500 Internal Server Error", body: Data(error.localizedDescription.utf8), contentType: "text/plain; charset=utf-8", on: connection)
        }
    }

    private func resolve(target: String) -> URL? {
        let pathOnly = target.split(separator: "?", maxSplits: 1).first.map(String.init) ?? "/"
        let decoded = pathOnly.removingPercentEncoding ?? pathOnly
        let requested = decoded == "/" ? "index.html" : String(decoded.drop(while: { $0 == "/" }))
        let components = requested.split(separator: "/").map(String.init)

        guard !components.isEmpty,
              !components.contains(".."),
              !components.contains(".") else {
            return nil
        }

        var url = rootURL
        for component in components {
            url.appendPathComponent(component)
        }

        let standardized = url.standardizedFileURL
        guard standardized.path.hasPrefix(rootURL.path) else { return nil }
        return standardized
    }

    private func send(
        status: String,
        body: Data,
        contentType: String,
        contentLength: Int? = nil,
        cacheControl: String = "no-cache",
        on connection: NWConnection
    ) {
        let length = contentLength ?? body.count
        let header = "HTTP/1.1 \(status)\r\nContent-Type: \(contentType)\r\nContent-Length: \(length)\r\nCache-Control: \(cacheControl)\r\nConnection: close\r\n\r\n"
        var response = Data(header.utf8)
        response.append(body)
        connection.send(content: response, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private func mimeType(for extensionValue: String) -> String {
        switch extensionValue.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "json", "webmanifest": return "application/json; charset=utf-8"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "svg": return "image/svg+xml"
        case "pdf": return "application/pdf"
        case "txt", "md": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}
