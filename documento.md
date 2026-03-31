# Pipeline GRAD FIXER: Illustrator → After Effects
## Gradientes Perfeitos em Vetores Complexos via GCky SDK (v12 — PRODUÇÃO AE 2025 BINARY SAFE + Turbo Shadow-Build)
**Status:** ✅ FUNCIONANDO — paths + gradientes exatos + posição 1:1 com artboard do Illustrator

---

## 1. Visão Geral (Arquitetura v12)

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

| Problema | Solução v12 |
|---|---|
| Lentidão extrema ao construir +500 vetores nativamente | **Turbo Shadow-Build Strategy:** cria as shapes iterativamente em uma var tempComp (background Comp), e com 1 comando `copyToComp()` injeta na comp alvo, reduzindo processamento DOM da UI de 1.5 min pra ~10 segs ✅ |
| Reconstrução Bezier falha em shapes rotacionadas | Correção geométrica em ExtendScript com `sd.rotation`, e extração absoluta (`SplitGroup.jsx`) usando referências topologicas shape-relative `[0,0]` ✅ |
| Hierarquia de Grupos Perdida / Desalinhada no AE | **Shape Bounds System:** Nulls foram abandonados. Grupos são convertidos p/ Shape Layers Invisíveis contendo sub-shapes `Bounds` com `w` e `h` nativos calculados (bounding-boxes de grupos Ai). Posicionamento e Rotações fluindo exatamente iguais a exportações padrão Overlord ✅ |
| Inserção no Fundo Prejudicava a Escala Z | Pilha de camadas perfeitamente invertida no Json+JS para manter hierarquia igual Overlord ✅ |
| AE 2025 salva AEPX em bdata (binário encriptado) | Template embutido `grad_batch_template.aepx` (criado em modo legado/fallback para conter um node XML legível `<GCky>` dentro de um encapsulador pseudo-binário `<GCst>`) manipulado via C++ injetado diretamente em disco ✅ |
| GCky XML Injection corrompido / Black screen | Transformamos nodes brutos e apóstrofos limitados em C++ Strings Literais (usando `<` via `&lt;` e escapando aspas `&apos;`). Padding rígido de numeração `Stops Size = 20`. ✅ |

---

## 3. Arquivos do Sistema

| Arquivo | Local | Função |
|---|---|---|
| `ExtrairGradiente.jsx` | `C:\AEGP\` | Extrai formas, curvas e hierarquias do Illustrator → JSON |
| `CriarComp.jsx` | `C:\AEGP\` | Roteia parâmetros de bounds do Illustrator pra invocar nova Comp no AE |
| `grad_data.json` | `C:\AEGP\` | Payload principal de conversão bridge |
| `grad_batch_template.aepx` | `C:\AEGP\` | Template do AE contendo placeholders nativos `<GCky>(grad)` para injetar cor |
| `ae_batch_temp.aepx` | `C:\AEGP\` | Output serializado pós moderação binária no SDK C++ |
| `SplitGroup.jsx` / `SimularOverlord.jsx` | `C:\AEGP\` | Motor de construtor JS (Turbo Shadow-Build) |
| `GradientManipulator.cpp` | SDK/Examples | Plugin C++ AEGP — injeção GCky rápida para vetores de gradiente |
| `GradientManipulator_PiPL.r` | SDK/Examples | Recursos do plugin (menu, ID) |

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
| v9 | Tentativa de "Smart Gradient Positioning" (Reconstrução 8-Point) ignorando path original. Gerou erro L1 "O objeto é inválido" no AE 2025 por bugs em índices e loops do AST Vector. |
| v10 | Rollback e Recuperação Definitiva de v6/v7 do payload `.aex` estável. Zero Reconstrução (clona a layer sólida original integralmente) + GCky XML Injection! |
| **v11** ✅ | **Suporte completo a Hierarquia de Grupos Nativos via Nulls! Recria perfeitamente o visual em árvore do Illustrator no AE. Além disso, a injeção do C++ garante parentesco na ordem exata (`parent` ANTES de `Position`) para eliminar "saltos" visuais de coordenadas locais.** |

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
