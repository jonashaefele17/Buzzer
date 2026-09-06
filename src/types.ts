export interface Team {
  id: string
  name: string
  color: string
}

export interface GameConfig {
  teams: Team[]
  pointsCorrect: number
  pointsWrongEnabled: boolean
  pointsWrongValue: number
}

export type GameStatus = 'not_started' | 'running' | 'ended'

export interface GameState {
  status: GameStatus
  scores: Record<string, number>
  /** Scores snapshot from right before the last judged answer, used for leaderboard trend arrows. */
  previousScores: Record<string, number>
}

export type QuestionStatus = 'open' | 'locked'

export interface QuestionState {
  questionNumber: number
  status: QuestionStatus
  buzzedTeamId: string | null
  excludedTeamIds: string[]
}

export interface FullGameData {
  config: GameConfig
  state: GameState
  question: QuestionState
}

/**
 * Backend-agnostic API surface. The UI must only ever call these functions;
 * the concrete persistence/sync implementation (local for dev, Supabase in prod)
 * can be swapped without touching UI code.
 */
export interface GameStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): FullGameData
  startGame(config: GameConfig): void
  endGame(): void
  resetGame(): void
  buzz(teamId: string): void
  cancelBuzz(): void
  judge(correct: boolean): void
  unlockTeam(teamId: string): void
  unlockAllTeams(): void
  forceNextQuestion(): void
  adjustScore(teamId: string, newValue: number): void
}
