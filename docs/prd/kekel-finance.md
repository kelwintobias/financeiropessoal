# PRD — Kekel Finance

**Versão:** 1.0
**Data:** 2026-03-03
**Status:** Draft

---

## 1. Visão Geral

Aplicativo pessoal para controle de finanças mensais. Foco em simplicidade: registrar gastos, acompanhar orçamentos por categoria e monitorar metas financeiras — tudo num único lugar, sem burocracia.

---

## 2. Problema

Usuário não tem visibilidade clara de para onde vai o dinheiro todo mês. Planilhas são chatas de manter, apps financeiros do mercado são complexos demais e cheios de funcionalidades desnecessárias.

---

## 3. Objetivo

Criar um app leve e direto ao ponto onde o usuário:
- Registra gastos rapidamente
- Vê o resumo do mês em segundos
- Define e acompanha metas financeiras (ex.: juntar R$ 5.000 para viagem)

---

## 4. Usuário-alvo

Uma única pessoa (uso pessoal). Sem multiusuário, sem compartilhamento — por enquanto.

---

## 5. Escopo — MVP

### 5.1 Gastos

| Funcionalidade | Descrição |
|---|---|
| Registrar gasto | Valor, descrição, categoria, data |
| Editar / excluir gasto | Correção de lançamentos |
| Listar gastos do mês | Ordenados por data, com filtro por categoria |
| Total do mês | Soma automática de todos os gastos |

**Categorias padrão:** Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Outros
Usuário pode criar categorias personalizadas.

### 5.2 Orçamento Mensal

| Funcionalidade | Descrição |
|---|---|
| Definir orçamento por categoria | Limite mensal em R$ |
| Indicador de uso | Ex.: "Alimentação: R$ 320 / R$ 500 (64%)" |
| Alerta de estouro | Aviso ao ultrapassar o limite |

### 5.3 Metas Financeiras

| Funcionalidade | Descrição |
|---|---|
| Criar meta | Nome, valor-alvo, prazo (opcional) |
| Registrar aporte | Adicionar valor à meta |
| Progresso visual | Barra de progresso com % atingido |
| Concluir / arquivar meta | Ao atingir o objetivo |

### 5.4 Dashboard

- Resumo do mês atual: total gasto vs. orçamento total
- Gastos por categoria (gráfico simples de barras ou pizza)
- Metas em andamento com progresso

---

## 6. Fora do Escopo (MVP)

- Multiusuário / compartilhamento
- Integração com bancos ou Open Finance
- Importação de extratos (CSV/OFX)
- Relatórios históricos avançados
- Notificações push
- App mobile nativo

---

## 7. Requisitos Não-Funcionais

- **Plataforma:** Web (responsivo para uso no celular pelo browser)
- **Persistência:** Local (localStorage ou IndexedDB) no MVP — sem backend
- **Performance:** Carregamento inicial < 2s
- **Privacidade:** Dados ficam apenas no dispositivo do usuário
- **Offline:** Funciona sem internet

---

## 8. Stack Sugerida

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript |
| Estilo | Tailwind CSS |
| Estado / persistência | Zustand + localStorage |
| Gráficos | Recharts |
| Build | Vite |

> Alternativa mais simples: Next.js com app router caso se queira adicionar backend depois sem migração.

---

## 9. Fluxos Principais

### Registrar um gasto
1. Usuário clica em "Novo gasto"
2. Preenche: valor, categoria, descrição (opcional), data (padrão = hoje)
3. Salva → aparece na lista do mês imediatamente
4. Dashboard atualiza total e indicador de orçamento da categoria

### Criar uma meta
1. Usuário clica em "Nova meta"
2. Preenche: nome, valor-alvo, prazo (opcional)
3. Salva → aparece no painel de metas com progresso 0%
4. A cada aporte, progresso atualiza em tempo real

---

## 10. Métricas de Sucesso

Como é um app pessoal, o critério é uso real e contínuo:

- Usuário registra gastos pelo menos 15 dias no primeiro mês
- Consegue responder "quanto gastei este mês e em quê?" em menos de 10 segundos
- Pelo menos 1 meta criada e acompanhada no primeiro mês

---

## 11. Próximas Versões (Pós-MVP)

- Histórico mensal e comparativo entre meses
- Exportar dados (CSV / JSON)
- Backup na nuvem (opcional, opt-in)
- Recorrências (ex.: aluguel todo dia 5)
- Tags livres em gastos
- PWA para instalação no celular
