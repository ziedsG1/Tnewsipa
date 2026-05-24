#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetInstallPlugin, "WidgetInstall",
    CAP_PLUGIN_METHOD(showAddWidgetGuide, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getWidgetStatus, CAPPluginReturnPromise);
)
