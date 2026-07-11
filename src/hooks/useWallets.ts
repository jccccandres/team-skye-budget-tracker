import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Wallet, WalletInsert, WalletInvite, WalletMember } from '../types/database'
import { useAuth } from './useAuth'

export interface WalletWithMembers extends Wallet {
  members: WalletMember[]
}

export function useWallets() {
  const { user } = useAuth()
  const [wallets, setWallets] = useState<WalletWithMembers[]>([])
  const [pendingInvites, setPendingInvites] = useState<WalletInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setWallets([])
      setPendingInvites([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [walletsResult, membersResult, invitesResult] = await Promise.all([
      supabase.from('wallets').select('*').order('created_at', { ascending: true }),
      supabase.from('wallet_members').select('*'),
      // RLS filters to invites for the current user; only filter by status here.
      supabase.from('wallet_invites').select('*').eq('status', 'pending'),
    ])

    const walletsError = walletsResult.error ?? membersResult.error
    if (walletsError) {
      setError(walletsError.message)
      setWallets([])
    } else {
      const members = (membersResult.data as WalletMember[]) ?? []
      const combined = ((walletsResult.data as Wallet[]) ?? []).map((wallet) => ({
        ...wallet,
        members: members.filter((m) => m.wallet_id === wallet.id),
      }))
      setWallets(combined)
    }

    if (invitesResult.error) {
      setError((prev) => prev ?? invitesResult.error!.message)
      setPendingInvites([])
    } else {
      setPendingInvites((invitesResult.data as WalletInvite[]) ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createWallet = useCallback(
    async (input: WalletInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.', walletId: null }

      const { data, error: insertError } = await supabase
        .from('wallets')
        .insert({ name: input.name, created_by: user.id })
        .select()
        .single()

      if (insertError) return { error: insertError.message, walletId: null }

      // Add creator as the first member (owner)
      const { error: memberError } = await supabase
        .from('wallet_members')
        .insert({ wallet_id: data.id, user_id: user.id, role: 'owner' })

      if (memberError) return { error: memberError.message, walletId: null }

      await refresh()
      return { error: null, walletId: data.id as string }
    },
    [user, refresh],
  )

  const inviteToWallet = useCallback(
    async (walletId: string, email: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail) return { error: 'Enter an email address.' }
      if (normalizedEmail === user.email?.toLowerCase()) {
        return { error: "You can't invite yourself." }
      }

      const { error: insertError } = await supabase.from('wallet_invites').insert({
        wallet_id: walletId,
        invited_email: normalizedEmail,
        invited_by: user.id,
      })

      if (insertError) return { error: insertError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  const respondToInvite = useCallback(
    async (invite: WalletInvite, accept: boolean) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('wallet_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', invite.id)

      if (updateError) return { error: updateError.message }

      if (accept) {
        const { error: memberError } = await supabase
          .from('wallet_members')
          .insert({ wallet_id: invite.wallet_id, user_id: user.id, role: 'member' })

        if (memberError) return { error: memberError.message }
      }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  const leaveWallet = useCallback(
    async (walletId: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: deleteError } = await supabase
        .from('wallet_members')
        .delete()
        .eq('wallet_id', walletId)
        .eq('user_id', user.id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return {
    wallets,
    pendingInvites,
    loading,
    error,
    createWallet,
    inviteToWallet,
    respondToInvite,
    leaveWallet,
    refresh,
  }
}
