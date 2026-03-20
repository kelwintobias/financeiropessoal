# Design: Controle de Gastos Semanal — Dashboard (Home)

**Data:** 2026-03-20
**Status:** Aprovado

## Resumo

Reestruturar a aba Home para exibir controle de gastos baseado no ciclo semanal (Segunda a Domingo). A seção "Saldo em Conta" ganha o campo "Meta de Saldo Final" (editável). Uma nova seção "Controle da Semana" mostra Total Disponível, Disponível até Domingo e Limite Diário.

---

## Seção 1 — Saldo em Conta (expandida)

**Arquivo:** `src/pages/DashboardPage.tsx`

Manter o comportamento atual e adicionar o campo "Meta de Saldo Final":

```
[Saldo atual]           R$ 2.000,00   ← EditableAmount (accountBalance)
[Meta de Saldo Final]   R$   500,00   ← EditableAmount (monthlyGoal) — NOVO
- Gastos Pix/Dinheiro (ciclo)  - R$ 200,00   (só aparece se cycleExpensesCash > 0)
= Saldo real em conta          R$ 1.300,00   (só aparece se cycleExpensesCash > 0)
```

- `EditableAmount` para "Saldo atual" — já existente, chama `updateAccountBalance`
- `EditableAmount` para "Meta de Saldo Final" — NOVO, chama `updateMonthlyGoal`; label exibido: "Meta de Saldo Final"
- Linhas de dedução e saldo real permanecem condicionais (`cycleExpensesCash > 0`)

---

## Seção 2 — Controle da Semana (nova)

**Arquivo:** `src/pages/DashboardPage.tsx`

Exibida abaixo da seção "Saldo em Conta". Título: `Controle da Semana`.

### Cálculos

```ts
const totalDisponivel = accountBalance - monthlyGoal
const d = today.getDay() // 0=Dom, 1=Seg, ..., 6=Sáb
const diasRestantes = d === 0 ? 1 : 8 - d
// Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
const limiteDiario = diasRestantes > 0 ? totalDisponivel / 7 : 0
const disponivelAteDomingo = limiteDiario * diasRestantes
```

### Layout visual (ordem de exibição)

1. **Total Disponível** — valor grande, proeminente
   - Fonte: `text-3xl font-bold`
   - Cor: `text-green-600` se ≥ 0, `text-red-600` se < 0
   - Label acima em cinza: `text-sm text-gray-500`

2. **Disponível até Domingo** — valor médio
   - Formato: `text-xl font-semibold`
   - Cor: verde/vermelho igual ao critério acima
   - Sub-label: `text-xs text-gray-400` mostrando `"N dias (hoje inclusive)"`

3. **Limite Diário** — valor médio
   - Formato: `text-xl font-semibold text-gray-700`
   - Sub-label: `text-xs text-gray-400`: `"por dia (base 7 dias)"`

### Estrutura JSX da seção

```tsx
<section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
  <h2 className="font-semibold text-gray-700 mb-3">Controle da Semana</h2>

  {/* Total Disponível */}
  <div className="mb-4 text-center">
    <p className="text-sm text-gray-500 mb-1">Total Disponível</p>
    <p className={`text-3xl font-bold ${totalDisponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {formatBRL(totalDisponivel)}
    </p>
  </div>

  <div className="space-y-2 border-t border-gray-100 pt-3">
    {/* Disponível até Domingo */}
    <div className="flex justify-between items-center">
      <div>
        <span className="text-sm text-gray-600">Disponível até Domingo</span>
        <p className="text-xs text-gray-400">{diasRestantes} dias (hoje inclusive)</p>
      </div>
      <span className={`text-xl font-semibold ${disponivelAteDomingo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatBRL(disponivelAteDomingo)}
      </span>
    </div>

    {/* Limite Diário */}
    <div className="flex justify-between items-center">
      <div>
        <span className="text-sm text-gray-600">Limite Diário</span>
        <p className="text-xs text-gray-400">por dia (base 7 dias)</p>
      </div>
      <span className={`text-xl font-semibold ${limiteDiario >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
        {formatBRL(limiteDiario)}
      </span>
    </div>
  </div>
</section>
```

---

## Imports adicionados em DashboardPage

Adicionar `updateMonthlyGoal` ao destructure do store:

```ts
const { incomes, expenses, fixedExpenses, creditCard, userSettings, updateAccountBalance, updateMonthlyGoal } = useFinanceStore()
```

Os cálculos de `totalDisponivel`, `diasRestantes`, `limiteDiario` e `disponivelAteDomingo` são definidos diretamente no corpo do componente (sem utilitário externo).

---

## Arquivos modificados

| Ação | Arquivo |
|------|---------|
| Modificar | `src/pages/DashboardPage.tsx` |

Nenhum outro arquivo é alterado. Nenhuma migration de banco necessária (`monthlyGoal` já existe em `user_settings.monthly_goal`).

---

## Comportamentos preservados

- `calculateForecast` permanece em DashboardPage (necessário para `accountBalance`, `realAccountBalance`, `cycleExpensesCash`)
- A seção "Saldo em Conta" existente não é removida — apenas expandida com o novo `EditableAmount` para `monthlyGoal`
- `EditableAmount` continua importado de `@/components/ui/EditableAmount`
- Valores negativos (totalDisponivel < 0) são exibidos em vermelho — não há estado de erro especial
