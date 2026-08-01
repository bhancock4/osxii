import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Difficulty } from '../chaos/difficulty'

/**
 * Leaderboard backend (Supabase project "osxii"). The publishable key is safe
 * to ship in client code — write access is fenced by RLS + CHECK constraints.
 * Env vars override the defaults so preview builds can point elsewhere.
 */
const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://gcllbdvugejrrmrtyaqg.supabase.co'
const SUPABASE_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'sb_publishable_EeJ9KOCj0IJwXsbgsP4VLg_6z84bk07'

let client: SupabaseClient | null = null

export function leaderboardEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

function db(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY)
  return client
}

export type Ending = 'won' | 'ultrawon'

export interface ScoreEntry {
  id?: number
  name: string
  difficulty: Difficulty
  ending: Ending
  score: number
  seconds: number
  balance: number
  subs: number
  ads_closed: number
}

const NAME_KEY = 'osxii_player_name'

export function savedName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' }
}

export function rememberName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name) } catch { /* private browsing: the leaderboard forgets you */ }
}

export async function submitScore(entry: ScoreEntry): Promise<{ id: number }> {
  const { data, error } = await db()
    .from('scores')
    .insert({
      name: entry.name,
      difficulty: entry.difficulty,
      ending: entry.ending,
      score: Math.round(entry.score),
      seconds: Math.round(entry.seconds),
      balance: Math.round(entry.balance * 100) / 100,
      subs: entry.subs,
      ads_closed: entry.ads_closed,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id }
}

/**
 * Top entries for a board. Normal wins rank by score (desc); Total System
 * Liberation ranks by speed (asc) because the score is always ∞.
 */
export async function fetchTop(difficulty: Difficulty, ending: Ending, limit = 10): Promise<ScoreEntry[]> {
  let q = db()
    .from('scores')
    .select('id, name, difficulty, ending, score, seconds, balance, subs, ads_closed')
    .eq('difficulty', difficulty)
    .eq('ending', ending)
    .limit(limit)
  q = ending === 'ultrawon' ? q.order('seconds', { ascending: true }) : q.order('score', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ScoreEntry[]
}

/** 1-based rank of a submitted entry within its board. */
export async function fetchRank(entry: ScoreEntry): Promise<number> {
  let q = db()
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('difficulty', entry.difficulty)
    .eq('ending', entry.ending)
  q = entry.ending === 'ultrawon' ? q.lt('seconds', Math.round(entry.seconds)) : q.gt('score', Math.round(entry.score))
  const { count, error } = await q
  if (error) throw error
  return (count ?? 0) + 1
}
