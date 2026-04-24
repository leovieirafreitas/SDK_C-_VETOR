# Pipeline GRAD FIXER: Illustrator → After Effects
## Gradientes Perfeitos em Vetores Complexos via GCky SDK (v19 — SplitGroup: Clip Mask via Merge Paths Intersect Nativo)
**Status:** ✅ FUNCIONANDO — layers + gradientes + clip masks nativas (Merge Paths Intersect dentro do VG) + textos editáveis + hierarquia perfeita + IDs únicos por sessão. SplitGroup exporta tudo em **1 única layer Vetores** incluindo shapes clipados.

---

## 1. Visão Geral (Arquitetura v15)

```
[ILLUSTRATOR — Passo 1]
    Botão "COMP": Cria Comp no AE baseada no Artboard (CriarComp.jsx)
    Botão "SPLIT": ExtrairGradiente.jsx (Roda Localmente)
    Extrai: nome, hierarquia (grupos), bounds (w, h), gradient stops, posições e curvas Bezier absolutas.
         ↓
    C:\AEGP\grad_data.json

[AFTER EFFECTS — Passo 2 (Turbo Shadow-Build)]
    SimularOverlord.jsx / SplitGroup.jsx
    - Pausa atualização da tela (app.beginUndoGroup).
    - Cria um TempComp Oculto no background.
    - Constrói shapes idênticos (solid, fill, hierarquia de bounds/grupos) super-rápido (< 10s).
    - Copia as camadas da TempComp para a Comp visível do usuário.
    - Aplica o Parentesco dinâmico via layer names.
         ↓
    layers prontas e agrupadas: "grad_1", "Grupo_1", ... na COMP_ATIVA.

[AFTER EFFECTS — Passo 3: Plugin C++ AEGP]
    Menu: Camada → "GRAD FIXER: Aplicar Gradientes"
         ↓
    C++ lê grad_data.json
    C++ lê o Template Lote (grad_batch_template.aepx)
    C++ gera UM ÚNICO AEPX em Lote (ae_batch_temp.aepx) injetando todos os GCkys sequencialmente nele.
    ExtendScript:
      1. Importa ae_batch_temp.aepx → obtém a Nova Comp com Todas as Camadas de Template (Lote)
      2. Loopa pelo JSON extraído do C++ e para cada layer do Comp template importado:
      3. Lê o Shape Value da layer original nativa do Overlord
      4. Remove Rect + Stroke da respectiva camada copiada e Injeta o Shape Value
      5. Aplica a camada final na Comp Principal e a posiciona
      6. Remove a camada original crua
         ↓
[RESULTADO]
    layers "grad_1 (grad)", "grad_2 (grad)" com:
    ✅ Importação Super Rápida (1 único AEPX ao invés de centenas)
    ✅ Paths IDÊNTICOS ao Illustrator (vindos do Overlord, zero reconstrução)
    ✅ Gradientes NATIVOS editáveis c/ limites dinâmicos de parada de cor (Stops Padding)
```

---

## 2. Por que essa Arquitetura?

