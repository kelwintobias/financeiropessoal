# Design: Marcar Renda como Recebida

**Data:** 2026-03-16
**Status:** Aprovado

---

## Problema

O sistema calcula `quantoPodeGastar` somando o saldo manual do usuário com rendas futuras previstas (`incomeBeforePayment`). Porém, quando o usuário recebe uma renda antes da data prevista e ajusta o saldo manualmente, o sistema continua contando essa renda como futura — resultando em dupla contagem e um valor inflado de quanto pode ser gasto.

---

## Solução

Adicionar um campo `receivedAt` (timestamp) à entidade `Income`. Quando o usuário marca uma renda como recebida, esse campo é preenchido com o momento atual. A lógica de cálculo exclui rendas cujo `receivedAt` caia dentro do ciclo de faturamento atual.

**Reset automático:** ao virar o ciclo de faturamento, o `receivedAt` antigo fica fora do intervalo `[cycleStart, cycleEnd]` e a renda volta automaticamente a ser considerada futura — sem nenhuma ação explícita de reset.

---

## Banco de Dados

### Migration

```sql
ALTER TABLE incomes ADD COLUMN received_at TIMESTAMPTZ NULL;
```

- Nenhum dado existente é alterado (todas as rendas começam como `null`)
- `received_at = null` → renda não marcada como recebida neste ciclo
- `received_at = <timestamp>` → renda marcada como recebida; será comparada com o ciclo atual

---

## Tipos (`src/types/index.ts`)

Adicionar campo opcional à interface `Income`:

```ts
export interface Income {
  // ... campos existentes ...
  receivedAt?: string  // ISO timestamp, ex: '2026-03-16T14:30:00Z'
}
```

Adicionar assinatura à interface `FinanceStore`:

```ts
markIncomeReceived: (id: string, received: boolean) => Promise<void>
```

---

## Store (`src/store/useFinanceStore.ts`)

### `mapIncomeFromDB`

```ts
const mapIncomeFromDB = (row: Record<string, unknown>): Income => ({
  // ... campos existentes ...
  receivedAt: row.received_at != null ? (row.received_at as string) : undefined,
})
```

### `markIncomeReceived`

```ts
markIncomeReceived: async (id, received) => {
  const value = received ? new Date().toISOString() : null
  await supabase
    .from('incomes')
    .update({ received_at: value })
    .eq('id', id)
  set((state) => ({
    incomes: state.incomes.map((inc) =>
      inc.id === id ? { ...inc, receivedAt: value ?? undefined } : inc
    ),
  }))
},
```

---

## Lógica de Cálculo (`src/utils/forecastUtils.ts`)

### Helper: `isReceivedInCycle`

```ts
function isReceivedInCycle(income: Income, cycleStart: string, cycleEnd: string): boolean {
  if (!income.receivedAt) return false
  const date = income.receivedAt.split('T')[0]  // 'YYYY-MM-DD'
  return date >= cycleStart && date <= cycleEnd
}
```

### `calculateForecast` — mudanças

**1. `incomeBeforePayment`:** excluir rendas marcadas como recebidas neste ciclo

```ts
// No início do reduce, antes de qualquer outra verificação:
if (isReceivedInCycle(inc, cycleStart, cycleEnd)) return sum
```

**2. `incomeList` — campo `received`:** considerar `receivedAt` além do `paymentDay`

```ts
const received = isReceivedInCycle(income, cycleStart, cycleEnd)
  || (income.paymentDay != null && income.paymentDay <= todayDay)
```

**Atenção:** `cycleStart` e `cycleEnd` já são computados antes do bloco de receitas no `calculateForecast`. O helper `isReceivedInCycle` precisa ser chamado após a computação do ciclo.

---

## Interface (`src/pages/IncomePage.tsx`)

### Botão de toggle por item da lista

Cada renda na lista exibe um botão de toggle à esquerda do valor:

- **Não recebida:** ícone `○` (cinza), sem badge
- **Recebida:** ícone `✓` (verde), badge "Recebida" em verde, valor em cinza

### Comportamento

- Clicar no ícone chama `markIncomeReceived(id, !isReceived)`
- A `isReceived` local é derivada de `inc.receivedAt != null` (sem dependência do ciclo — a página não tem acesso ao `cycleStart/cycleEnd`)
- Sem modal de confirmação; feedback via atualização imediata do estado

### Consideração de UX

O badge "Recebida" serve também como indicador visual na tela de renda de que aquela renda **já está no saldo** e não será mais somada como futura nas projeções.

---

## Fluxo Completo

```
Usuário recebe renda → ajusta saldo manualmente → abre IncomePage
→ toca ○ na renda correspondente → vira ✓ (Recebida)
→ received_at salvo no Supabase
→ forecastUtils exclui essa renda de incomeBeforePayment
→ quantoPodeGastar não conta mais duas vezes
→ ao virar o ciclo, received_at fica fora do range → renda volta a ser futura
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/XXX_income_received_at.sql` | Nova coluna `received_at` |
| `src/types/index.ts` | Campo `receivedAt?` em `Income`; `markIncomeReceived` em `FinanceStore` |
| `src/store/useFinanceStore.ts` | `mapIncomeFromDB` + action `markIncomeReceived` |
| `src/utils/forecastUtils.ts` | Helper `isReceivedInCycle`; mudanças em `incomeList` e `incomeBeforePayment` |
| `src/pages/IncomePage.tsx` | Toggle button por item; badge "Recebida" |

---

## Fora de Escopo

- Reset manual (desnecessário — o ciclo cuida disso)
- Histórico de quando cada renda foi recebida (pode ser extraído do `received_at` se necessário no futuro)
- Notificações ou lembretes para marcar renda como recebida
