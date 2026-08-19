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

        loadBundledApp(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    private func loadBundledApp(in webView: WKWebView) {
        guard
            let webRoot = Bundle.main.resourceURL?.appendingPathComponent("WebApp", isDirectory: true),
            let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebApp")
        else {
            webView.loadHTMLString(Self.missingBundleHTML, baseURL: nil)
            return
        }

        webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
    }

    private static let missingBundleHTML = """
    <!doctype html>
    <html lang="de">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#eef4f4;color:#17353c;padding:32px;line-height:1.5}
        .card{max-width:640px;margin:80px auto;background:#fff;border-radius:20px;padding:24px;border:1px solid #d5e1e2}
      </style>
    </head>
    <body><div class="card"><h1>Web-App nicht gefunden</h1><p>Die WebApp-Ressourcen wurden beim Xcode-Build nicht in das App-Bundle kopiert. Bitte den Build-Log der Phase „Bundle Web App“ prüfen.</p></div></body>
    </html>
    """

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if Self.shouldOpenExternally(url) {
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

            if Self.shouldOpenExternally(url) {
                UIApplication.shared.open(url)
            } else {
                webView.load(navigationAction.request)
            }
            return nil
        }

        private static func shouldOpenExternally(_ url: URL) -> Bool {
            guard let scheme = url.scheme?.lowercased() else { return false }
            return ["mailto", "tel", "sms", "maps"].contains(scheme)
        }
    }
}