| Problema | Solução v16 |
|---|---|
| Lentidão extrema ao construir +500 vetores nativamente | **Turbo Shadow-Build Strategy:** cria as shapes iterativamente em uma var tempComp (background Comp), e com 1 comando `copyToComp()` injeta na comp alvo, reduzindo processamento DOM da UI de 1.5 min pra ~10 segs ✅ |
| Reconstrução Bezier falha em shapes rotacionadas | Correção geométrica em ExtendScript com `sd.rotation`, e extração absoluta usando referências topologicas shape-relative `[0,0]` ✅ |
| Inserção no Fundo Prejudicava a Escala Z | Pilha de camadas perfeitamente invertida no Json+JS para manter hierarquia igual Overlord ✅ |
| AE 2025 salva AEPX em bdata (binário encriptado) | Template embutido `grad_batch_template.aepx` manipulado via C++ injetado diretamente em disco ✅ |
| **Duplicação Massiva de Textos e Objetos no Split Layer** | **Blindagem de Desduplicação Computacional (DNA Hashing):** Antes de gerar o `.json`, todas as formas extraídas ganham uma assinatura baseada em (x, y, tipo, string/path count). O Exportador checa e destrói do Payload clones 100% idênticos vindos de falhas do ExtendScript (DOM Selection BUG) ou pranchetas pasteboard invisíveis. Filtro de Bounds `abRect` rigoroso e verificação de `layer.visible` na exportação em batch. ✅ |
| **Alinhamento do Texto Errado (Sempre na Esquerda)** | Conversão dos metadados de Parágrafo do Illustrator e uso preciso de enumeradores intrínsecos `ParagraphJustification.CENTER/RIGHT_JUSTIFY`. ✅ |
| **Textos com Quebra-de-linha (Enter) falhando no AE** | Implementado parse `replace(/\r?\n\|\r/g, "\r")` convertendo parágrafos múltiplos em um único objeto multiline do AE mantendo entrelinha orgânico. ✅ |
| **Máscaras de Recorte (Track Matte Alpha) Indesejavelmente Invisíveis** | **Solid Fill Fallback:** Clipping paths sem stroke/fill nativo são exportados forçosamente injetando um `{fill: {color: [0.4,0.4,0.4]}}` garantindo pixels visiveis e render funcionais pra Matte. ✅ |
| **Posições erradas para filhos de grupos (manchas da vaca, janelas)** | **Posição Local Explícita (v13):** Aplicar parent PRIMEIRO, depois calcular `localX` e `localY` explícita. ✅ |
| Hierarquia de Grupos Perdida / Desalinhada no AE | **Shape Bounds System:** Nulls foram abandonados. Grupos são convertidos p/ Shape Layers Invisíveis contendo sub-shapes `Bounds` com `w` e `h` nativos. ✅ |
| GCky XML Injection corrompido / Black screen | Nodes com `&lt;` e `&gt;` em C++. Padding rígido de `Stops Size = 20`. ✅ |
| **Máscaras circulares (Ellipse/Sol/Sky) não aplicadas no AE** | **ClipGroup Detection + Track Matte (v13):** `ExtrairGradiente.jsx` varre TODOS os filhos... `SimularOverlord.jsx` usa `setTrackMatte()`. ✅ |
| **Gradiente não aplicado em vetores com nome igual ao grupo pai** | **(v16 — ROOT CAUSE):** Quando o path de gradiente tinha o mesmo nome do grupo pai (ex: ambos chamados "Bush"), o `processGradientFill` usava `item.name` direto como `name` no JSON — sem `_idx`, sem unicidade. Resultado: colisão no `layerNamesMulti` do C++ e o gradiente era perdido. **Fix:** `processGradientFill` agora **sempre** gera um nome único com `_idx` + sessionID, independente de o item ter nome ou não. ✅ |
| **Gradiente aplicado na camada errada (camada do grupo em vez do gradiente)** | Quando `layerNamesMulti["Bush"]` tinha `[k_grupo, k_gradiente]`, o C++ pegava o grupo (k1) como alvo — injetando gradient no grupo e ignorando a layer de gradiente real. O fix de unicidade de IDs elimina essa ambiguidade. ✅ |
| **Gradientes não localizados pelo C++ por name collision** | IDs de sessão agora incluem timestamp (`_idxNxSSSSS`) garantindo que exports incrementais para a mesma comp nunca colidam. Layers de grupos, sólidos e textos usam `currentID` como `name` no JSON. Layers de gradiente não são renomeadas pelo SplitLayer, mantendo o nome `_idx` para o C++ encontrar exatamente. ✅ |

---

## 3. Arquivos do Sistema

