export function saveInterviewResult(userId, result) {
  const history = JSON.parse(localStorage.getItem(`interview_history_${userId}`) || "[]")
  history.push({
    id: Date.now().toString(),
    ...result,
  })
  localStorage.setItem(`interview_history_${userId}`, JSON.stringify(history))
}

export function getInterviewHistory(userId) {
  const history = JSON.parse(localStorage.getItem(`interview_history_${userId}`) || "[]")
  return history.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getInterviewStats(userId) {
  const history = getInterviewHistory(userId)

  if (history.length === 0) {
    return {
      totalInterviews: 0,
      averageScore: 0,
      bestScore: 0,
      recentScore: 0,
    }
  }

  const scores = history.map((h) => h.score)
  const averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
  const bestScore = Math.max(...scores)
  const recentScore = scores[0]

  return {
    totalInterviews: history.length,
    averageScore,
    bestScore,
    recentScore,
  }
}
