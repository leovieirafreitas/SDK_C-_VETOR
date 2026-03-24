# Guia Técnico: Pipeline Illustrator → After Effects
## "Overlord Caseiro" v9 — Vetores Nativos + Gradientes + Rotação

> Pipeline completo para importar qualquer design do Illustrator para o After Effects  
> com vértices Bezier editáveis, gradientes nativos com rotação correta e estrutura de layers organizada.

---

## ✅ Status Atual: FUNCIONANDO PERFEITAMENTE

| Recurso | Status |
|---|---|
| Gradientes (linear, multi-stop) | ✅ Cores + posição + ângulo corretos |
| Gradientes em shapes rotacionados | ✅ `effectiveAngle = panelAngle - shapeRotation` |
| Qualquer ângulo (-90°, 45°, 0°, etc.) | ✅ `gradByAngle()` — sem precisar de rotação no AE |
| Shapes sólidos (fills) | ✅ Correto com cor real |
| Strokes (arcos, círculos) | ✅ Capturado com strokeWidth |
| Compound paths ("a","o","e","b") | ✅ Buracos via Merge Paths Exclude |
| Closed/open paths (arcos abertos) | ✅ `pathItem.closed` preservado |
| Sem duplicatas | ✅ Filtro por `parent.typename === "Layer"` |

---

## 1. Arquitetura do Sistema (3 Camadas)

```
ILLUSTRATOR (ExtendScript)
  ExtrairGradiente.jsx v11
        │
        ▼ grad_data.json  (cores + effectiveAngle + stops)
AFTER EFFECTS (ExtendScript)
  SimularOverlord.jsx v7
        │ (para shapes gradiente — placeholder fill)
        ▼
PLUGIN C++ (AEGP SDK)
  GradientManipulator.dll  v9
  → Menu: Camada → GRAD FIXER: Aplicar Gradientes
```

---

## 2. ExtrairGradiente.jsx — Illustrator (v11)

### Inovação principal: `effectiveAngle`

O problema antigo: shapes com `item.rotation != 0°` tinham o ângulo do gradiente errado.

**Por quê:**  
- `fc.angle` retorna o ângulo no espaço LOCAL da shape (antes da rotação)
- `item.rotation` = a rotação da shape no espaço do artboard
- Para obter o ângulo REAL no AE (world space): `effectiveAngle = fc.angle - item.rotation`

```javascript
var panelAngle  = fc.angle || 0;          // ângulo no local space da shape
var shapeRotation = item.rotation || 0;   // rotação da shape no artboard

// ÂNGULO EFETIVO no AE (world space):
var effectiveAngle = panelAngle - shapeRotation;
```

**Exemplos:**
| Shape | panelAngle | shapeRotation | effectiveAngle | Resultado |
|---|---|---|---|---|
| Retângulo direto | -90° | 0° | -90° | Vertical ✅ |
| Retângulo rotacionado | 0° | 90° | -90° | Vertical ✅ |
| Diagonal | -45° | 0° | -45° | Diagonal ✅ |
| Qualquer combo | α | β | α - β | Correto ✅ |

---

### Regras de iteração (sem duplicatas!)
```javascript
for (var s=0; s<doc.pageItems.length; s++) {
    if (doc.pageItems[s].parent.typename === "Layer") {
        collectAll(doc.pageItems[s], ...);
    }
}
// collectAll() recursiona via item.pageItems (filhos diretos do grupo)
```
> **Bug clássico Illustrator:** `doc.pageItems` retorna TUDO incluindo aninhados.

### Formato JSON exportado:
```json
{
  "artboard": { "w": 1080, "h": 1920 },
  "aiPath": "C:/path/to/file.ai",
  "shapes": [
    {
      "name": "grad_0", "fillType": "gradient",
      "gradient": {
        "angle": -90,
        "startX": 540, "startY": 0,
        "endX": 540, "endY": 1920,
        "stops": [{"pos":0,"mid":0.5,"r":0.6,"g":0.8,"b":0.1}, ...]
      },
      "path": { "pts": [{...}], "closed": true }
    }
  ]
}
```

> **Nota:** `gradient.angle` agora contém o `effectiveAngle` (world space AE), já corrigido pela rotação da shape.