| Arquivo | Local | Função |
|---|---|---|
| **Lógica ExtendScript** (`SimularOverlord.jsx`, `ExtrairGradiente.jsx`, `SplitGroup.jsx`, `CriarComp.jsx`) | `AppData/.../GradFixer/` e `Documentos/SDK` | Núcleo de Engenharia: Construtores, Turbo Shadow-Build, ClipGroups e Pareintes |
| `grad_data.json` | `C:\AEGP\` | Payload principal de conversão bridge (acessado pelo C++) |
| `grad_batch_template.aepx` e `nested_group_template.aepx` | `C:\AEGP\` | Templates vitais contendo placeholders nativos `<GCky>` para injetar cor em Lote |
| `GradientManipulator.aex` | Compilado p/ `C:\AEGP\` | Plugin compilado (pelo Visual Studio) pronto para rodar no AE |
| `GradientManipulator.cpp/r` | SDK/Examples | Código Fonte C++ base do plugin AEGP |

⚠️ **ATENÇÃO:** Nunca coloque scripts isolados `.jsx` dentro de `C:\AEGP\`. A ponte foi reescrita (`ExtrairGradiente.jsx`) para varrer dinamicamente as pastas reais do projeto (`AppData` e `Documentos`). Isso tira de vez o risco iminente de arquivos fósseis/desatualizados quebrarem a estrutura!

---

## 4. Como Usar (3 passos)

**Passo 1 — Illustrator:**
- Deixe o arquivo `.ai` aberto.
- Clique no botão `Comp` no Painel da Extensão. O fluxo rodará `CriarComp.jsx` e criará uma "Composition" idêntica ao Artboard vigente automaticamente. (Background Comp mode evita renders massivos de tela simultâneos).

**Passo 2 — Construção Extrema em JS:**
- Clique `Split Layer` ou equivalente no painel. O CEP aciona a ponte pro AE.
- O JS varrerá `ExtrairGradiente.jsx`. Em milissegundos o Illustrator serializa bounds e shapes para o `grad_data.json`.
- O AE absorverá o call pra compilar massivamente (`SimularOverlord` ou `SplitGroup`). Atuando com Transações Isoladas de RAM (`app.beginUndoGroup` e Hidden Pre-comping `TempBuild_GF`), 600 vetores saltam do nada pra Timeline num intervalo limpo e síncrono (< 10s).
- Hierarquia perfeitamente convertida pra pseudo-Nulls (`Bounds` arrays em layers shape neutras).

**Passo 3 — After Effects (Plugin C++ Inject - Flash Gradients):**
- Aciona-se, e o `GradientManipulator.cpp` processará a extração. Injeta o Array de Cores RGB no `.AEPX` na velocidade da luz do disco do sistema operativo.
- Ele renderiza as substituições pra camada `Template`, finalizando as cópias com `<GCky>` de volta na comp final. Importação Relâmpago com cores orgânicas puras idênticas à source de Design.

---

## 5. Estrutura do grad_data.json (v6)

```json
{
  "artboard": { "w": 1080.0, "h": 1920.0 },
  "aiPath": "C:/Users/usuario/Desktop/Logo 72 anos.ai",
  "shapes": [
    {
      "name": "grad_1",
      "fillType": "gradient",
      "gradient": {
        "startX": 197.0, "startY": 948.0,
        "endX": 498.0,   "endY": 948.0,
        "stops": [
          { "pos": 0.0, "mid": 0.5, "r": 0.78, "g": 0.0,  "b": 0.78 },
          { "pos": 1.0, "mid": 0.5, "r": 0.9,  "g": 0.45, "b": 0.0  }
        ]
      },
      "path": [
        { "a": [197.24, 750.36], "i": [0.0, 0.0], "o": [0.0, 0.0] }
      ]
    }
  ]
}
```

> **r, g, b** são floats 0.0–1.0 (convertidos de RGB do Illustrator).  
> **path** é o array Bezier (âncora, handle entrada, handle saída).

---

## 6. Decisões Técnicas Críticas

### A. Zero Reconstrução de Bezier — Cópia do Shape Value

O insight mais importante da v6: **não reconstruímos o path do JSON nem do Illustrator**.
Em vez disso, lemos o `Shape Value` diretamente da layer que o Overlord já criou (paths perfeitos),
e copiamos para a layer do AEPX template:

```javascript
// Ler path perfeito da layer Overlord:
shapeVal = origCont.property(k).property('ADBE Vector Shape').value;

// Injetar no layer GCky template:
var newP = grp.addProperty('ADBE Vector Shape - Group');
newP.property('ADBE Vector Shape').setValue(shapeVal); // ← cópia direta!
```

Funciona com qualquer complexidade: compound paths, letras, formas orgânicas, etc.

### B. GCky XML — Formato interno de gradiente do AE

GCky é o formato interno do AE para dados de gradiente. É XML proprietário da Adobe
injetado dentro de `<GCky><string>...</string></GCky>` no AEPX:

```cpp
// Cada tag deve usar entidades HTML (CRÍTICO), exceto as aspas de atributos!
const std::string lt = "&lt;";   // < → &lt;
const std::string gt = "&gt;";   // > → &gt;
const std::string ap = "'";      // ' → ' (Atenção: NÃO usar &apos;)
const std::string nl = "&#xA;";  // newline → &#xA;

// ERRADO (quebra o XML do AEPX):
x += "<prop.map version='4'>";

// CORRETO:
x += lt + "prop.map version=" + ap + "4" + ap + gt + nl;
```

### C. Bypass de Segurança Binária (Padding do Stops Size)

AE 2025 amarra o XML (`GCky`) a um cache binário fixo (`tdbs`). Se o template original possui `Stops Size = 20`, a engine em C++ *DEVE* injetar exatamente 20 stops no XML, mesmo que o JSON exportado possua apenas 3 cores. Caso contrário, o After Effects reverterá para 2 cores sólidas preto-e-branco genéricas.

```cpp
// Localizar 'Stops Size' original escondido no payload &lt;int&gt;
size_t intPos = aepx.find("&lt;int ", sizeIndex);
size_t gtPos = aepx.find("&gt;", intPos);
int originalSize = std::stoi(aepx.substr(gtPos+4, 10)); // Extrai "20"

