# Design: Registro Automático de Gastos ao Atualizar Fatura

**Data:** 2026-03-16
**Status:** Aprovado

---

## Contexto

O usuário atualiza manualmente o valor da fatura do cartão de crédito todos os dias no Dashboard. Atualmente esse valor é apenas salvo em `credit_card_config.current_bill`, sem nenhum histórico. O objetivo é registrar automaticamente a diferença como um gasto na aba "Gastos" sempre que o valor da fatura aumentar.

---

## Requisitos

- Quando o usuário alterar "Fatura atual" de X para Y no Dashboard:
  - Se `Y > X`: calcular `diff = Y - X` e salvar como `Expense`
  - Se `Y <= X`: apenas atualizar o valor, sem registrar gasto
- O gasto automático deve ter:
  - `amount`: `Y - X`
  - `description`: `"Fatura DD/MM"` (data do dia atual)
  - `categoryId`: categoria "Cartão" (criada via migration seed)
  - `date`: data de hoje (`YYYY-MM-DD`)
  - `paymentMethod`: `'card'`
- O gasto aparece na aba "Gastos" como qualquer outro, podendo ser editado ou excluído

---

## Arquitetura

### Abordagem escolhida: Nova action `updateBillAndRecord`

Criar uma função específica no store que encapsula as duas operações (registrar gasto + atualizar fatura) atomicamente. Sem alterar a `updateCurrentBill` existente.

### Fluxo

```
Dashboard (EditableAmount)
  └── onSave={updateBillAndRecord(newAmount)}
        ├── diff = newAmount - creditCard.currentBill
        ├── if diff <= 0 → updateCurrentBill(newAmount) e retorna
        └── if diff > 0:
              ├── addExpense({ amount: diff, description: "Fatura DD/MM", categoryId: <cartão>, date: hoje, paymentMethod: 'card' })
              └── updateCurrentBill(newAmount)
```

---

## Banco de Dados

**Nenhuma mudança de schema.** Os gastos automáticos usam a tabela `expenses` existente.

**Migration de seed:** `supabase/migrations/006_card_category_seed.sql`
Insere a categoria "Cartão" com `is_default: true` e cor `#6366f1`, somente se não existir.

```sql
INSERT INTO categories (id, name, color, is_default)
SELECT gen_random_uuid(), 'Cartão', '#6366f1', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cartão');
```

> **Nota:** migrations 001–005 já existem no projeto. O próximo número disponível é 006.

---

## Detalhes de Implementação

### Assinatura TypeScript

```ts
updateBillAndRecord: (newAmount: number) => Promise<void>
```

### Baseline do diff

`cardBillAccumulated = creditCard.currentBill` (conforme `forecastUtils.ts` linha 178). O valor exibido no Dashboard é igual a `currentBill`, portanto `diff = newAmount - creditCard.currentBill`.

### Guard de categoria

Se a categoria "Cartão" não for encontrada em `get().categories` (ex: migration não aplicada), a action **não registra o gasto** e apenas chama `updateCurrentBill(newAmount)`, logando um warning no console.

### Tratamento de falha parcial

As operações são sequenciais (não atômicas no banco). Estratégia: se `addExpense` falhar, a action retorna sem atualizar `currentBill`. Se `addExpense` suceder mas `updateCurrentBill` falhar, o gasto fica registrado e `currentBill` permanece com o valor antigo — inconsistência aceitável para uso pessoal. Erros são logados no console.

### Formatação de data e arredondamento

- Usar `String(day).padStart(2,'0') + '/' + String(month+1).padStart(2,'0')` para gerar `DD/MM` (mesmo padrão de `formatDay` no DashboardPage)
- `diff` arredondado a 2 casas decimais: `Math.round(diff * 100) / 100`

---

## Artefatos Modificados

| Artefato | Tipo | Descrição da mudança |
|---|---|---|
| `supabase/migrations/006_card_category_seed.sql` | Novo | Seed da categoria "Cartão" |
| `src/types/index.ts` | Edição | Adicionar `updateBillAndRecord` à interface `FinanceStore` |
| `src/store/useFinanceStore.ts` | Edição | Implementar `updateBillAndRecord` |
| `src/pages/DashboardPage.tsx` | Edição | Trocar `updateCurrentBill` por `updateBillAndRecord` no `EditableAmount` da fatura |

---

## UI

Nenhuma mudança na `ExpensesPage`. Os gastos automáticos aparecem na lista existente com o ponto colorido da categoria "Cartão" (roxo), descrição "Fatura DD/MM" e valor da diferença.

---

## Fora do escopo

- Agrupamento visual especial para gastos de fatura na ExpensesPage
- Desfazer automático ao diminuir a fatura
- Notificação ou toast ao registrar o gasto
