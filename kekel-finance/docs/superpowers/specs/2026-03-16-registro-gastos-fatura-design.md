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

**Migration de seed:** `supabase/migrations/004_card_category_seed.sql`
Insere a categoria "Cartão" com `is_default: true` e cor `#6366f1`, somente se não existir.

```sql
INSERT INTO categories (id, name, color, is_default)
SELECT gen_random_uuid(), 'Cartão', '#6366f1', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cartão');
```

---

## Artefatos Modificados

| Artefato | Tipo | Descrição da mudança |
|---|---|---|
| `supabase/migrations/004_card_category_seed.sql` | Novo | Seed da categoria "Cartão" |
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
