# Design: Aba Metas no BottomNav

**Data:** 2026-03-20
**Status:** Aprovado

## Resumo

Substituir a aba "Cartão" no `BottomNav` pela aba "Metas", que navega para a `GoalsPage` já existente em `/goals`.

## Contexto

A `GoalsPage` (`src/pages/GoalsPage.tsx`) e o `GoalCard` (`src/components/goals/GoalCard.tsx`) já estão implementados e a rota `/goals` já está registrada em `routes.tsx`. A única lacuna é a entrada no menu de navegação inferior.

O `BottomNav` atual tem 5 abas: Início · Renda · Gastos · Fixos · Cartão. A aba "Cartão" é considerada pouco útil pelo usuário e será removida do menu (a rota `/card` permanece no código).

## Mudança

**Arquivo:** `src/components/layout/BottomNav.tsx`

Substituir:
```ts
{ to: '/card', icon: '💳', label: 'Cartão' }
```
Por:
```ts
{ to: '/goals', icon: '🎯', label: 'Metas' }
```

**Nav resultante:** Início · Renda · Gastos · Fixos · Metas

## Escopo

- Nenhuma alteração em `GoalsPage`, `GoalCard`, `routes.tsx` ou qualquer outro arquivo.
- A rota `/card` continua existindo, apenas sai do menu de navegação.
