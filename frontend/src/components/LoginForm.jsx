"use client"

import { useState } from "react"
import styles from "./LoginForm.module.css"

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error("Please fill in all fields")
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Get stored users from localStorage
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]")
      const user = storedUsers.find((u) => u.email === email && u.password === password)

      if (!user) {
        throw new Error("Invalid email or password")
      }

      onSuccess({
        id: user.id,
        name: user.name,
        email: user.email,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="your@email.com"
          disabled={loading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  )
}
