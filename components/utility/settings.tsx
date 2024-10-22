import { PentestGPTContext } from "@/context/context"
import { deleteAllChats } from "@/db/chats"
import { PROFILE_CONTEXT_MAX } from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { LLM_LIST_MAP } from "@/lib/models/llm/llm-list"
import { supabase } from "@/lib/supabase/browser-client"
import { TeamRole } from "@/lib/team-utils"
import {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  DialogPanel,
  DialogTitle
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
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FC, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Button } from "../ui/button"
import { TransitionedDialog } from "../ui/transitioned-dialog"
import { DeleteAllChatsDialog } from "./delete-all-chats-dialog"
import { DataControlsTab } from "./profile-tabs/data-controls-tab"
import { PersonalizationTab } from "./profile-tabs/personalization-tab"
import { ProfileTab } from "./profile-tabs/profile-tab"
import { SubscriptionTab } from "./profile-tabs/subscription-tab"
import { TeamTab } from "./profile-tabs/team-tab"
import { SecurityTab } from "./profile-tabs/security-tab"

export const Settings: FC = () => {
  const {
    profile,
    setProfile,
    envKeyMap,
    setAvailableHostedModels,
    isMobile,
    membershipData
  } = useContext(PentestGPTContext)

  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const fetchUserEmail = async () => {
      const user = await supabase.auth.getUser()
      setUserEmail(user?.data.user?.email || "Not available")
    }
    fetchUserEmail()
  }, [])

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

    const providers = ["openai", "mistral", "openrouter"]

    providers.forEach(async provider => {
      let providerKey: keyof typeof profile =
        `${provider}_api_key` as keyof typeof profile

      const models = LLM_LIST_MAP[provider]
      const envKeyActive = envKeyMap[provider]

      if (!envKeyActive) {
        const hasApiKey = !!updatedProfile[providerKey]

        if (hasApiKey && Array.isArray(models)) {
          setAvailableHostedModels(prev => {
            const newModels = models.filter(
              model =>
                !prev.some(prevModel => prevModel.modelId === model.modelId)
            )
            return [...prev, ...newModels]
          })
        } else if (!hasApiKey && Array.isArray(models)) {
          setAvailableHostedModels(prev =>
            prev.filter(model => !models.includes(model))
          )
        }
      }
    })

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

  const handleCancelDelete = () => {
    setShowConfirmationDialog(false)
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
      <button onClick={() => setIsOpen(true)}>
        {profile.image_url ? (
          <Image
            className="mt-2 size-[34px] cursor-pointer rounded hover:opacity-50"
            src={profile.image_url + "?" + new Date().getTime()}
            height={34}
            width={34}
            alt="Profile"
          />
        ) : (
          <IconSettings size={SIDEBAR_ICON_SIZE} />
        )}
      </button>

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
                  />
                </TabPanel>
                <TabPanel>
                  <SubscriptionTab userEmail={userEmail} isMobile={isMobile} />
                </TabPanel>
                <TabPanel>
                  <DataControlsTab />
                </TabPanel>
                <TabPanel>
                  <SecurityTab />
                </TabPanel>
                {membershipData &&
                  membershipData?.invitation_status === "accepted" && (
                    <TabPanel>
                      <TeamTab isMobile={isMobile} />
                    </TabPanel>
                  )}
              </TabPanels>
            </div>
          </TabGroup>

          <div className="mt-6 flex h-[38px] items-center justify-end">
            {activeTab === "personalization" && (
              <Button onClick={handleSave}>Save</Button>
            )}
          </div>
        </DialogPanel>
      </TransitionedDialog>

      <DeleteAllChatsDialog
        isOpen={showConfirmationDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirm}
      />
    </>
  )
}