---

## 3. SimularOverlord.jsx — After Effects (v7)

### O que faz:
- Lê `C:/AEGP/grad_data.json`
- Cria uma nova composição com as dimensões do artboard
- Para cada shape gradiente: cria Shape Layer com `Position=[0,0]`, `Anchor=[0,0]`

### Processo por tipo:

#### Gradiente:
```javascript
// Position [0,0], Anchor [0,0] — layer local = espaço absoluto do artboard
// Placeholder fill com cor do primeiro stop (GRAD FIXER vai substituir)
shLyr.property("ADBE Position").setValue([0, 0]);
shLyr.property("ADBE Anchor Point").setValue([0, 0]);
```

#### Solid / Stroke:
```javascript
// Position = centro do item (como overlord-lite faz)
tr.property("ADBE Position").setValue([sd.x, sd.y]);
```

#### Compound Paths (letras com buracos):
```javascript
var mp = cont.addProperty("ADBE Vector Filter - Merge");
mp.property("ADBE Vector Merge Type").setValue(5); // Exclude = buraco!
```

---

## 4. Plugin C++ — GRAD FIXER v9 (GradientManipulator)

### Inovação: `gradByAngle()` — matemática que funciona TODOS OS ÂNGULOS no AE

**Problema:** After Effects (versões < 2025) **não tem propriedade de rotação no gradiente**.  
**Solução:** Calcular os pontos `start/end` do G-Fill para simular qualquer ângulo.

#### Fórmula `gradByAngle()`:
```javascript
function gradByAngle(mnX, mxX, mnY, mxY, ang) {
    var cx = (mnX + mxX) / 2, cy = (mnY + mxY) / 2;
    var half = Math.max(mxX - mnX, mxY - mnY) * 0.55;
    var rad = ang * Math.PI / 180;
    var dX = Math.cos(rad);
    var dY = -Math.sin(rad);  // Y flipado: AI (Y-up) → AE (Y-down)
    return [
        [cx - half * dX, cy - half * dY],  // start
        [cx + half * dX, cy + half * dY]   // end
    ];
}
```

**Visualização dos ângulos:**

| effectiveAngle | Gradiente no AE | Pontos |
|---|---|---|
| -90° | Vertical topo→base | start=(cx, topo), end=(cx, base) |
| +90° | Vertical base→topo | start=(cx, base), end=(cx, topo) |
| 0° | Horizontal esq→dir | start=(esq, cy), end=(dir, cy) |
| 180° | Horizontal dir→esq | start=(dir, cy), end=(esq, cy) |
| -45° | Diagonal ↘ | start=(topo-esq), end=(base-dir) |
| +45° | Diagonal ↗ | start=(base-esq), end=(topo-dir) |

### Fluxo completo do GRAD FIXER:

```
1. Lê grad_data.json → shapes[] com angle + stops
2. Gera AEPX por shape (cores corretas via GCky XML)
3. Para cada gradiente:
   a. Encontra origLyr pelo nome (placeholder do SimularOverlord)
   b. Calcula bounds da shape a partir dos vértices (mnX,mxX,mnY,mxY)
   c. SMART GRADIENT POSITIONING (3 métodos em cascata):
      ┌─ Método 1: angle != 0 → validar formula (fc.origin+fc.angle)
      │   SE gsX dentro do range da shape: usar formula direta
      │   SE gsX fora do range (offset do artboard): usar gradByAngle()
      ├─ Método 2: angle == 0 (gradient tool) → native .ai import
      │   Importa .ai nativo → lê G-Fill real → converte coords (local+pos-anch)
      │   VALIDAR: coords dentro do range dos bounds (evita X=12800 para shape em X=300)
      └─ Método 3: fallback → gradByAngle() com angle conhecido / bounds puro
   d. Importa AEPX (cores corretas)
   e. Injeta shape path da origLyr
   f. Define G-Fill start/end (das posições calculadas)
   g. Remove origLyr placeholder
4. Alert: método usado por shape — ex: "[grad_0: center+angle(-90deg)]"
```

### Por que `center+angle` e não `formula`?

