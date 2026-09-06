import type { ReactNode } from 'react'
import { useHostSession } from '../hooks/useHostSession'
import { HostLogin } from './HostLogin'

export function HostGate({ children }: { children: ReactNode }) {
  const session = useHostSession()

  if (session === 'loading') return null
  if (session === 'local' || session) return <>{children}</>
  return <HostLogin />
}
