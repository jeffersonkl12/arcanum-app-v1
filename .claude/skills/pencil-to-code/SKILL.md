---
name: pencil-to-code
description: Extrai informações do arquivo .pen (Pencil / pen.dev) e transforma em código Vue do renderer do Arcanum - tokens Tailwind v4 em base.css, componentes shadcn-vue, componentes compostos, views, pages e templates. Use quando o usuário pedir para implementar, converter, portar ou sincronizar um design, tela, frame, componente ou token do .pen (docs/designe.pen) para código.
---

# pencil-to-code

Converte o design do `.pen` em código **seguindo as regras deste projeto**. Os guias do próprio Pencil (`guide/code.md`, `guide/tailwind.md`) assumem React, valores arbitrários e CSS em `:root`. Aqui eles valem só para a **extração**. Na hora de escrever código, as regras do projeto vencem (ver "Conflitos com os guias do Pencil").

Todo o código gerado vive no **renderer** (`src/renderer/src`, alias `@renderer`). Esta skill nunca toca `src/main`, `src/preload` nem `src/mastra`.

## 0. Antes de começar

1. Garanta que `CLAUDE.md`, `AGENTS.md` e `docs/rules.md` estão no contexto. Definem processos, aliases, nomes de arquivo, barrels e a fronteira renderer ↔ main.
   **Leia também `docs/frontend.md` (obrigatório).** É a especificação do renderer: estrutura de pastas, nomes, camadas (page → view → component → composable → IPC), tratamento de `IpcResponse`, tipos, imagens e o que não fazer na UI. Esta skill só cobre a extração do `.pen`; **onde colocar e como escrever o código vem do `docs/frontend.md`**, e este arquivo não o repete. Se algo aqui divergir dele, vale o `docs/frontend.md`.
2. Carregue as referências do Pencil com `mcp__pencil__read_skill`: `pen-schema.md`, `execute.md` e `guide/components.md`. Se as ferramentas `mcp__pencil__*` não tiverem schema, carregue-as via ToolSearch.
3. Se o servidor `pencil` não estiver conectado (as ferramentas `mcp__pencil__*` não existem), **pare e avise o usuário**. Não tente contornar lendo o arquivo.
4. Arquivos `.pen` são criptografados: **nunca** use Read/Grep neles. Acesse só pelas ferramentas do MCP, sempre passando `filePath` (`docs/designe.pen`).
5. Rode `get_app_state` para saber o arquivo ativo, a seleção atual, os componentes reutilizáveis e as telas.
6. Defina o escopo com o usuário se estiver ambíguo: tokens, um componente, uma tela ou o arquivo inteiro. Se houver nós selecionados, o escopo é a seleção.
7. Inspecione o estado real do renderer antes de decidir qualquer coisa: `ls src/renderer/src/components/ui` (shadcn já instalados), `src/renderer/src/components`, `composable`, e se `vue-router` / `pinia` estão no `package.json`. Não assuma o que existe.

O fluxo é incremental: **tokens → componentes → views → page → template/rota**. Valide cada etapa antes de seguir para a próxima.

## 1. Tokens (variáveis do .pen → Tailwind v4)

Leia: `Print(GetVariables())` (em `execute`).

Destino: `src/renderer/src/assets/base.css`, o CSS apontado por `components.json > tailwind.css`. `main.css` só importa o `base.css`; não coloque tokens nele. Confira o `components.json` antes de rodar `shadcn-vue add`, senão o CLI pode criar um segundo CSS.

Fluxo:

1. **Mapeie para tokens shadcn existentes primeiro.** O `base.css` já tem `background`, `foreground`, `card`, `primary`, `muted-foreground`, `border`, `destructive`, `ring`, `sidebar-*`, `radius` etc. Se a variável do design tem o mesmo papel, **altere o valor do token existente** em vez de criar outro. Assim os componentes shadcn já saem com a cara do design sem sobrescrever classes em cada uso.
   - Exemplos (confirme pelo papel no design): `text-primary` → `foreground`, `text-secondary` → `muted-foreground`, `surface` → `card`, `destructive` → `destructive`, `border` → `border`, cor de destaque/CTA → `primary`.