// Injetar stops do Illustrator e PAD (repetir última cor) até dar os 20 originais
for (int i=0; i < originalSize; i++) {
    float pos, r, g, b;
    if (i < (int)stops.size()) { pos = stops[i].pos; r = stops[i].r; ... }
    else { pos = 1.0f; r = stops.back().r; ... } // Repete o final invisível
}
```

### D. Template AEPX — AE 2025 usa `<GCst>` wrapper

AE 2025+ salva gradientes em AEPX dentro de um `<GCst>` que contém `<GCky>`:

```xml
<tdmn bdata="...ADBE Vector Graphic - G-Fill..."/>
<tdgp>
  ...
  <tdmn bdata="...ADBE Vector Grad Colors..."/>
  <GCst>              ← wrapper AE 2025
    <tdbs>...</tdbs>  ← stream binária (não modificar)
    <GCky>            ← ponto de injeção ✅
      <string>
        &lt;?xml version=&apos;1.0&apos;?&gt;&#xA;
        &lt;prop.map version=&apos;4&apos;&gt;&#xA;
        ...
      </string>
    </GCky>
  </GCst>
</tdgp>
```

**Como criar o template:** No AE 2025:
- Nova Composição → Camada de Forma → `+` Retângulo → `+` Preenchimento de Gradiente
- `Arquivo → Salvar Como → Projeto After Effects XML (.aepx)`
- Salvar como `C:\AEGP\gradient_template.aepx`

### D. C++ escreve AEPX em modo binário (CRÍTICO)

```cpp
// CORRETO — binary mode preserva encoding exato:
std::ifstream tp("...template.aepx", std::ios::binary);
std::ofstream out("...grad_0.aepx",   std::ios::binary);

// ERRADO — mode texto (padrão) corromperia o AEPX no Windows!
std::ifstream tp("...template.aepx"); // ← NUNCA fazer
```

### E. Limpeza agressiva do grupo de formas

O template tem Rect + Stroke + G-Fill no grupo. Ao injetar, precisamos limpar TUDO
exceto o G-Fill e o Transform:

### H. Posicionamento 1:1 com o Artboard do Illustrator

**ExtrairGradiente.jsx** converte coordenadas automaticamente:
```javascript
// Illustrator: Y cresce para CIMA (matemático)
// AE: Y cresce para BAIXO (tela)
// Artboard rect = [left, top, right, bottom]
var aeX = pt.anchor[0] - artRect[0]; // relativo ao canto esquerdo do artboard
var aeY = artRect[1] - pt.anchor[1]; // Y invertido
// → vertices em coordenadas absolutas do artboard no espaço AE
```

**SimularOverlord.jsx** cria a comp com dimensões exatas do artboard:
```javascript
// SEMPRE cria nova comp — nunca reutiliza comp ativa
var comp = app.project.items.addComp("Vetores Grad", artW, artH, 1, dur, fps);
// Layer anchor=[0,0], position=[0,0]
// → vertex [960, 540] aparece no centro de um comp 1920x1080 ✅
```

**GRAD FIXER** zera o Vector Group Transform herdado do template AEPX:
```javascript
// O template foi criado num artboard específico → tem offset!
// Vector Group Transform herda posição do artboard original → DESLOCA as shapes
vgt.property('ADBE Vector Anchor').setValue([0,0]);
vgt.property('ADBE Vector Position').setValue([0,0]);  // ← CRÍTICO!
vgt.property('ADBE Vector Scale').setValue([100,100]);
vgt.property('ADBE Vector Rotation').setValue(0);
// Agora: vertex [960,540] → comp center [960,540] ✅
```

### I. bgColor aceita apenas [R, G, B]

```javascript
newComp.bgColor = [0, 0, 0];    // ✅
newComp.bgColor = [0, 0, 0, 0]; // ❌ "A matriz de cores não tem 3 valores"
```

```javascript
var toRemove = [];
for (var k=1; k<=grp.numProperties; k++) {
    var pm = grp.property(k);
    if (pm.matchName !== 'ADBE Vector Graphic - G-Fill' &&
        pm.matchName !== 'ADBE Vector Transform Group') {
        toRemove.push(pm);
    }
}
for (var ri=0; ri<toRemove.length; ri++) {
    try { toRemove[ri].remove(); } catch(er) {}
}
// Agora o grupo tem só G-Fill → adicionar o path
var newP = grp.addProperty('ADBE Vector Shape - Group');
newP.property('ADBE Vector Shape').setValue(shapeVal);
newP.moveTo(1); // path acima do G-Fill → herda o gradiente
```

### F. Grad Start/End no AE 2025 PT-BR

```javascript
// AE 2025 PT-BR usa nomes em português:
gfill.property("Ponto inicial").setValue([gsX, gsY]);
gfill.property("Ponto final").setValue([geX, geY]);

