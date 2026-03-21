# Dashboard Cycle-Based Spending Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 7-day base in the "Controle da Semana" section with a dynamic calculation based on days remaining in the billing cycle, and rename the fields to "Gasto Diário" and "Disponível para esta Semana".

**Architecture:** Single-file change in `DashboardPage.tsx`. Add `cycleEnd` to the forecast destructure, calculate `diasNoCiclo` (days from today to cycleEnd inclusive), replace `limiteDiario` with `gastoDiario = totalDisponivel / diasNoCiclo`, rename `disponivelAteDomingo` to `disponivelSemana`, and update JSX labels.

**Tech Stack:** React, TypeScript, Tailwind CSS, Zustand (`useFinanceStore`), `calculateForecast` (forecastUtils)

---

## Files

| Action | File |
|--------|------|
| Modify | `kekel-finance/src/pages/DashboardPage.tsx` |

---

### Task 1: Update calculations and JSX for cycle-based spending control

Replace the fixed 7-day daily limit with a dynamic cycle-based calculation and update all labels.

**Files:**
- Modify: `kekel-finance/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Read the current file**

  ```bash
  # File: kekel-finance/src/pages/DashboardPage.tsx
  ```

  Confirm the current content before editing. The file currently has:
  - `const { accountBalance, realAccountBalance, cycleExpensesCash } = forecast` (line 33)
  - `const diasRestantes = d === 0 ? 1 : 8 - d` (line 37)
  - `const limiteDiario = diasRestantes > 0 ? totalDisponivel / 7 : 0` (line 39)
  - `const disponivelAteDomingo = limiteDiario * diasRestantes` (line 40)
  - JSX labels: "Disponível até Domingo", "Limite Diário", "por dia (base 7 dias)"

- [ ] **Step 2: Replace the forecast destructure to add `cycleEnd`**

  Change:
  ```tsx
  const { accountBalance, realAccountBalance, cycleExpensesCash } = forecast
  ```
  To:
  ```tsx
  const { accountBalance, realAccountBalance, cycleExpensesCash, cycleEnd } = forecast
  ```

- [ ] **Step 3: Replace the three old calculation lines with the new cycle-based ones**

  Remove these three lines:
  ```tsx
  const diasRestantes = d === 0 ? 1 : 8 - d
  // Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
  const limiteDiario = diasRestantes > 0 ? totalDisponivel / 7 : 0
  const disponivelAteDomingo = limiteDiario * diasRestantes
  ```

  Replace with:
  ```tsx
  // Dias até domingo (hoje inclusive): Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
  const diasAteDomingo = d === 0 ? 1 : 8 - d

  // Dias restantes no ciclo de faturamento (hoje inclusive).
  // cycleEnd é 'YYYY-MM-DD' (formato garantido por calculateForecast).
  // Math.max(1,...) protege contra cycleEnd no passado.
  const cycleEndDate = new Date(cycleEnd + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diasNoCiclo = Math.max(1, Math.floor((cycleEndDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  const gastoDiario = totalDisponivel / diasNoCiclo
  const disponivelSemana = gastoDiario * diasAteDomingo
  ```

- [ ] **Step 4: Update the JSX section**

  In the "Controle da Semana" section JSX, replace the entire content of the `<div className="space-y-2 border-t border-gray-100 pt-3">` block:

  Change:
  ```tsx
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
  ```

  To:
  ```tsx
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
  ```

- [ ] **Step 5: Verify the complete file**

  After all edits, the calculations block (between `const { accountBalance, ... } = forecast` and `return (`) should look exactly like this:

  ```tsx
  const { accountBalance, realAccountBalance, cycleExpensesCash, cycleEnd } = forecast

  const totalDisponivel = accountBalance - monthlyGoal
  const d = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  // Dias até domingo (hoje inclusive): Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
  const diasAteDomingo = d === 0 ? 1 : 8 - d

  // Dias restantes no ciclo de faturamento (hoje inclusive).
  // cycleEnd é 'YYYY-MM-DD' (formato garantido por calculateForecast).
  // Math.max(1,...) protege contra cycleEnd no passado.
  const cycleEndDate = new Date(cycleEnd + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diasNoCiclo = Math.max(1, Math.floor((cycleEndDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  const gastoDiario = totalDisponivel / diasNoCiclo
  const disponivelSemana = gastoDiario * diasAteDomingo
  ```

  Confirm no references to old variable names (`diasRestantes`, `limiteDiario`, `disponivelAteDomingo`) remain anywhere in the file.

- [ ] **Step 6: Run typecheck and lint**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck && npm run lint
  ```

  Expected: no type errors. Pre-existing lint warnings in other files are acceptable.

- [ ] **Step 7: Run build**

  ```bash
  npm run build
  ```

  Expected: build completes without errors.

- [ ] **Step 8: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/pages/DashboardPage.tsx && git commit -m "feat: base Gasto Diario and Disponivel para esta Semana on billing cycle days remaining [Cycle Spending]"
  ```
