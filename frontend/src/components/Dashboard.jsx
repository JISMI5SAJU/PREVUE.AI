"use client"

import styles from "./Dashboard.module.css"

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <h2>Dashboard</h2>
      <p>Overview of recent interviews, scores, and progress.</p>

      <div className={styles.cards}>
        <div className={styles.card}>
          <h3>Recent Score</h3>
          <p>75%</p>
        </div>
        <div className={styles.card}>
          <h3>Interviews Taken</h3>
          <p>12</p>
        </div>
        <div className={styles.card}>
          <h3>Avg. Response Time</h3>
          <p>45s</p>
        </div>
      </div>
    </div>
  )
}
