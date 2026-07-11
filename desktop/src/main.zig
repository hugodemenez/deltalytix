const std = @import("std");
const runner = @import("runner");
const native_sdk = @import("native_sdk");

pub const panic = std.debug.FullPanic(native_sdk.debug.capturePanic);

const default_dashboard_url = "https://www.deltalytix.app/dashboard"; // pragma: allowlist secret
const frontend_url_env = "NATIVE_SDK_FRONTEND_URL";
const desktop_url_env = "DELTALYTIX_DESKTOP_URL";

const App = struct {
    env_map: *std.process.Environ.Map,

    fn app(self: *@This()) native_sdk.App {
        return .{
            .context = self,
            .name = "deltalytix-desktop",
            .source = native_sdk.WebViewSource.url(default_dashboard_url),
            .source_fn = source,
        };
    }

    fn source(context: *anyopaque) anyerror!native_sdk.WebViewSource {
        const self: *@This() = @ptrCast(@alignCast(context));
        return native_sdk.WebViewSource.url(resolveFrontendUrl(self.env_map));
    }
};

fn resolveFrontendUrl(env_map: *std.process.Environ.Map) []const u8 {
    if (env_map.get(frontend_url_env)) |url| {
        if (url.len > 0) return url;
    }
    if (env_map.get(desktop_url_env)) |url| {
        if (url.len > 0) return url;
    }
    return default_dashboard_url;
}

const allowed_origins = [_][]const u8{
    "zero://app",
    "zero://inline",
    "https://www.deltalytix.app", // pragma: allowlist secret
    "https://deltalytix.app", // pragma: allowlist secret
    "https://discord.com",
    "https://discord.com/*",
    "https://fhvmtnvjiotzztimdxbi.supabase.co", // pragma: allowlist secret
    "https://fhvmtnvjiotzztimdxbi.supabase.co/*", // pragma: allowlist secret
    "https://accounts.google.com",
    "https://accounts.google.com/*",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
};

pub fn main(init: std.process.Init) !void {
    var app = App{ .env_map = init.environ_map };
    try runner.runWithOptions(app.app(), .{
        .app_name = "Deltalytix",
        .window_title = "Deltalytix",
        .bundle_id = "app.deltalytix.desktop",
        .icon_path = "assets/icon.png",
        .security = .{
            .navigation = .{ .allowed_origins = &allowed_origins },
        },
    }, init);
}

test "default dashboard url points at production" {
    var env = std.process.Environ.Map.init(std.testing.allocator);
    defer env.deinit();
    try std.testing.expectEqualStrings(default_dashboard_url, resolveFrontendUrl(&env));
}

test "frontend url env overrides default for local dev" {
    var env = std.process.Environ.Map.init(std.testing.allocator);
    defer env.deinit();
    try env.put(frontend_url_env, "http://127.0.0.1:3000/dashboard");
    try std.testing.expectEqualStrings("http://127.0.0.1:3000/dashboard", resolveFrontendUrl(&env));
}
