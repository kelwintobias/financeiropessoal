# Design: Reestruturação de Layout — Home e nova aba Crédito

**Data:** 2026-03-20
**Status:** Aprovado

## Resumo

1. **Home** fica apenas com o modal "Saldo em Conta"
2. **Nova aba "Crédito"** recebe "Disponível para gastar" + "Situação da Fatura"
3. **"Previsão de Receitas"** é removida permanentemente
4. **`EditableAmount`** é extraído para componente compartilhado
5. **BottomNav** ganha 6ª aba "Crédito"

---

## Seção 1 — DashboardPage (Home)

**Arquivo:** `src/pages/DashboardPage.tsx`

Manter apenas:
- Título "Dashboard"
- Seção "Saldo em Conta" (Section 4 atual)

Remover completamente:
- Section 1: "Disponível para gastar"
- Section 2: "Situação da Fatura"
- Section 3: "Previsão de Receitas"

Imports a remover: `calculateForecast`, `creditCard`, `updateBillAndRecord`, `updateMonthlyGoal`, `incomes`, `expenses`, `fixedExpenses`, todos os destructures de `forecast` (exceto `accountBalance`, `realAccountBalance`, `cycleExpensesCash`), e helpers de data (`closingDate`, `paymentDate`, `formatDay`, `limitPercent`, `formatCycleRange`).

`EditableAmount` deixa de ser definido em `DashboardPage.tsx` e passa a ser importado de `@/components/ui/EditableAmount`.

---

## Seção 2 — CreditPage (nova)

**Arquivo:** `src/pages/CreditPage.tsx` (criar)

Contém as seções migradas do Dashboard na ordem:
1. "Disponível para gastar" (painel verde/vermelho com `quantoPodeGastar`)
2. "Situação da Fatura" (cartão, fatura acumulada, fixos pendentes, gastos no ciclo, fechamento, limite)

Usa `calculateForecast` com todos os dados necessários (incomes, expenses, fixedExpenses, creditCard, userSettings).

Usa `EditableAmount` importado de `@/components/ui/EditableAmount`.

Título da página: "Crédito"

---

## Seção 3 — EditableAmount (extrair)

**Arquivo:** `src/components/ui/EditableAmount.tsx` (criar)

Mover o componente `EditableAmount` que hoje está inline em `DashboardPage.tsx` para este arquivo dedicado. Interface mantida:

```ts
interface EditableAmountProps {
  value: number
  onSave: (v: number) => Promise<void>
  label: string
}
```

---

## Seção 4 — Rota e Navegação

**`src/routes.tsx`** — adicionar:
```tsx
import CreditPage from '@/pages/CreditPage'
// ...
<Route path="credit" element={<CreditPage />} />
```

**`src/components/layout/BottomNav.tsx`** — adicionar como 6ª entrada:
```ts
{ to: '/credit', icon: '💳', label: 'Crédito' }
```

Nav resultante: **Início · Renda · Gastos · Fixos · Metas · Crédito**

---

## Arquivos modificados / criados

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/ui/EditableAmount.tsx` |
| Criar | `src/pages/CreditPage.tsx` |
| Modificar | `src/pages/DashboardPage.tsx` |
| Modificar | `src/routes.tsx` |
| Modificar | `src/components/layout/BottomNav.tsx` |

---

## Comportamentos preservados

- Toda a lógica de `calculateForecast` permanece intacta, apenas muda de arquivo
- `updateAccountBalance` continua sendo chamado de `DashboardPage`
- `updateBillAndRecord` e `updateMonthlyGoal` passam a ser chamados de `CreditPage`
- O link "Editar cartão / Configurar" na seção "Situação da Fatura" aponta para `/card` (mantido)
- A rota `/card` (CardPage) não é alterada
