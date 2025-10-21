"use client"

import { useState, useEffect } from "react"
import AuthContext from "./context/AuthContext"
import AuthPage from "./pages/AuthPage"
import Dashboard from "./pages/Dashboard"
import styles from "./App.module.css"

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <AuthContext.Provider value={{ user, handleLogin, handleLogout }}>
      {user ? <Dashboard /> : <AuthPage />}
    </AuthContext.Provider>
  )
}

export default App
