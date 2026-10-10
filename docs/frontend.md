# Frontend Rules

Padrões e recomendações do renderer (`src/renderer/src`, alias `@renderer`). Complementam `CLAUDE.md` e `docs/rules.md`, que definem os processos, a fronteira renderer ↔ main e o contrato de IPC. Onde este arquivo e o `rules.md` divergirem, vale o `rules.md`.

O renderer é só a interface. A engine (no main) decide e calcula, a IA narra, e o renderer **mostra o estado e dispara ações**. Esse princípio vale para toda decisão abaixo.

## 1. Estrutura do renderer

```
src/renderer/
├── index.html
└── src/
    ├── assets/         # imagens, fontes e o CSS global (apenas tema/tokens do Tailwind)
    ├── components/
    │   ├── custom/     # componentes nossos (composições e criados do zero)
    │   └── ui/         # componentes do shadcn-vue (gerados pelo CLI)
    ├── composable/     # lógica de domínio usada pelos componentes
    ├── constant/       # constantes da UI
    ├── lib/            # utilitários do shadcn-vue (`cn`)
    ├── page/           # páginas (uma por rota)
    ├── router/         # vue-router: rotas e navegação
    ├── store/          # stores Pinia (estado compartilhado)
    ├── template/       # layout base (header, sidebar, barra de título...)
    ├── util/           # funções puras de apoio
    ├── view/           # seções de uma página
    ├── App.vue
    ├── env.d.ts
    └── main.ts
```

As pastas são criadas **quando surgem pela primeira vez** (como no resto do projeto). Hoje existem `assets`, `components/ui`, `components/custom`, `composable`, `constant`, `lib`, `page`, `router`, `template` e `view`. `components/Versions.vue` é resto do template do electron-vite.

Não há `service/` nem `boot/` no renderer. A camada de acesso a dados é o próprio contrato de IPC (`window.api.invoke`, tipado por `ipcContract`). Uma lib global que precise iniciar antes do app montar é inicializada no `main.ts`; só crie uma pasta `boot/` se aparecerem várias.

### Aliases

Só existem `@renderer` e `@renderer/*` (e `@shared`). **Não crie alias por pasta** (`@composable`, `@util`, `@constant`...): os nomes `@lib`, `@util` e `@constant` já são aliases do main e se confundiriam. Importe sempre `@renderer/<pasta>/...`.

### Nomes de arquivo

Componentes Vue são `PascalCase.vue` (isenção do `rules.md`) e o papel aparece no nome. Os `.ts` seguem `<name>.<domain>.ts`.

| Pasta               | Arquivo                | Exemplo                                    |
| ------------------- | ---------------------- | ------------------------------------------ |
| `components/custom` | `PascalCase.vue`       | `WorldCard.vue`                            |
| `components/ui`     | nomes originais do CLI | `Button.vue`                               |
| `page`              | `<Name>Page.vue`       | `WorldsPage.vue`                           |
| `view`              | `<Section>View.vue`    | `view/worlds/WorldListView.vue`            |
| `template`          | `<Name>Template.vue`   | `MainTemplate.vue`                         |
| `composable`        | `<name>.composable.ts` | `world.composable.ts` (exporta `useWorld`) |
| `store`             | `<name>.store.ts`      | `party.store.ts` (exporta `usePartyStore`) |
| `router`            | `<name>.router.ts`     | `app.router.ts`                            |
| `constant`          | `<name>.constant.ts`   | `navigation.constant.ts`                   |
| `util`              | `<name>.util.ts`       | `format-modifier.util.ts`                  |
| tipos da UI         | `<name>.type.ts`       | `world.type.ts`                            |
| mappers             | `<name>.mapper.ts`     | `world.mapper.ts`                          |

Pastas de views são agrupadas por página: `view/worlds/WorldListView.vue`.

### Barrels

Pasta de código do renderer tem `index.ts` reexportando seu conteúdo por alias, nunca por caminho relativo:

```ts
export * from '@renderer/composable/world.composable'
export { default as WorldCard } from '@renderer/components/custom/WorldCard.vue'
```

`export *` não reexporta o `default` de um `.vue`, por isso o segundo formato. `components/ui/*` é gerado pelo shadcn-vue e já traz os próprios `index.ts`: não mexa.

Arquivos **na mesma pasta** se importam por `./arquivo`, nunca pelo `index.ts`/alias da própria pasta (evita import circular).

## 2. shadcn-vue primeiro

A UI é montada com shadcn-vue (estilo `reka-nova`, configurado em `components.json`). **Não invente componentes** que a biblioteca já oferece.

Fluxo ao precisar de um elemento de UI:

