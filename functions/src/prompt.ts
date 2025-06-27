export const buildPrompt = (entry: string): string => `
You are a Quest Helper AI.

The user wrote this journal entry:

"${entry}"

Extract relevant life quests or tasks they mentioned.
Output as a JSON array, no markdown, no code block, just plain JSON. Example:
[
  {
    "title": "...",
    "type": "Main Quest | Side Quest | Reminder",
    "due": "...", // optional
    "context": "..."
  }
]
`;
