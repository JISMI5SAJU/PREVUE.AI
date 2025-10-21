"use client"

import { useState } from "react"
import styles from "./QuestionCard.module.css"

export default function QuestionCard({ question, onSubmit, isLastQuestion }) {
  const [answer, setAnswer] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!answer.trim()) return

    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    onSubmit(answer)
    setAnswer("")
    setSubmitting(false)
  }

  return (
    <div className={styles.card}>
      <div className={styles.questionSection}>
        <h3 className={styles.question}>{question.text}</h3>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className={styles.textarea}
          disabled={submitting}
          rows="6"
        />

        <button type="submit" disabled={!answer.trim() || submitting} className={styles.submitBtn}>
          {submitting ? "Processing..." : isLastQuestion ? "Complete Interview" : "Next Question"}
        </button>
      </form>
    </div>
  )
}
