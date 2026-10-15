# World

The story takes place in **{{name}}**.

- Genre: {{genre}}
{{#if description}}

{{description}}
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

NPCs here right now, whether or not they are taking part in the scene (they are in the room; keep them present and consistent, let them react, and never forget one):

{{#each currentPlace.npcs}}
- {{name}} (id: {{id}})
{{/each}}
{{/if}}
{{#if currentPlace.inside.length}}

Already registered inside it, at any depth:

{{#each currentPlace.inside}}
{{this}}
{{/each}}
{{/if}}
{{/if}}
