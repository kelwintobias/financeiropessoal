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

Remover completamente do JSX:
- Section 1: "Disponível para gastar"
- Section 2: "Situação da Fatura"
- Section 3: "Previsão de Receitas"

**`calculateForecast` é mantido** em DashboardPage — a seção "Saldo em Conta" usa `accountBalance`, `realAccountBalance` e `cycleExpensesCash` que vêm do forecast. Portanto `incomes`, `expenses`, `fixedExpenses`, `creditCard` e `manualBalance` continuam sendo passados para `calculateForecast`.

Destructures do forecast a manter: apenas `{ accountBalance, realAccountBalance, cycleExpensesCash }`.

Remover do store: `updateBillAndRecord`, `updateMonthlyGoal`.

Remover helpers de data/UI que eram exclusivos das seções removidas: `closingDate`, `paymentDate`, `formatDay`, `limitPercent`, `formatCycleRange`, e todos os outros destructures do forecast não listados acima (`spendingPower`, `cardBillAccumulated`, `cardBillForecast`, `daysUntilClosing`, `daysUntilPayment`, `incomeReceived`, `incomePending`, `incomeList`, `fixedAlreadyBilled`, `fixedPending`, `cycleExpensesCard`, `cycleStart`, `cycleEnd`, `incomeBeforePayment`, `quantoPodeGastar`).

`EditableAmount` deixa de ser definido inline em `DashboardPage.tsx` e passa a ser importado de `@/components/ui/EditableAmount`.

---

## Seção 2 — CreditPage (nova)

**Arquivo:** `src/pages/CreditPage.tsx` (criar)

Contém as seções migradas do Dashboard na ordem (código copiado verbatim das linhas 169–289 de DashboardPage.tsx):
1. Section 1: "Disponível para gastar" (painel verde/vermelho, linhas 170–217)
2. Section 2: "Situação da Fatura" (linhas 219–289)

Usa `calculateForecast` com todos os dados necessários (incomes, expenses, fixedExpenses, creditCard, userSettings).

Destructures do forecast usados: `spendingPower`, `cardBillAccumulated`, `cardBillForecast`, `daysUntilClosing`, `daysUntilPayment`, `incomeBeforePayment`, `accountBalance`, `cycleExpensesCash`, `cycleExpensesCard`, `fixedAlreadyBilled`, `fixedPending`, `cycleStart`, `cycleEnd`, `quantoPodeGastar`.

Usa `EditableAmount` importado de `@/components/ui/EditableAmount`.

**Título da página:** `<h1 className="text-xl font-bold text-gray-800 mb-4">💳 Crédito</h1>`

**Imports:** `Link` (react-router-dom), `useFinanceStore`, `currentMonth` (budgetUtils), `calculateForecast` + `formatBRL` (forecastUtils), `EditableAmount` (@/components/ui/EditableAmount).

---

## Seção 3 — EditableAmount (extrair)

**Arquivo:** `src/components/ui/EditableAmount.tsx` (criar)

Extração pura — zero mudanças no comportamento, visual ou assinatura. O componente é copiado integralmente de `DashboardPage.tsx` (linhas 7–74) para o novo arquivo e exportado como `export default`. Interface mantida exatamente:

```ts
interface EditableAmountProps {
  value: number
  onSave: (v: number) => Promise<void>
  label: string
}
```

O componente internamente usa `useState`, `useRef` do React — esses imports vão junto no novo arquivo.

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
