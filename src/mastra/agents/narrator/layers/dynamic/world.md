# World

The story takes place in **{{name}}**.

- Genre: {{genre}}
{{#if description}}

{{description}}
{{/if}}
{{#if cultures.length}}

Cultures of this world: {{#each cultures}}{{#unless @first}}, {{/unless}}{{this}}{{/each}}
{{/if}}
{{#if languages.length}}

Languages of this world: {{#each languages}}{{#unless @first}}, {{/unless}}{{this}}{{/each}}
{{/if}}
{{#if currentPlace}}

## Current location

The party is at **{{currentPlace.name}}** ({{currentPlace.type}}).
{{#if currentPlace.hasParent}}

Route, from the largest place down to here: {{#each currentPlace.path}}{{#unless @first}} > {{/unless}}{{name}} ({{type}}){{/each}}
{{/if}}
{{#if currentPlace.description}}

{{currentPlace.description}}
{{/if}}
{{#if currentPlace.npcs.length}}

NPCs relevant to this place. They are here right now, but they are not necessarily doing something, interacting with the party or needing to: they are part of the setting. Keep them present and consistent, let them react when it makes sense, and do not force them into the scene. Below is only a short sheet of each; their full story is not shown, so do not invent a past that contradicts what is written:

{{#each currentPlace.npcs}}
- {{name}} (id: {{id}}): {{age}}, {{gender}}{{#if culture}}, culture {{culture}}{{/if}}{{#if language}}, speaks {{language}}{{/if}}{{#if profession}}, {{profession}}{{/if}}
{{#if appearance}}
  - Appearance: {{appearance}}
{{/if}}
{{#if personality}}
  - Personality: {{personality}}
{{/if}}
{{#if family.length}}
  - Family (fixed by the world; name, bond, age, id):
{{#each family}}
    - {{name}} ({{relation}}, {{age}}, id: {{id}})
{{/each}}
{{/if}}
{{/each}}
{{/if}}
{{#if currentPlace.inside.length}}

Already registered inside it, at any depth:

{{#each currentPlace.inside}}
{{this}}
{{/each}}
{{/if}}
{{/if}}