`fc.origin` em Illustrator retorna posição em **coordenadas do espaço LOCAL da shape** quando ela está rotacionada. Para shapes em artboards com offset grande no documento, isso resulta em valores como X=12800 (impossível). O `gradByAngle()` resolve ignorando `fc.origin` e calculando tudo a partir dos bounds geométricos dos vértices.

---

## 5. Sequência de Uso

```
1. Selecionar os vetores no Illustrator (ou deixar tudo selecionado = exporta tudo)
2. File > Scripts > ExtrairGradiente.jsx
   → Alert mostra: "panel=-90° rot=0° eff=-90° (world AE)" → confirmação visual
3. Abrir After Effects (com projeto ativo)
4. File > Scripts > SimularOverlord.jsx
   → Cria composição "Vetores Grad" com layers placeholder
5. Menu Camada → GRAD FIXER: Aplicar Gradientes
   → Alert: "2 gradientes aplicados | [grad_0: center+angle(-90deg)] [grad_1: formula_panel]"
```

---

## 6. Estrutura de Arquivos

| Arquivo | Local | Função |
|---|---|---|
| `ExtrairGradiente.jsx` | `C:\AEGP\` | Script Illustrator — gera JSON com effectiveAngle |
| `SimularOverlord.jsx` | `C:\AEGP\` | Script AE — cria layers placeholder |
| `grad_data.json` | `C:\AEGP\` | Ponte de dados: cores + ângulo efetivo |
| `GradientManipulator.dll` | Plugins AE | Aplica gradientes com posição correta |
| `gradient_template.aepx` | `C:\AEGP\` | Template XML do G-Fill (cores) |
| `grad_N.aepx` | `C:\AEGP\` | Gerados temporariamente pelo C++ |

---

## 7. Bugs Resolvidos (histórico completo)

| Bug | Causa | Solução |
|---|---|---|
| Shapes duplicados (3x) | `doc.pageItems` flattened + recursão | Filtrar `parent.typename === "Layer"` |
| Arcos abertos fechando errado | `sh.closed = true` hardcoded | Usar `pathItem.closed` real |
| Buracos em letras "a","o","e" | `Fill Rule` não funciona via script | `Merge Paths Exclude (modo 5)` |
| Círculos/strokes faltando | `fillColor === "NoColor"` pulava strokes | Checar `item.stroked` separadamente |
| Gradiente em CompoundPath | `item.fillColor` retornava NoColor | Fallback para `pathItems[0].fillColor` |
| Gradiente horizontal (errado) | `fc.angle` retorna ângulo local da shape | `effectiveAngle = fc.angle - item.rotation` |
| Gradiente sólido azul | Native import dava X=12800 (offset artboard) | Validar coords contra bounds (3× shape size) |
| Direção errada em shapes rotacionados | rotation=90° muda o ângulo world | `effectiveAngle = panelAngle - shapeRotation` |
| AE não tem rotação no gradiente | Versões < 2025: sem prop de rotação | `gradByAngle()`: calcula start/end por matemática |
| fc.origin fora do artboard | Shapes em artboards com offset no doc | `center+angle` ignora fc.origin, usa bounds |

---

## 8. Inspiração: Overlord-Lite

O pipeline foi desenvolvido estudando o código-fonte do plugin `overlord-lite`  
localizado em `C:\Users\FELIPE BARROSO\Documents\pluginOver\overlord-lite`.

### Insights chave do overlord-lite:
- **Coordenadas relativas ao centro**: `pt.anchor - cx, cy - pt.anchor` → posição no layer = centro do item
- **Closed flag preservado**: `shape.closed = pathItem.closed`
- **1 layer por item**: Não agrupa em shape layers compartilhados
- **Gradientes via .ai temp**: overlord exporta .ai temporário; nós usamos GRAD FIXER (mais eficiente e sem arquivos temporários de .ai)

---

**Versão:** ExtrairGradiente v11 + SimularOverlord v7 + GradientManipulator v9  
**Data:** Março 2026  
**Status:** ✅ PRODUÇÃO — Gradientes corretos em QUALQUER ângulo, com e sem rotação de shape  
**Assinado:** Antigravity & Felipe Barroso
