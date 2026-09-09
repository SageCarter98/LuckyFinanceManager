import { apiRequest } from '../api'
import { parseDecimal } from '../decimal'
import type { IncomeExpenseSummary, NetWorthSummary, SpendingByCategoryItem } from '../types'

export interface ReportDateRange {
  start_date?: string
  end_date?: string
}

type SpendingByCategoryWire = { category: string; total: string | number }
type IncomeExpenseWire = { income: string | number; expenses: string | number; net: string | number }
type NetWorthWire = { total: string | number }

function buildQuery(range: ReportDateRange): string {
  const params = new URLSearchParams()
  if (range.start_date) params.set('start_date', range.start_date)
  if (range.end_date) params.set('end_date', range.end_date)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function spendingByCategory(range: ReportDateRange = {}, signal?: AbortSignal): Promise<SpendingByCategoryItem[]> {
  const wire = await apiRequest<SpendingByCategoryWire[]>(`/reports/spending-by-category${buildQuery(range)}`, {}, signal)
  return wire.map((item) => ({ category: item.category, total: parseDecimal(item.total) }))
}

export async function incomeVsExpense(range: ReportDateRange = {}, signal?: AbortSignal): Promise<IncomeExpenseSummary> {
  const wire = await apiRequest<IncomeExpenseWire>(`/reports/income-vs-expense${buildQuery(range)}`, {}, signal)
  return { income: parseDecimal(wire.income), expenses: parseDecimal(wire.expenses), net: parseDecimal(wire.net) }
}

export async function netWorth(signal?: AbortSignal): Promise<NetWorthSummary> {
  const wire = await apiRequest<NetWorthWire>('/reports/net-worth', {}, signal)
  return { total: parseDecimal(wire.total) }
}
