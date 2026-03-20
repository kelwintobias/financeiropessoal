# Design: GoalCard UI Redesign

**Data:** 2026-03-20
**Status:** Aprovado

## Resumo

Redesenhar o `GoalCard` para:
1. Substituir "Arquivar" por dois botões — "Remover" (discreto) e "Meta concluída" (celebrativo, sempre visível)
2. Tornar os campos Valor Total, Valor Atual e Data editáveis inline (click-to-edit)

## Contexto

- Arquivo: `src/components/goals/GoalCard.tsx`
- Store: `updateGoal(id, data)` e `deleteGoal(id)` já existem
- Interface `Goal`: `{ id, name, targetAmount, currentAmount, deadline?, status }`

---

## Seção 1 — Botões de ação

### "Meta concluída" (celebrativo)
- **Visibilidade:** sempre visível para `status === 'active'`, oculto em `compact`
- **Estilo:** `bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md`
- **Ícone:** 🎉 à esquerda do texto "Meta concluída!"
- **Aria:** `aria-label={`Concluir meta ${goal.name}`}`
- **Ação:** `updateGoal(goal.id, { status: 'completed' })`
- **Erro:** revert silencioso (sem mensagem ao usuário)

### "Remover" (discreto)
- **Visibilidade:** sempre visível para `status === 'active'`, oculto em `compact`
- **Estilo:** `text-xs text-gray-400 hover:text-red-400` — sem fundo, sem borda
- **Posição:** canto inferior direito do card
- **Aria:** `aria-label={`Remover meta ${goal.name}`}`
- **Comportamento:** ao clicar, exibe confirmação inline imediatamente abaixo dos botões de ação:
  - Texto: "Remover esta meta?"
  - `[Confirmar]` — `text-red-500 hover:text-red-700 text-sm font-medium`
  - `[Cancelar]` — `text-gray-400 hover:text-gray-600 text-sm`
  - Apenas [Confirmar] ou [Cancelar] fecham a confirmação; clicar fora e ESC não fecham
  - [Confirmar] chama `deleteGoal(goal.id)`
  - Erro: confirmação fecha, card permanece

### Removidos
- Botão "📦 Arquivar" — removido; metas já arquivadas continuam visíveis na GoalsPage
- Botão "✅ Concluir" (aparecia só em 100%) — substituído pelo botão celebrativo
- Botão "+ Registrar aporte" — removido completamente; substituído pela edição inline do Valor Atual

---

## Seção 2 — Campos editáveis inline (click-to-edit)

### Estados visuais

**Modo view (padrão):**
- Valores exibidos como texto normal
- Ao fazer hover sobre um campo editável: `cursor-pointer` + sublinhado pontilhado (`underline decoration-dashed decoration-gray-400`) para sinalizar editabilidade

**Modo edit (ao clicar):**
- Texto substituído por `<input>` com borda azul + botões ✓ (`text-green-600`) e ✕ (`text-gray-400`) imediatamente à direita
- Fundo do input: `bg-gray-50 border border-blue-400 rounded px-1 text-sm`

### Regras gerais
- Apenas um campo em edição por vez
- Clicar em outro campo editável cancela o atual sem salvar e abre o novo
- Botão ✕ cancela sem salvar; botão ✓ valida e salva
- Erro de rede/Supabase: revert silencioso ao valor anterior
- Todos os campos editáveis ocultados em `compact`

### Campo: Valor Total
- **Exibição:** `[R$ 500,00]` de `[R$ 1.000,00]` — ambos clicáveis individualmente
- **Input:** `type="number" min="0.01" step="0.01"`
- **Validação:** valor ≤ 0 → borda vermelha no input, não salva, mantém input aberto
- **currentAmount > novoTargetAmount:** permitido; barra capa em 100% visualmente
- **Salva:** `updateGoal(goal.id, { targetAmount: novoValor })`

### Campo: Valor Atual
- **Exibição:** idem acima
- **Input:** `type="number" min="0" step="0.01"`
- **Validação:** valor negativo → borda vermelha, não salva
- **Salva:** `updateGoal(goal.id, { currentAmount: novoValor })`

### Campo: Data (prazo)
- **Exibição view:** "Prazo: DD/MM/AAAA" se existe; linha omitida se `deadline` é undefined
- **Input:** `type="date"` — opcional; limpar e confirmar salva como `undefined` (remove o prazo, oculta a linha)
- **Salva:** `updateGoal(goal.id, { deadline: novaData || undefined })`

---

## Barra de progresso

- Fórmula: `Math.round((currentAmount / targetAmount) * 100)`, retorna 0 se targetAmount=0
- Barra visual capa em 100%
- **Cores mantidas exatamente como estão:** verde ≥100%, azul ≥60%, azul-claro <60%

---

## Arquivos alterados

- Apenas: `src/components/goals/GoalCard.tsx`

## Comportamentos preservados
- Prop `compact` não exibe botões de ação nem campos editáveis
- Seção "Concluídas / Arquivadas" na `GoalsPage` não é alterada
