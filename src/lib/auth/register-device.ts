import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";
import { createClient } from "@/lib/supabase/client";

export interface RegisteredDevice {
  id: string;
  device_id: string;
  device_name: string | null;
  os: string;
  last_seen: string;
}

export type RegisterResult =
  | { kind: "success"; isNew: boolean; plan: string }
  | { kind: "skipped"; reason: string }
  | {
      kind: "limit_reached";
      currentDeviceId: string;
      devices: RegisteredDevice[];
      plan: string;
      limit: number;
    }
  | { kind: "error"; message: string };

interface DeviceInfoFromTauri {
  device_id: string;
  device_name: string | null;
  os: string;
  os_version: string | null;
  app_version: string;
  hostname: string | null;
}

/**
 * Register the current device with the cloud `register_device` RPC.
 *
 * Behaviour:
 *   - When not running in Tauri (e.g. Vercel preview), returns "skipped".
 *   - When the user isn't signed in, returns "skipped".
 *   - When the cloud RPC isn't deployed yet (PostgrestError 42883
 *     "function not found"), returns "skipped" so the desktop app
 *     keeps working in pre-migration environments.
 *   - When the RPC returns `device_limit_reached`, surfaces the device
 *     list so the caller can render `<DeviceLimitModal>`.
 */
export async function registerDevice(): Promise<RegisterResult> {
  if (!isTauri()) {
    return { kind: "skipped", reason: "not_tauri" };
  }

  let info: DeviceInfoFromTauri;
  try {
    info = await invoke<DeviceInfoFromTauri>("get_device_info");
  } catch (e) {
    return { kind: "error", message: `device_info: ${e}` };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { kind: "skipped", reason: "no_session" };
  }

  const locale =
    typeof navigator !== "undefined" ? navigator.language : null;
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;

  const { data, error } = await supabase.rpc("register_device", {
    p_device_id: info.device_id,
    p_device_name: info.device_name,
    p_os: info.os,
    p_os_version: info.os_version,
    p_app_version: info.app_version,
    p_locale: locale,
    p_timezone: timezone,
    p_hostname: info.hostname,
  });

  if (error) {
    // 42883 = function does not exist. Lets the app boot before the
    // migration is applied.
    if (error.code === "42883" || /function .* does not exist/i.test(error.message)) {
      return { kind: "skipped", reason: "rpc_not_deployed" };
    }
    return { kind: "error", message: error.message };
  }

  if (!data) {
    return { kind: "error", message: "empty_response" };
  }

  if (data.success) {
    return { kind: "success", isNew: !!data.is_new, plan: data.plan };
  }

  if (data.error === "device_limit_reached") {
    return {
      kind: "limit_reached",
      currentDeviceId: info.device_id,
      devices: data.devices ?? [],
      plan: data.plan ?? "free",
      limit: data.limit ?? 1,
    };
  }

  return { kind: "error", message: data.error ?? "unknown" };
}

export async function revokeRemoteDevice(deviceId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("revoke_device", {
    p_device_id: deviceId,
  });
  if (error) return { success: false, message: error.message };
  if (!data?.success) {
    return { success: false, message: data?.error ?? "unknown" };
  }
  return { success: true };
}
