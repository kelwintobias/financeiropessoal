# Spec: Recorrência Semanal em Gastos Fixos

**Data:** 2026-03-19
**Status:** Aprovado

---

## Visão Geral

Adicionar suporte a recorrência semanal (por dia da semana ou datas específicas) nos gastos fixos. O usuário informa o valor por ocorrência e seleciona o padrão de repetição. O sistema calcula automaticamente quantas ocorrências existem do dia atual até o fim do ciclo da fatura e as inclui no forecast da fatura, sem duplicar valores já presentes no saldo manual (`currentBill`).

---

## Requisitos

1. O usuário informa o **valor por ocorrência** (ex: R$ 50).
2. O usuário escolhe a recorrência:
   - **Dias da semana pré-definidos** (chips): Seg, Ter, Qua, Qui, Sex, Sáb, Dom; atalhos "Fins de semana" (Sáb+Dom) e "Dias úteis" (Seg–Sex).
   - **Personalizado**: seleção manual de datas específicas via calendário do ciclo atual.
3. O sistema calcula as ocorrências de **amanhã** (`today + 1 dia`) até o fim do ciclo inclusive, e multiplica pelo valor unitário.
4. Datas já passadas no ciclo (incluindo hoje) não são somadas ao forecast — assumem-se incorporadas no `currentBill`.
5. Padrões por dia da semana são **recalculados automaticamente** a cada novo ciclo.
6. Datas específicas **persistem** até o usuário removê-las manualmente.
7. Quando `recurrenceType` está definido (não-null), o campo `billingDay` é **ignorado no forecast** e oculto na UI do formulário. Apenas gastos fixos com `recurrenceType = null` participam do cálculo de `fixedAlreadyBilled` e `fixedPending`.

---

## Modelo de Dados

### TypeScript — `src/types/index.ts`

```ts
export interface FixedExpense {
  id: string
  description: string
  amount: number              // valor por ocorrência quando recurrenceType definido; valor mensal quando null
  categoryId?: string
  billingDay?: number         // ignorado no forecast quando recurrenceType não é null
  paymentMethod: 'card' | 'cash'
  isActive: boolean
  createdAt: string
  recurrenceType?: 'weekdays' | 'specific'   // undefined/null = mensal (comportamento atual)
  recurrenceWeekdays?: number[]              // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  recurrenceDates?: string[]                 // formato 'YYYY-MM-DD'
}
```

**Semântica de limpeza:** passar `recurrenceType: undefined` (ou `null` no payload Supabase) reverte o gasto ao modo mensal com `billingDay`. Quando `recurrenceType` é apagado, `recurrenceWeekdays` e `recurrenceDates` também devem ser enviados como `null`.

**Ativação da recorrência:** ao definir `recurrenceType` na UI, o campo `billingDay` deve ser enviado como `null` no payload — garantindo que um `billingDay` pré-existente não cause interferência futura.

### Migration Supabase

```sql
-- supabase/migrations/004_fixed_expense_recurrence.sql
ALTER TABLE fixed_expenses
  ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('weekdays', 'specific')),
  ADD COLUMN recurrence_weekdays INTEGER[],
  ADD COLUMN recurrence_dates TEXT[];
```

Todos os campos são nullable; registros existentes não são afetados. O cliente Supabase JS retorna colunas `INTEGER[]` e `TEXT[]` do PostgreSQL como arrays JavaScript nativos — nenhuma deserialização customizada necessária em `mapFixedExpenseFromDB`.

---

## Lógica de Forecast — `src/utils/forecastUtils.ts`

### Nova função auxiliar

```ts
// Não exportada — interna a forecastUtils.ts; exportada apenas para testes unitários se necessário
function calcRecurringFixedTotal(
  fixedExpenses: FixedExpense[],  // deve ser pré-filtrado pelo chamador (isActive, recurrenceType)
  cycleEnd: string,               // 'YYYY-MM-DD' — inclusive
  today: Date                     // objeto Date representando o dia atual
): number
```

**Comportamento:**
- Recebe lista já filtrada (o chamador é responsável pelo filtro de `isActive` e `recurrenceType`).
- Para `recurrenceType = 'weekdays'`:
  - Itera de `today + 1 dia` até `cycleEnd` inclusive.
  - Conta dias cujo `date.getDay()` está em `recurrenceWeekdays`.
  - Acumula `count × amount`.
