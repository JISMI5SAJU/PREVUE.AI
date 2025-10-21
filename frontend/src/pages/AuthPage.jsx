"use client"

import { useState } from "react"
import { useContext } from "react"
import AuthContext from "../context/AuthContext"
import LoginForm from "../components/LoginForm"
import SignUpForm from "../components/SignUpForm"
import styles from "./AuthPage.module.css"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { handleLogin } = useContext(AuthContext)

  const handleAuthSuccess = (userData) => {
    handleLogin(userData)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>PREVUE.AI</h1>
          <p className={styles.subtitle}>Practice interviews with AI</p>
        </div>

        {isLogin ? <LoginForm onSuccess={handleAuthSuccess} /> : <SignUpForm onSuccess={handleAuthSuccess} />}

        <div className={styles.toggle}>
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className={styles.toggleBtn}>
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
