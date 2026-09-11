export interface UserRead {
  id: string
  email: string
  full_name: string
  tenant_id: string
  role: string
  email_verified: boolean
  timezone: string
  preferred_currency: string
  notification_preferences: Record<string, boolean>
  /** Only ever populated by /auth/signup, and only outside production -- no
   * email provider is wired in yet. Always null everywhere else. */
  dev_verification_token: string | null
}

export interface UserUpdateInput {
  full_name?: string
  timezone?: string
  preferred_currency?: string
  notification_preferences?: Record<string, boolean>
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export type AccountType = 'checking' | 'savings' | 'credit'

export interface AccountRead {
  id: string
  tenant_id: string
  name: string
  account_type: AccountType
  native_currency: string
  current_balance: number
  created_at: string
  updated_at: string
}

export interface AccountInput {
  name: string
  account_type: AccountType
  native_currency: string
  current_balance: number
}

export interface CategoryRead {
  id: string
  tenant_id: string
  name: string
  monthly_limit: number | null
  created_at: string
  updated_at: string
}

export interface CategoryInput {
  name: string
  monthly_limit: number | null
}

export type TransactionType = 'income' | 'expense'

export interface TransactionRead {
  id: string
  tenant_id: string
  account_id: string
  category_id: string | null
  transaction_type: TransactionType
  amount: number
  currency: string
  transaction_date: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface TransactionInput {
  account_id: string
  category_id: string | null
  transaction_type: TransactionType
  amount: number
  currency: string
  transaction_date: string | null
  note: string | null
}

export interface TransactionFilters {
  account_id?: string
  category_id?: string
  start_date?: string
  end_date?: string
}

export type BillFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringBillRead {
  id: string
  tenant_id: string
  account_id: string
  category_id: string | null
  name: string
  amount: number
  currency: string
  frequency: BillFrequency
  due_day: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecurringBillInput {
  name: string
  account_id: string
  category_id: string | null
  amount: number
  currency: string
  frequency: BillFrequency
  due_day: number
}

export interface SavingsGoalRead {
  id: string
  tenant_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  created_at: string
  updated_at: string
}

export interface SavingsGoalInput {
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
}

export interface NotificationRead {
  id: string
  tenant_id: string
  user_id: string | null
  kind: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface SpendingByCategoryItem {
  category: string
  total: number
}

export interface IncomeExpenseSummary {
  income: number
  expenses: number
  net: number
}

export interface NetWorthSummary {
  total: number
}

export interface AdminTenantSearchResult {
  user_id: string
  email: string
  full_name: string
  tenant_id: string
  role: string
  email_verified: boolean
  account_count: number
  category_count: number
  transaction_count: number
  recurring_bill_count: number
  savings_goal_count: number
  notification_count: number
}

export interface AdminTenantSummary {
  tenant_id: string
  user_count: number
  account_count: number
  category_count: number
  transaction_count: number
  notification_count: number
}

export type SubscriptionStatusValue =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'

export interface SubscriptionStatusRead {
  status: SubscriptionStatusValue
  is_entitled: boolean
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  grace_period_ends_at: string | null
  plan_amount_cents: number
  plan_currency: string
}

export interface CheckoutSessionRead {
  checkout_url: string
}

export interface BillingHistoryItem {
  id: string
  amount_due: number
  amount_paid: number
  currency: string
  status: string
  created_at: string
  hosted_invoice_url: string | null
  invoice_pdf_url: string | null
}

export interface ExportPayload {
  user: {
    id: string
    email: string
    full_name: string
    tenant_id: string
    email_verified: boolean
    timezone: string
    preferred_currency: string
    notification_preferences: Record<string, boolean>
  }
  accounts: Record<string, unknown>[]
  categories: Record<string, unknown>[]
  transactions: Record<string, unknown>[]
  recurring_bills: Record<string, unknown>[]
  savings_goals: Record<string, unknown>[]
}