- Para `recurrenceType = 'specific'`:
  - `todayStr = today.toISOString().split('T')[0]` (mesmo padrão de `cycleStart`/`cycleEnd` no codebase).
  - Filtra `recurrenceDates` onde `date > todayStr` e `date <= cycleEnd` (comparação de strings `'YYYY-MM-DD'`).
  - Acumula `count × amount`.
- Retorna soma total.

### Integração em `calculateForecast`

**Separação das listas de fixos ativos:**

```ts
const activeFixed = fixedExpenses.filter(fe => fe.isActive)
const monthlyFixed = activeFixed.filter(fe => !fe.recurrenceType)   // billingDay-based
const recurringFixed = activeFixed.filter(fe => !!fe.recurrenceType) // recurrence-based
```

**Cálculos mensais (inalterados, mas aplicados apenas a `monthlyFixed`):**

```ts
const totalFixedActive = monthlyFixed.reduce((sum, fe) => sum + fe.amount, 0)
const fixedAlreadyBilled = monthlyFixed
  .filter(fe => fe.billingDay != null && fe.billingDay <= todayDay)
  .reduce((sum, fe) => sum + fe.amount, 0)
const fixedPending = totalFixedActive - fixedAlreadyBilled
// Invariante preservada: fixedAlreadyBilled + fixedPending === totalFixedActive
```

**Cálculo recorrente com split por forma de pagamento:**

Gastos recorrentes respeitam `paymentMethod` da mesma forma que os gastos manuais:
- `'card'` → contabilizados na fatura do cartão
- `'cash'` → contabilizados como saída do saldo em conta

```ts
const recurringCard = recurringFixed.filter(fe => fe.paymentMethod === 'card')
const recurringCash  = recurringFixed.filter(fe => fe.paymentMethod === 'cash')

const fixedRecurringCard = calcRecurringFixedTotal(recurringCard, cycleEnd, today)
const fixedRecurringCash = calcRecurringFixedTotal(recurringCash,  cycleEnd, today)
const fixedRecurring = fixedRecurringCard + fixedRecurringCash  // total para ForecastResult
```

**Fórmula completa da fatura:**

```ts
const cardBillForecast = cardBillAccumulated + fixedPending + fixedRecurringCard + cycleExpensesCard
```

**Saldo real em conta (atualizado):**

```ts
const realAccountBalance = manualBalance - cycleExpensesCash - fixedRecurringCash
```

**`cycleEnd` sem cartão:** quando não há cartão configurado, o `calculateForecast` já define `cycleEnd` como último dia do mês corrente — essa string é passada diretamente para `calcRecurringFixedTotal`.

### Atualização de `ForecastResult`

```ts
export interface ForecastResult {
  // ... campos existentes ...
  fixedRecurring: number      // total (card + cash) das despesas recorrentes pendentes no ciclo
  fixedRecurringCard: number  // parcela cartão
  fixedRecurringCash: number  // parcela dinheiro/PIX
}
```

> **Nota de integridade:** `totalFixedActive` passa a cobrir somente `monthlyFixed`. A identidade `fixedAlreadyBilled + fixedPending = totalFixedActive` é preservada. O custo recorrente do ciclo é exposto via `fixedRecurring` — os dois valores têm semânticas distintas (mensal fixo vs. ocorrências futuras no ciclo) e não devem ser somados na UI.

---

## Store — `src/store/useFinanceStore.ts`

### `mapFixedExpenseFromDB`

```ts
recurrenceType: (row.recurrence_type as FixedExpense['recurrenceType']) ?? undefined,
recurrenceWeekdays: (row.recurrence_weekdays as number[] | null) ?? undefined,
recurrenceDates: (row.recurrence_dates as string[] | null) ?? undefined,
```

### `addFixedExpense` e `updateFixedExpense`

Incluir no payload Supabase:

```ts
recurrence_type: fe.recurrenceType ?? null,
recurrence_weekdays: fe.recurrenceWeekdays ?? null,
recurrence_dates: fe.recurrenceDates ?? null,
```

`isActive` e `toggleFixedExpense` se aplicam a gastos recorrentes da mesma forma que aos mensais — nenhuma mudança necessária.

---

## UI

### `FixedExpenseForm.tsx`

**Novos estados:**

