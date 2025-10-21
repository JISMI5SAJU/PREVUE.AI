"use client"

import { useState } from "react"
import styles from "./SignUpForm.module.css"

export default function SignUpForm({ onSuccess }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Validate inputs
      if (!name || !email || !password || !confirmPassword) {
        throw new Error("Please fill in all fields")
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Get stored users from localStorage
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]")

      // Check if user already exists
      if (storedUsers.some((u) => u.email === email)) {
        throw new Error("Email already registered")
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
      }

      storedUsers.push(newUser)
      localStorage.setItem("users", JSON.stringify(storedUsers))

      onSuccess({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
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
        <label htmlFor="name" className={styles.label}>
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          placeholder="John Doe"
          disabled={loading}
        />
      </div>

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

      <div className={styles.formGroup}>
        <label htmlFor="confirmPassword" className={styles.label}>
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  )
}
