import { PentestGPTContext } from "@/context/context"
import { deleteAllChats } from "@/db/chats"
import { PROFILE_CONTEXT_MAX } from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { supabase } from "@/lib/supabase/browser-client"
import {
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels
} from "@headlessui/react"
import {
  IconCreditCard,
  IconDatabaseCog,
  IconSettings,
  IconShield,
  IconUserHeart,
  IconUsers,
  IconX
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { MultiStepDeleteAccountDialog } from "./mfa/mutil-step-deletion"
import { TransitionedDialog } from "../ui/transitioned-dialog"
import { DeleteDialog } from "./delete-all-chats-dialog"
import { DataControlsTab } from "./profile-tabs/data-controls-tab"
import { PersonalizationTab } from "./profile-tabs/personalization-tab"
import { ProfileTab } from "./profile-tabs/profile-tab"
import { SecurityTab } from "./profile-tabs/security-tab"
import { SubscriptionTab } from "./profile-tabs/subscription-tab"
import { TeamTab } from "./profile-tabs/team-tab"
import { TeamRole } from "@/lib/team-utils"
import { cancelSubscription, getStripe } from "@/lib/server/stripe"
import { ProfileButton } from "../ui/profile-button"
import { useUIContext } from "@/context/ui-context"

export const Settings: FC<{ showEmail?: boolean }> = ({
  showEmail = false
}) => {
  const { user, subscription, profile, setProfile, membershipData, userEmail } =
    useContext(PentestGPTContext)
  const { isMobile } = useUIContext()

  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )
  const [showDeleteAccountConfirmation, setShowDeleteAccountConfirmation] =
    useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" })
    router.push("/login")
    router.refresh()
  }

  const handleSave = async () => {
    if (!profile) return

    const isOverLimit = profileInstructions.length > PROFILE_CONTEXT_MAX
    if (isOverLimit) {
      toast.error(
        `Profile instructions exceed the limit of ${PROFILE_CONTEXT_MAX} characters.`
      )
      return
    }

    const updatedProfile = await updateProfile(profile.id, {
      ...profile,
      profile_context: profileInstructions
    })

    setProfile(updatedProfile)
    toast.success("Profile updated!", { duration: 2000 })
    setIsOpen(false)
  }

  const handleDeleteAllChats = () => {
    setIsOpen(false)
    setShowConfirmationDialog(true)
  }

  const handleConfirm = async () => {
    setShowConfirmationDialog(false)
    const deleted = await deleteAllChats(profile?.user_id || "")
    if (deleted) {
      window.location.reload()
    } else {
      toast.error("Failed to delete all chats")
    }
  }

  const handleDeleteAccount = () => {
    setIsOpen(false)
    setShowDeleteAccountConfirmation(true)
  }

  const handleConfirmDeleteAccount = async () => {
    if (!user?.id) {
      console.error("User ID not found", user)
      toast.error("Failed to delete account")
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase.rpc("delete_user", {
        sel_user_id: user.id
      })

      if (error) {
        toast.error("Failed to delete account")
        setIsDeleting(false)
        return
      }

      if (subscription?.id && subscription.status === "active") {
        const stripe = getStripe()
        await cancelSubscription(stripe, subscription.id)
      }

      await handleSignOut()
    } catch (error) {
      toast.error("Failed to delete account")
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirmationDialog(false)
    setIsOpen(true)
  }

  const handleCancelDeleteAccount = () => {
    setShowDeleteAccountConfirmation(false)
    setIsOpen(true)
  }

  const tabItems = [
    { value: "profile", icon: IconSettings, label: "General" },
    { value: "personalization", icon: IconUserHeart, label: "Personalization" },
    { value: "subscription", icon: IconCreditCard, label: "Subscription" },
    { value: "data-controls", icon: IconDatabaseCog, label: "Data Controls" },
    { value: "security", icon: IconShield, label: "Security" },
    { value: "team", icon: IconUsers, label: "Team" }
  ].filter(tab => {
    if (tab.value === "subscription") {
      return !membershipData || membershipData?.member_role === TeamRole.OWNER
    }

    if (tab.value === "team") {
      return membershipData && membershipData?.invitation_status === "accepted"
    }

    return true
  })

  if (!profile) return null

  return (
    <>
      <ProfileButton
        imageUrl={profile?.image_url}
        onClick={() => setIsOpen(true)}
        userEmail={userEmail}
        showEmail={showEmail}
      />

      <TransitionedDialog isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <DialogPanel
          className={`
          bg-popover overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all
          ${isMobile ? "" : "w-full max-w-3xl md:min-w-[700px]"}
          max-h-[90vh] overflow-y-auto
        `}
        >
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-xl font-medium leading-6">
              Settings
            </DialogTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-muted rounded-full p-2 transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>

          <TabGroup onChange={index => setActiveTab(tabItems[index].value)}>
            <div className={`${isMobile ? "flex flex-col" : "flex"}`}>
              <TabList
                className={`${
                  isMobile
                    ? "mb-2 flex flex-wrap gap-2"
                    : "mr-8 w-1/4 space-y-2"
                }`}
              >
                {tabItems.map(({ value, icon: Icon, label }) => (
                  <Tab
                    key={value}
                    className={({ selected }) => `
                      ${isMobile ? "flex-shrink flex-grow-0 min-w-0" : "w-full justify-start"}
                      flex items-center whitespace-nowrap px-2 py-2 rounded
                      ${selected ? "bg-secondary text-primary" : "text-primary hover:bg-secondary/50"}
                    `}
                  >
                    <Icon className="mr-2" size={20} />
                    {label}
                  </Tab>
                ))}
              </TabList>

              <TabPanels
                className={`${isMobile ? "mt-2" : ""} mb-4 min-h-[300px] w-full`}
              >
                <TabPanel>
                  <ProfileTab
                    handleDeleteAllChats={handleDeleteAllChats}
                    handleSignOut={handleSignOut}
                  />
                </TabPanel>
                <TabPanel>
                  <PersonalizationTab
                    profileInstructions={profileInstructions}
                    setProfileInstructions={setProfileInstructions}
                    onSave={handleSave}
                    isMobile={isMobile}
                  />
                </TabPanel>
                <TabPanel>
                  <SubscriptionTab userEmail={userEmail} isMobile={isMobile} />
                </TabPanel>
                <TabPanel>
                  <DataControlsTab
                    onDeleteAccount={handleDeleteAccount}
                    isDeleting={isDeleting}
                  />
                </TabPanel>
                <TabPanel>
                  <SecurityTab />
                </TabPanel>
                {membershipData &&
                  membershipData?.invitation_status === "accepted" && (
                    <TabPanel>
                      <TeamTab />
                    </TabPanel>
                  )}
              </TabPanels>
            </div>
          </TabGroup>

          {!isMobile && (
            <div className="mt-6 flex h-[38px] items-center justify-end">
              {activeTab === "personalization" && (
                <Button onClick={handleSave}>Save</Button>
              )}
            </div>
          )}
        </DialogPanel>
      </TransitionedDialog>

      <DeleteDialog
        isOpen={showConfirmationDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirm}
        title="Delete All Chats"
        message="Are you sure you want to delete all chats? This action cannot be undone."
        confirmButtonText="Delete All"
      />

      <MultiStepDeleteAccountDialog
        isOpen={showDeleteAccountConfirmation}
        onClose={handleCancelDeleteAccount}
        onConfirm={handleConfirmDeleteAccount}
        userEmail={userEmail}
        isDeleting={isDeleting}
      />
    </>
  )
}
