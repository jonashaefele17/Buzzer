import type { FullGameData, GameConfig, GameStore } from '../types'

const STORAGE_KEY = 'buzzer-game-data-v2'
const CHANNEL_NAME = 'buzzer-game-sync-v2'

const initialData: FullGameData = {
  config: {
    teams: [],
    pointsCorrect: 1,
    pointsWrongEnabled: false,
    pointsWrongValue: 0,
  },
  state: {
    status: 'not_started',
    scores: {},
    previousScores: {},
  },
  question: {
    questionNumber: 0,
    status: 'open',
    buzzedTeamId: null,
    excludedTeamIds: [],
  },
}

/**
 * Local dev/testing implementation of GameStore.
 * Persists to localStorage and syncs across tabs via BroadcastChannel + storage events,
 * so multiple "devices" can be simulated as multiple browser tabs on one machine.
 *
 * NOTE: this is NOT safe against real concurrent-write races (that's fine here since
 * JS in one tab is single-threaded and this is only for local testing). The production
 * Supabase implementation must use an atomic conditional UPDATE for buzz().
 */
class LocalGameStore implements GameStore {
  private data: FullGameData
  private listeners = new Set<() => void>()
  private channel: BroadcastChannel | null = null

  constructor() {
    this.data = this.load()

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = () => {
        this.data = this.load()
        this.notify()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.data = this.load()
          this.notify()
        }
      })
    }
  }

  private load(): FullGameData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return structuredClone(initialData)
      return JSON.parse(raw) as FullGameData
    } catch {
      return structuredClone(initialData)
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    this.channel?.postMessage('update')
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

  startGame(config: GameConfig): void {
    const scores: Record<string, number> = {}
    for (const team of config.teams) scores[team.id] = 0

    this.data = {
      config,
      state: { status: 'running', scores, previousScores: { ...scores } },
      question: {
        questionNumber: 1,
        status: 'open',
        buzzedTeamId: null,
        excludedTeamIds: [],
      },
    }
    this.save()
  }

  endGame(): void {
    if (this.data.state.status === 'ended') return
    this.data = {
      ...this.data,
      state: { ...this.data.state, status: 'ended' },
    }
    this.save()
  }

  // Keeps the previous team/points config so the setup form can be prefilled.
  resetGame(): void {
    this.data = {
      ...this.data,
      state: { status: 'not_started', scores: {}, previousScores: {} },
      question: {
        questionNumber: 0,
        status: 'open',
        buzzedTeamId: null,
        excludedTeamIds: [],
      },
    }
    this.save()
  }

  buzz(teamId: string): void {
    const { state, question } = this.data
    if (state.status !== 'running') return
    if (question.status !== 'open') return
    if (question.excludedTeamIds.includes(teamId)) return

    this.data = {
      ...this.data,
      question: { ...question, status: 'locked', buzzedTeamId: teamId },
    }
    this.save()
  }

  cancelBuzz(): void {
    const { question } = this.data
    if (question.status !== 'locked') return

    this.data = {
      ...this.data,
      question: { ...question, status: 'open', buzzedTeamId: null },
    }
    this.save()
  }

  judge(correct: boolean): void {
    const { config, state, question } = this.data
    if (question.status !== 'locked') return
    const teamId = question.buzzedTeamId
    if (!teamId) return

    // Snapshot scores as they stood right before this judgement, for leaderboard trend arrows.
    const previousScores = state.scores

    if (correct) {
      const scores = {
        ...state.scores,
        [teamId]: (state.scores[teamId] ?? 0) + config.pointsCorrect,
      }
      this.data = {
        ...this.data,
        state: { ...state, scores, previousScores },
        question: {
          questionNumber: question.questionNumber + 1,
          status: 'open',
          buzzedTeamId: null,
          excludedTeamIds: [],
        },
      }
    } else {
      const scores = config.pointsWrongEnabled
        ? {
            ...state.scores,
            [teamId]: (state.scores[teamId] ?? 0) - config.pointsWrongValue,
          }
        : state.scores
      this.data = {
        ...this.data,
        state: { ...state, scores, previousScores },
        question: {
          ...question,
          status: 'open',
          buzzedTeamId: null,
          excludedTeamIds: [...question.excludedTeamIds, teamId],
        },
      }
    }
    this.save()
  }

  unlockTeam(teamId: string): void {
    const { question } = this.data
    this.data = {
      ...this.data,
      question: {
        ...question,
        excludedTeamIds: question.excludedTeamIds.filter((id) => id !== teamId),
      },
    }
    this.save()
  }

  unlockAllTeams(): void {
    this.data = {
      ...this.data,
      question: { ...this.data.question, excludedTeamIds: [] },
    }
    this.save()
  }

  forceNextQuestion(): void {
    const { question } = this.data
    this.data = {
      ...this.data,
      question: {
        questionNumber: question.questionNumber + 1,
        status: 'open',
        buzzedTeamId: null,
        excludedTeamIds: [],
      },
    }
    this.save()
  }

  adjustScore(teamId: string, newValue: number): void {
    this.data = {
      ...this.data,
      state: {
        ...this.data.state,
        scores: { ...this.data.state.scores, [teamId]: newValue },
      },
    }
    this.save()
  }
}

export const gameStore: GameStore = new LocalGameStore()
