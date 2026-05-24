import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetSyncPlugin"
    public let jsName = "WidgetSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveNews", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveNews(_ call: CAPPluginCall) {
        guard let payload = call.getObject("payload") else {
            call.reject("Missing payload")
            return
        }

        WidgetDataStore.save(payload)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
