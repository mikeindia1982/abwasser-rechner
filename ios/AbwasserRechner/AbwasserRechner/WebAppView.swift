import SwiftUI
import WebKit
import UIKit

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
            server.start { [weak webView] result in
                DispatchQueue.main.async {
                    guard let webView else { return }
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
