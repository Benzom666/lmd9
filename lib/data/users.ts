import { supabase } from "@/lib/supabase"
import { logError } from "@/lib/error-handler"

/**
 * Fetches a list of drivers associated with a specific admin.
 * @param adminId - The UUID of the admin user.
 * @returns A promise that resolves to an array of driver objects.
 */
export async function getDrivers(adminId: string) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, user_id")
      .eq("role", "driver")
      .eq("admin_id", adminId)

    if (error) throw error

    const driverList = (data || []).map((driver) => ({
      id: driver.user_id,
      name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Unknown Driver",
    }))

    return driverList
  } catch (error) {
    logError(error, { context: "getDrivers", adminId })
    return []
  }
}
