import { useState } from 'react'
import { gameStore } from '../store'
import type { GameConfig, Team } from '../types'

const DEFAULT_TEAM_COUNT = 4

const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#eab308', '#22c55e', '#a855f7', '#f97316']

function makeTeams(count: number, previous: Team[]): Team[] {
  const teams: Team[] = []
  for (let i = 0; i < count; i++) {
    teams.push(
      previous[i] ?? {
        id: crypto.randomUUID(),
        name: `Team ${i + 1}`,
        color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      },
    )
  }
  return teams
}

interface HostSetupFormProps {
  initialConfig?: GameConfig
}

export function HostSetupForm({ initialConfig }: HostSetupFormProps) {
  const [teams, setTeams] = useState<Team[]>(() =>
    makeTeams(initialConfig?.teams.length || DEFAULT_TEAM_COUNT, initialConfig?.teams ?? []),
  )
  const [pointsCorrect, setPointsCorrect] = useState(initialConfig?.pointsCorrect ?? 1)
  const [pointsWrongEnabled, setPointsWrongEnabled] = useState(
    initialConfig?.pointsWrongEnabled ?? false,
  )
  const [pointsWrongValue, setPointsWrongValue] = useState(initialConfig?.pointsWrongValue ?? 0)

  const updateTeamCount = (count: number) => {
    const clamped = Math.max(2, Math.min(6, count))
    setTeams((prev) => makeTeams(clamped, prev))
  }

  const renameTeam = (id: string, name: string) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
  }

  const recolorTeam = (id: string, color: string) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    gameStore.startGame({
      teams,
      pointsCorrect,
      pointsWrongEnabled,
      pointsWrongValue,
    })
  }

  return (
    <form className="host-setup" onSubmit={handleSubmit}>
      <h1>Spiel konfigurieren</h1>

      <label className="field">
        Anzahl Teams
        <input
          type="number"
          min={2}
          max={6}
          value={teams.length}
          onChange={(e) => updateTeamCount(Number(e.target.value))}
        />
      </label>

      <div className="team-name-list">
        {teams.map((team, index) => (
          <div className="team-config-row" key={team.id}>
            <input
              type="color"
              className="team-color-input"
              value={team.color}
              onChange={(e) => recolorTeam(team.id, e.target.value)}
              aria-label={`Team ${index + 1} Farbe`}
            />
            <label className="field team-name-field">
              Team {index + 1} Name
              <input
                type="text"
                value={team.name}
                onChange={(e) => renameTeam(team.id, e.target.value)}
                required
              />
            </label>
          </div>
        ))}
      </div>

      <label className="field">
        Punkte für richtige Antwort
        <input
          type="number"
          value={pointsCorrect}
          onChange={(e) => setPointsCorrect(Number(e.target.value))}
        />
      </label>

      <label className="field checkbox-field">
        <input
          type="checkbox"
          checked={pointsWrongEnabled}
          onChange={(e) => setPointsWrongEnabled(e.target.checked)}
        />
        Punkte-Abzug bei falscher Antwort
      </label>

      {pointsWrongEnabled && (
        <label className="field">
          Punkte-Abzug
          <input
            type="number"
            value={pointsWrongValue}
            onChange={(e) => setPointsWrongValue(Number(e.target.value))}
          />
        </label>
      )}

      <button type="submit" className="start-game-button">
        Spiel starten
      </button>
    </form>
  )
}