2. **Crie token novo** só para o que não tem equivalente (ex.: `surface-2`, `border-strong`, `gold-bright`, `text-tertiary`): defina `--<name>` em `:root`/`.dark` e exponha em `@theme inline` como `--color-<name>: var(--<name>)`. Vira utilitária (`bg-surface-2`).
3. **Fontes** (`font-heading`, `font-body`): `--font-heading`/`--font-body` dentro de `@theme inline` (Tailwind v4 aceita pilha de fontes com vírgulas ali), gerando `font-heading`/`font-body`.
   - **Não use `<link>` do Google Fonts nem `@import url(https://...)`.** O CSP do `index.html` (`default-src 'self'`) bloqueia fontes externas, e o app é local/offline.
   - Instale a fonte como pacote (`@fontsource` / `@fontsource-variable`, confira o nome na documentação do Fontsource) e importe o CSS dele no `main.ts` ou no `base.css`. O Vite empacota os arquivos e o `@font-face` sai do pacote, não do projeto.
   - Fonte nova é dependência nova: diga ao usuário qual pacote vai adicionar.
4. **Números** (`radius-card`, `radius-sm`, espaçamentos): `--radius-*`/`--spacing-*` no `@theme`. Cuidado: o `base.css` já define `--radius` e a escala `--radius-sm…4xl` derivada dele. Prefira ajustar `--radius` a criar escala paralela. Valor que já existe na escala do Tailwind (múltiplo de 4px) não precisa de token.
5. **Cores**: converta para `oklch` (padrão do arquivo). Se não conseguir converter com precisão, mantenha o hex em vez de aproximar.
6. **Temas**: o `.pen` pode ter só um tema (ex.: só escuro). Hoje o `base.css` tem `:root` (claro) e `.dark` com `@custom-variant dark`, e **nada no app aplica a classe `.dark`**. Se não houver eixo de tema no design, **pergunte ao usuário** se o design vira o `.dark` (e quem aplica a classe), o `:root` ou ambos. Não decida em silêncio, pois afeta o app inteiro.
7. **Resíduos do template do electron-vite**: `base.css` e `main.css` ainda têm variáveis `--ev-c-*`, `--color-background-soft/mute` e regras de `body` (flex centralizado, `overflow: hidden`, `user-select: none`, `background: var(--ev-c-white)`) que **sobrescrevem o design**. Ao aplicar tokens, liste o que conflita e proponha remover; só remova o que o código novo substituir, e apenas com o aval do usuário se ainda houver código usando (`Versions.vue`, `App.vue`).
8. **Valores soltos** (hex ou número hardcoded no design, sem `$variavel`): liste-os. Se aparecem em vários lugares, proponha um token. Se for pontual, é exceção aceitável apenas para largura/altura.

```js
Get(screenId, n => typeof n.fill === "string" && !n.fill.startsWith("$") && Print(n.id, n.name, n.fill))
```

Nunca invente token: todo token novo deve ter origem no design ou justificativa explícita.

## 2. Componentes (reusables do .pen → shadcn-vue ou composição)

### 2.1 Inventário

```js
Get(n => n.reusable && Print(n.id, n.name))
Get(screenId, n => n.type === "ref" && Print(n.ref, n.name))
```

Para cada componente reutilizável, registre: quantas instâncias existem nas telas do escopo, quais `descendants` são sobrescritos (viram props/slots) e se algum filho é desativado por alguma instância (`enabled: false`).

### 2.2 Decisão (nesta ordem)

1. **Já está instalado em `components/ui`?** Use direto. O projeto usa o estilo `reka-nova` e já tem dezenas de itens (accordion, alert, avatar, badge, button, card, dialog, field, input, tabs, ...). Confira com `ls` antes de adicionar.
2. **Existe no registry do shadcn-vue?** Consulte o MCP `shadcnVue` se estiver disponível (`search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`) ou a documentação em https://www.shadcn-vue.com. Se existir, instale com `bunx shadcn-vue@latest add <item>` (sem `--overwrite`, para não apagar customização) e mapeie variantes/tamanhos. Ex.: Primary Button → `Button` (variant default), Outline Button → `Button` (variant outline), Icon Button → `Button` (size icon), Badge → `Badge`, Avatar → `Avatar`, Tab Item → `Tabs`, Input/Textarea Group → `Field` + `Input`/`Textarea`.
3. **Não existe, mas é composição?** Monte um componente em `src/renderer/src/components/custom/<PascalCase>.vue` compondo itens do shadcn-vue. Ex.: `WorldCard.vue` → `Card` + `Badge` + `Button`.
4. **Só crie do zero** (tags + Tailwind) quando nada acima resolver.
5. Se a diferença visual for só de cor/raio/fonte, resolva nos **tokens** (seção 1), não em classes repetidas.
6. Antes de criar, procure se o componente já existe (`components/`, `view/`, `page/`). Se existir, atualize em vez de duplicar.

