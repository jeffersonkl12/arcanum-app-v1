# Party

{{#if members.length}}
These are the characters that make up the player's party right now.

Treat the sheets below as a starting point, not as the full definition of a character. Personality and background are only summaries: build on them and let the character grow in the story, without being bound to what they say and without just repeating them.

Use the sheet when it fits the scene. Age, gender, race, profession and attributes are more than data; they say who the character is and how the world reads them. A child is treated differently from an adult, gender can shape how someone is received or seen, a sharp mind can sound sharp, great strength tends to come with an imposing build. Let these traits color how others react, how the character looks, speaks and moves, never as a list to recite.

{{#each members}}
## {{name}}{{#if isPlayer}} (the player's character){{/if}}

- Id: {{id}}
- Age: {{age}}
- Gender: {{gender}}
- Health: {{hpCurrent}} of {{hpMax}} hit points
- Attributes (d6 rolled in a check; 4 is an average person): strength {{strength}} ({{strengthLevel}}), dexterity {{dexterity}} ({{dexterityLevel}}), intelligence {{intelligence}} ({{intelligenceLevel}})
- Money: {{goldPieces}} gold pieces, {{silverPieces}} silver pieces, {{bronzePieces}} bronze pieces
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
- Equipped: {{#if equipped.length}}{{#each equipped}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}nothing{{/if}}
{{#if carried.length}}
- Carrying: {{#each carried}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{/each}}
{{else}}
The party has no members yet.
{{/if}}
