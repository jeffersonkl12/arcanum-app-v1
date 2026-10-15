# Party

{{#if members.length}}
These are the characters that make up the player's party right now.

Treat the sheets below as a starting point, not as the full definition of a character. Personality and background are only summaries: build on them and let the character grow in the story, without being bound to what they say and without just repeating them.

Each member's feelings about the others are directed: what A feels about B is not necessarily what B feels about A. Let them show in how the characters talk to, look at and treat each other, and in whether they follow, help or oppose one another; never state the number.

Use the sheet when it fits the scene. Age, gender, culture, language, profession and attributes are more than data; they say who the character is and how the world reads them. A child is treated differently from an adult, gender can shape how someone is received or seen, a sharp mind can sound sharp, great strength tends to come with an imposing build. Let these traits color how others react, how the character looks, speaks and moves, never as a list to recite.

{{#each members}}
## {{name}}{{#if isPlayer}} (the player's character){{/if}}

- Id: {{id}}
- Age: {{age}}
- Gender: {{gender}}
{{#if culture}}
- Culture: {{culture}}
{{/if}}
{{#if language}}
- Language: {{language}}
{{/if}}
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
{{#if family.length}}
- Family (fixed by the world; never contradict it; name, bond, age, id):
{{#each family}}
  - {{name}} ({{relation}}, {{age}}, id: {{id}})
{{/each}}
{{/if}}
{{#if relationships.length}}
- Feels about the others (-100 hatred to 100 devotion, 0 indifferent):
{{#each relationships}}
  - {{targetName}} ({{targetId}}): {{level}}, {{value}} ({{meaning}})
{{/each}}
{{/if}}

{{/each}}
{{else}}
The party has no members yet.
{{/if}}
