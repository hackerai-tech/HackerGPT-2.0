import { FC, useState } from "react"
import { Button } from "../../ui/button"
import { Label } from "../../ui/label"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export const SecurityTab: FC = () => {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogoutAllDevices = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut({ scope: "global" })
      router.push("/login")
      router.refresh()
      toast.success("Logged out of all devices")
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Failed to log out of all devices")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Label htmlFor="logoutAllDevices">Log out of all devices</Label>
          <p className="text-muted-foreground max-w-[90%] text-sm">
            Log out of all active sessions across all devices, including your
            current session. It may take up to 30 minutes for other devices to
            be logged out.
          </p>
        </div>
        <Button
          id="logoutAllDevices"
          variant="destructive"
          onClick={handleLogoutAllDevices}
          disabled={isLoggingOut}
          aria-label="Log out of all devices"
        >
          {isLoggingOut ? "Logging out..." : "Log out all"}
        </Button>
      </div>
    </div>
  )
}
