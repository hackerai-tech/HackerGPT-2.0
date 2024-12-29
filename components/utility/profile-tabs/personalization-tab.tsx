import { FC } from "react"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { LimitDisplay } from "@/components/ui/limit-display"
import { PROFILE_CONTEXT_MAX } from "@/db/limits"
import { Button } from "@/components/ui/button"

interface PersonalizationTabProps {
  profileInstructions: string
  setProfileInstructions: (value: string) => void
  onSave: () => void
  isMobile: boolean
}

export const PersonalizationTab: FC<PersonalizationTabProps> = ({
  profileInstructions,
  setProfileInstructions,
  onSave,
  isMobile
}) => {
  const isOverLimit = profileInstructions.length > PROFILE_CONTEXT_MAX

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="mb-4">
          <Label className="text-sm">
            What would you like PentestGPT to know about you to provide better
            responses?
          </Label>
        </div>

        <TextareaAutosize
          value={profileInstructions}
          onValueChange={setProfileInstructions}
          placeholder="Profile context..."
          minRows={6}
          maxRows={10}
          className={`${isOverLimit ? "border-red-500" : ""} bg-secondary`}
        />

        <LimitDisplay
          used={profileInstructions.length}
          limit={PROFILE_CONTEXT_MAX}
          isOverLimit={isOverLimit}
        />
      </div>

      {isMobile && (
        <div className="flex justify-end">
          <Button onClick={onSave}>Save</Button>
        </div>
      )}
    </div>
  )
}
