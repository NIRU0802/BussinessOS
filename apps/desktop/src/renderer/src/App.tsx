import { useEffect, useState } from 'react'
import DeviceSetup from './screens/DeviceSetup'
import Login from './screens/Login'
import './assets/main.css'

function App(): React.JSX.Element {
  const [checking, setChecking] = useState(true)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    window.api.device.isConfigured().then((result) => {
      setConfigured(result)
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    const handleOnline = () => window.api.sync.notifyOnline()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  if (checking) {
    return <div className="centered-screen">Loading…</div>
  }
  if (!configured) {
    return <DeviceSetup onComplete={() => setConfigured(true)} />
  }
  return <Login />
}

export default App