1. **Veja se já está instalado:** `ls src/renderer/src/components/ui`. O projeto já tem dezenas de itens (button, card, dialog, field, input, tabs, sonner, chart, empty, bubble, attachment...).
2. **Procure no registry** (MCP `shadcnVue`, se disponível, ou https://www.shadcn-vue.com). Se existir, adicione com `bunx shadcn-vue@latest add <component>`, sem `--overwrite`.
3. **Se não existir, componha:** monte um componente unindo itens do shadcn-vue (ex.: `WorldCard` = `Card` + `Badge` + `Button`).
4. **Só crie do zero** (tags + Tailwind) quando nada acima resolver.

Regras de uso:

- Personalize por `class` (utilitárias do Tailwind) e pelas `variants` do componente, não editando `components/ui`.
- Componentes nossos ficam em `components/custom/`, fora de `components/ui`.
- Extraia um componente próprio só com repetição real ou candidato claro a reuso. Sem wrappers vazios em volta de um componente shadcn-vue.
- Ícones: `@lucide/vue`. Toasts: `vue-sonner` (o `Toaster` vem de `components/ui/sonner`).
- Classes condicionais: `cn()` de `@renderer/lib/utils`.

## 3. Arquitetura em camadas

```
page ─▶ view ─▶ component ─▶ composable ─▶ store (opcional)
                                  │
                                  └──────▶ window.api.invoke  ─▶ IPC ─▶ engine (main)
```

Cada camada fala só com a logo abaixo. **Componentes, views e pages nunca chamam `window.api` diretamente.**

### `composable/`: lógica de domínio

- Cada composable é uma lógica de domínio e o **ponto único** pelo qual os componentes acessam dados e ações dela. Pode ser reaproveitado por vários componentes.
- Chama a engine por `window.api.invoke` (via `useRequest`, abaixo), guarda o resultado e expõe estado e funções prontos para a UI.
- Estado de uma única tela fica em `ref`/`reactive` dentro do composable. Estado compartilhado entre telas ou componentes distantes vai para uma store (próxima seção).

```ts
// composable/world.composable.ts
import { ref } from 'vue'
import type { World, WorldFilter } from '@schema'
import { useRequest } from '@renderer/composable/request.composable'

export function useWorld() {
  const { isLoading, request } = useRequest()
  const worlds = ref<World[]>([])

  async function loadWorlds(filter?: WorldFilter) {
    worlds.value = (await request('world:list', filter)) ?? []
  }

  return { worlds, isLoading, loadWorlds }
}
```

### Chamadas ao IPC, erros e loading

- Toda chamada resolve em `IpcResponse<T>` e **nunca rejeita** (ver `rules.md`, "IPC"). Nenhum `try/catch` em volta de `invoke` para tratar erro de negócio: leia `response.ok`.
- Os composables fazem as chamadas por um `useRequest` (`request.composable.ts`): controla `isLoading`, transforma a falha em toast e devolve o `data` ou `undefined`. Esboço (confira com o typecheck e com a API do `vue-sonner`):

```ts
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { IpcChannel, IpcInputArgs, IpcOutput } from '@shared'

export function useRequest() {
  const isLoading = ref(false)

  async function request<TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ): Promise<IpcOutput<TChannel> | undefined> {
    isLoading.value = true
    try {
      const response = await window.api.invoke(channel, ...input)
      if (response.ok) return response.data
      toast.error(response.error.message)
      return undefined
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, request }
}
```

- Trate por `error.kind` quando a UI precisar de algo além do toast:

| `kind`          | O que fazer                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `invalid_input` | Mapear `error.issues[].path` para os campos do formulário (`vee-validate`) |
| `not_found`     | Estado vazio/"não encontrado" na tela, e atualizar a lista                 |
| `conflict`      | Mensagem ao usuário (ex.: nome já existe); não repetir a chamada           |
| `forbidden`     | Mensagem ao usuário                                                        |
| `internal`      | Toast genérico (a mensagem já vem genérica; o detalhe fica no log do main) |

- Chamadas lentas (`gameMaster:takeTurn` espera um LLM) precisam de estado de loading visível e de bloquear envio duplo.
- Depois de uma mutação, use o que a engine devolveu (ou recarregue). **Nunca recalcule localmente** o resultado de `update`/`create`.

### `store/`: Pinia

- `pinia` ainda **não está instalado**. Pergunte ao usuário antes de adicionar.
- Use sempre que o dado for global ou usado por muitos componentes aninhados ou diferentes (ex.: mundo e grupo ativos). Guarda e organiza estado compartilhado, sem chamar `window.api` (quem chama é o composable).
- A engine é a fonte da verdade. A store é só um espelho do que a engine devolveu.

### Tipos e mappers

- Os tipos do contrato vêm de `import type { ... } from '@schema'` / `@shared`. Não os redeclare no renderer. `import type` é a única exceção à regra de que o renderer não importa de `src/main` (some no build).
- Se a UI precisa de outro formato (ex.: um card que junta mundo + grupo), crie um modelo da UI em `composable/<domain>.type.ts` e converta por função pura em `composable/<domain>.mapper.ts`. O componente consome o modelo da UI.
- Quando o contrato mudar, o ajuste fica no tipo e no mapper do domínio; componentes, views e pages não mudam.
- Canal ou campo que a tela precisa e **ainda não existe** no `ipcContract`: não invente. Mock dentro do composable, com o comentário `Proposed: channel not in ipcContract yet`, e liste no relatório final.

### Imagens

- A UI mostra imagem de entidade com `toImageUrl(imagePath)` de `@shared`. Nunca monte a URL na mão nem importe arquivo de `docs/`.
- Para trocar a imagem, o renderer envia os bytes: `request('actor:setImage', { id, data: new Uint8Array(await file.arrayBuffer()) })`. Nunca um caminho.

### Segredos

- Chave de API nunca está no renderer. `aiSetting:get` só informa **se** há chave; a chave só trafega do renderer ao main no `aiSetting:update`, digitada pelo usuário, e não deve ficar em store, log nem `localStorage`.

### Componentes, views e pages: burros em lógica

- Componentes sabem **o que e como renderizar**, nada além. Sem regra de negócio, sem `window.api`, sem cálculo de domínio.
- **Nada de regra de jogo na UI:** sem `Math.random()` para dados, sem cálculo de modificador, dano, HP ou resultado de teste. Mostre os valores que a engine devolve. Formatar (ex.: `+3`) é permitido e vai em `util/`.
- Dados e ações vêm de composables. A UI consome e dispara.

### `router/`

- `vue-router` ainda **não está instalado**. Pergunte antes de adicionar e confirme a API na documentação oficial.
- O build empacotado carrega via `file://`, então o histórico deve ser por hash (`createWebHashHistory`), não por path.
- Navegue com `RouterLink` / `useRouter`. Nada de `window.location` nem `<a href>` interno.

### `template/`

Layout base da aplicação: barra de título, sidebar, header e demais estruturas compartilhadas, com `<RouterView />`. As pages renderizam dentro dele.

### `page/` e `view/`

- Toda tela nova vira uma **page** em `page/`, ligada a uma rota.
- A page é dividida em **views** (as seções), em `view/<page>/`. Cada view usa componentes shadcn-vue ou nossos.
- Exemplo: `WorldsPage.vue` é composta por `WorldHeroView.vue`, `WorldListView.vue` e `WorldCtaView.vue`.
- A page apenas organiza as views. Se uma view precisa de dados, usa um composable.

## 4. Narrador e UI gerada (pendente)

O narrador responde por `gameMaster:takeTurn` (resposta inteira) ou por `gameMaster:streamTurn` (a narração chega aos poucos em `gameMaster:turnEvent`, ouvido com `window.api.on`; ver `api.md` §5.8) e o histórico vem de `gameMaster:listHistory`. O back já ensina OpenUI Lang ao narrador a partir de `NARRATOR_UI_COMPONENTS` (`@shared`), separa prosa de blocos de UI em tempo real (`delta` com `segment` e `kind`), valida cada bloco e devolve `segments` no histórico. **O renderer ainda não tem** a library com os componentes Vue, o `<Renderer>` nem o consumo dos eventos.

Antes de construir a tela de chat ou qualquer UI gerada pela IA, alinhe o desenho com o usuário. Princípios que já valem:

- Quando o narrador pedir uma rolagem ou teste, o botão da UI chama a **engine** (via um canal IPC a ser criado) e devolve o resultado ao narrador. O cliente nunca rola nem calcula.
- A mensagem do narrador é texto; qualquer estrutura além disso passa por um contrato explícito, não por parsing solto no componente.
- Componentes de chat reaproveitam o que o shadcn já traz (`bubble`, `attachment`, `empty`).

## 5. Reaproveite antes de criar

- Use **VueUse** (`@vueuse/core`) quando houver composable pronto (`useStorage`, `useDebounceFn`, `useElementSize`, `useMediaQuery`...). Não reimplemente.
- Antes de escrever utilitário ou lógica nova, verifique as libs já instaladas no `package.json`: `reka-ui`, `@lucide/vue`, `vee-validate` + `zod` (formulários e validação), `vue-sonner`, `embla-carousel-vue`, `@unovis/vue` (gráficos), `clsx`, `tailwind-merge`, `class-variance-authority`.
- Para adicionar uma dependência, confirme que nenhuma instalada resolve e avise o usuário. Fontes entram como pacote (Fontsource), nunca por CDN: o CSP do `index.html` bloqueia origens externas e o app é local.

## 6. Código organizado e limpo

- Legibilidade e organização vêm antes de otimização, em pastas, arquivos e código.
- Nomes claros, em inglês, que dizem o que a coisa é ou faz. Funções pequenas com uma única responsabilidade. O texto da UI (labels, títulos) fica em português, como no design.
- Sem pastas ou arquivos desnecessários, sem aninhamento excessivo, sem estrutura "para o futuro".
- Siga o padrão que já existe no projeto antes de introduzir outro.
- `<script setup lang="ts">`, props tipadas (`defineProps<...>()`). Estilo do código: aspas simples, sem ponto e vírgula, largura 100, sem vírgula final.
- Estilo somente com utilitárias do Tailwind. Nada de classes em `.css` nem blocos `<style>` (o `base.css` é só para tema e tokens).
- Confirme a API de qualquer lib na documentação oficial antes de usar (Vue, Tailwind, reka-ui, shadcn-vue, Vue Router, VueUse).
