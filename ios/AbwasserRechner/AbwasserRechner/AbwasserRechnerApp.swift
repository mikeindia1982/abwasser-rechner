import SwiftUI

@main
struct AbwasserRechnerApp: App {
    var body: some Scene {
        WindowGroup {
            WebAppView()
                .ignoresSafeArea(.container, edges: .bottom)
        }
    }
}
