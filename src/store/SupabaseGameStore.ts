import { supabase } from '../lib/supabaseClient'
import type { FullGameData, GameConfig, GameStatus, GameStore, QuestionStatus } from '../types'

const ROW_ID = 1

interface GameRow {
  id: number
  config: GameConfig
  status: GameStatus
  scores: Record<string, number>
  previous_scores: Record<string, number>
  question_number: number
  question_status: QuestionStatus
  buzzed_team_id: string | null
  excluded_team_ids: string[]
}

function rowToData(row: GameRow): FullGameData {
  return {
    config: row.config,
    state: {
      status: row.status,
      scores: row.scores,
      previousScores: row.previous_scores,
    },
    question: {
      questionNumber: row.question_number,
      status: row.question_status,
      buzzedTeamId: row.buzzed_team_id,
      excludedTeamIds: row.excluded_team_ids,
    },
  }
}

const emptyData: FullGameData = {
  config: { teams: [], pointsCorrect: 1, pointsWrongEnabled: false, pointsWrongValue: 0 },
  state: { status: 'not_started', scores: {}, previousScores: {} },
  question: { questionNumber: 0, status: 'open', buzzedTeamId: null, excludedTeamIds: [] },
}

/**
 * Supabase-backed implementation of GameStore (see supabase/schema.sql for the
 * required table/RLS/realtime setup). Requires exactly one row (id=1) in `game`.
 *
 * buzz() is the only operation that MUST be race-safe under concurrent writes
 * (multiple team devices buzzing at once): it's a single conditional UPDATE
 * that only succeeds if the question was still `open`, so simultaneous buzzes
 * from different devices can never both "win".
 */
class SupabaseGameStore implements GameStore {
  private data: FullGameData = emptyData
  private listeners = new Set<() => void>()

  constructor() {
    if (!supabase) return
    void this.loadInitial()

    supabase
      .channel('game-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game', filter: `id=eq.${ROW_ID}` },
        (payload) => {
          this.data = rowToData(payload.new as GameRow)
          this.notify()
        },
      )
      .subscribe()

    // Mobile OSes suspend websockets while a tab is backgrounded/locked, so a
    // realtime update can be missed; force a fresh fetch whenever the device
    // wakes back up or regains network, instead of trusting only the next event.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.loadInitial()
      })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.loadInitial())
    }
  }

  private async loadInitial() {
    const { data, error } = await supabase!.from('game').select('*').eq('id', ROW_ID).single()
    if (error || !data) {
      console.error('Failed to load game state from Supabase', error)
      return
    }
    this.data = rowToData(data as GameRow)
    this.notify()
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot(): FullGameData {
    return this.data
  }

  private async update(patch: Record<string, unknown>, conditions?: Record<string, unknown>) {
    if (!supabase) return
    let query = supabase.from('game').update(patch).eq('id', ROW_ID)
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        query = query.eq(key, value)
      }
    }
    const { error } = await query
    if (error) console.error('Supabase update failed', error)
  }

  async startGame(config: GameConfig) {
    const scores: Record<string, number> = {}
    for (const team of config.teams) scores[team.id] = 0

    await this.update({
      config,
      status: 'running',
      scores,
      previous_scores: scores,
      question_number: 1,
      question_status: 'open',
      buzzed_team_id: null,
      excluded_team_ids: [],
    })
  }

  async endGame() {
    await this.update({ status: 'ended' })
  }

  // Keeps the previous team/points config so the setup form can be prefilled.
  async resetGame() {
    await this.update({
      status: 'not_started',
      scores: {},
      previous_scores: {},
      question_number: 0,
      question_status: 'open',
      buzzed_team_id: null,
      excluded_team_ids: [],
    })
  }

  async buzz(teamId: string) {
    if (!supabase) return
    const { error } = await supabase
      .from('game')
      .update({ question_status: 'locked', buzzed_team_id: teamId })
      .eq('id', ROW_ID)
      .eq('status', 'running')
      .eq('question_status', 'open')
      .not('excluded_team_ids', 'cs', JSON.stringify([teamId]))
    if (error) console.error('buzz failed', error)
  }

  async cancelBuzz() {
    await this.update(
      { question_status: 'open', buzzed_team_id: null },
      { question_status: 'locked' },
    )
  }

  async judge(correct: boolean) {
    const { config, state, question } = this.data
    if (question.status !== 'locked') return
    const teamId = question.buzzedTeamId
    if (!teamId) return

    // Snapshot scores as they stood right before this judgement, for leaderboard trend arrows.
    const previousScores = state.scores

    const patch = correct
      ? {
          scores: { ...state.scores, [teamId]: (state.scores[teamId] ?? 0) + config.pointsCorrect },
          previous_scores: previousScores,
          question_number: question.questionNumber + 1,
          question_status: 'open',
          buzzed_team_id: null,
          excluded_team_ids: [],
        }
      : {
          scores: config.pointsWrongEnabled
            ? {
                ...state.scores,
                [teamId]: (state.scores[teamId] ?? 0) - config.pointsWrongValue,
              }
            : state.scores,
          previous_scores: previousScores,
          question_status: 'open',
          buzzed_team_id: null,
          excluded_team_ids: [...question.excludedTeamIds, teamId],
        }

    // Guard against double-judging the same buzz: only applies while still locked.
    await this.update(patch, { question_status: 'locked' })
  }

  async unlockTeam(teamId: string) {
    const excludedTeamIds = this.data.question.excludedTeamIds.filter((id) => id !== teamId)
    await this.update({ excluded_team_ids: excludedTeamIds })
  }

  async unlockAllTeams() {
    await this.update({ excluded_team_ids: [] })
  }

  async forceNextQuestion() {
    await this.update({
      question_number: this.data.question.questionNumber + 1,
      question_status: 'open',
      buzzed_team_id: null,
      excluded_team_ids: [],
    })
  }

  async adjustScore(teamId: string, newValue: number) {
    const scores = { ...this.data.state.scores, [teamId]: newValue }
    await this.update({ scores })
  }
}

export const gameStore: GameStore = new SupabaseGameStore()
