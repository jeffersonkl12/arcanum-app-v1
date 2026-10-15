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
{{#if currentPlace.inside.length}}

Already registered inside it, at any depth:

{{#each currentPlace.inside}}
{{this}}
{{/each}}
{{/if}}
{{/if}}
