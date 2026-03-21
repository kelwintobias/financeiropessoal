# Design: Controle da Semana com base no ciclo de faturamento

**Data:** 2026-03-20
**Status:** Aprovado

## Resumo

Alterar a seção "Controle da Semana" no Dashboard para calcular o "Gasto Diário Permitido" com base nos dias restantes do ciclo de faturamento (não mais base fixa de 7 dias). O "Disponível para esta Semana" passa a ser o Gasto Diário × dias restantes até domingo.

---

## Contexto atual

`DashboardPage.tsx` já contém uma seção "Controle da Semana" com:
- `limiteDiario = totalDisponivel / 7` (base fixa de 7 dias)
- `disponivelAteDomingo = limiteDiario * diasRestantes`

`calculateForecast()` já retorna `cycleEnd: string` ('YYYY-MM-DD') — o último dia do ciclo de faturamento do cartão, ou último dia do mês calendário se não houver cartão.

---

## Mudanças em DashboardPage.tsx

### 1. Adicionar `cycleEnd` ao destructure do forecast

```tsx
const { accountBalance, realAccountBalance, cycleExpensesCash, cycleEnd } = forecast
```

### 2. Substituir os cálculos semanais

**Remover explicitamente as três linhas abaixo (que serão substituídas):**
```tsx
const diasRestantes = d === 0 ? 1 : 8 - d  // renomeado para diasAteDomingo
const limiteDiario = diasRestantes > 0 ? totalDisponivel / 7 : 0  // substituído por gastoDiario
const disponivelAteDomingo = limiteDiario * diasRestantes  // substituído por disponivelSemana
```

**Substituir por (nesta ordem exata):**
```tsx
// Dias até domingo (hoje inclusive): Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
const diasAteDomingo = d === 0 ? 1 : 8 - d

// Dias restantes no ciclo de faturamento (hoje inclusive).
// cycleEnd é 'YYYY-MM-DD' (formato garantido por calculateForecast).
// Math.max(1,...) protege contra cycleEnd no passado (nunca deve ocorrer, mas previne divisão problemática).
const cycleEndDate = new Date(cycleEnd + 'T00:00:00')
const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
const diasNoCiclo = Math.max(1, Math.floor((cycleEndDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)) + 1)

const gastoDiario = totalDisponivel / diasNoCiclo
const disponivelSemana = gastoDiario * diasAteDomingo
```

A ordem importa: `diasAteDomingo` deve ser declarado **antes** de `disponivelSemana`, que o utiliza.

### 3. Atualizar o JSX da seção

Renomear labels e sub-labels:

| Antes | Depois |
|-------|--------|
| "Disponível até Domingo" | "Disponível para esta Semana" |
| `{diasRestantes} dias (hoje inclusive)` | `{diasAteDomingo} dias (hoje inclusive)` |
| "Limite Diário" | "Gasto Diário" |
| "por dia (base 7 dias)" | `por dia até fim do ciclo ({diasNoCiclo} dias)` |

---

## JSX completo da seção "Controle da Semana"

```tsx
{/* Controle da Semana */}
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
    {/* Disponível para esta Semana */}
    <div className="flex justify-between items-center">
      <div>
        <span className="text-sm text-gray-600">Disponível para esta Semana</span>
        <p className="text-xs text-gray-400">{diasAteDomingo} dias (hoje inclusive)</p>
      </div>
      <span className={`text-xl font-semibold ${disponivelSemana >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatBRL(disponivelSemana)}
      </span>
    </div>

    {/* Gasto Diário */}
    <div className="flex justify-between items-center">
      <div>
        <span className="text-sm text-gray-600">Gasto Diário</span>
        <p className="text-xs text-gray-400">por dia até fim do ciclo ({diasNoCiclo} dias)</p>
      </div>
      <span className={`text-xl font-semibold ${gastoDiario >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
        {formatBRL(gastoDiario)}
      </span>
    </div>
  </div>
</section>
```

---

## Arquivo modificado

| Ação | Arquivo |
|------|---------|
| Modificar | `src/pages/DashboardPage.tsx` |

---

## Comportamentos preservados

- `totalDisponivel = accountBalance - monthlyGoal` — sem alteração
- "Saldo em Conta" section — sem alteração
- Cor verde/vermelho baseada em ≥ 0 / < 0 — mantida
- `diasAteDomingo`: Dom=1, Seg=7, Sex=3, Sáb=2 — mesma lógica, renomeado
- `gastoDiario` mostra `text-gray-700` (neutro) quando positivo — valor de referência, não saldo
- `diasNoCiclo` nunca < 1 (proteção com `Math.max(1, ...)`)
