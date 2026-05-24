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
        if let jsonString = call.getString("payloadJson"), !jsonString.isEmpty {
            WidgetDataStore.save(jsonString: jsonString)
        } else if let payload = call.getObject("payload") {
            WidgetDataStore.save(payload)
        } else {
            call.reject("Missing payload")
            return
        }

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["saved": true])
    }
}
