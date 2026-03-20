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
   - **Dias da semana pré-definidos** (chips): Seg, Ter, Qua, Qui, Sex, Sáb, Dom, Fins de semana, Dias úteis.
   - **Personalizado**: seleção manual de datas específicas via calendário do ciclo atual.
3. O sistema calcula as ocorrências de **hoje+1 até o fim do ciclo** e multiplica pelo valor unitário.
4. Datas já passadas no ciclo não são somadas ao forecast (evitar duplicação com `currentBill`).
5. Padrões por dia da semana são **recalculados automaticamente** a cada novo ciclo.
6. Datas específicas **persistem** até o usuário removê-las manualmente.
7. Quando `recurrenceType` está ativo, o campo `billingDay` é ignorado no cálculo do forecast.

---

## Modelo de Dados

### TypeScript — `src/types/index.ts`

```ts
export interface FixedExpense {
  id: string
  description: string
  amount: number              // valor por ocorrência quando recurrenceType definido
  categoryId?: string
  billingDay?: number         // usado apenas quando recurrenceType é undefined
  paymentMethod: 'card' | 'cash'
  isActive: boolean
  createdAt: string
  recurrenceType?: 'weekdays' | 'specific'
  recurrenceWeekdays?: number[]   // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  recurrenceDates?: string[]      // formato 'YYYY-MM-DD'
}
```

### Migration Supabase

```sql
-- supabase/migrations/004_fixed_expense_recurrence.sql
ALTER TABLE fixed_expenses
  ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('weekdays', 'specific')),
  ADD COLUMN recurrence_weekdays INTEGER[],
  ADD COLUMN recurrence_dates TEXT[];
```

Todos os campos são nullable; registros existentes não são afetados.

---

## Lógica de Forecast — `src/utils/forecastUtils.ts`

### Nova função auxiliar

```ts
export function calcRecurringFixedTotal(
  fixedExpenses: FixedExpense[],
  cycleEnd: string,  // 'YYYY-MM-DD'
  today: Date
): number
```

**Lógica:**
- Filtra apenas `isActive = true` e `recurrenceType` definido.
- Para `recurrenceType = 'weekdays'`:
  - Itera de amanhã (`today + 1 dia`) até `cycleEnd` inclusive.
  - Conta dias cujo `getDay()` está em `recurrenceWeekdays`.
  - Soma `count × amount`.
- Para `recurrenceType = 'specific'`:
  - Filtra `recurrenceDates` onde `date > today` e `date <= cycleEnd`.
  - Soma `count × amount`.
- Retorna total combinado.

### Integração em `calculateForecast`

Adição ao cálculo de fatura:

```ts
const fixedRecurring = calcRecurringFixedTotal(activeFixed, cycleEnd, today)
const cardBillForecast = cardBillAccumulated + fixedPending + fixedRecurring + cycleExpensesCard
```

`ForecastResult` ganha campo:

```ts
fixedRecurring: number  // total das despesas recorrentes pendentes no ciclo
```

Gastos mensais com `billingDay` continuam com a lógica atual (`fixedAlreadyBilled` / `fixedPending`) inalterada.

---

## Store — `src/store/useFinanceStore.ts`

### `mapFixedExpenseFromDB`

```ts
recurrenceType: (row.recurrence_type as FixedExpense['recurrenceType']) ?? undefined,
recurrenceWeekdays: (row.recurrence_weekdays as number[]) ?? undefined,
recurrenceDates: (row.recurrence_dates as string[]) ?? undefined,
```

### `addFixedExpense` e `updateFixedExpense`

Incluir os novos campos no payload Supabase:

```ts
recurrence_type: fe.recurrenceType ?? null,
recurrence_weekdays: fe.recurrenceWeekdays ?? null,
recurrence_dates: fe.recurrenceDates ?? null,
```

---

## UI

### `FixedExpenseForm.tsx`

**Novos estados:**
- `hasRecurrence: boolean` — toggle Não/Sim
- `recurrenceType: 'weekdays' | 'specific' | null`
- `recurrenceWeekdays: number[]`
- `recurrenceDates: string[]`
- `showCalendar: boolean` — controla modal de calendário

**Fluxo do formulário:**

1. Campos existentes (descrição, valor, pagamento, categoria).
2. Quando `recurrenceType` é `undefined`: exibe campo "Dia de cobrança" (comportamento atual).
3. Toggle: **"Esse valor se repete em outros dias?"** → [Não] [Sim].
4. Se Sim:
   - Chips clicáveis (múltipla seleção): Seg, Ter, Qua, Qui, Sex, Sáb, Dom.
   - Atalhos: "Fins de semana" (toggle Sáb+Dom), "Dias úteis" (toggle Seg–Sex).
   - Botão "Personalizado" → abre modal de calendário.
   - Campo "Dia de cobrança" fica oculto.
5. **Preview** (visível ao selecionar qualquer recorrência):
   ```
   X ocorrências até o fechamento  →  Total previsto: R$ Y
   ```
   Calculado com `calcRecurringFixedTotal` usando ciclo do cartão e data atual.

**Modal de calendário:**
- Exibe dias de `cycleStart` a `cycleEnd`.
- Toque seleciona/deseleciona a data (destaque visual).
- Botão "Confirmar" fecha o modal e define `recurrenceDates`.

### `FixedExpensesPage.tsx`

Linha de detalhe adicional em cada item com recorrência:

- `weekdays`: `"Seg, Sex  ·  3 ocorrências  ·  R$ 150,00 este ciclo"`
- `specific`: `"Datas específicas  ·  2 ocorrências  ·  R$ 100,00 este ciclo"`

Contagem de ocorrências calculada com `calcRecurringFixedTotal` em tempo de renderização.

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/types/index.ts` | Adicionar campos `recurrenceType`, `recurrenceWeekdays`, `recurrenceDates` a `FixedExpense` e `ForecastResult` |
| `src/utils/forecastUtils.ts` | Nova função `calcRecurringFixedTotal`; atualizar `calculateForecast` e `ForecastResult` |
| `src/store/useFinanceStore.ts` | Atualizar `mapFixedExpenseFromDB`, `addFixedExpense`, `updateFixedExpense` |
| `src/components/fixedExpenses/FixedExpenseForm.tsx` | Adicionar toggle, chips, modal de calendário e preview |
| `src/pages/FixedExpensesPage.tsx` | Exibir detalhe de recorrência em cada item |
| `supabase/migrations/004_fixed_expense_recurrence.sql` | Migration com 3 novas colunas |

---

## Casos de Borda

- **Ciclo sem ocorrências futuras:** preview exibe "0 ocorrências — R$ 0,00"; o gasto continua cadastrado para ciclos futuros.
- **Datas específicas fora do ciclo atual:** são ignoradas no cálculo do ciclo corrente mas persistem para ciclos futuros.
- **Sem cartão configurado:** ciclo usa mês corrente (lógica existente); cálculo de ocorrências funciona normalmente.
- **Chip + calendário simultâneos:** a UI não permite — selecionar chips limpa datas específicas e vice-versa.
