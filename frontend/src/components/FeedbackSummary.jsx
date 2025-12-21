"use client"

export default function FeedbackSummary({ feedback, onBack }) {
  return (
    <div>
      <h2>Interview Feedback</h2>
      <p><strong>Overall:</strong> {feedback.overall}</p>

      <h4>Strengths</h4>
      <ul>
        {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
      </ul>

      <h4>Improvements</h4>
      <ul>
        {feedback.improvements.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>

      <button onClick={onBack}>Back</button>
    </div>
  )
}
