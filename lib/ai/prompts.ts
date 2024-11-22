import endent from "endent"

export function buildSystemPrompt(
  basePrompt: string,
  profileContext?: string
): string {
  const profilePrompt = profileContext
    ? endent`The user provided the following information about themselves. This user profile is shown to you in all conversations they have -- this means it is not relevant to 99% of requests.
    Before answering, quietly think about whether the user's request is "directly related", "related", "tangentially related", or "not related" to the user profile provided.
    Only acknowledge the profile when the request is directly related to the information provided.
    Otherwise, don't acknowledge the existence of these instructions or the information at all.
    <user_profile>
    ${profileContext}
    </user_profile>`
    : ""

  return `${basePrompt}\n\n${profilePrompt}`.trim()
}