// Fallback para versões em inglês:
gfill.property("ADBE Vector Grad Start").setValue([gsX, gsY]);
```

### G. Guard de sucesso — não perder layers originais

```javascript
var successGrad = false;
try {
    newP.property('ADBE Vector Shape').setValue(shapeVal);
    successGrad = true;
} catch(eInj) { successGrad = false; }

if (successGrad) {
    try { origLyr.remove(); } catch(e) {} // só remove se deu certo
    applied++;
} else {
    try { newLyr.remove(); } catch(e) {} // descarta layer incompleta
}
```

---

## 7. Tabela de Erros e Soluções

| Erro | Causa | Solução |
|---|---|---|
| `"formato inválido ou ilegível"` | AEPX gerado por JS (modo texto) | C++ em `std::ios::binary` ✅ |
| `"formato inválido ou ilegível"` | GCky com `<` literais no XML | Usar `&lt;` e `&gt;` em GenerateGCky ✅ |
| `"formato inválido ou ilegível"` | Template sem `<GCky>` (só bdata) | Recriar template no AE com G-Fill ✅ |
| Retângulo grande visível | Rect + Stroke do template não removidos | Remover TUDO exceto G-Fill e Transform ✅ |
| Layer original apagada sem gradiente | `successGrad` não verificado | Guard de sucesso antes de `origLyr.remove()` ✅ |
| Shapes deslocadas / em posição errada | Vector Group Transform do template tem offset | Zerar `ADBE Vector Position/Anchor` do grupo ✅ |
| Comp com tamanho errado | SimularOverlord reutilizava comp ativa | SEMPRE criar nova comp com dimensões do artboard ✅ |
| Gradientes Renderizando quase PRETO | C++ dividindo cores [0.0 - 1.0] novamente por 255 | Remover `/ 255.f` do C++. Cores do JSON já chegam entre 0-1 ✅ |
| Apenas 2 cores são injetadas no AE (Ponta 1 e Ponta 2) | XML do C++ não encontrou `<int` para extrair tamanho pq estava formatado como `&lt;int` | Usar `aepx.find("&lt;int")` e forçar Preenchimento do vetor c/ a última cor (Padding) ✅ |
| `"O objeto é inválido"` | `rect.remove()` após `addProperty()` | Remover ANTES de addProperty ✅ |
| `"Gradientes: 0"` via BridgeTalk | `JSON.stringify` não existe em AI ES | Usar polyfill `toJSON()` ✅ |
| Grad Start/End não muda | matchName falha no AE PT-BR | Usar `"Ponto inicial"` / `"Ponto final"` ✅ |
| `bgColor` dá erro | `[R,G,B,A]` com 4 valores | Usar apenas `[R, G, B]` ✅ |
| `NO_VALUE / Erro Colors L553` | ExtendScript AE 2025 crasheia ao acesar `.value` de G-Fill c/ padding injetado | NUNCA ler ou copiar pelo JS. Clonar a layer 100% nativa via `copyToComp` ✅ |
| **Ellipse/Sol/Sky sem máscara no AE (ClipGroup)** | `clipping===true` só verificado no primeiro/último filho — errava quando a ellipse estava em outra posição | Varrer TODOS os filhos com loop `for (ci=0; ci<pageItems.length; ci++)` ✅ |
| **ClipGroup não propaga para netos (sub-grupos)** | `clipMaskID` não era passado para filhos de GroupItems aninhados (era resetado para `null`) | `effectiveClipID = clipMaskID \|\| clipParentMaskID` — herda máscara do ancestral ✅ |
| **Manchas da vaca / janela fora de posição** | Posição absoluta setada antes do parent → compensação automática do AE falha em hierarquias profundas | Setar parent PRIMEIRO, depois calcular `localX = sd.x - parentSD.x` / `localY = sd.y - parentSD.y` e setar `ADBE Position` explicitamente ✅ |
| **Velocidade degradada (vetor por vetor no AE)** | `TempBuild_GF` removido acidentalmente, AE atualizava UI a cada layer criada | Restaurar Turbo Shadow-Build: criar em `tempComp`, depois `copyToComp()` em batch ✅ |
| **Sombras sem modo de Mesclagem (Grama/Multiply)** | O Illustrator tem modos de blend (`blendingMode`), porém o json os descartava. AE inseria opacidade sem a função de Blend `Multiply/Overlay` | A função `ExtrairGradiente.jsx` agora extrai os IDs das blendModes convertendo pra String. `SimularOverlord.jsx` propaga via `layer.blendingMode` e `ADBE Vector Blend Mode` simultaneamente ✅ |
| **Gradiente não aplicado quando path tem o mesmo nome do grupo pai** | `processGradientFill` usava `item.name` diretamente → sem `_idx` → colisão `layerNamesMulti` no C++ | Sempre gerar nome único: `gradBase + "_grad_idx" + idCounter + "x" + sessionID` ✅ |
| **C++ aplica gradiente no grupo em vez do path de gradiente** | Ambiguidade em `layerNamesMulti["Bush"]` com múltiplas layers de mesmo nome | IDs únicos com session timestamp eliminam a ambiguidade totalmente ✅ |
| **Layers de gradiente renomeadas antes do C++ rodar** | SplitLayer renomeava TODOS os layers incluindo gradientes → C++ não achava pelo nome `_idx` | SplitLayer agora **pula o rename** para layers com `fillType === "gradient"` ✅ |
| **Vetores de costas no After Effects (Z-Order invertido no SplitGroup)** | `SplitGroup.jsx` inseria cada Shape no `rootVet` de forma sequencial: o primeiro shape (Fundo no Illy) ficava em cima no AE pois o AE empilha internamente de baixo pra cima dentro de um Shape Layer | Adicionado `try { parentCont.property(sd.name).moveTo(1); } catch(e){}` ao final de cada bloco de criação de shape. A cada novo shape inserido ele é promovido manualmente ao índice 1, garantindo que o último shape processado (Frente no Illy) fique no topo visual ✅ |
| **Vetores de costas no Timeline (Z-Order invertido no SplitLayer)** | `SplitLayer.jsx` criava layers no `tempComp` de `length-1` a `0` (reverso). O `copyToComp()` copiava de `numLayers` a `1` (reverso). O duplo-inverso acidentalmente resultava em ordem correta em alguns casos mas a mecânica nativa do AE (`addShape()` sempre adiciona na posição 1 da timeline empurrando os anteriores para baixo) fazia o resultado final ficar invertido | Loop de criação alterado para `0 → length` (forwards). O loop de cópia `copyToComp` já iteria de `numLayers → 1` (reverso). O par Forwards+Reverso garante que a camada que chega por último ao `comp` principal seja a Camada do Fundo, deixando as Camadas da Frente no topo da timeline ✅ |
| **SplitGroup: masks de clip não aplicadas (shapes do Sol invisíveis)** | Filtro `fillType !== "gradient"` bloqueava 100% dos shapes com `clipMaskRef` — todos os anéis do Sol são `"solid"`, nunca `"gradient"`. Resultado: loop de máscaras nunca executava | Removido filtro restritivo; pipeline agora processa `solid` **e** `gradient` com `clipMaskRef` ✅ |
| **SplitGroup: `NO_VG` após C++ rodar (groupContMap stale)** | `groupContMap` armazena referências DOM **antes** do C++ rodar. C++ modifica a VG tree do Vetores → referências ficam inválidas → `pCont3.property(sd3.name)` retorna null | Re-busca `vetLayer` direto de `comp.layer()` pós-C++ (referência fresca) + busca recursiva `_findVGByName` no DOM atual ✅ |
| **SplitGroup: shapes clippados saindo como layers standalone fora do Vetores** | `ADBE Mask Atom` só pode ser aplicado a layers — criava `comp.layers.addShape()` standalone que quebravam a arquitetura de 1 layer Vetores | Substituído por **Merge Paths Intersect (valor 4)** adicionado **dentro do próprio VG** do shape: path do conteúdo + path do clip → operador Merge Paths → shape clipado sem sair do Vetores ✅ |
| **SplitGroup: fill invisível após Merge Paths** | AE exige que Fill/Stroke venha **depois** do Merge Paths na lista de propriedades do VG. O passo 1 havia adicionado o Fill antes dos clip paths → Fill renderizava sem clip, Merge Paths era ignorado | Após adicionar clip path + Merge Paths, coleta referências de todos os `Fill/Stroke/G-Fill` e `moveTo(numProperties)` — empurra todos para o final do VG ✅ |
| **SplitGroup: clip mask invertido (XOR em vez de Intersect)** | Valor `5` no `ADBE Vector Merge Type` = **Exclude Intersect (XOR)** — mostra tudo EXCETO onde sobrepõe: rings apareciam fora do círculo | Correto é valor `4` = **Intersect** — mostra apenas a área onde os paths se sobrepõem (ring clipado dentro do círculo) ✅ |
| **C++: G-Fill invisível após paste quando Merge Paths presente** | Paste inseria G-Fill no índice 1 (topo do VG), empurrando path shapes para baixo → Fill renderizava antes dos paths no contexto do Merge Paths | `moveTo(gradCont.numProperties)` após localizar o G-Fill — empurra para o final do VG, respeitando a regra Fill-após-paths ✅ |
---

## 8. Histórico de Versões

| Versão | O que funcionava |
|---|---|
| v1 | Cores chegando (GCky XML + fix `&#xA;`) |
| v2 | Vetor chegando (`copyToComp` void fix) |
| v3 | Sem retângulo do template (remove rect ANTES de addProperty) |
| v4 | Comp com tamanho do artboard + posição 1:1 |
| v4.5 | Multi-shape (N vetores + gradientes) |
| v5 | Híbrido: .ai nativo para sólidos + GCky para gradientes |
| v6 | GRAD FIXER: Zero reconstrução — copia Shape Value do Overlord + GCky via SDK |
| v7 | Posição 1:1 com artboard Illustrator — nova comp correta + Vector Group Transform zerado |
| v9 | Tentativa de "Smart Gradient Positioning" (Reconstrução 8-Point) |
| v10 | Rollback e Recuperação Definitiva de v6/v7 do payload `.aex` estável. |
| v11 | Suporte completo a Hierarquia de Grupos Nativos. |
| v12 | Suporte a compound paths e Turbo Shadow-Build. |
| v13 | ClipGroup Detection + Parentesco Preciso. |
| v14 | **Suporte a Modos de Mesclagem (BlendingMode)**: Extração unificada no ExtendScript (via `item.blendingMode.toString()`), passando a constante integral para o `grad_data.json` e sendo injetada pela função `setBlend` tanto no nível do Vector Group (Group Path) como Global da Shape Layer (Multiply, Overlay, DropShadows convertidas em vetores...). Nova arquitetura de deployment estrito (`AppData/Roaming/...` e Documentos) extinguindo o passivo `/AEGP`. |
| **v15** ✅ | **Deduplicação e Tipografia Nativa Avançada**: Implementada **Desduplicação via Assinatura DNA** para evitar cópias empilhadas devido a falhas do DOM. Mapeamento fiel das justificações e quebras-de-linha nativas de IL para Ae. Clip Paths invisíveis ganharam preenchimento cinza automático para forçar Track Matte Alpha correto no comp. Expurgo avançado de itens fora da prancheta limite ativa. |
| **v16** ✅ | **Fix Colisão de IDs Pai=Filho (Nome Duplicado)**: Root cause final dos gradientes que não eram aplicados quando pai grupo e filho path tinham o **mesmo nome** no Illustrator (ex: grupo "Bush" contendo path "Bush"). `processGradientFill` agora **sempre** gera nome único com `_idx` + sessionID. `SplitLayer` pula o rename para layers de gradiente. Cleanup pós-C++ strip `_idx` de todas as layers. Adicionada ferramenta de diagnóstico `C:\AEGP\grad_debug.txt`. IDs de sessão (`globalSessionID`) garantem unicidade em exports incrementais. |
| **v17** ✅ | **Remoção de Desduplicação Agressiva Pós-ClipMask**: A "Blindagem de Desduplicação" implementada na v15 estava filtrando incorretamente vetores que eram falsos positivos (como o corte do Sol e a ausência da Vaquinha). Ajuste do algoritmo para desduplicar apenas camadas de Texto puras e liberação irrestrita da extração de Paths/Groups. Limpeza visual de logs e alertas no SplitLayer.jus. Renderização 1:1 restaurada e fidelidade máxima garantida. |
| **v18** ✅ | **Fix Definitivo de Z-Order (Stacking de Vetores)**: Resolvido o bug que deixava os vetores de costas tanto no SplitGroup quanto no SplitLayer. **SplitGroup**: adicionado `moveTo(1)` ao final de cada bloco de criação de shape/grupo para elevar manualmente o elemento recém-criado ao topo, garantindo que o último item processado (Frente no Illustrator) fique visualmente acima de todos os outros. **SplitLayer**: loop de criação invertido para `0 → length` (forwards) em par com o loop de `copyToComp` que roda `numLayers → 1` (reverso), garantindo que a camada da Frente do Illustrator seja sempre a primeira na timeline do AE. **ExtrairGradiente**: mantido em ordem natural Top-to-Bottom do Illustrator (sem inversões no exportador). Pipeline de Z-Order finalmente estável e previsível. |
| **v19** ✅ | **SplitGroup: Clip Masks Nativas via Merge Paths Intersect**: Pipeline de mascaramento completamente reescrito para manter a arquitetura de **1 única layer Vetores**. Em vez de criar layers standalone com `ADBE Mask Atom`, cada shape com `clipMaskRef` recebe o path do clip + operador **Merge Paths Intersect (valor 4)** diretamente dentro do seu VG, seguido de `moveTo(numProperties)` em todos os fills para garantir a ordem correta (Paths → Clip Path → Merge Paths → Fill). Busca recursiva `_findVGByName` no DOM pós-C++ resolve o bug de referências stale do `groupContMap`. C++ também recebeu fix idêntico de `moveTo` para G-Fill após paste. Resultado: shapes clipados (anéis do Sol, etc.) renderizam perfeitos **dentro** do Vetores, sem layers extras na timeline. |


