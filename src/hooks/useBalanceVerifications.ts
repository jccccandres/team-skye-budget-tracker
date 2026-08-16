import { useCallback, useEffect, useMemo, useState } from 'react'
import { notifyDataChanged } from '../lib/dataSync'
import { todayISO } from '../lib/format'
import { supabase } from '../lib/supabaseClient'
import type { BalanceVerification, CreateBalanceVerificationInput, VerificationScopeType } from '../types/database'
import { useAuth } from './useAuth'

export interface VerificationScopeRef {
  scopeType: VerificationScopeType
  walletId: string | null
  savingsGoalId: string | null
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function scopeKey(scope: VerificationScopeRef): string {
  if (scope.scopeType === 'personal') return 'personal'
  if (scope.scopeType === 'wallet') return `wallet:${scope.walletId ?? ''}`
  return `savings_goal:${scope.savingsGoalId ?? ''}`
}

function scopeFromRow(row: BalanceVerification): VerificationScopeRef {
  return {
    scopeType: row.scope_type,
    walletId: row.wallet_id,
    savingsGoalId: row.savings_goal_id,
  }
}

export function useBalanceVerifications() {
  const { user } = useAuth()
  const [items, setItems] = useState<BalanceVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('balance_verifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
      setLoading(false)
      return
    }

    setItems((data as BalanceVerification[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const latestByScope = useMemo(() => {
    const map = new Map<string, BalanceVerification>()
    for (const row of items) {
      const key = scopeKey(scopeFromRow(row))
      if (!map.has(key)) {
        map.set(key, row)
      }
    }
    return map
  }, [items])

  const latestForScope = useCallback(
    (scope: VerificationScopeRef): BalanceVerification | null => latestByScope.get(scopeKey(scope)) ?? null,
    [latestByScope],
  )

  const createVerification = useCallback(
    async (input: CreateBalanceVerificationInput) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      if (input.scopeType === 'wallet' && !input.walletId) {
        return { error: 'Wallet verification requires a wallet.' }
      }

      if (input.scopeType === 'savings_goal' && !input.savingsGoalId) {
        return { error: 'Savings verification requires a savings goal.' }
      }

      if (input.scopeType === 'savings_goal' && input.actualAmount < 0) {
        return { error: 'Savings actual amount cannot be negative.' }
      }

      let expectedAmount = 0

      if (input.scopeType === 'personal' || input.scopeType === 'wallet') {
        const { data: totalsData, error: totalsError } = await supabase
          .rpc('get_wallet_totals', {
            p_wallet_id: input.scopeType === 'wallet' ? input.walletId : null,
            p_start: null,
            p_end: null,
          })
          .single()

        if (totalsError) return { error: totalsError.message }

        const totals = totalsData as {
          total_income: number
          total_expenses: number
          total_credit_card_expenses: number
          transferred_out: number
        }

        const totalIncome = Number(totals.total_income)
        const totalExpenses = Number(totals.total_expenses)
        const totalCreditCardExpenses = Number(totals.total_credit_card_expenses)
        const transferredOut = Number(totals.transferred_out)
        expectedAmount = totalIncome - (totalExpenses - totalCreditCardExpenses) - transferredOut
      } else {
        const { data: goalData, error: goalError } = await supabase
          .from('savings_goals')
          .select('current_amount')
          .eq('id', input.savingsGoalId)
          .single()

        if (goalError) return { error: goalError.message }

        expectedAmount = Number((goalData as { current_amount: number }).current_amount)
      }

      const delta = roundCurrency(input.actualAmount - expectedAmount)
      const hasAdjustment = Math.abs(delta) >= 0.01

      let adjustmentKind: BalanceVerification['adjustment_kind'] = 'none'
      let adjustmentReferenceId: string | null = null

      if (hasAdjustment && (input.scopeType === 'personal' || input.scopeType === 'wallet')) {
        if (delta > 0) {
          const { data: incomeData, error: incomeError } = await supabase
            .from('income')
            .insert({
              user_id: user.id,
              wallet_id: input.scopeType === 'wallet' ? input.walletId : null,
              amount: roundCurrency(Math.abs(delta)),
              source: 'Balance Reconciliation',
              frequency: 'One-time',
              date: input.date || todayISO(),
            })
            .select('id')
            .single()

          if (incomeError) return { error: incomeError.message }

          adjustmentKind = 'income'
          adjustmentReferenceId = (incomeData as { id: string }).id
        } else {
          const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .insert({
              user_id: user.id,
              wallet_id: input.scopeType === 'wallet' ? input.walletId : null,
              amount: roundCurrency(Math.abs(delta)),
              category: 'Balance Reconciliation',
              description: 'Balance verification adjustment',
              payment_source: 'wallet',
              credit_card_id: null,
              date: input.date || todayISO(),
            })
            .select('id')
            .single()

          if (expenseError) return { error: expenseError.message }

          adjustmentKind = 'expense'
          adjustmentReferenceId = (expenseData as { id: string }).id
        }
      }

      if (hasAdjustment && input.scopeType === 'savings_goal') {
        const isDeposit = delta > 0
        const { data: savingsTxData, error: savingsTxError } = await supabase
          .from('savings_transactions')
          .insert({
            goal_id: input.savingsGoalId,
            amount: roundCurrency(Math.abs(delta)),
            type: isDeposit ? 'deposit' : 'withdrawal',
            date: input.date || todayISO(),
            note: 'Balance verification adjustment',
          })
          .select('id')
          .single()

        if (savingsTxError) return { error: savingsTxError.message }

        adjustmentKind = isDeposit ? 'savings_deposit' : 'savings_withdrawal'
        adjustmentReferenceId = (savingsTxData as { id: string }).id
      }

      const { data: verificationData, error: verificationError } = await supabase
        .from('balance_verifications')
        .insert({
          user_id: user.id,
          scope_type: input.scopeType,
          wallet_id: input.scopeType === 'wallet' ? input.walletId : null,
          savings_goal_id: input.scopeType === 'savings_goal' ? input.savingsGoalId : null,
          expected_amount: roundCurrency(expectedAmount),
          actual_amount: roundCurrency(input.actualAmount),
          delta,
          note: input.note,
          adjustment_applied: hasAdjustment,
          adjustment_kind: adjustmentKind,
          adjustment_reference_id: adjustmentReferenceId,
        })
        .select('*')
        .single()

      if (verificationError) return { error: verificationError.message }

      await refresh()
      notifyDataChanged()

      return {
        error: null,
        verification: verificationData as BalanceVerification,
      }
    },
    [user, refresh],
  )

  return {
    items,
    loading,
    error,
    latestForScope,
    createVerification,
    refresh,
  }
}
