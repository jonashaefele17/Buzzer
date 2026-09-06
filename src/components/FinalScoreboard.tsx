import type { GameConfig, GameState } from '../types'

interface FinalScoreboardProps {
  config: GameConfig
  state: GameState
}

export function FinalScoreboard({ config, state }: FinalScoreboardProps) {
  const ranked = [...config.teams].sort(
    (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0),
  )

  return (
    <div className="final-scoreboard">
      <h1>Spiel beendet</h1>
      <ol className="final-list">
        {ranked.map((team, index) => (
          <li key={team.id} className={`final-item rank-${index + 1}`}>
            <span className="final-rank">{index + 1}.</span>
            <span className="final-color" style={{ background: team.color }} />
            <span className="final-name">{team.name}</span>
            <span className="final-score">{state.scores[team.id] ?? 0}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