---

## 9. Componentes da v6

### GradientManipulator.cpp (plugin C++ AEGP)
- `ParseGradJSON()` — lê grad_data.json
- `GenerateGCky()` — gera XML de gradiente com `&lt;` / `&gt;` / `&apos;` / `&#xA;`
- `WriteAEPX()` — lê template + injeta GCky + escreve em binário
- `ApplyGradientsToExistingLayers()` — ExtendScript que faz a cópia Shape Value
- Menu: `GRAD FIXER: Aplicar Gradientes`

### ExtrairGradiente.jsx (Illustrator)
- Varre seleção ou documento inteiro por items com `GradientColor`
- Extrai: nome, stops (RGB 0-1, posição), startX/Y endX/Y, path Bezier
- Salva `C:\AEGP\grad_data.json`

### SimularOverlord.jsx (AE — teste/fallback)
- Lê grad_data.json
- Cria shape layers com paths corretos + cor sólida (simula o Overlord)
- Layers ficam com nomes exatos do JSON

---

## 10. Evolução Futura

- **Integração real com Overlord**: Hook no pipeline do Overlord para acionar o GRAD FIXER automaticamente após import
- **BridgeTalk direto**: Triggar o ExtendScript do AE direto do AI sem passo manual (testado, funciona via `bt.send(30)`)
- **Gradientes Radiais**: Flag linear/radial no GCky (`Gradient Type`)
- **Alpha Stops**: Exportar e injetar opacidade por stop
- **Suporte a texto**: TextFrames do Illustrator como camadas de texto editáveis
- **Múltiplos Artboards**: Exportar artboard específico por nome

