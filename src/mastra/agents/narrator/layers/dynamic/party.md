# Party

{{#if members.length}}
These are the characters that make up the player's party right now.

{{#each members}}
## {{name}}{{#if isPlayer}} (the player's character){{/if}}

- Age: {{age}}
- Gender: {{gender}}
{{#if profession}}
- Profession: {{profession}}
{{/if}}
{{#if appearance}}
- Appearance: {{appearance}}
{{/if}}
{{#if personality}}
- Personality: {{personality}}
{{/if}}
{{#if background}}
- Background: {{background}}
{{/if}}

{{/each}}
{{else}}
The party has no members yet.
{{/if}}
