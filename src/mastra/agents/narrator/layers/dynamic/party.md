# Party

{{#if members.length}}
These are the characters that make up the player's party right now.

{{#each members}}
## {{name}}{{#if isPlayer}} (the player's character){{/if}}

- Age: {{age}}
- Gender: {{gender}}
- Health: {{hpCurrent}} of {{hpMax}} hit points
- Attributes: strength {{strength}}, dexterity {{dexterity}}, intelligence {{intelligence}}
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
