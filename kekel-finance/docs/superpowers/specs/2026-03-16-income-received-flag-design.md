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

**Pré-requisito de ordenação:** No `calculateForecast` atual, o bloco de `billingCycle`/`cycleStart`/`cycleEnd` (atualmente nas linhas ~149-154) está posicionado **depois** do bloco de `incomeBeforePayment` (linhas ~127-145). Para usar `isReceivedInCycle`, **mover o bloco de billing cycle para antes do bloco de receitas** (antes da declaração de `incomeList` e `incomeBeforePayment`). Isso não altera nenhuma lógica existente, apenas reordena a computação.

**1. `incomeBeforePayment`:** excluir rendas marcadas como recebidas neste ciclo

O guard deve ser inserido **logo após** o guard existente de `paymentDay == null` (que já exclui rendas sem data definida), ficando assim:

```ts
if (inc.paymentDay == null) return sum          // guard existente (já no saldo)
if (isReceivedInCycle(inc, cycleStart, cycleEnd)) return sum  // novo guard
```

Posicionado após o guard de `paymentDay == null` porque rendas sem data já são excluídas pelo critério existente; o novo guard só precisa atuar sobre rendas que teriam `paymentDay` definido e seriam normalmente contadas.

**Nota:** Quando `creditCard` é `null`, `nextPaymentDate` é `null` e o guard `if (nextPaymentDate != null && ...)` já faz com que `incomeBeforePayment` retorne 0 para todas as rendas. O guard de `isReceivedInCycle` se torna um dead-branch nesse caso, mas é inofensivo.

**2. `incomeList` — campo `received`:** considerar `receivedAt` além do `paymentDay`

A expressão atual é: `income.paymentDay != null ? income.paymentDay <= todayDay : true`

O `paymentDay == null` retorna `true` (renda sem data definida é sempre considerada recebida). A expressão proposta deve preservar esse comportamento:

```ts
const received = isReceivedInCycle(income, cycleStart, cycleEnd)
  || (income.paymentDay == null)
  || (income.paymentDay <= todayDay)
```

Dessa forma:
- `receivedAt` dentro do ciclo → `true` (marcada manualmente)
- `paymentDay == null` → `true` (sem data, considerada já no saldo — comportamento preservado)
- `paymentDay <= todayDay` → `true` (dia já passou — comportamento preservado)

**Efeito colateral intencional:** Como `incomeList` alimenta os totais `incomeReceived` e `incomePending`, uma renda marcada via `receivedAt` passará a compor `incomeReceived` — o que é o comportamento correto e desejado.

---

## Interface (`src/pages/IncomePage.tsx`)

### Botão de toggle por item da lista

Cada renda na lista exibe um botão de toggle à esquerda do valor:

- **Não recebida:** ícone `○` (cinza), sem badge
- **Recebida:** ícone `✓` (verde), badge "Recebida" em verde, valor em cinza

### Comportamento

- Clicar no ícone chama `markIncomeReceived(id, !isReceived)`
- `isReceived` é derivada de `isReceivedInCycle(inc, cycleStart, cycleEnd)`. `IncomePage` não chama `calculateForecast` hoje — a abordagem mais simples é: exportar `isReceivedInCycle` de `forecastUtils.ts` como função pública, e computar `cycleStart`/`cycleEnd` localmente na página chamando `getCurrentBillingCycle(creditCard.closingDay, new Date())` (já exportada de `forecastUtils.ts`) com o `creditCard` da store. Quando `creditCard` é `null`, `isReceived` cai de volta para `false` (sem ciclo definido, o toggle não tem efeito visual relevante).
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

## Notas de Implementação

- **Conversão de datas em `IncomePage`:** `getCurrentBillingCycle` retorna `{ start: Date; end: Date }`. Antes de passar para `isReceivedInCycle`, converter para string: `.toISOString().split('T')[0]` — exatamente como `calculateForecast` já faz nas linhas 153-154 de `forecastUtils.ts`.
- **Error handling em `markIncomeReceived`:** Seguir o padrão existente no store: checar o erro do Supabase antes de chamar `set()`. Caso o update falhe, não atualizar o estado local para evitar divergência silenciosa entre UI e banco.

---

## Fora de Escopo

- Reset manual (desnecessário — o ciclo cuida disso)
- Histórico de quando cada renda foi recebida (pode ser extraído do `received_at` se necessário no futuro)
- Notificações ou lembretes para marcar renda como recebida