Não edite arquivos de `components/ui` para customizar (são gerados e um `add` posterior pode sobrescrevê-los). Use `class` e variantes.

### 2.3 Extração

Processe **um componente por vez** e valide antes do próximo:

```js
Print(Get(componentId, {depth: 5}))
Print(Get(componentId, {depth: 5, includePathGeometry: true}))
```

- **Props**: cada propriedade sobrescrita por alguma instância vira prop tipada (`defineProps<...>()`). Sobrescrita de texto → prop de string. Filho `enabled:false` em alguma instância → conteúdo condicional (`v-if` / prop opcional). Filho que nenhuma instância desativa → sempre renderiza.
- **Slots**: frames marcados com `slot` ou que instâncias substituem por árvore completa viram `<slot />`.
- **Estados** (hover, ativo, selecionado) que aparecem como variantes no design viram prop de variante, não componentes separados.
- **SVG** (`path`): use o `geometry` exato (`includePathGeometry`). Nunca aproxime. Ícones **não** são SVG: veja a tabela abaixo.
- **Imagens**: as imagens do `.pen` (ex.: `docs/images/*`) são placeholders de design. **Não as importe no app.** Imagem de entidade (ator, mundo, ...) vem do `imagePath` da entidade, exibida com `toImageUrl(imagePath)` de `@shared` (`arcanum-image://local/...`). Se a entidade ainda não tem `image_path`, avise o usuário (ver `docs/rules.md`, "Local data") em vez de embutir o arquivo. Ilustração decorativa fixa do app (não é dado do usuário) pode ir em `assets/`.

## 3. Conversão de layout e estilo (pen → Tailwind)

Só utilitárias do Tailwind. Nada de `style=""`, `<style>` ou classe CSS própria.

| Pencil | Tailwind |
| --- | --- |
| `layout: "vertical"` | `flex flex-col` |
| `layout: "horizontal"` (padrão de frame) | `flex` |
| `layout: "none"` + `x`/`y` | `relative` no pai + `absolute` no filho (sinalize ao usuário; evite se um layout resolver) |
| `gap: N` | `gap-{N/4}` |
| `padding: N` / `[v,h]` / `[t,r,b,l]` | `p-` / `py- px-` / `pt- pr- pb- pl-` com `N/4` |
| `justifyContent: start/center/end/space_between/space_around` | `justify-start/center/end/between/around` |
| `alignItems: start/center/end` | `items-start/center/end` |
| `width/height: "fill_container"` | eixo principal do pai flex: `flex-1`; senão `w-full` / `h-full` (`h-full` exige altura na cadeia de pais) |
| `width/height: "fit_content"` | `w-fit` / `h-fit` (ou omitir) |
| `width/height: N` | classe de escala (`w-64`) se `N/4` existir na escala, senão **exceção permitida** `w-[Npx]` |
| `clip: true` | `overflow-hidden` |
| `cornerRadius` | `rounded-*` usando token |
| `stroke` + `strokeWidth` | `border` + `border-<token>` (por lado: `border-b` etc.) |
| `effect` shadow / blur | `shadow-*` / `blur-*` (token se customizado) |
| `fill: "$token"` | `bg-<token>` / `text-<token>` |
| `opacity` | `opacity-*` |
| text `fontSize` / `fontWeight` / `lineHeight` (razão) / `letterSpacing` | `text-*` / `font-*` / `leading-*` / `tracking-*` (token se fora da escala) |
| text `textGrowth: fixed-width` | sem classe de largura; deixe o pai controlar |
| `fontFamily: "$font-heading"` | `font-heading` |
| `icon` (lucide, nome em kebab-case) | componente de `@lucide/vue` em PascalCase (`wand-sparkles` → `WandSparkles`), tamanho do nó em `size-*` |

