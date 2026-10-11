# API do Arcanum: especificação técnica

> **Versão do documento:** 2026-10-10 · **Escopo:** back (processo _main_ do Electron) consumido pelo renderer Vue.
> **Fonte da verdade:** [`src/shared/ipc-contract.shared.ts`](../src/shared/ipc-contract.shared.ts). Se este documento divergir do contrato, o contrato vence. Corrija o documento.
> Regras de arquitetura (camadas, aliases, nomenclatura) ficam em [`rules.md`](./rules.md). Regras do renderer ficam em [`frontend.md`](./frontend.md). Este arquivo não as repete.

## Legenda de status

| Marca | Significado                                        |
| ----- | -------------------------------------------------- |
| ✅    | Implementado e em uso                              |
| ⚠️    | Existe, mas com limitação importante               |
| 🚧    | **Não existe ainda.** Proposta ou lacuna conhecida |

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Como consumir a API](#2-como-consumir-a-api)
3. [Envelope de resposta e erros](#3-envelope-de-resposta-e-erros)
4. [Enums e limites compartilhados](#4-enums-e-limites-compartilhados)
5. [Referência por domínio](#5-referência-por-domínio)
   - [5.1 World](#51-world) · [5.2 Culture](#52-culture) · [5.3 Language](#53-language) · [5.4 Actor](#54-actor) · [5.5 Party](#55-party) · [5.6 Imagens](#56-imagens) · [5.7 AI Setting](#57-ai-setting) · [5.8 Game Master](#58-game-master) · [5.9 Dice](#59-dice)
6. [IA: fluxo do Game Master](#6-ia-fluxo-do-game-master)
7. [Chat com OpenUI](#7-chat-com-openui)
8. [Modelo de dados](#8-modelo-de-dados)
9. [Ciclo de vida do app e dados locais](#9-ciclo-de-vida-do-app-e-dados-locais)
10. [Lacunas conhecidas](#10-lacunas-conhecidas)
11. [Apêndice](#11-apêndice)

---

## 1. Visão geral

O Arcanum é um app desktop single-player. **Não existe API HTTP.** O "back" é o processo _main_ do Electron (engine, banco, Mastra) e o renderer o consome **somente por IPC**.

```
┌──────────── Renderer (Vue) ────────────┐
│  window.api.invoke('world:get', id)    │
└───────────────────┬────────────────────┘
                    │ contextBridge (só canais do contrato)
┌───────────────────▼────────────────────┐
│ Preload  src/preload/index.ts          │  allowlist = chaves de ipcContract
└───────────────────┬────────────────────┘
                    │ ipcRenderer.invoke / ipcMain.handle
┌───────────────────▼────────────────────┐
│ Main                                   │
│  register.ipc.ts                       │  1. isTrustedSender
│    ├─ schema.parse(input)  (Zod)       │  2. valida
│    ├─ route.run(input)                 │  3. executa
│    └─ toIpcError(e)                    │  4. mapeia erro
│  Service ─► Repository ─► PGlite       │  engine + dados
│  Service ─► NarratorGateway ─► Mastra ─┼─► LLM (Google/OpenAI/Anthropic/DeepSeek)
└────────────────────────────────────────┘
```

**Princípio central:** a engine decide e calcula; a IA apenas lê o estado, chama a engine por _tools_ e narra. A IA nunca inventa nem sobrescreve estado de jogo.

| Item                              | Valor                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Transporte                        | `ipcRenderer.invoke` → `ipcMain.handle` (request/response)                                            |
| Canais                            | **38** (world 8 · culture 5 · language 5 · actor 7 · party 6 · aiSetting 4 · gameMaster 3) + 1 evento |
| Argumentos                        | **Um** por canal (use objeto quando precisar de vários valores)                                       |
| Streaming / eventos main→renderer | ✅ `gameMaster:streamTurn` + evento `gameMaster:turnEvent` (ver [§5.8](#58-game-master))              |
| Autenticação                      | Nenhuma (app local). O main só aceita frames do próprio app                                           |

---

## 2. Como consumir a API

### 2.1 Chamada básica

```ts
const res = await window.api.invoke('world:get', worldId)

if (res.ok) {
  console.log(res.data.name) // res.data é World
} else {
  console.error(res.error.kind, res.error.message)
}
```

- A entrada e a saída são **tipadas pelo canal** (`IpcInput<C>` / `IpcOutput<C>`). O compilador rejeita canal inexistente ou payload errado.
- A promise **nunca rejeita**. Sempre resolve `IpcResponse<T>`. Não use `try/catch` para erro de negócio; teste `res.ok`.
- Canais cuja entrada aceita `undefined` (`world:list`, `aiSetting:*`) têm o argumento **opcional**:

```ts
await window.api.invoke('world:list') // sem filtro
await window.api.invoke('world:list', { isTemplate: true, genres: ['horror'] })
await window.api.invoke('aiSetting:get')
```

### 2.2 Um único argumento

Update sempre usa `{ id, patch }`. Operações com dois ids usam objeto nomeado:

```ts
await window.api.invoke('actor:update', { id: actorId, patch: { profession: 'Ferreiro' } })
await window.api.invoke('party:addMember', { partyId, actorId })
```

### 2.3 Composable existente (`useRequest`)

`src/renderer/src/composable/request.composable.ts` é por onde todos os composables chamam a API:

```ts
const { isLoading, error, request, execute } = useRequest()
const world = await request('world:get', worldId) // data em caso de sucesso, undefined em erro
const deleted = await execute('actor:delete', actorId) // canais `void`: true em sucesso
```

Em erro, ele guarda o `IpcError` e mostra um toast com a mensagem **em português** (`translateIpcError`, `util/ipc-error.util.ts`; as mensagens do back são em inglês) para todo `kind`, **exceto** `invalid_input` (esse é para o formulário exibir por campo, via `issues`).

### 2.4 Tipos que o renderer pode importar

Só `import type` de `@schema` / `@shared` (apagados no build). O renderer nunca importa `src/main` em runtime.

---

## 3. Envelope de resposta e erros

```ts
type IpcResponse<T> = { ok: true; data: T } | { ok: false; error: IpcError }

interface IpcError {
  kind: 'invalid_input' | 'not_found' | 'conflict' | 'forbidden' | 'internal'
  message: string
  issues?: { path: string; message: string }[] // só em invalid_input
}
```

**Por que não rejeitar?** O Electron só transporta o `message` de um erro lançado e o `contextBridge` descarta propriedades customizadas. Um `reject` perderia o `kind`.

### 3.1 Tipos de erro

| `kind`          | Quem produz            | Quando                                                                                     | Como tratar na UI                             |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `invalid_input` | `ZodError` no main     | Payload fora do schema                                                                     | Mapear `issues[].path` para os campos do form |
| `not_found`     | `NotFoundError`        | `get`/`update`/`delete` de id inexistente. Mensagem: `` `Entidade "id" was not found` ``   | Toast; recarregar a lista                     |
| `conflict`      | `ConflictError`        | Violação de regra de domínio ou constraint (ver [§3.3](#33-matriz-de-conflitos))           | Toast com a mensagem (já é legível)           |
| `forbidden`     | Preload ou main        | Canal fora do contrato (`Unknown channel "x"`) ou frame não confiável (`Untrusted sender`) | Bug de integração, não é erro de usuário      |
| `internal`      | Qualquer outra exceção | Falha inesperada. Logada no main; o renderer recebe `Something went wrong`                 | Toast genérico                                |

O preload também devolve `internal` se o próprio `ipcRenderer.invoke` falhar (erro de transporte).

### 3.2 Fluxo de uma chamada

1. **Preload** confere se o canal está em `IPC_CHANNELS`. Se não, `forbidden`.
2. **Main** confere `isTrustedSender(frameUrl)`. Em dev exige a origem de `ELECTRON_RENDERER_URL`; em produção exige `file:`. Senão, `forbidden`.
3. `schema.parse(input)`. Falha vira `invalid_input`.
4. `route.run(input)` chama o serviço.
5. Qualquer exceção passa por `toIpcError`. Sucesso vira `{ ok: true, data }`.

Exemplo de `invalid_input`:

```jsonc
// window.api.invoke('world:create', { name: '   ', genre: 'banana' })
{
  "ok": false,
  "error": {
    "kind": "invalid_input",
    "message": "The data sent is invalid",
    "issues": [
      { "path": "name", "message": "Too small: expected string to have >=1 characters" },
      {
        "path": "genre",
        "message": "Invalid option: expected one of \"fantasy\"|\"high_fantasy\"|…"
      }
    ]
  }
}
```

> As mensagens de `issues` vêm do Zod v4 e estão em inglês. Quem exibe ao usuário final deve traduzir ou usar apenas o `path`.

### 3.3 Matriz de conflitos

`ConflictError` nasce de dois lugares: regras explícitas nos serviços e a tradução de erros do Postgres (`23505` unique, `23503` foreign key) em `src/main/database/error.database.ts`.

| Origem                                          | Mensagem                                                                                                                                | Quando                                                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `actor_world_id_player_unique`                  | `The world already has a player`                                                                                                        | 2º ator com `isNpc: false` no mesmo mundo (create ou update)                                          |
| `party_world_id_unique`                         | `The world already has a party`                                                                                                         | 2ª party no mesmo mundo                                                                               |
| `actor_culture_world_fk`                        | `The culture does not exist in the actor world, or is still in use`                                                                     | Cultura de outro mundo/inexistente, **ou** apagar cultura que ainda tem atores                        |
| `actor_language_world_fk`                       | `The language does not exist in the actor world, or is still in use`                                                                    | Idem para language                                                                                    |
| `actor_party_world_fk`                          | `The party does not exist in the actor world, or is still in use`                                                                       | Party de outro mundo/inexistente, **ou** apagar party que ainda tem membros                           |
| `actor_hp_max_range` / `actor_hp_current_range` | `The maximum health must be at least 1` / `The current health must be between 0 and the maximum`                                        | Vida fora da faixa (o serviço barra antes com `The current health cannot be higher than the maximum`) |
| Outro FK/unique                                 | `cause.detail` do Postgres (ex.: `Key (world_id)=… is not present in table "world".`) ou `The operation violates a data constraint`     | `worldId` inexistente em create, etc.                                                                 |
| Imagem grande                                   | `The image is too big (the limit is 5 MB)`                                                                                              | `*:setImage` com > 5 MB                                                                               |
| Imagem inválida                                 | `The file is not a PNG, JPEG, WebP or GIF image`                                                                                        | Bytes não batem com nenhum formato aceito                                                             |
| Caminho de imagem inválido                      | `"<path>" is not a valid image path`                                                                                                    | Caminho que escapa da pasta de imagens (defesa interna)                                               |
| Armazenamento seguro indisponível               | `Secure storage is not available on this system (no keyring found), so the API key cannot be saved. Set it in the environment instead.` | `aiSetting:update` com `apiKey` no Linux sem keyring                                                  |
| Chave salva ilegível                            | `The saved API key can no longer be decrypted (the system keychain changed). Save it again.`                                            | Troca de keychain do SO                                                                               |

> ⚠️ **Mensagens de FK são ambíguas de propósito.** "não existe no mundo, **ou** ainda está em uso" cobre dois casos distintos (referência inválida × apagar algo em uso). Se a UI precisar distinguir, ela deve saber o contexto da operação (estava criando/atualizando ou apagando?).

---

## 4. Enums e limites compartilhados

| Constante        | Valores                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WORLD_GENRES`   | `fantasy` `high_fantasy` `dark_fantasy` `grimdark` `medieval` `mythological` `steampunk` `cyberpunk` `sci_fi` `post_apocalyptic` `horror` `western` |
| `ACTOR_AGES`     | `baby` `child` `adolescent` `young_adult` `middle_aged` `old` `elder`                                                                               |
| `ACTOR_GENDERS`  | `male` `female`                                                                                                                                     |
| `ACTOR_HP`       | `hpMax` de 1 a 9999 · padrão ao criar: **40** (jogador) e **20** (NPC)                                                                              |
| `AI_PROVIDERS`   | `google` `openai` `anthropic` `deepseek`                                                                                                            |
| `ROLL_MODES`     | `normal` `advantage` `disadvantage` (só usado pela IA; não há IPC de rolagem)                                                                       |
| `CHECK_OUTCOMES` | `critical_failure` `failure` `success` `critical_success`                                                                                           |

| `TEXT_LIMITS` | Valor | Onde se aplica                                                                   |
| ------------- | ----- | -------------------------------------------------------------------------------- |
| `name`        | 120   | `name` de world/culture/language/actor, filtro `name`                            |
| `shortText`   | 120   | `profession`                                                                     |
| `longText`    | 5000  | `description`, `appearance`, `personality`, `background`, mensagem de `takeTurn` |

**Convenções gerais**

- Todo `id` é **UUID** (`z.uuid()`). Os ids são gerados pelo banco; o cliente nunca os envia em create.
- Strings `name` passam por `trim()` e exigem `min(1)`.
- **Chaves desconhecidas são removidas em silêncio** (`z.object` não é `strict`). Mandar `imagePath` em create/update, `sourceWorldId` em create ou `worldId` em update **não dá erro: o campo é ignorado**.
- `null` é valor válido em campos anuláveis (zera o campo). `undefined` (campo ausente) significa "não alterar" em update.
- Um `update` com patch vazio (ou só `undefined`) não faz UPDATE: devolve a linha atual.
- Nenhuma lista tem paginação. Toda `list*` devolve todas as linhas, ordenadas por `name` ascendente.
- Datas (`CampaignMessage.createdAt`) chegam como `Date` (structured clone do Electron preserva o tipo).

---

## 5. Referência por domínio

Nas tabelas de campos: **obrigatório** = sem valor padrão e não anulável; _default_ é o valor aplicado pelo banco quando o campo é omitido.

### 5.1 World

Um _mundo_ é o agregado raiz. Uma "campanha" é apenas um mundo com `isTemplate: false`; um _template_ é um mundo com `isTemplate: true` pensado para ser clonado.

#### Canais

| Canal               | Entrada                      | Saída                       | Erros possíveis                          |
| ------------------- | ---------------------------- | --------------------------- | ---------------------------------------- |
| `world:list`        | `WorldFilter \| undefined`   | `World[]` (ordem `name`)    | `invalid_input`                          |
| `world:get`         | `string` (id)                | `World`                     | `invalid_input`, `not_found`             |
| `world:create`      | `CreateWorld`                | `World`                     | `invalid_input`                          |
| `world:update`      | `{ id, patch: UpdateWorld }` | `World`                     | `invalid_input`, `not_found`             |
| `world:delete`      | `string` (id)                | `void`                      | `invalid_input`, `not_found`             |
| `world:clone`       | `CloneWorld`                 | `World` (o novo)            | `invalid_input`, `not_found`             |
| `world:setImage`    | `{ id, data }`               | `string` (novo `imagePath`) | `invalid_input`, `not_found`, `conflict` |
| `world:removeImage` | `string` (id)                | `void`                      | `invalid_input`, `not_found`             |

#### `World` (saída)

| Campo           | Tipo             | Observação                                                                |
| --------------- | ---------------- | ------------------------------------------------------------------------- |
| `id`            | `string` (uuid)  |                                                                           |
| `name`          | `string`         |                                                                           |
| `isTemplate`    | `boolean`        |                                                                           |
| `description`   | `string`         | `''` por padrão                                                           |
| `genre`         | `WorldGenre`     |                                                                           |
| `sourceWorldId` | `string \| null` | Template de origem (preenchido por `world:clone`)                         |
| `imagePath`     | `string \| null` | Relativo à pasta de imagens. Exiba com `toImageUrl` ([§5.6](#56-imagens)) |

#### `CreateWorld` (entrada)

| Campo         | Tipo         | Obrigatório | Regras / default       |
| ------------- | ------------ | ----------- | ---------------------- |
| `name`        | `string`     | sim         | trim, 1–120            |
| `genre`       | `WorldGenre` | sim         | enum                   |
| `description` | `string`     | não         | ≤ 5000. _default_ `''` |
| `isTemplate`  | `boolean`    | não         | _default_ `false`      |

`UpdateWorld` = `CreateWorld` com **todos** os campos opcionais.

#### `WorldFilter` (entrada de `world:list`)

Todos opcionais, combinados com **AND**. Campo omitido não filtra.

| Campo           | Tipo            | Semântica                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------ |
| `isTemplate`    | `boolean`       | Igualdade                                                                      |
| `name`          | `string` ≤ 120  | Contém, sem diferenciar maiúsculas (`ILIKE %…%`). `%`, `_` e `\` são escapados |
| `genres`        | `WorldGenre[]`  | Qualquer um dos gêneros. **Array vazio não filtra**                            |
| `sourceWorldId` | `string` (uuid) | Só os clones daquele template                                                  |

```ts
// Templates de terror ou fantasia sombria cujo nome contém "vale"
await window.api.invoke('world:list', {
  isTemplate: true,
  genres: ['horror', 'dark_fantasy'],
  name: 'vale'
})
```

#### `world:clone`

```ts
interface CloneWorld {
  sourceWorldId: string
  name?: string // trim, 1–120. Omitido: usa o nome do mundo de origem
}
```

**O que acontece, em ordem** (`WorldCloneService` / `WorldCloneRepository`):

1. Carrega a origem. Inexistente → `not_found` (`World "<id>"`).
2. Abre **uma transação** (tudo ou nada) e insere o novo mundo:
   - novo `id`; `isTemplate = false`; `name = name ?? origem.name`;
   - `sourceWorldId = origem.isTemplate ? origem.id : origem.sourceWorldId`. Clonar uma _campanha_ continua apontando para o **template original**.
3. Copia, com **novos ids** e `worldId` novo, nesta ordem: cultures → languages → parties → actors. Os vínculos `cultureId`/`languageId`/`partyId` dos atores são remapeados para os ids novos.
4. O jogador (`isNpc: false`) **é copiado junto**.
5. Após o commit, copia os **arquivos** de imagem (mundo e atores) com nomes novos. Falha ao copiar um arquivo é só logada e **não** falha o clone (o `imagePath` fica, mas a imagem não carrega).
6. O chat começa **do zero**: o thread do Mastra é chaveado por `worldId`, e o clone tem outro id.

```ts
const res = await window.api.invoke('world:clone', {
  sourceWorldId: templateId,
  name: 'Campanha do Vale Sombrio'
})
if (res.ok) router.push(`/game/${res.data.id}`)
```

#### Comportamento de `world:delete`

- O banco apaga em **cascata** actors, cultures, languages e party do mundo.
- Clones feitos a partir dele **sobrevivem**, com `sourceWorldId = NULL`.
- ⚠️ **Não** apaga o thread de chat do Mastra (nenhum código de limpeza existe) e **não** apaga os arquivos de imagem na hora. Os arquivos órfãos são varridos no próximo startup (`ImageSweepService`).

---

### 5.2 Culture

Cultura descritiva de um mundo (nome + texto), referenciada pelos atores.

| Canal                 | Entrada                        | Saída       | Erros                                                      |
| --------------------- | ------------------------------ | ----------- | ---------------------------------------------------------- |
| `culture:listByWorld` | `string` (worldId)             | `Culture[]` | `invalid_input`                                            |
| `culture:get`         | `string`                       | `Culture`   | `invalid_input`, `not_found`                               |
| `culture:create`      | `CreateCulture`                | `Culture`   | `invalid_input`, `conflict` (worldId inexistente)          |
| `culture:update`      | `{ id, patch: UpdateCulture }` | `Culture`   | `invalid_input`, `not_found`                               |
| `culture:delete`      | `string`                       | `void`      | `invalid_input`, `not_found`, `conflict` (em uso por ator) |

| Campo (`Culture`) | Tipo     | Criação                          | Update                  |
| ----------------- | -------- | -------------------------------- | ----------------------- |
| `id`              | uuid     | gerado                           | imutável                |
| `worldId`         | uuid     | **obrigatório**                  | **imutável** (ignorado) |
| `name`            | `string` | **obrigatório**, trim 1–120      | opcional                |
| `description`     | `string` | opcional, ≤ 5000, _default_ `''` | opcional                |

### 5.3 Language

Idêntico a Culture em canais, campos e erros (`language:listByWorld|get|create|update|delete`, tipo `Language`, `CreateLanguage`, `UpdateLanguage`). Apagar um idioma ainda usado por um ator → `conflict`.

---

### 5.4 Actor

Personagem do mundo: o **jogador** (`isNpc: false`) ou um **NPC** (`isNpc: true`).

| Canal               | Entrada                      | Saída     | Erros                                    |
| ------------------- | ---------------------------- | --------- | ---------------------------------------- |
| `actor:listByWorld` | `string` (worldId)           | `Actor[]` | `invalid_input`                          |
| `actor:get`         | `string`                     | `Actor`   | `invalid_input`, `not_found`             |
| `actor:create`      | `CreateActor`                | `Actor`   | `invalid_input`, `conflict`              |
| `actor:update`      | `{ id, patch: UpdateActor }` | `Actor`   | `invalid_input`, `not_found`, `conflict` |
| `actor:delete`      | `string`                     | `void`    | `invalid_input`, `not_found`             |
| `actor:setImage`    | `{ id, data }`               | `string`  | `invalid_input`, `not_found`, `conflict` |
| `actor:removeImage` | `string`                     | `void`    | `invalid_input`, `not_found`             |

#### `Actor` (saída) e `CreateActor` (entrada)

| Campo         | Tipo             | Em `create`                    | Observação                                         |
| ------------- | ---------------- | ------------------------------ | -------------------------------------------------- |
| `id`          | uuid             | gerado                         |                                                    |
| `worldId`     | uuid             | **obrigatório**                | Imutável: fora de `UpdateActor`                    |
| `name`        | `string`         | **obrigatório**, trim 1–120    |                                                    |
| `age`         | `ActorAge`       | **obrigatório**                |                                                    |
| `gender`      | `ActorGender`    | **obrigatório**                |                                                    |
| `cultureId`   | `uuid \| null`   | opcional                       | Deve ser do **mesmo mundo**                        |
| `languageId`  | `uuid \| null`   | opcional                       | Deve ser do **mesmo mundo**                        |
| `partyId`     | `uuid \| null`   | opcional                       | Deve ser do **mesmo mundo**                        |
| `profession`  | `string \| null` | opcional, ≤ 120                |                                                    |
| `appearance`  | `string \| null` | opcional, ≤ 5000               |                                                    |
| `personality` | `string \| null` | opcional, ≤ 5000               |                                                    |
| `background`  | `string \| null` | opcional, ≤ 5000               |                                                    |
| `hpMax`       | `number` (int)   | opcional, 1–9999               | Omitido: 40 se `isNpc: false`, senão 20            |
| `hpCurrent`   | `number` (int)   | opcional, 0–`hpMax`            | Omitido: começa com a vida cheia (`hpMax`)         |
| `isNpc`       | `boolean`        | opcional, _default_ **`true`** | `false` = jogador. **No máximo 1 por mundo**       |
| `imagePath`   | `string \| null` | **não aceito** (ignorado)      | Só muda por `actor:setImage` / `actor:removeImage` |

`UpdateActor` = `CreateActor` sem `worldId`, tudo opcional.

```ts
// Criar o jogador
await window.api.invoke('actor:create', {
  worldId,
  name: 'Aldric',
  age: 'young_adult',
  gender: 'male',
  isNpc: false,
  profession: 'Ranger'
})
```

**Regras de integridade (viram `conflict`)**

- Já existe um jogador no mundo e você cria/atualiza outro ator com `isNpc: false` → `The world already has a player`.
- `cultureId`/`languageId`/`partyId` apontando para algo de **outro mundo** ou inexistente. A garantia é do banco, por FK composta `(id, world_id)`.
- `hpCurrent` maior que `hpMax` → `The current health cannot be higher than the maximum`. No `update`, mandar só `hpMax` menor que a vida atual **baixa a vida atual junto**; mandar só `hpCurrent` é conferido contra o `hpMax` salvo. O banco repete a regra por `CHECK` (`actor_hp_max_range`, `actor_hp_current_range`).
- `worldId` inexistente → `conflict` com o `detail` cru do Postgres.

> O vínculo com a party pode ser feito por `actor:update { partyId }` **ou** por `party:addMember`. Os dois escrevem a mesma coluna.

---

### 5.5 Party

O grupo de aventureiros do mundo. **No máximo uma por mundo.** Uma party não tem campos editáveis (não existe `party:update`); os membros são os atores com `partyId` apontando para ela.

| Canal                | Entrada                | Saída                    | Erros                                                        |
| -------------------- | ---------------------- | ------------------------ | ------------------------------------------------------------ |
| `party:findByWorld`  | `string` (worldId)     | `Party \| undefined`     | `invalid_input`                                              |
| `party:create`       | `{ worldId }`          | `Party`                  | `invalid_input`, `conflict`                                  |
| `party:delete`       | `string` (partyId)     | `void`                   | `invalid_input`, `not_found`, `conflict` (ainda tem membros) |
| `party:listMembers`  | `string` (partyId)     | `Actor[]` (ordem `name`) | `invalid_input`, `not_found`                                 |
| `party:addMember`    | `{ partyId, actorId }` | `Actor`                  | `invalid_input`, `not_found`, `conflict`                     |
| `party:removeMember` | `{ partyId, actorId }` | `Actor`                  | `invalid_input`, `not_found`                                 |

`Party` = `{ id: string; worldId: string }`.

**Pontos que costumam enganar**

- `party:findByWorld` sem party devolve **`{ ok: true, data: undefined }`**, não `not_found`. Teste `res.data === undefined`.
- `party:delete` com membros → `conflict`. Remova os membros antes.
- `party:addMember`: party inexistente → `not_found` (`Party`); ator inexistente → `not_found` (`Actor`); ator de outro mundo → `conflict`.
- `party:removeMember`: ator inexistente **ou** que não pertence àquela party → `not_found` (`Party member "<actorId>"`).
- `party:addMember` e `party:removeMember` devolvem o **ator atualizado** (com o novo `partyId`).

---

### 5.6 Imagens

Imagens são **arquivos**, nunca conteúdo de banco. A entidade guarda apenas `imagePath` (relativo). Escopos hoje: **`world`** e **`actor`**. 🚧 Culture e Language não têm imagem.

#### Enviar

```ts
async function uploadActorImage(actorId: string, file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const res = await window.api.invoke('actor:setImage', { id: actorId, data })
  return res.ok ? res.data : undefined // novo imagePath, ex.: "actor/6f1c….png"
}
```

| Regra          | Valor                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Formatos       | PNG, JPEG (`.jpg`), WebP, GIF. **SVG é recusado de propósito** (pode carregar script)              |
| Detecção       | Pelos **bytes** (magic numbers), nunca por nome ou MIME do arquivo                                 |
| Tamanho máximo | **5 MB** (`IMAGE_LIMITS.maxBytes`). Validado no serviço, não no Zod                                |
| Nome           | `<escopo>/<uuid>.<ext>`: **cada upload gera nome novo**, então a imagem trocada nunca vem do cache |
| Entrada Zod    | `{ id: uuid, data: Uint8Array }`                                                                   |

**Ordem de operações de `setImage`** (segura contra falha): valida tamanho → valida formato → confere se a entidade existe → grava arquivo (`.tmp` + rename) → grava o caminho no banco → apaga o arquivo antigo. Se a gravação no banco falhar, o arquivo novo é removido.

`removeImage` em entidade sem imagem é um no-op (`ok: true`); em entidade inexistente, `not_found`.

#### Exibir

```ts
import { toImageUrl } from '@shared'

const src = actor.imagePath ? toImageUrl(actor.imagePath) : undefined
// "arcanum-image://local/actor/6f1c….png"
```

O protocolo `arcanum-image://` é servido pelo main **apenas de dentro da pasta de imagens**. Caminho inválido → HTTP 400; arquivo ausente → 404. O CSP de `index.html` precisa de `img-src` com `arcanum-image:` (já configurado).

#### Limpeza

Apagar uma entidade **não** apaga o arquivo. O `ImageSweepService` remove arquivos sem dono no startup. Substituir ou remover a imagem pelos canais apaga o arquivo antigo imediatamente.

---

### 5.7 AI Setting

Configuração **global** (uma única linha) do modelo que alimenta o narrador. Vale para todos os mundos.

| Canal                   | Entrada           | Saída                      | Erros                                 |
| ----------------------- | ----------------- | -------------------------- | ------------------------------------- |
| `aiSetting:catalog`     | `undefined`       | `AiProviderCatalogEntry[]` | —                                     |
| `aiSetting:get`         | `undefined`       | `AiSettingView`            | —                                     |
| `aiSetting:update`      | `UpdateAiSetting` | `AiSettingView`            | `invalid_input`, `conflict` (keyring) |
| `aiSetting:clearApiKey` | `undefined`       | `AiSettingView`            | —                                     |

#### Catálogo (`aiSetting:catalog`)

```ts
interface AiProviderCatalogEntry {
  id: 'google' | 'openai' | 'anthropic' | 'deepseek'
  label: string
  apiKeyEnvVar: string // ex.: GOOGLE_API_KEY
  maxTemperature: number // 2 (google/openai/deepseek) · 1 (anthropic)
  models: { id: string; label: string }[] // do mais capaz ao mais simples
  hasEnvironmentKey: boolean // há chave no ambiente do processo?
}
```

| Provider    | Env var             | Temp. máx. | Modelos (mais capaz → mais simples)                                                          |
| ----------- | ------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `google`    | `GOOGLE_API_KEY`    | 2          | `gemini-3.1-pro-preview` · `gemini-3.8-flash` · `gemini-3.5-flash` · `gemini-3.5-flash-lite` |
| `openai`    | `OPENAI_API_KEY`    | 2          | `gpt-5.5-pro` · `gpt-5.5` · `gpt-5.4` · `gpt-5.4-mini` · `gpt-5.4-nano`                      |
| `anthropic` | `ANTHROPIC_API_KEY` | 1          | `claude-fable-5-1` · `claude-opus-5-5` · `claude-sonnet-5-5` · `claude-haiku-4-5`            |
| `deepseek`  | `DEEPSEEK_API_KEY`  | 2          | `deepseek-v4-pro` · `deepseek-v4-flash`                                                      |

A fonte da verdade é `src/main/constant/ai-model.constant.ts`. Para oferecer um modelo novo basta adicioná-lo lá. A ordem dentro de cada provider é um julgamento por nome, não por preço.

#### Leitura (`aiSetting:get`)

```ts
interface AiSettingView {
  provider: AiProvider
  model: string
  temperature: number
  apiKey: {
    configured: boolean
    source: 'stored' | 'environment' | 'none' // 'stored' vence 'environment'
    hint: string | null // últimos 4 caracteres; null se source !== 'stored'
  }
}
```

- Sem nada salvo, devolve o **padrão**: `google` / `gemini-3.5-flash` / `1`.
- Se o modelo salvo saiu do catálogo, também cai no padrão.
- **A chave nunca é enviada ao renderer.** Só `configured`, `source` e `hint`.

#### Escrita (`aiSetting:update`)

```ts
interface UpdateAiSetting {
  provider: AiProvider
  model: string // trim, min 1, deve pertencer ao catálogo do provider
  temperature: number // ≥ 0 e ≤ maxTemperature do provider
  apiKey?: string // trim, 1–512
}
```

Validações cruzadas (`superRefine`) chegam como `invalid_input` com `issues`:

| `path`        | Mensagem                                             |
| ------------- | ---------------------------------------------------- |
| `model`       | `"<model>" is not a <Provider> model of the catalog` |
| `temperature` | `<Provider> accepts a temperature up to <max>`       |

**Semântica que não é óbvia**

1. `update` **substitui a escolha inteira**: trocar de provider exige mandar o modelo também.
2. `apiKey` omitida **mantém** a chave salva, **mas só se o provider não mudou**. Trocar de provider sem mandar chave nova **descarta** a chave salva.
3. `apiKey` enviada é criptografada (Electron `safeStorage`) e guardada com o `hint` (últimos 4 caracteres).
4. Chave em branco é rejeitada pelo Zod. **Para apagar a chave use `aiSetting:clearApiKey`.**
5. Sem chave salva, o Mastra lê a variável de ambiente do provider (`apiKeyEnvVar`).
6. ⚠️ No Linux sem keyring (backend `basic_text`), salvar chave retorna `conflict`. Alternativa: definir a variável de ambiente.

---

### 5.8 Game Master

| Canal                    | Entrada                                                | Saída                                        | Erros                                                |
| ------------------------ | ------------------------------------------------------ | -------------------------------------------- | ---------------------------------------------------- |
| `gameMaster:takeTurn`    | `{ worldId: string; message: string }`                 | `string` (resposta do narrador)              | `invalid_input`, `not_found`, `conflict`, `internal` |
| `gameMaster:streamTurn`  | `{ turnId: string; worldId: string; message: string }` | `void` (aceito; a narração chega por evento) | `invalid_input`, `not_found`, `conflict`, `internal` |
| `gameMaster:listHistory` | `string` (worldId)                                     | `CampaignMessage[]`                          | `invalid_input`, `not_found`                         |

````ts
interface CampaignMessage {
  id: string
  role: 'user' | 'assistant'
  text: string // como foi gravado; a fala do narrador pode conter blocos OpenUI Lang
  segments: NarrationSegment[] // `text` já separado em prosa e blocos de UI (ver abaixo)
  createdAt: Date
}

type NarrationSegment =
  { type: 'prose'; text: string } | { type: 'ui'; source: string; issues: NarrationIssue[] } // `source` é OpenUI Lang, sem a cerca ```
interface NarrationIssue {
  code: string // código do parser: 'unknown-component', 'missing-required', 'unresolved-reference', 'incomplete'…
  message: string
  component?: string
}
````

- `message`: trim, 1–5000 caracteres.
- `takeTurn` é **lento** (chamada a LLM, com até 10 passos de tool). A UI precisa de estado de _loading_ e deve bloquear envio duplicado.
- `takeTurn` devolve **só o texto final**. Para ver a narração enquanto ela é escrita, use `streamTurn`.

**Streaming (`streamTurn`)**

`streamTurn` responde assim que o turno é aceito. O resto chega como eventos em `gameMaster:turnEvent`, ouvidos com `window.api.on` (devolve a função que cancela a escuta):

```ts
type TurnEvent = { turnId: string } & (
  | { type: 'delta'; segment: number; kind: 'prose' | 'ui'; text: string } // só o trecho novo
  | { type: 'done'; text: string; segments: NarrationSegment[] } // resposta inteira: substitui o acumulado
  | { type: 'error'; error: IpcError }
)
```

O main já separa a prosa dos blocos de UI **enquanto o texto chega**: cada `delta` pertence ao segmento de posição `segment` (um número que cresce na ordem em que a resposta é escrita) e diz se ele é `prose` ou `ui`. O renderer só concatena `text` no segmento daquela posição, sem procurar cercas de código nem remontar marcadores partidos entre chunks. Um segmento `ui` acumulado é exatamente o `response` que o `<Renderer>` espera (OpenUI Lang, sem a cerca).

```ts
const turnId = crypto.randomUUID()
let segments: { kind: 'prose' | 'ui'; text: string }[] = []
const stop = window.api.on('gameMaster:turnEvent', (event) => {
  if (event.turnId !== turnId) return
  if (event.type === 'delta') {
    segments[event.segment] ??= { kind: event.kind, text: '' }
    segments[event.segment].text += event.text
  }
  if (event.type === 'done') stop() // event.segments substitui `segments`: já aparado, sem vazios, com `issues`
  if (event.type === 'error') stop() // mostrar event.error.message
})
const res = await window.api.invoke('gameMaster:streamTurn', { turnId, worldId, message })
if (!res.ok) stop() // não começou: `conflict` se o mundo já tem um turno em andamento
```

- `done.segments` é o resultado final e **tem o mesmo formato e conteúdo** que `listHistory` devolve depois para aquela mensagem. Os índices de `delta` não valem para ele: segmentos vazios são descartados e o texto é aparado, então o renderer troca a lista inteira.
- Cada bloco `ui` final vem validado contra o vocabulário (`issues`). O parser do OpenUI é permissivo: um bloco com `issues` ainda pode renderizar em parte, e quem decide o que mostrar é o renderer. O main também registra no log (`The narrator wrote a UI block with issues`), que é o sinal de que o modelo fugiu do prompt.

- **O `turnId` é do renderer** (uuid). Os eventos podem chegar antes de o `invoke` resolver, então o renderer precisa estar ouvindo antes de chamar.
- Todo turno aceito termina em `done` ou `error`. Falhas que impedem o início (`not_found`, `conflict`, validação) vêm na resposta do `invoke`, não por evento. Falhas depois do início vêm como `error` (o detalhe fica no log do main, como no `takeTurn`).
- Um mundo tem **um** turno em andamento por vez; o segundo `streamTurn` recebe `conflict`. Não há cancelamento ainda.
- O turno é gravado na memória da campanha ao terminar, como no `takeTurn`.
- `listHistory` devolve apenas mensagens `user`/`assistant` com **texto** (partes de tool-call e relatórios de sub-agente são descartados; mensagens vazias também).
- Falhas do provedor (chave ausente/inválida, rede, limite de taxa) chegam como `internal` com a mensagem genérica. O detalhe fica no log do main. ⚠️ Se um chat falha com `internal`, a primeira suspeita é a chave de API (ver [§6.6](#66-configuração-e-chaves)).

Fluxo completo na [§6](#6-ia-fluxo-do-game-master).

### 5.9 Dice

| Canal               | Entrada                              | Saída         | Erros                       |
| ------------------- | ------------------------------------ | ------------- | --------------------------- |
| `dice:resolveCheck` | `{ mode: RollMode; dice: number[] }` | `CheckResult` | `invalid_input`, `conflict` |

Resolve uma checagem cujos dados o jogador rolou na tela (`@3d-dice/dice-box`, física 3D): as faces são só a **entropia**, as regras continuam na engine. É o que o botão do `RollRequest` chama (§7).

- `mode`: `normal` (2d6), `advantage` (3d6) ou `disadvantage` (1d6). Vem de `DICE_PER_ROLL_MODE` (`@shared`, `roll-mode.shared.ts`).
- `dice`: cada face do d6, de 1 a 6, **na quantidade exata do modo**. Outra quantidade ou valor fora de 1–6 volta como `invalid_input` (formato) ou `conflict` (quantidade que não bate com o modo).
- A saída é o mesmo `CheckResult` do `rollCheckTool`: `outcome` pelo dado mais alto (6 crítico, 5 sucesso, 2–4 falha, todos em 1 falha crítica).
- Local e de um jogador só: o renderer é confiável para sortear as faces, então não há anti-trapaça.

---

## 6. IA: fluxo do Game Master

### 6.1 Princípio

> **Engine decide, IA narra.** Regras, dados, criação de NPC e estado pertencem à engine. A IA lê o estado, chama a engine por _tools_ e usa o resultado para enriquecer a narração. Ela nunca inventa nem sobrescreve o estado.

### 6.2 Uma rodada de `takeTurn`

```
Renderer                 Main (GameMasterService)            Mastra / LLM
   │ gameMaster:takeTurn       │                                   │
   ├──────────────────────────►│ 1. worldService.get(worldId)      │  (not_found se não existir)
   │                           │ 2. aiSettingService.resolve()     │  provider+model+temp+chave (decifrada, só no main)
   │                           │ 3. loadParty(worldId)             │  membros lidos A CADA turno
   │                           │ 4. RequestContext:                │
   │                           │    worldId, narratorModel{id,key},│
   │                           │    world, party, npcRegistry,     │
   │                           │    diceChecker                    │
   │                           │ 5. narrator.generate(message, {   │
   │                           │      maxSteps: 10,                ├─► prompt = layers (estático→dinâmico)
   │                           │      temperature,                 │   LLM ──► rollCheckTool ──► DiceCheckService
   │                           │      memory: { resource: worldId, │   LLM ──► npcCreator ──► createNpcTool ──► ActorService
   │                           │        thread: campaign-<id> } }) │   LLM ──► texto final
   │◄──────────────────────────┤ 6. result.text                    │
   │   { ok:true, data:"…" }   │                                   │
```

Pontos a reter:

- O estado (mundo, party) é **reinjetado a cada turno** pelos layers dinâmicos. Não há tool de leitura de estado: o que a IA sabe do jogo é o que o prompt traz.
- O thread de memória é `campaign-<worldId>`, com `resource = worldId`. Um clone (id novo) começa com chat vazio.
- A chave de API decifrada **nunca** sai do main. Ela entra no `RequestContext` e é usada só na chamada ao provedor.

### 6.3 Agentes

| Agente          | id            | Modelo                                                         | Tools / sub-agentes                  | Memória                                                         |
| --------------- | ------------- | -------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| **Narrator**    | `narrator`    | Dinâmico: `requestContext.narratorModel.id` (`provider/model`) | `rollCheckTool`, agente `npcCreator` | Sim (Observational Memory, modelo `google/gemini-2.5-flash`)    |
| **NPC Creator** | `npc-creator` | Fixo: `google/gemini-3.5-flash-lite`                           | `createNpcTool`                      | Não (cada delegação tem thread novo sob `{worldId}-npcCreator`) |

Ambos validam o `RequestContext` com `gameContextSchema` e estão registrados em `src/mastra/index.ts`.

> ⚠️ O modelo do NPC Creator é **fixo** e usa Google. Ele precisa de `GOOGLE_API_KEY` no ambiente, **independente** do provider escolhido para o narrador.
> O mesmo vale para a memória (`google/gemini-2.5-flash`).

### 6.4 Prompt em camadas

O system prompt do narrador é a junção de _layers_ (um `.md` cada), nesta ordem (`src/mastra/agents/narrator/layers/`):

| #   | Layer      | Tipo     | Conteúdo                                                                                                                                                                                                                      |
| --- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `identity` | estático | Quem é o narrador                                                                                                                                                                                                             |
| 2   | `rules`    | estático | Nunca inventar mecânica · rolar `rollCheckTool` só para ações incertas e relevantes · o resultado é final · delegar NPC novo ao `npcCreator` **antes** de narrá-lo · responder no idioma do jogador · nunca agir pelo jogador |
| 3   | `world`    | dinâmico | `name`, `genre`, `description` (opcional)                                                                                                                                                                                     |
| 4   | `party`    | dinâmico | Membros: `name`, `isPlayer`, `age`, `gender`, `hpCurrent`/`hpMax` (só leitura para a IA) e, se houver, `profession`, `appearance`, `personality`, `background`                                                                |

- Camadas estáticas vêm primeiro (prefixo imutável ajuda o cache do provedor). Dinâmicas, do que menos muda para o que mais muda.
- Dinâmicas são **Handlebars em modo `strict`**: campo ausente **lança erro**. Campo opcional precisa de `{{#if campo}}`.
- Os `.md` são lidos do disco em runtime (`ARCANUM_AGENTS_DIR`). Em build empacotado vão como _extra resource_.
- O NPC Creator tem um layer dinâmico próprio com `world.name`, `world.genre`, `world.description`. ⚠️ Ele usa `{{world.description}}` sem `#if`; como `description` é `''` por padrão, funciona, mas um `description` ausente quebraria.

### 6.5 Tools

#### `rollCheckTool` (id `roll-check`)

Rola uma checagem de dados na engine. O resultado é **final**; a IA o narra, não o altera.

```ts
// input
{ mode?: 'normal' | 'advantage' | 'disadvantage' } // omitido = normal

// output (CheckResult)
{
  mode: 'normal' | 'advantage' | 'disadvantage'
  dice: number[]       // cada d6 rolado
  highest: number      // maior dado
  outcome: 'critical_failure' | 'failure' | 'success' | 'critical_success'
  succeeded: boolean   // true para success e critical_success
}
```

| Modo           | Dados | Quando usar                |
| -------------- | ----- | -------------------------- |
| `normal`       | 2d6   | Padrão                     |
| `advantage`    | 3d6   | Circunstância favorável    |
| `disadvantage` | 1d6   | Circunstância desfavorável |

Leitura do resultado pelo **maior dado**: `6` → `critical_success` · `5` → `success` · `2–4` → `failure` · `1` → `critical_failure` (maior dado `1` significa que todos os dados foram `1`).

```jsonc
{ "mode": "normal", "dice": [3, 5], "highest": 5, "outcome": "success", "succeeded": true }
```

#### `createNpcTool` (id `create-npc`)

Só o `npcCreator` a usa. Registra um NPC pela engine (`ActorService.create` com `isNpc: true`).

```ts
// input (npcDraft)
{
  name: string            // trim, 1–120
  age: ActorAge
  gender: ActorGender
  profession?: string     // ≤ 120
  appearance?: string     // ≤ 5000
  personality?: string    // ≤ 5000
  background?: string     // ≤ 5000
}

// output
{ created: boolean; npc?: npcDraft & { id: string }; reason?: string }
```

Se a engine rejeitar (`ConflictError`), a tool devolve `{ created: false, reason }` para a **IA corrigir e tentar de novo**. Qualquer outro erro é relançado e vira `internal`.

> O NPC criado pela IA aparece em `actor:listByWorld`. A UI deve recarregar a lista depois de um turno.

### 6.6 Configuração e chaves

| Variável                                                                       | Quem define       | Uso                                                      |
| ------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------- |
| `GOOGLE_API_KEY` · `OPENAI_API_KEY` · `ANTHROPIC_API_KEY` · `DEEPSEEK_API_KEY` | Ambiente (`.env`) | Chave do provider quando **não há chave salva no app**   |
| `ARCANUM_AGENTS_DIR`                                                           | `loadMastra()`    | Pasta dos `.md` dos layers                               |
| `ARCANUM_MASTRA_DIR`                                                           | `loadMastra()`    | Pasta dos arquivos do Mastra                             |
| `TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN`                                      | Ambiente          | Opcional. Padrão: `file:<ARCANUM_MASTRA_DIR>/storage.db` |
| `MASTRA_PLATFORM_ACCESS_TOKEN`                                                 | Ambiente          | Opcional. Só envia observabilidade se definido           |
| `ELECTRON_RENDERER_URL`                                                        | `electron-vite`   | Dev server (usado por `isTrustedSender`)                 |

**Resolução da chave do narrador:** chave salva no app (`aiSetting:update`) → senão variável de ambiente do provider → senão falha (`internal`).

> ⚠️ `.env` é **excluído** do build empacotado (`electron-builder.yml`). Em produção a chave precisa vir de `aiSetting:update` (ou do ambiente do SO).
> ⚠️ Não existe `.env.example`, e `dotenv` está nas dependências mas nenhum arquivo de `src` o importa. Não está verificado como o `.env` chega ao `process.env` do main em dev.

### 6.7 Armazenamento do chat

- O histórico fica no **Mastra** (LibSQL em `userData/data/mastra/storage.db`), **não** no banco do jogo (PGlite).
- Observabilidade: DuckDB em `userData/data/mastra/observability.duckdb`. `SensitiveDataFilter` está ativo.
- Consequência: `world:delete` apaga o mundo, mas o thread do Mastra fica órfão (🚧 sem limpeza).

---

## 7. Chat com OpenUI

> **Estado atual:** back e renderer estão prontos: o vocabulário (`NARRATOR_UI_COMPONENTS`, em `@shared`), o layer de prompt, o streaming de turnos (§5.8), a library Vue (`src/renderer/src/openui/`), o `<Renderer>` no chat e o consumo dos eventos (`useTurnStream`). A **rolagem de dado por botão** também está pronta: `RollRequest` + `dice:resolveCheck` (§5.9).
> Os trechos de API da lib foram conferidos no README instalado e nos `.d.ts` da 0.4.0. O que é proposta de arquitetura está marcado como tal.

### 7.1 O que o OpenUI faz (e o que não faz)

OpenUI Lang é uma linguagem de saída que o LLM escreve para descrever UI. O app a interpreta e renderiza com componentes Vue **que você define e autoriza**.

```
root = Stack([titulo, resultado])
titulo = Heading("Teste de percepção")
resultado = RollResult("success", [3, 5])
```

A lib cobre quatro coisas:

1. **Definir** componentes que o modelo pode chamar (`defineComponent`, props em Zod).
2. **Montar** a library (`createLibrary`).
3. **Gerar o prompt** que ensina a linguagem ao modelo (`library.prompt(...)`).
4. **Renderizar** a saída, inclusive parcial (`<Renderer>` + parser de streaming).

**A lib não define transporte.** Como os chunks saem do LLM, passam pelo main e chegam ao renderer é decisão do app. Hoje esse caminho não existe.

### 7.2 API da lib usada (verificada)

```ts
import { defineComponent, createLibrary, Renderer } from '@openuidev/vue-lang'
import { z } from 'zod'

const RollResult = defineComponent({
  name: 'RollResult',
  description: 'Mostra o resultado de uma checagem já feita pela engine. Nunca invente valores.',
  props: z.object({
    outcome: z.enum(['critical_failure', 'failure', 'success', 'critical_success']),
    dice: z.array(z.number().int())
  }),
  component: RollResultView // componente Vue; recebe { props, renderNode }
})

export const library = createLibrary({ components: [RollResult /* … */], root: 'Stack' })

const systemPrompt = library.prompt({
  preamble: 'Você é o mestre do jogo.',
  additionalRules: ['Nunca invente resultados de dados: use apenas o que as tools devolveram.'],
  examples: ['root = RollResult("success", [3, 5])']
})
```

```vue
<script setup lang="ts">
import { Renderer } from '@openuidev/vue-lang'
import { library } from './library'
</script>

<template>
  <Renderer
    :response="response"
    :library="library"
    :is-streaming="isStreaming"
    :on-action="onAction"
    :on-error="onError"
  />
</template>
```

| Prop do `<Renderer>`             | Uso                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `response`                       | Texto OpenUI Lang **acumulado** (`string \| null`)                                                                           |
| `library`                        | Resultado de `createLibrary`                                                                                                 |
| `isStreaming`                    | `true` enquanto chegam chunks. Desabilita interação de formulário                                                            |
| `onAction`                       | Recebe `ActionEvent` quando um componente dispara ação                                                                       |
| `toolProvider`                   | `Record<string, fn>` (ou cliente MCP) que executa `Query()` / `Mutation()`                                                   |
| `onError`                        | Erros estruturados (`missing-required`, `null-required`, `unknown-component`, `excess-args`). **Não impedem a renderização** |
| `initialState` · `onStateUpdate` | Hidratação e leitura do estado de formulário                                                                                 |

`library.prompt()` também aceita `inlineMode` (texto + bloco OpenUI opcional, bom para um narrador que mistura prosa e UI), `tools`/`toolExamples` e `editMode`. Há também `library.toJSONSchema()`. O parser de streaming de `lang-core` expõe `createStreamingParser(schema)` com `push(chunk)` / `set(fullText)` / `getResult()`, e `meta.incomplete` indica texto truncado.

### 7.3 Arquitetura

```
 Renderer (Vue)                       Main                                  Mastra
 ───────────────                      ────                                  ──────
 window.api.invoke(                   gameMaster:streamTurn
   'gameMaster:streamTurn')  ───────►   ├─ valida, trava o mundo ──────────► narrator.stream(...)
                                        │                                      │ system prompt = layers +
 window.api.on(                         │                                      │ narratorUiPrompt()
   'gameMaster:turnEvent') ◄────────────┤◄──── delta … delta … done|error ─────┘ (fullStream → text-delta)
   ▲                                    └─ webContents.send (RendererEvents)
   └─ <Renderer :response=acumulado :is-streaming>   (🚧 renderer)
```

**O que existe (✅)**

| Peça                      | Onde                                                           | Observação                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vocabulário (fonte única) | `src/shared/narrator-ui.shared.ts`                             | `NARRATOR_UI_COMPONENTS`: nome, descrição e props (Zod), **sem Vue**. Hoje: `Stack` (raiz) e `RollRequest`. Sem componente de dado/número de propósito (ver risco 6)        |
| Prompt do narrador        | `src/mastra/prompt/narrator-ui.prompt.ts` + `generatedLayer`   | `createLibrary` com componentes vazios só para gerar `library.prompt({ inlineMode: true, … })`. Entra no narrador depois de `rules`, antes dos layers dinâmicos         |
| `narrateStream`           | `NarratorGateway` (`@lib/narrator.lib`)                        | Lê `fullStream`: só `text-delta` do próprio narrador (texto de especialista vem embrulhado em `tool-output`); chunk `error` vira exceção                                |
| Separador prosa/UI        | `src/main/util/narration.util.ts`                              | `NarrationStreamSplitter` (streaming, segura crases partidas entre chunks) e `splitNarration`. A regra de cerca é a do parser do OpenUI. Puro, sem imports              |
| Validação do bloco        | `src/main/lib/openui.lib.ts`                                   | Fachada do `vue-lang`: `narratorUiLibrary()` (usada pelo prompt e pela validação) e `validateNarratorUi(source)` → `NarrationIssue[]`                                   |
| Sumarização compatível    | `src/mastra/memory/narrator.memory.ts`                         | Hook `beforeObservation`: o Observer lê a resposta **sem** os blocos de UI (não vira "fato da história" nem gasta tokens). No armazenamento a mensagem continua inteira |
| `streamTurn` + trava      | `GameMasterService`                                            | Mesmo preparo do `takeTurn`; uma trava por mundo, liberada ao fim do turno                                                                                              |
| Evento main → renderer    | `ipcEventContract`, `RendererEvents` (`@lib`), `window.api.on` | O preload só deixa ouvir canais do contrato e entrega só o payload (nunca o `event` do Electron)                                                                        |
| `vue-lang` no main        | `electron.vite.config.ts` (`esmOnlyDeps`)                      | O pacote só tem condição `import`; o main é CJS, então ele é empacotado em vez de externo (senão `ERR_PACKAGE_PATH_NOT_EXPORTED`)                                       |

**No renderer (✅)**

| Peça                    | Onde                                                                | Observação                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Library com componentes | `openui/narrator.library.ts`                                        | `NARRATOR_UI_COMPONENTS.map(spec => defineComponent({ ...spec, component }))`. Falha ao carregar se um nome do vocabulário não tiver componente Vue em `renderers`             |
| Componentes             | `components/custom/NarratorStack.vue`, `NarratorRollRequest.vue`        | Todo nome novo no vocabulário precisa do componente aqui                                                                                                                       |
| `<Renderer>` no chat    | `components/custom/NarratorUi.vue`, usado por `GameChatMessage.vue` | Só o bloco `ui` vai para o `<Renderer>`; a prosa segue por `proseToChatSegments`                                                                                               |
| Consumo dos eventos     | `composable/turn-stream.composable.ts`, `game.composable.ts`        | Acumula `delta` por posição, troca tudo pelos `segments` do `done`, trata `error`                                                                                              |
| Ação `continue_conversation` | `NarratorUi.vue` (`onAction`)                                       | `continue_conversation` vira um novo turno com o texto da opção. Só a última fala do narrador é clicável, e não durante um turno. Outras ações (como `open_url`) são ignoradas |
| Persistência do formato | memória do Mastra                                                   | Ver risco 3                                                                                                                                                                    |

### 7.4 Riscos e decisões em aberto

1. **A UI gerada não pode tocar o estado por conta própria.** `Query()`/`Mutation()` do OpenUI chamam o `toolProvider`. Se ele existir, **cada função deve ser um wrapper de `window.api.invoke`** (passa por validação e pela engine). Nunca implemente regra de jogo dentro de um componente ou do `toolProvider`. Isso quebraria o princípio "engine decide".
2. **Rolagem de dado por botão.** `docs/frontend.md` §4 prevê um botão de rolagem que chama a engine e devolve o resultado ao narrador. **Não existe IPC de rolagem** hoje (o `DiceCheckService` só é alcançado pela tool da IA). É um canal novo a desenhar.
3. ✅ **Histórico.** A memória do Mastra guarda a resposta crua, com o bloco OpenUI Lang e a cerca (verificado com um modelo falso: o que sai do stream e o que `listHistory` devolve são idênticos). `listHistory` já devolve `segments`, então reidratar o chat é renderizar os `ui` com `isStreaming = false`.
4. **Dois renderizadores competindo.** `proseToChatSegments` (heurística de diálogo por aspas/travessão) e o `<Renderer>` não podem coexistir sobre o mesmo texto. ✅ Resolvido: `toChatSegments(segments)` manda a prosa para `proseToChatSegments` e só o bloco `ui` para o `<Renderer>`.
5. **Fonte única do vocabulário.** O prompt (main/Mastra) e a library (renderer/Vue) precisam descrever os **mesmos** componentes. Se divergirem, o modelo emite componentes desconhecidos (`unknown-component`) que a lib tolera, mas renderiza mal. Decidir onde mora a definição (por exemplo, schemas Zod em `@shared`, sem Vue, e o mapeamento para componentes no renderer).
6. **Resultado de dado alucinado.** O modelo pode escrever `RollResult("success", [6])` sem ter chamado a tool. Mitigação: a regra do layer ("só use o que a tool devolveu") **não é garantia**. Se isso importar, valide no main (comparar o que a UI exibe com os resultados das tool-calls do turno) ou deixe o componente de dado ser alimentado pelo resultado real da tool, não pelo texto do modelo.
7. **Telemetria da lib.** `@openuidev/lang-core` envia telemetria pseudônima no `postinstall` (desative com `OPENUI_TELEMETRY_DISABLED=1` ou `DO_NOT_TRACK=1`). A telemetria em runtime (geração de prompt e parse) é **opt-in**: só liga com `OPENUI_RUNTIME_TELEMETRY_ENABLED`, que o app não define.
8. **CSP.** `index.html` tem um `connect-src http://localhost:4111` (dev server do Mastra). Não é parte desta API e não é necessário para o IPC.
9. **Design primeiro.** `docs/frontend.md` §4 pede alinhar o desenho do chat gerativo antes de construir. Este documento não substitui essa decisão.

---

## 8. Modelo de dados

Banco do jogo: **PGlite** (Postgres embutido) via Drizzle, em `userData/data/game`. O esquema é versionado por migrations (nunca `drizzle-kit push`).

```
            ┌──────────┐ 1───N ┌──────────┐
            │  world   │───────│  actor   │ N───1 culture
            │          │       │          │ N───1 language
            │          │ 1───1 │          │ N───1 party
            │          │───────┤  party   │
            │          │ 1───N │          │
            │          │───────┤ culture  │
            │          │ 1───N │          │
            │          │───────┤ language │
            └────┬─────┘       └──────────┘
                 │ source_world_id (auto-ref., ON DELETE SET NULL)
                 └──► world

            ai_setting  (linha única, sem relação)
```

| Tabela       | Colunas principais                                                                                                                                                                          | Constraints relevantes                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world`      | `id`, `name`, `is_template`, `description`, `genre`, `source_world_id`, `image_path`                                                                                                        | `source_world_id` → `world.id` **ON DELETE SET NULL**                                                                                                                                                                                                                                                                                                      |
| `actor`      | `id`, `world_id`, `name`, `age`, `gender`, `culture_id`, `language_id`, `party_id`, `profession`, `appearance`, `personality`, `background`, `image_path`, `hp_max`, `hp_current`, `is_npc` | `world_id` **CASCADE**. Índice único parcial `actor_world_id_player_unique` em `(world_id) WHERE is_npc = false`. `CHECK` `actor_hp_max_range` (`hp_max` entre 1 e 9999) e `actor_hp_current_range` (`hp_current` entre 0 e `hp_max`). FKs compostas `(culture_id, world_id)`, `(language_id, world_id)`, `(party_id, world_id)` sem ON DELETE (NO ACTION) |
| `culture`    | `id`, `world_id`, `name`, `description`                                                                                                                                                     | `world_id` CASCADE · `UNIQUE (id, world_id)`                                                                                                                                                                                                                                                                                                               |
| `language`   | `id`, `world_id`, `name`, `description`                                                                                                                                                     | `world_id` CASCADE · `UNIQUE (id, world_id)`                                                                                                                                                                                                                                                                                                               |
| `party`      | `id`, `world_id`                                                                                                                                                                            | `world_id` CASCADE · `party_world_id_unique` · `UNIQUE (id, world_id)`                                                                                                                                                                                                                                                                                     |
| `ai_setting` | `id` (boolean, sempre `true`), `provider`, `model`, `temperature`, `encrypted_key`, `key_hint`                                                                                              | `CHECK` de linha única · `CHECK ((encrypted_key IS NULL) = (key_hint IS NULL))`                                                                                                                                                                                                                                                                            |

**Por que as FKs são compostas?** `(culture_id, world_id)` referenciando `culture(id, world_id)` faz o **banco** garantir que o ator e sua cultura/idioma/party pertencem ao mesmo mundo. Nenhum serviço precisa conferir isso. Como são `NO ACTION`, apagar uma cultura em uso falha com `conflict`. As FKs só valem enquanto a coluna opcional não é `NULL`.

**Migrations** (`drizzle/`, cada uma com `migration.sql` e `snapshot.json`; nunca edite uma já entregue):

1. `…_flashy_thor_girl`: enums, `actor`, `culture`, `language`, `party`, `world`, índices e FKs
2. `…_tiny_magma`: enum `ai_provider` e `ai_setting`
3. `…_legal_sebastian_shaw`: `actor.image_path`
4. `…_mixed_firebrand`: `world.image_path`
5. `…_open_slayback`: `world.source_world_id` + FK `SET NULL`
6. `…_dry_sentinel`: `actor.hp_max`, `actor.hp_current` e seus `CHECK`s (jogadores já existentes recebem 40)

Não existem tabelas de cena, sessão, combate, inventário ou NPC separado: um NPC é um `actor` com `is_npc = true`.

---

## 9. Ciclo de vida do app e dados locais

**Startup** (`src/main/index.ts`), nesta ordem:

1. `registerImageScheme()` (no carregamento do módulo, antes de `app.ready`).
2. `app.whenReady()`:
   1. `initializeDatabase()`: aplica migrations pendentes. Falha lança `Database migration failed: …`.
   2. `sweepOrphanImages()`: remove arquivos de imagem sem dono. Falhas são logadas e engolidas.
   3. `serveImages()`: ativa o protocolo `arcanum-image://`.
   4. `registerIpc()`: registra os 37 canais.
   5. `createWindow()`.
3. O Mastra **não** carrega no startup: `loadMastra()` faz `import()` dinâmico sob demanda (o primeiro `takeTurn`/`listHistory` paga esse custo). Nunca importe `src/mastra` estaticamente do main.

**Encerramento:** `before-quit` é adiado uma vez para `closeDatabase()` (fecha o PGlite) e só então `app.quit()`.

**Onde ficam os dados** (`app.getPath('userData')`, nunca no repositório):

| Caminho                             | Conteúdo                           |
| ----------------------------------- | ---------------------------------- |
| `data/game`                         | Banco PGlite do jogo               |
| `data/images/<escopo>/<uuid>.<ext>` | Imagens (`world/`, `actor/`)       |
| `data/mastra/storage.db`            | Chat/memória do Mastra (LibSQL)    |
| `data/mastra/observability.duckdb`  | Observabilidade do Mastra (DuckDB) |

Nunca aponte dois processos para o mesmo diretório PGlite. Fora do app (Mastra CLI/Studio), `src/mastra` usa `.data/mastra` (ignorado pelo git) e **nunca** compartilha arquivo com o app.

---

## 10. Lacunas conhecidas

| #   | Lacuna                                                                      | Impacto                                                                                                                      |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🚧 Cancelamento de turno em streaming                                       | Um turno em andamento só termina sozinho; o mundo fica travado até lá                                                        |
| 2   | ✅ OpenUI no renderer (library Vue, `<Renderer>`, eventos)                  | Resolvido ([§7](#7-chat-com-openui))                                                                                         |
| 3   | 🚧 IPC de rolagem de dados                                                  | A UI não pode pedir uma checagem; só a IA rola                                                                               |
| 4   | 🚧 Combate, atributos, perícias, inventário                                 | A vida existe (`hpMax`/`hpCurrent`, editável por `actor:update`), mas nada a muda no jogo: sem dano, cura nem tool para a IA |
| 5   | 🚧 Cenas e sessões                                                          | Só existe um thread de chat por mundo                                                                                        |
| 6   | 🚧 Tool de leitura de estado para a IA                                      | Estado só chega por layers a cada turno                                                                                      |
| 7   | 🚧 Imagem em culture/language                                               | Escopos de imagem: só `world` e `actor`                                                                                      |
| 8   | 🚧 Paginação em qualquer `list*`                                            | Devolve tudo; aceitável no escopo single-player                                                                              |
| 9   | 🚧 Limpeza do thread do Mastra ao apagar mundo                              | Conversas órfãs em `storage.db`                                                                                              |
| 10  | 🚧 `party:update`                                                           | Por desenho: a party não tem campos editáveis                                                                                |
| 11  | ⚠️ `.env` não vai no build; sem `.env.example`; `dotenv` sem uso confirmado | Em produção a chave deve vir de `aiSetting:update`                                                                           |
| 12  | ⚠️ Nenhum teste automatizado                                                | Não há script `test` em `package.json`                                                                                       |
| 13  | ⚠️ NPC Creator e memória fixos em Google                                    | Exigem `GOOGLE_API_KEY` mesmo se o narrador usar outro provider                                                              |
| 14  | ⚠️ Mensagens de erro em inglês                                              | Zod e serviços devolvem inglês; a tradução é responsabilidade da UI                                                          |
| 15  | ⚠️ `aiSettingService.resolve()` não é rota                                  | Por segurança: devolve a chave em claro e nunca deve cruzar o IPC                                                            |

---

## 11. Apêndice

### 11.1 Índice dos 37 canais

| #   | Canal                    | Entrada                         | Saída                      |
| --- | ------------------------ | ------------------------------- | -------------------------- |
| 1   | `world:list`             | `WorldFilter \| undefined`      | `World[]`                  |
| 2   | `world:get`              | `string`                        | `World`                    |
| 3   | `world:create`           | `CreateWorld`                   | `World`                    |
| 4   | `world:update`           | `{ id, patch: UpdateWorld }`    | `World`                    |
| 5   | `world:delete`           | `string`                        | `void`                     |
| 6   | `world:clone`            | `{ sourceWorldId, name? }`      | `World`                    |
| 7   | `world:setImage`         | `{ id, data: Uint8Array }`      | `string`                   |
| 8   | `world:removeImage`      | `string`                        | `void`                     |
| 9   | `culture:listByWorld`    | `string`                        | `Culture[]`                |
| 10  | `culture:get`            | `string`                        | `Culture`                  |
| 11  | `culture:create`         | `CreateCulture`                 | `Culture`                  |
| 12  | `culture:update`         | `{ id, patch: UpdateCulture }`  | `Culture`                  |
| 13  | `culture:delete`         | `string`                        | `void`                     |
| 14  | `language:listByWorld`   | `string`                        | `Language[]`               |
| 15  | `language:get`           | `string`                        | `Language`                 |
| 16  | `language:create`        | `CreateLanguage`                | `Language`                 |
| 17  | `language:update`        | `{ id, patch: UpdateLanguage }` | `Language`                 |
| 18  | `language:delete`        | `string`                        | `void`                     |
| 19  | `actor:listByWorld`      | `string`                        | `Actor[]`                  |
| 20  | `actor:get`              | `string`                        | `Actor`                    |
| 21  | `actor:create`           | `CreateActor`                   | `Actor`                    |
| 22  | `actor:update`           | `{ id, patch: UpdateActor }`    | `Actor`                    |
| 23  | `actor:delete`           | `string`                        | `void`                     |
| 24  | `actor:setImage`         | `{ id, data: Uint8Array }`      | `string`                   |
| 25  | `actor:removeImage`      | `string`                        | `void`                     |
| 26  | `party:findByWorld`      | `string`                        | `Party \| undefined`       |
| 27  | `party:create`           | `{ worldId }`                   | `Party`                    |
| 28  | `party:delete`           | `string`                        | `void`                     |
| 29  | `party:listMembers`      | `string`                        | `Actor[]`                  |
| 30  | `party:addMember`        | `{ partyId, actorId }`          | `Actor`                    |
| 31  | `party:removeMember`     | `{ partyId, actorId }`          | `Actor`                    |
| 32  | `aiSetting:catalog`      | `undefined`                     | `AiProviderCatalogEntry[]` |
| 33  | `aiSetting:get`          | `undefined`                     | `AiSettingView`            |
| 34  | `aiSetting:update`       | `UpdateAiSetting`               | `AiSettingView`            |
| 35  | `aiSetting:clearApiKey`  | `undefined`                     | `AiSettingView`            |
| 36  | `gameMaster:takeTurn`    | `{ worldId, message }`          | `string`                   |
| 37  | `gameMaster:listHistory` | `string`                        | `CampaignMessage[]`        |

Conferência rápida do total: `grep -cE "^  '[a-zA-Z]+:[a-zA-Z]+': channel<" src/shared/ipc-contract.shared.ts` deve imprimir `37`.

### 11.2 Como adicionar um canal

O compilador falha até os três passos estarem prontos (detalhes em [`rules.md`](./rules.md#ipc)):

1. Declare em `ipcContract` (`src/shared/ipc-contract.shared.ts`) com `channel<Entrada, Saída>()`.
2. Implemente em `src/main/ipc/<dominio>.ipc.ts` com `route(zodSchema, (input) => service.metodo(...))`. O handler é fino, depende de **interface** de serviço e nunca faz parse. Um domínio novo é ligado em `@module/ipc.module.ts`.
3. Chame no renderer: `await window.api.invoke('dominio:acao', input)`.

Se a entidade ganhar imagem: escopo em `IMAGE_SCOPES`, coluna `image_path` (+ `db:generate`), omitir dos schemas, registrar `ImageService` e o dono do sweep em `@module/image.module.ts`, e criar `<dominio>:setImage` / `<dominio>:removeImage`.

### 11.3 Glossário

| Termo       | Significado                                                        |
| ----------- | ------------------------------------------------------------------ |
| Engine      | Código no main que decide regras, dados e estado. Fonte da verdade |
| Narrator    | Agente de IA que narra a campanha                                  |
| Template    | Mundo com `isTemplate: true`, feito para ser clonado               |
| Campanha    | Mundo com `isTemplate: false` (normalmente um clone)               |
| Jogador     | `actor` com `isNpc: false` (no máximo 1 por mundo)                 |
| Layer       | Arquivo `.md` que compõe o system prompt de um agente              |
| Thread      | Conversa persistida no Mastra: `campaign-<worldId>`                |
| OpenUI Lang | Linguagem de saída que o LLM usa para descrever UI                 |
