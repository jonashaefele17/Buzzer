import { gameStore } from '../store'
import type { FullGameData } from '../types'
import { Leaderboard } from './Leaderboard'
import { FinalScoreboard } from './FinalScoreboard'
import { HostSetupForm } from './HostSetupForm'
import { TeamQRCodes } from './TeamQRCodes'

interface HostViewProps {
  data: FullGameData
}

export function HostView({ data }: HostViewProps) {
  const { config, state, question } = data

  if (state.status === 'not_started') {
    return <HostSetupForm initialConfig={config} />
  }

  if (state.status === 'ended') {
    return (
      <div className="final-scoreboard-wrapper">
        <FinalScoreboard config={config} state={state} />
        <button type="button" className="start-game-button" onClick={() => gameStore.resetGame()}>
          Neues Spiel konfigurieren
        </button>
      </div>
    )
  }

  const buzzedTeam = config.teams.find((t) => t.id === question.buzzedTeamId)
  const excludedTeams = config.teams.filter((t) => question.excludedTeamIds.includes(t.id))

  return (
    <div className="host-view">
      <div className="host-column">
        <section className="host-card">
          <h2>Rangliste</h2>
          <Leaderboard config={config} state={state} />
        </section>

        <section className="host-card">
          <h2>Frage {question.questionNumber}</h2>
          {question.status === 'open' && (
            <p className="status-text status-open">Buzzer ist frei</p>
          )}
          {question.status === 'locked' && (
            <>
              <p className="status-text status-locked">
                <span className="status-dot" style={{ background: buzzedTeam?.color }} />
                {buzzedTeam?.name ?? 'Unbekanntes Team'} ist dran
              </p>
              <div className="judge-buttons">
                <button
                  type="button"
                  className="btn judge-correct"
                  onClick={() => gameStore.judge(true)}
                >
                  Richtig
                </button>
                <button
                  type="button"
                  className="btn judge-wrong"
                  onClick={() => gameStore.judge(false)}
                >
                  Falsch
                </button>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => gameStore.cancelBuzz()}>
                Buzz stornieren
              </button>
            </>
          )}
        </section>

        <section className="host-card">
          <h3>Ausgeschlossene Teams</h3>
          {excludedTeams.length === 0 ? (
            <p className="muted">Keine</p>
          ) : (
            <ul className="excluded-list">
              {excludedTeams.map((team) => (
                <li key={team.id}>
                  <span className="excluded-name">
                    <span className="status-dot" style={{ background: team.color }} />
                    {team.name}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => gameStore.unlockTeam(team.id)}>
                    Wieder freigeben
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => gameStore.unlockAllTeams()}>
            Alle Teams wieder freigeben
          </button>
        </section>

        <section className="host-card">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => gameStore.forceNextQuestion()}
          >
            Nächste Frage erzwingen
          </button>
        </section>

        <section className="host-card">
          <h3>Punkte-Korrektur</h3>
          <ul className="score-adjust-list">
            {config.teams.map((team) => (
              <li key={team.id}>
                <span className="excluded-name">
                  <span className="status-dot" style={{ background: team.color }} />
                  {team.name}
                </span>
                <input
                  type="number"
                  value={state.scores[team.id] ?? 0}
                  onChange={(e) => gameStore.adjustScore(team.id, Number(e.target.value))}
                />
              </li>
            ))}
          </ul>
        </section>

        <button type="button" className="btn btn-danger btn-block" onClick={() => gameStore.endGame()}>
          Spiel beenden
        </button>
      </div>

      <div className="host-column">
        <section className="host-card">
          <h2>QR-Codes</h2>
          <TeamQRCodes teams={config.teams} />
        </section>
      </div>
    </div>
  )
}
