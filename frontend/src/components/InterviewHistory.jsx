"use client"

import { useContext } from "react"
import AuthContext from "../context/AuthContext"
import { getInterviewHistory, getInterviewStats } from "../utils/historyService"
import styles from "./InterviewHistory.module.css"

export default function InterviewHistory() {
  const { user } = useContext(AuthContext)
  const history = getInterviewHistory(user.id)
  const stats = getInterviewStats(user.id)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScoreColor = (score) => {
    if (score >= 8) return "#4caf50"
    if (score >= 6) return "#ff9800"
    return "#f44336"
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Your Interview History</h2>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Interviews</div>
          <div className={styles.statValue}>{stats.totalInterviews}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Average Score</div>
          <div className={styles.statValue}>{stats.averageScore}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Best Score</div>
          <div className={styles.statValue}>{stats.bestScore}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Recent Score</div>
          <div className={styles.statValue}>{stats.recentScore}</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className={styles.empty}>
          <p>No interviews yet. Start your first interview to see your history!</p>
        </div>
      ) : (
        <div className={styles.historyList}>
          {history.map((interview) => (
            <div key={interview.id} className={styles.historyItem}>
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <h3 className={styles.itemRole}>{interview.role}</h3>
                  <span className={styles.itemMode}>{interview.mode}</span>
                  <span className={styles.itemDifficulty}>{interview.difficulty}</span>
                </div>
                <p className={styles.itemDate}>{formatDate(interview.date)}</p>
              </div>
              <div
                className={styles.itemScore}
                style={{ color: getScoreColor(interview.score), borderColor: getScoreColor(interview.score) }}
              >
                {interview.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
