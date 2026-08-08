import type { SupabaseClient } from '@supabase/supabase-js'
import type { Difficulty } from '../chaos/difficulty'
import { useGame } from '../state/game'
import { getSessionStats } from '../chaos/engine'

/**
 * Leaderboard backend (Supabase project "osxii"). The publishable key is safe
 * to ship in client code — write access is fenced by RLS, CHECK constraints,
 * and a validation trigger. Env vars override the defaults so preview builds
 * can point elsewhere.
 */
const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://gcllbdvugejrrmrtyaqg.supabase.co'
const SUPABASE_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'sb_publishable_EeJ9KOCj0IJwXsbgsP4VLg_6z84bk07'

/**
 * Public by necessity (it ships in the bundle): the salt makes score forgery
 * require reading this code rather than just replaying a request. It is
 * tamper-resistance, not cryptography — the server re-derives the same hash.
 */
const SESSION_SALT = 'OSXII-the-cat-remains-unbothered'

// supabase-js is ~half the app bundle; load it only when a screen actually
// touches the leaderboard, never on the critical path to the boot screen.
let clientPromise: Promise<SupabaseClient> | null = null

export function leaderboardEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

function db(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(m => m.createClient(SUPABASE_URL, SUPABASE_KEY))
  }
  return clientPromise
}

/**
 * Boards: 'won'/'ultrawon' are the classic module; 'timesheet' is a
 * StrategyLens victory; 'shamed' is a StrategyLens miss — the cross-player
 * wall of shame the loss email cc's the world on.
 */
export type Ending = 'won' | 'ultrawon' | 'timesheet' | 'shamed'

/** StrategyLens runs report the 'eom' edition (End of Month). */
export type BoardDifficulty = Difficulty | 'eom'

export interface ScoreEntry {
  id?: number
  name: string
  difficulty: BoardDifficulty
  ending: Ending
  score: number
  seconds: number
  balance: number
  subs: number
  ads_closed: number
}

const NAME_KEY = 'osxii_player_name'

/** Arcade rules: up to 3 characters, A–Z and 0–9, uppercase. */
export function sanitizeName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
}

export function savedName(): string {
  try { return sanitizeName(localStorage.getItem(NAME_KEY) ?? '') } catch { return '' }
}

export function rememberName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name) } catch { /* private browsing: the leaderboard forgets you */ }
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function submitScore(entry: ScoreEntry): Promise<{ id: number }> {
  const { sessionId } = useGame.getState()
  const { moves, clicks, keys } = getSessionStats()
  const score = Math.round(entry.score)
  const seconds = Math.round(entry.seconds)
  // Canonical string mirrored exactly by the server-side trigger.
  const session_hash = await sha256Hex(
    [sessionId, entry.difficulty, entry.ending, score, seconds, moves, clicks, keys, SESSION_SALT].join('|')
  )
  const { data, error } = await (await db())
    .from('scores')
    .insert({
      name: sanitizeName(entry.name),
      difficulty: entry.difficulty,
      ending: entry.ending,
      score,
      seconds,
      balance: Math.round(entry.balance * 100) / 100,
      subs: entry.subs,
      ads_closed: entry.ads_closed,
      session_id: sessionId,
      moves,
      clicks,
      keys,
      session_hash,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id }
}

/**
 * Top entries for a board, all editions combined (each row carries its
 * difficulty). Normal wins rank by score (desc); Total System Liberation
 * ranks by speed (asc) because the score is always ∞. The wall of shame
 * ranks by recency — fresh shame first.
 */
export async function fetchTop(ending: Ending, limit = 10, difficulty?: BoardDifficulty): Promise<ScoreEntry[]> {
  let q = (await db())
    .from('scores')
    .select('id, name, difficulty, ending, score, seconds, balance, subs, ads_closed')
    .eq('ending', ending)
    .limit(limit)
  if (difficulty) q = q.eq('difficulty', difficulty)
  q = ending === 'ultrawon' ? q.order('seconds', { ascending: true })
    : ending === 'shamed' ? q.order('created_at', { ascending: false })
    : q.order('score', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ScoreEntry[]
}

/** 1-based worldwide rank of a submitted entry (all editions combined). */
export async function fetchRank(entry: ScoreEntry): Promise<number> {
  let q = (await db())
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
 * NOTE this is a read-modify-write: calling it persists the current ranks as
 * the new baseline, so the second reader in a session sees deltas vs the
 * first reader, not vs the previous visit.
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
