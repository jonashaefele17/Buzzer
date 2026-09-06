import { gameStore } from '../store'
import type { FullGameData } from '../types'
import { Leaderboard } from './Leaderboard'
import { FinalScoreboard } from './FinalScoreboard'

interface TeamViewProps {
  data: FullGameData
  teamId: string
}

export function TeamView({ data, teamId }: TeamViewProps) {
  const { config, state, question } = data
  const team = config.teams.find((t) => t.id === teamId)

  if (state.status === 'ended') {
    return <FinalScoreboard config={config} state={state} />
  }

  if (state.status === 'not_started') {
    return (
      <div className="team-view">
        <p className="status-text">Warte auf Spielstart</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="team-view">
        <p className="status-text">Unbekanntes Team – bitte den QR-Code erneut scannen</p>
      </div>
    )
  }

  const isExcluded = question.excludedTeamIds.includes(teamId)
  const isBuzzedByMe = question.status === 'locked' && question.buzzedTeamId === teamId
  const isBuzzedByOther = question.status === 'locked' && question.buzzedTeamId !== teamId
  const canBuzz = question.status === 'open' && !isExcluded

  let statusText: string
  let buzzLabel: string
  let buzzStateClass: string
  if (isBuzzedByMe) {
    statusText = 'Ihr seid dran, wartet auf Bewertung'
    buzzLabel = 'GEBUZZERT'
    buzzStateClass = 'buzz-button--locked-mine'
  } else if (isBuzzedByOther) {
    const otherTeam = config.teams.find((t) => t.id === question.buzzedTeamId)
    statusText = `${otherTeam?.name ?? 'Ein anderes Team'} ist dran, bitte warten`
    buzzLabel = 'GESPERRT'
    buzzStateClass = 'buzz-button--locked-other'
  } else if (isExcluded) {
    statusText = 'Ihr seid für diese Frage raus'
    buzzLabel = 'RAUS'
    buzzStateClass = 'buzz-button--excluded'
  } else {
    statusText = 'Buzzer ist frei'
    buzzLabel = 'BUZZ'
    buzzStateClass = 'buzz-button--open'
  }

  return (
    <div className="team-view">
      <Leaderboard config={config} state={state} highlightTeamId={teamId} />
      <div className="team-main">
        <h1 className="team-name" style={{ color: team.color }}>
          {team.name}
        </h1>
        <p className="status-text">{statusText}</p>
        <button
          type="button"
          className={`buzz-button ${buzzStateClass}`}
          disabled={!canBuzz}
          style={canBuzz ? { background: team.color } : undefined}
          onClick={() => gameStore.buzz(teamId)}
        >
          {buzzLabel}
        </button>
      </div>
    </div>
  )
}