Espaçamento: a escala do Tailwind é de 4px. Um valor fora da escala (ex.: 14, 18) **não** vira `p-[14px]`: use o token mais próximo se o design permitir, ou registre um token no `@theme` se o valor for sistemático. Valor arbitrário só é aceito para **largura/altura** pontuais.

Mantenha os textos, ícones e espaçamentos **iguais aos do design**. Use `cn()` de `@renderer/lib/utils` para classes condicionais.

## 4. Telas → template, page e views

Estrutura, nomes e papéis de `template/`, `page/` e `view/` estão em `docs/frontend.md` (seções 1 e 3). Aqui só o que é da extração:

1. **Template** (`MainTemplate.vue`): compare as telas e extraia o que se repete (sidebar, header, barra de título) para o template base, com `<RouterView />`.
2. **Page** (`<Name>Page.vue`): uma por tela. Só organiza views.
3. **Views** (`view/<page>/<Section>View.vue`): cada seção de primeiro nível da tela. Nomeie pelo papel (`WorldListView`, `WorldHeroView`), não pela posição.
4. **Telas que são estados/passos do mesmo fluxo** (ex.: "Criar Personagem", "- Habilidade", "- Inventario"; "Iniciar Campanha (1/2/3)"): normalmente é uma page com views por passo ou rotas filhas. **Pergunte** qual estrutura o usuário prefere antes de gerar.
5. **Dependências que faltam**: `vue-router` e `pinia` não estão instalados (confira o `package.json`). Antes da primeira page, diga ao usuário e só instale com o aval dele.

## 5. Dados e fronteira com a engine

Detalhes (camadas, `useRequest`, erros por `kind`, tipos, mappers, imagens, segredos) estão em `docs/frontend.md`, seção 3. O que importa na extração:

1. O design mostra números (HP, dados, modificadores, perícias, resultados de teste) e dados de exemplo (nomes, mundos, personagens). **Nada disso é escrito no componente.** Os valores vêm da engine por composable; a UI não calcula regra de jogo.
2. Procure em `src/shared/ipc-contract.shared.ts` o canal que serve a tela (`world:list`, `actor:listByWorld`, `party:findByWorld`, `gameMaster:takeTurn`...). Se existe, use-o pelo composable. Se não existe, mock **dentro do composable** com o comentário `Proposed: channel not in ipcContract yet`, e avise o usuário.
3. **Nunca invente canais IPC nem mexa em `src/main`** por conta própria. Liste no relatório final cada canal que falta (nome `domain:action`, entrada, saída). Criá-lo é trabalho da engine (ver `docs/rules.md`, "IPC") e só com pedido explícito.
4. Streaming (narrador digitando), eventos main → renderer e UI gerada pela IA ainda não existem (`docs/frontend.md`, seção 4). Telas de chat/narração usam o que o contrato já oferece (`gameMaster:takeTurn`, `gameMaster:listHistory`) ou mock no composable. Avise, não improvise com `ipcRenderer`.
5. **Textos da UI** (labels, títulos) são conteúdo, não código: mantenha-os como estão no design, mesmo em português. Já nomes de arquivos, componentes, variáveis, props e tipos são sempre em inglês (ex.: tela "Mundos" → `WorldsPage.vue`; "Criar Personagem" → `CreateCharacterPage.vue`).

## 6. Escrita

Ordem: tokens → `shadcn-vue add` → componentes compostos → views → page → template/rota.

Siga `docs/frontend.md` para nomes de arquivo, aliases (`@renderer/...`, nunca relativo entre pastas), barrels, `<script setup lang="ts">`, estilo de código e reaproveitamento de libs (VueUse, vee-validate + zod, vue-sonner). Atualize o `index.ts` da pasta a cada arquivo novo. Confirme a API de qualquer lib na documentação oficial antes de usar.

## 7. Validação (por etapa, não só no fim)

