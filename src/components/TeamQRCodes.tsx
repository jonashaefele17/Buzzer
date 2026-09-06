import QRCode from 'react-qr-code'
import type { Team } from '../types'

interface TeamQRCodesProps {
  teams: Team[]
}

function teamUrl(teamId: string): string {
  const url = new URL(window.location.href)
  url.search = `?role=team&team=${encodeURIComponent(teamId)}`
  return url.toString()
}

export function TeamQRCodes({ teams }: TeamQRCodesProps) {
  return (
    <div className="qr-grid">
      {teams.map((team) => (
        <div className="qr-item" key={team.id} style={{ borderColor: team.color }}>
          <QRCode value={teamUrl(team.id)} size={128} bgColor="#ffffff" fgColor="#0b0c10" />
          <span style={{ color: team.color }}>{team.name}</span>
        </div>
      ))}
    </div>
  )
}
