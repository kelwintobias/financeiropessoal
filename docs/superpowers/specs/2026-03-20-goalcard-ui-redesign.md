# Design: GoalCard UI Redesign

**Data:** 2026-03-20
**Status:** Aprovado

## Resumo

Redesenhar o `GoalCard` para:
1. Substituir "Arquivar" por dois botões — "Remover" (discreto) e "Meta concluída" (celebrativo, sempre visível)
2. Tornar os campos Valor Total, Valor Atual e Data editáveis inline (click-to-edit)

## Contexto

Arquivo principal: `src/components/goals/GoalCard.tsx`

Store: `useFinanceStore` já expõe `updateGoal(id, data)` e `deleteGoal(id)`.

Interface `Goal`: `{ id, name, targetAmount, currentAmount, deadline?, status }`

## Seção 1 — Substituição dos botões de ação

### Botão "Meta concluída" (celebrativo)
- **Visibilidade:** sempre visível para metas com `status === 'active'`
- **Estilo:** `bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md`
- **Ícone:** 🎉 à esquerda do texto "Meta concluída!"
- **Ação:** `updateGoal(goal.id, { status: 'completed' })`

### Botão "Remover" (discreto)
- **Visibilidade:** sempre visível para metas com `status === 'active'`
- **Estilo:** `text-xs text-gray-400 hover:text-red-400` — sem fundo, sem borda
- **Posição:** canto inferior direito do card
- **Comportamento:** ao clicar, exibe confirmação inline no próprio card:
  - Texto: "Remover esta meta?"
  - Botões: `[Confirmar]` (vermelho sutil) e `[Cancelar]` (cinza)
  - Confirmação chama `deleteGoal(goal.id)`

### Removidos
- Botão "📦 Arquivar" (`updateGoal({ status: 'archived' })`) — removido completamente
- Botão "✅ Concluir" (que só aparecia em 100%) — substituído pelo botão celebrativo sempre visível

## Seção 2 — Campos editáveis inline (click-to-edit)

Cada campo exibe o valor atual como texto clicável. Ao clicar, o texto é substituído por um `<input>` com botões ✓ (confirmar) e ✕ (cancelar). Ao confirmar, chama `updateGoal` com o campo correspondente. Ao cancelar, restaura o valor original sem salvar.

Apenas um campo pode estar em modo de edição por vez.

### Campo: Valor Total
- **Exibição normal:** parte da linha de progresso (ex: "R$ 500,00 de R$ 1.000,00")
- **Edição:** `<input type="number" min="0.01" step="0.01">`
- **Salva:** `updateGoal(goal.id, { targetAmount: novoValor })`

### Campo: Valor Atual
- **Exibição normal:** parte da linha de progresso
- **Edição:** `<input type="number" min="0" step="0.01">`
- **Salva:** `updateGoal(goal.id, { currentAmount: novoValor })`
- **Substitui:** o botão "Registrar aporte" é removido (a edição direta do valor atual torna-o redundante)

### Campo: Data (prazo)
- **Exibição normal:** "Prazo: DD/MM/AAAA" ou "Sem prazo" se vazio
- **Edição:** `<input type="date">` — campo opcional, pode ser limpo
- **Salva:** `updateGoal(goal.id, { deadline: novaData || undefined })`

## Arquivos alterados

- `src/components/goals/GoalCard.tsx` — único arquivo modificado

## Comportamento preservado
- Barra de progresso continua calculando em tempo real com base em `currentAmount / targetAmount`
- Cards de metas concluídas/arquivadas existentes na `GoalsPage` não são alterados
- Prop `compact` do `GoalCard` (usada em outros contextos) não exibe os botões de ação nem os campos editáveis — comportamento mantido