---

## 11. Arquitetura SplitGroup (v13+)

### Estabilização de Render e Fim das "Camadas de forma 50"

A arquitetura do **SplitGroup** permite agrupar toda a arte importada do Illustrator dentro de uma única Shape Layer mestra chamada `Vetores`.
Nas versões anteriores, a injeção do C++ dependia de **Dummy Layers** (`Camada de forma X`) como placeholders isolados na timeline. Isso causava resíduos (as famosas camadas vazias que o AE gerava se a execução do script fosse interrompida ou se a renomeação falhasse).

Na versão estável atual:
1. **Iscas Seguras (Dummy Layers)**: O SplitGroup.jsx continua gerando as Dummy Layers apenas para os shapes que contêm gradientes, para manter a compatibilidade com o C++ antigo e novo.
2. **Extra Cleanup Automático (O Exterminador)**: Um loop de varredura roda imediatamente após o C++ finalizar. Ele deleta incondicionalmente qualquer camada nomeada como Camada de forma X, _idx ou (grad).
3. **Fallback Name Seguro**: Se o AE impedir de renomear a camada para `Vetores` (causa raiz das Camadas de forma perdidas na timeline), o script tenta novamente e utiliza **referências diretas ao objeto da camada** em vez de buscas via string de nome. Isso garante que as máscaras e a limpeza final funcionem perfeitamente.
4. **Z-Order de Máscaras**: Mantém o uso do `ADBE Vector Filter - Merge` (Intersect) com reordenação via `moveTo()`.

