import { useGameData } from './hooks/useGameData'
import { HostView } from './components/HostView'
import { TeamView } from './components/TeamView'
import './App.css'

function getRoleFromUrl(): { role: string | null; teamId: string | null } {
  const params = new URLSearchParams(window.location.search)
  return { role: params.get('role'), teamId: params.get('team') }
}

function App() {
  const data = useGameData()
  const { role, teamId } = getRoleFromUrl()

  if (role === 'host') {
    return <HostView data={data} />
  }

  if (role === 'team' && teamId) {
    return <TeamView data={data} teamId={teamId} />
  }

  return (
    <div className="role-picker">
      <h1>Buzzer</h1>
      <p>Kein Rollen-Parameter erkannt.</p>
      <a href="?role=host">Host-Ansicht öffnen</a>
    </div>
  )
}

export default App
