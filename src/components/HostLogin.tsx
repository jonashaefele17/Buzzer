import { useState } from 'react'
import { signInHost } from '../lib/hostAuth'

export function HostLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(await signInHost(username, password))
    setSubmitting(false)
  }

  return (
    <form className="host-setup" onSubmit={handleSubmit}>
      <h1>Host-Login</h1>

      <label className="field">
        Benutzername
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>

      <label className="field">
        Passwort
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && <p className="login-error">{error}</p>}

      <button type="submit" className="start-game-button" disabled={submitting}>
        {submitting ? 'Anmelden...' : 'Anmelden'}
      </button>
    </form>
  )
}