```ts
const [hasRecurrence, setHasRecurrence] = useState(false)
const [recurrenceType, setRecurrenceType] = useState<'weekdays' | 'specific' | null>(null)
const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([])
const [recurrenceDates, setRecurrenceDates] = useState<string[]>([])
const [showCalendar, setShowCalendar] = useState(false)
```

**Regras de modo:**
- Selecionar chips define `recurrenceType = 'weekdays'` e limpa `recurrenceDates`.
- Selecionar "Personalizado" define `recurrenceType = 'specific'`, limpa `recurrenceWeekdays`, e abre o modal.
- Alternar de volta para "Não" limpa todos os campos de recorrência.

**Fluxo do formulário:**

1. Campos existentes: descrição, valor, forma de pagamento, categoria.
2. Toggle: **"Esse valor se repete em outros dias?"** → [Não] [Sim].
3. Se "Sim":
   - **Campo "Dia de cobrança" é ocultado.**
   - Chips clicáveis (múltipla seleção): Seg, Ter, Qua, Qui, Sex, Sáb, Dom.
   - Atalhos: **"Fins de semana"** (toggle Sáb+Dom), **"Dias úteis"** (toggle Seg–Sex).
   - Botão **"Personalizado"** → abre modal de calendário (limpa chips selecionados).
4. Se "Não": campo "Dia de cobrança" exibido normalmente (comportamento atual).
5. **Preview** (visível ao selecionar qualquer recorrência):
   ```
   X ocorrências até o fechamento  →  Total previsto: R$ Y
   ```
   Calculado via `calcRecurringFixedTotal` usando o ciclo do cartão e a data atual.

**Modal de calendário:**
- Exibe os dias de `cycleStart` a `cycleEnd`.
- Toque seleciona/deseleciona a data (destaque visual).
- Botão "Confirmar" fecha o modal e define `recurrenceDates`.

### `FixedExpensesPage.tsx`

Linha de detalhe adicional em cada item com recorrência (calculada em tempo de renderização via `calcRecurringFixedTotal`):

- `weekdays`: `"Seg, Sex  ·  3 ocorrências  ·  R$ 150,00 este ciclo"`
- `specific`: `"Datas específicas  ·  2 ocorrências  ·  R$ 100,00 este ciclo"`

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/types/index.ts` | Adicionar campos `recurrenceType`, `recurrenceWeekdays`, `recurrenceDates` a `FixedExpense`; adicionar `fixedRecurring`, `fixedRecurringCard`, `fixedRecurringCash` a `ForecastResult` |
| `src/utils/forecastUtils.ts` | Nova função interna `calcRecurringFixedTotal`; separar `monthlyFixed` de `recurringFixed`; atualizar fórmulas de `cardBillForecast` e `realAccountBalance` |
| `src/store/useFinanceStore.ts` | Atualizar `mapFixedExpenseFromDB`, `addFixedExpense`, `updateFixedExpense` |
| `src/components/fixedExpenses/FixedExpenseForm.tsx` | Adicionar toggle, chips, atalhos, modal de calendário e preview |
| `src/pages/FixedExpensesPage.tsx` | Exibir detalhe de recorrência em cada item |
| `supabase/migrations/004_fixed_expense_recurrence.sql` | Migration com 3 novas colunas nullable |

---

## Casos de Borda

- **Ciclo sem ocorrências futuras:** preview exibe "0 ocorrências — R$ 0,00"; o gasto persiste para ciclos futuros.
- **Datas específicas fora do ciclo atual:** ignoradas no cálculo corrente mas persistem para ciclos futuros.
- **Sem cartão configurado:** `cycleEnd` = último dia do mês corrente; cálculo funciona normalmente.
- **Chips + calendário são mutuamente exclusivos:** selecionar chips limpa `recurrenceDates`; abrir calendário limpa `recurrenceWeekdays`.
- **Alternância entre modos:** ao alternar de `weekdays` para `specific` ou vice-versa, os dados do modo anterior são limpos.
- **`isActive = false`:** gastos recorrentes inativos são excluídos do cálculo assim como os mensais.
- **Remoção de `recurrenceType`:** enviar `recurrenceType: null` para o Supabase também envia `recurrenceWeekdays: null` e `recurrenceDates: null`, revertendo ao modo mensal com `billingDay`.
- **Ativação de recurrenceType em gasto existente com `billingDay`:** o payload da atualização deve incluir `billing_day: null`, garantindo que o valor não interfira em futura reversão acidental.
