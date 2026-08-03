// Add this idea to a native Capacitor iOS plugin.
// The alternate icon names must also be configured in the Xcode project.
@objc func setAppIcon(_ call: CAPPluginCall) {
    let name = call.getString("name")
    DispatchQueue.main.async {
        UIApplication.shared.setAlternateIconName(name == "classic" ? nil : name) { error in
            if let error = error { call.reject(error.localizedDescription) }
            else { call.resolve(["changed": true]) }
        }
    }
}
