import type { GameConfig, GameState } from '../types'

interface LeaderboardProps {
  config: GameConfig
  state: GameState
  highlightTeamId?: string
}

function rankOf(teamId: string, order: string[]): number {
  return order.indexOf(teamId)
}

export function Leaderboard({ config, state, highlightTeamId }: LeaderboardProps) {
  const rankedIds = [...config.teams]
    .sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
    .map((t) => t.id)

  const previousRankedIds = [...config.teams]
    .sort((a, b) => (state.previousScores[b.id] ?? 0) - (state.previousScores[a.id] ?? 0))
    .map((t) => t.id)

  return (
    <ol className="leaderboard">
      {rankedIds.map((teamId) => {
        const team = config.teams.find((t) => t.id === teamId)!
        const rankDelta = rankOf(teamId, previousRankedIds) - rankOf(teamId, rankedIds)

        return (
          <li
            key={team.id}
            className={team.id === highlightTeamId ? 'leaderboard-item own' : 'leaderboard-item'}
          >
            <span className="leaderboard-color" style={{ background: team.color }} />
            <span className="leaderboard-name">{team.name}</span>
            {rankDelta !== 0 && (
              <span className={rankDelta > 0 ? 'leaderboard-trend up' : 'leaderboard-trend down'}>
                {rankDelta > 0 ? '▲' : '▼'}
              </span>
            )}
            <span className="leaderboard-score">{state.scores[team.id] ?? 0}</span>
          </li>
        )
      })}
    </ol>
  )
}
