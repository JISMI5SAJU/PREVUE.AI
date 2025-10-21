"use client"

import { useContext } from "react"
import AuthContext from "../context/AuthContext"
import { saveInterviewResult } from "../utils/historyService"
import styles from "./FeedbackSummary.module.css"

export default function FeedbackSummary({ feedback, role, mode, difficulty, onBack }) {
  const { user } = useContext(AuthContext)

  const handleSaveAndBack = () => {
    saveInterviewResult(user.id, {
      role,
      mode,
      difficulty,
      score: feedback.score,
      date: new Date().toISOString(),
    })
    onBack()
  }

  const getScoreColor = (score) => {
    if (score >= 8) return "#4caf50"
    if (score >= 6) return "#ff9800"
    return "#f44336"
  }

  const getScoreLabel = (score) => {
    if (score >= 8) return "Excellent"
    if (score >= 6) return "Good"
    return "Needs Improvement"
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Interview Feedback</h2>
          <p className={styles.subtitle}>
            {role} • {mode} • {difficulty}
          </p>
        </div>

        <div className={styles.scoreSection}>
          <div className={styles.scoreCircle} style={{ borderColor: getScoreColor(feedback.score) }}>
            <div className={styles.scoreValue} style={{ color: getScoreColor(feedback.score) }}>
              {feedback.score}
            </div>
            <div className={styles.scoreMax}>/10</div>
          </div>
          <div className={styles.scoreLabel} style={{ color: getScoreColor(feedback.score) }}>
            {getScoreLabel(feedback.score)}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Strengths</h3>
          <ul className={styles.list}>
            {feedback.strengths.map((strength, index) => (
              <li key={index} className={styles.listItem}>
                <span className={styles.checkmark}>✓</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Areas for Improvement</h3>
          <ul className={styles.list}>
            {feedback.weaknesses.map((weakness, index) => (
              <li key={index} className={styles.listItem}>
                <span className={styles.warning}>!</span>
                {weakness}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Improvement Tip</h3>
          <p className={styles.tip}>{feedback.improvementTip}</p>
        </div>

        <div className={styles.actions}>
          <button onClick={handleSaveAndBack} className={styles.backBtn}>
            Back to Dashboard
          </button>
          <button onClick={handleSaveAndBack} className={styles.newBtn}>
            Start New Interview
          </button>
        </div>
      </div>
    </div>
  )
}
