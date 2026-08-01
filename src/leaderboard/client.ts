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
 * Top entries for a board, all editions combined (each row carries its
 * difficulty). Normal wins rank by score (desc); Total System Liberation
 * ranks by speed (asc) because the score is always ∞.
 */
export async function fetchTop(ending: Ending, limit = 10, difficulty?: Difficulty): Promise<ScoreEntry[]> {
  let q = db()
    .from('scores')
    .select('id, name, difficulty, ending, score, seconds, balance, subs, ads_closed')
    .eq('ending', ending)
    .limit(limit)
  if (difficulty) q = q.eq('difficulty', difficulty)
  q = ending === 'ultrawon' ? q.order('seconds', { ascending: true }) : q.order('score', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ScoreEntry[]
}

/** 1-based worldwide rank of a submitted entry (all editions combined). */
export async function fetchRank(entry: ScoreEntry): Promise<number> {
  let q = db()
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('ending', entry.ending)
  q = entry.ending === 'ultrawon' ? q.lt('seconds', Math.round(entry.seconds)) : q.gt('score', Math.round(entry.score))
  const { count, error } = await q
  if (error) throw error
  return (count ?? 0) + 1
}

export type Movement = number | 'new'

/**
 * Rank movement per entry since this browser last looked at the board:
 * positive = climbed, negative = fell, 'new' = wasn't on the board before.
 * Persists the current ranks as the new baseline.
 */
export function computeMovement(ending: Ending, rows: ScoreEntry[]): Record<number, Movement> {
  const key = `osxii_lb_ranks_${ending}`
  let prev: Record<string, number> = {}
  try { prev = JSON.parse(localStorage.getItem(key) ?? '{}') } catch { /* corrupted baseline: everyone is new */ }
  const movement: Record<number, Movement> = {}
  const next: Record<string, number> = {}
  rows.forEach((row, i) => {
    const rank = i + 1
    const id = String(row.id)
    if (prev[id] === undefined) movement[row.id!] = 'new'
    else movement[row.id!] = prev[id] - rank
    next[id] = rank
  })
  try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* private browsing */ }
  return movement
}