1. **Visual**: `TakeScreenshot` do nó no Pencil e compare com o app rodando (skill `run`; é Electron, o script é `npm run dev`). Confira cores, tipografia, espaçamento, raio, ícones e textos.
2. **Contagem**: nº de instâncias de cada componente no design = nº no código. Props conferem com os overrides.
3. **Layout**: `fill_container` expande, `fit_content` ajusta, sem overflow horizontal. Use `Get(screenId, (n, c) => c.problems && Print(n.name, c.problems))` para achar nós cortados no design. Lembre que a janela do Electron tem tamanho mínimo/redimensionável: teste em mais de um tamanho.
4. **Regras do projeto** (confira com Grep em `src/renderer/src`, excluindo `components/ui`):
   - sem `style=` nem `<style>` nos arquivos gerados;
   - sem `\[\d+px\]` fora de largura/altura;
   - sem hex/`rgb()` hardcoded em classes (`bg-[#...]`): sempre token;
   - sem import relativo entre pastas (`from '\.\./`);
   - nenhum import de runtime das camadas do main (`@service`, `@repository`, `@database`, `@ipc`, `@module`, `@lib`, `@config`, `@util`, `@constant`, `@error`); só `import type` e `@shared`;
   - nenhum `window.api` / `ipcRenderer` dentro de componente em `components/` (só em composables);
   - nenhuma imagem de `docs/` importada.
5. **Build**: `npm run typecheck` (node + `vue-tsc` do web) e `npm run lint`. O `npm run build` roda o typecheck antes de empacotar. Corrija erros antes de dar como concluído. Use sempre os scripts do `package.json`, não as ferramentas direto.
6. **Formatação**: o script `format` roda `prettier --write .` no repositório todo. Se a árvore tem mudanças alheias, formate só os arquivos criados com o Prettier apontando para eles.

## 8. Entrega

Resposta curta, sem criar arquivos de documentação das mudanças (a única edição de doc permitida é manter `docs/frontend.md` em dia quando você criar uma pasta nova do renderer). Relate:

- o que virou componente shadcn-vue, o que virou composição e o que foi criado do zero (e por quê);
- tokens alterados e tokens novos; dependências adicionadas (fontes, router);
- decisões que dependeram do usuário (tema, estrutura de passos, mocks, router);
- canais IPC que a tela precisa e ainda não existem;
- qualquer divergência entre design e código que você não conseguiu resolver.

## Conflitos com os guias do Pencil

| Guia do Pencil diz | Neste projeto |
| --- | --- |
| React, `.tsx` | Vue 3 SFC (`.vue`, `<script setup lang="ts">`) |
| "Use arbitrary values `[Npx]` when needed" | Tokens/escala do Tailwind. Arbitrário só para largura/altura pontual |
| `bg-[var(--color-x)]` | `bg-<token>` (token em `@theme inline`) |
| Variáveis em `:root`, "`@theme` só aceita custom properties" | `:root`/`.dark` + `@theme inline` (padrão shadcn); pilhas de fonte ficam em `@theme` |
| `.font-primary { ... }` em `@layer base` | `--font-*` no `@theme` (gera `font-*`); sem classes CSS próprias |
| Fonte por `@font-face`/Google Fonts | Pacote Fontsource importado pelo bundler (CSP bloqueia origem externa) |
| Componentes em `src/components/Name.tsx` | `src/renderer/src/components/custom/Name.vue`; `page/`, `view/` e `template/` nas pastas próprias do renderer (ver `docs/frontend.md`) |
| Recriar cada componente do design | shadcn-vue primeiro; compor depois; criar por último |
| Ícones como `<span>` de fonte | `@lucide/vue` |
| Imagens do design como assets | Imagem de entidade via `toImageUrl(imagePath)`; nada de `docs/images` no app |

## Armadilhas

- Não confie na memória do documento: o `.pen` pode ter mudado. Releia o nó antes de converter.
- `Get(document)` sem visitor falha. Use um visitor ou um id.
- Instâncias (`ref`) não têm `children` próprios: leia o componente de origem ou use `resolveInstances: true`.
- Nomes de nós no `.pen` podem estar em português ou conter prefixos (`component/`). Traduza para inglês ao nomear o código.
- Não use `Export(... "html-tailwind")` como código final: serve de referência visual, mas ignora shadcn-vue, tokens e a arquitetura do projeto.
- O `index.html` tem duas tags de CSP (a segunda libera `connect-src http://localhost:4111`). Ao adicionar algo que dependa de CSP (fonte, imagem, conexão), lembre que o navegador aplica a interseção das duas. Não afrouxe o CSP para fazer o design funcionar sem avisar o usuário.
- Esta skill é do projeto e vive direto em `.claude/skills/pencil-to-code/`. A pasta `.agents/skills` é das skills externas travadas por `skills-lock.json` (os symlinks em `.claude/skills` apontam para lá); não mova esta para lá.
