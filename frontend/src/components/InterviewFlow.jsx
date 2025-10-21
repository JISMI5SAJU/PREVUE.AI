"use client"

import { useState, useEffect } from "react"
import { generateQuestions, generateFeedback } from "../utils/aiService"
import QuestionCard from "./QuestionCard"
import FeedbackSummary from "./FeedbackSummary"
import styles from "./InterviewFlow.module.css"

export default function InterviewFlow({ role, mode, difficulty, onBack }) {
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [generatingFeedback, setGeneratingFeedback] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const generatedQuestions = await generateQuestions(role, mode, difficulty)
        setQuestions(generatedQuestions)
        setLoading(false)
      } catch (error) {
        console.error("Error generating questions:", error)
        setLoading(false)
      }
    }

    loadQuestions()
  }, [role, mode, difficulty])

  const handleAnswerSubmit = async (answer) => {
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setInterviewComplete(true)
      setGeneratingFeedback(true)
      const generatedFeedback = await generateFeedback(questions, newAnswers, role, mode, difficulty)
      setFeedback(generatedFeedback)
      setGeneratingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <p>Generating interview questions...</p>
        </div>
      </div>
    )
  }

  if (interviewComplete) {
    if (generatingFeedback) {
      return (
        <div className={styles.container}>
          <div className={styles.loadingCard}>
            <p>Analyzing your responses...</p>
          </div>
        </div>
      )
    }

    return <FeedbackSummary feedback={feedback} role={role} mode={mode} difficulty={difficulty} onBack={onBack} />
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.progressBar}>
          <div className={styles.progress} style={{ width: `${progress}%` }}></div>
        </div>
        <p className={styles.progressText}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      <QuestionCard
        question={currentQuestion}
        onSubmit={handleAnswerSubmit}
        isLastQuestion={currentQuestionIndex === questions.length - 1}
      />
    </div>
  )
}
