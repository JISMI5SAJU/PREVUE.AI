// In production, this would call your backend API with actual AI models

const QUESTION_TEMPLATES = {
  "Frontend Developer": {
    Technical: {
      Easy: [
        "What is the difference between state and props in React?",
        "Explain what CSS flexbox is and how it works.",
        "What is the purpose of the useEffect hook in React?",
        "How would you center a div on a page using CSS?",
        "What is the difference between let, const, and var in JavaScript?",
      ],
      Medium: [
        "How would you optimize a React component that re-renders too often?",
        "Explain the concept of closure in JavaScript with an example.",
        "What are the differences between async/await and promises?",
        "How would you handle form validation in a React application?",
        "Explain the virtual DOM and how React uses it.",
      ],
      Hard: [
        "Design a system to handle real-time data updates in a React application.",
        "Explain how you would implement a custom hook for managing complex state.",
        "What are the performance implications of using context in React?",
        "How would you implement server-side rendering with React?",
        "Explain the differences between controlled and uncontrolled components.",
      ],
    },
    HR: {
      Easy: [
        "Tell me about yourself and your experience with web development.",
        "Why are you interested in this Frontend Developer position?",
        "What is your greatest strength as a developer?",
        "Describe a challenging project you worked on.",
        "How do you stay updated with new technologies?",
      ],
      Medium: [
        "Tell me about a time you had to work with a difficult team member.",
        "How do you approach learning a new technology or framework?",
        "Describe your experience working in an agile environment.",
        "What is your approach to code review and feedback?",
        "Tell me about a time you failed and what you learned.",
      ],
      Hard: [
        "Describe your leadership experience and how you mentor junior developers.",
        "Tell me about a time you had to make a difficult technical decision.",
        "How do you balance technical excellence with business requirements?",
        "Describe your experience with cross-functional collaboration.",
        "Tell me about your long-term career goals and how this role fits in.",
      ],
    },
    Mixed: {
      Easy: [
        "What is React and why would you use it?",
        "Tell me about your experience with React.",
        "What is the difference between functional and class components?",
        "Why are you interested in this position?",
        "How do you debug issues in your code?",
      ],
      Medium: [
        "Explain how you would handle state management in a large React application.",
        "Tell me about a time you optimized a web application for performance.",
        "What is your experience with testing React components?",
        "How do you approach problem-solving when faced with a complex bug?",
        "Describe your experience with version control and Git.",
      ],
      Hard: [
        "Design a scalable architecture for a large-scale React application.",
        "Tell me about your experience with CI/CD pipelines.",
        "How would you approach refactoring a legacy codebase?",
        "Describe your experience with accessibility and web standards.",
        "Tell me about a time you had to make a trade-off between performance and maintainability.",
      ],
    },
  },
  "Backend Developer": {
    Technical: {
      Easy: [
        "What is the difference between SQL and NoSQL databases?",
        "Explain what an API is and how it works.",
        "What is the purpose of middleware in web applications?",
        "How would you handle errors in a backend application?",
        "What is the difference between authentication and authorization?",
      ],
      Medium: [
        "How would you design a database schema for a social media application?",
        "Explain the concept of caching and when you would use it.",
        "What are the differences between REST and GraphQL?",
        "How would you handle concurrent requests in a backend application?",
        "Explain the concept of microservices and their advantages.",
      ],
      Hard: [
        "Design a system to handle millions of concurrent users.",
        "Explain how you would implement distributed transactions.",
        "What are the trade-offs between consistency and availability?",
        "How would you design a real-time notification system?",
        "Explain the concept of event sourcing and when you would use it.",
      ],
    },
    HR: {
      Easy: [
        "Tell me about yourself and your backend development experience.",
        "Why are you interested in this Backend Developer position?",
        "What is your greatest strength as a backend developer?",
        "Describe a challenging backend project you worked on.",
        "How do you stay updated with backend technologies?",
      ],
      Medium: [
        "Tell me about a time you had to optimize a slow database query.",
        "How do you approach debugging production issues?",
        "Describe your experience with code reviews and feedback.",
        "Tell me about a time you had to refactor legacy code.",
        "How do you ensure code quality in your projects?",
      ],
      Hard: [
        "Describe your experience leading a backend team or project.",
        "Tell me about a time you had to make a difficult architectural decision.",
        "How do you balance technical debt with new feature development?",
        "Describe your experience with system design and scalability.",
        "Tell me about your long-term career goals in backend development.",
      ],
    },
    Mixed: {
      Easy: [
        "What is a REST API and how does it work?",
        "Tell me about your experience with backend frameworks.",
        "What is the purpose of a database in a web application?",
        "Why are you interested in this position?",
        "How do you approach learning new technologies?",
      ],
      Medium: [
        "Explain how you would design an API for a mobile application.",
        "Tell me about a time you improved the performance of a backend system.",
        "What is your experience with database optimization?",
        "How do you handle security in backend applications?",
        "Describe your experience with deployment and DevOps.",
      ],
      Hard: [
        "Design a scalable backend architecture for a high-traffic application.",
        "Tell me about your experience with distributed systems.",
        "How would you approach building a real-time collaboration platform?",
        "Describe your experience with monitoring and observability.",
        "Tell me about a time you had to make a trade-off between scalability and simplicity.",
      ],
    },
  },
  "Data Analyst": {
    Technical: {
      Easy: [
        "What is the difference between descriptive and predictive analytics?",
        "Explain what SQL is and why it is important for data analysis.",
        "What is the purpose of data visualization?",
        "How would you handle missing data in a dataset?",
        "What is the difference between correlation and causation?",
      ],
      Medium: [
        "How would you approach analyzing a large dataset?",
        "Explain the concept of statistical significance.",
        "What are the differences between mean, median, and mode?",
        "How would you identify outliers in a dataset?",
        "Explain the concept of data normalization.",
      ],
      Hard: [
        "Design a data pipeline for real-time analytics.",
        "Explain how you would implement machine learning models for prediction.",
        "What are the challenges of working with big data?",
        "How would you approach A/B testing for a feature?",
        "Explain the concept of data governance and its importance.",
      ],
    },
    HR: {
      Easy: [
        "Tell me about yourself and your data analysis experience.",
        "Why are you interested in this Data Analyst position?",
        "What is your greatest strength as a data analyst?",
        "Describe a data analysis project you worked on.",
        "How do you stay updated with data analysis tools and techniques?",
      ],
      Medium: [
        "Tell me about a time you discovered an important insight from data.",
        "How do you approach communicating findings to non-technical stakeholders?",
        "Describe your experience with data visualization tools.",
        "Tell me about a time you had to work with messy data.",
        "How do you ensure data quality in your analysis?",
      ],
      Hard: [
        "Describe your experience leading data analysis initiatives.",
        "Tell me about a time you had to make a recommendation based on data.",
        "How do you balance data-driven decisions with business intuition?",
        "Describe your experience with advanced analytics and modeling.",
        "Tell me about your long-term career goals in data analysis.",
      ],
    },
    Mixed: {
      Easy: [
        "What is data analysis and why is it important?",
        "Tell me about your experience with data analysis tools.",
        "What is the purpose of exploratory data analysis?",
        "Why are you interested in this position?",
        "How do you approach learning new tools?",
      ],
      Medium: [
        "Explain how you would analyze user behavior data.",
        "Tell me about a time you used data to solve a business problem.",
        "What is your experience with statistical analysis?",
        "How do you approach data storytelling?",
        "Describe your experience with data visualization.",
      ],
      Hard: [
        "Design a data analytics system for a large e-commerce platform.",
        "Tell me about your experience with predictive modeling.",
        "How would you approach building a recommendation system?",
        "Describe your experience with data warehousing.",
        "Tell me about a time you had to make a complex data-driven decision.",
      ],
    },
  },
}

export async function generateQuestions(role, mode, difficulty) {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const templates = QUESTION_TEMPLATES[role]?.[mode]?.[difficulty] || []

  // Shuffle and select 5 questions
  const shuffled = [...templates].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 5)

  return selected.map((text, index) => ({
    id: index,
    text,
  }))
}

export async function evaluateAnswer(question, answer, role, mode, difficulty) {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Simulated evaluation logic
  const answerLength = answer.trim().split(" ").length
  const hasExamples = answer.toLowerCase().includes("example") || answer.toLowerCase().includes("like")
  const hasDetail = answerLength > 20

  let score = 5
  if (hasDetail) score += 2
  if (hasExamples) score += 1

  return {
    score: Math.min(10, score),
    feedback: `Good response. ${hasExamples ? "You provided examples which is great." : "Consider adding examples to strengthen your answer."}`,
  }
}

export async function generateFeedback(questions, answers, role, mode, difficulty) {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Calculate overall score based on answer quality
  let totalScore = 0
  const feedbackItems = answers.map((answer) => {
    const answerLength = answer.trim().split(" ").length
    const hasExamples = answer.toLowerCase().includes("example") || answer.toLowerCase().includes("like")
    const hasDetail = answerLength > 20
    const hasStructure = answer.includes(".") && answer.split(".").length > 2

    let score = 5
    if (hasDetail) score += 2
    if (hasExamples) score += 1
    if (hasStructure) score += 1

    totalScore += Math.min(10, score)
    return Math.min(10, score)
  })

  const averageScore = Math.round((totalScore / answers.length) * 10) / 10

  // Generate contextual feedback based on role and answers
  const strengthsMap = {
    "Frontend Developer": [
      "Clear understanding of React concepts",
      "Good communication of technical ideas",
      "Practical problem-solving approach",
      "Knowledge of best practices",
      "Attention to performance details",
    ],
    "Backend Developer": [
      "Strong database design knowledge",
      "Good understanding of scalability",
      "Clear API design thinking",
      "Security awareness",
      "Problem-solving skills",
    ],
    "Data Analyst": [
      "Strong analytical thinking",
      "Good data interpretation skills",
      "Clear communication of insights",
      "Statistical knowledge",
      "Business acumen",
    ],
  }

  const weaknessesMap = {
    "Frontend Developer": [
      "Could provide more specific examples",
      "Need to elaborate on edge cases",
      "Consider discussing testing strategies",
      "Explore performance optimization techniques",
      "Discuss accessibility considerations",
    ],
    "Backend Developer": [
      "Could discuss error handling more",
      "Explore caching strategies",
      "Consider security implications",
      "Discuss monitoring and logging",
      "Elaborate on deployment strategies",
    ],
    "Data Analyst": [
      "Could provide more statistical rigor",
      "Discuss data validation methods",
      "Explore visualization best practices",
      "Consider business impact",
      "Discuss data quality issues",
    ],
  }

  const improvementTipsMap = {
    "Frontend Developer":
      "Practice explaining React patterns with real-world examples. Focus on performance optimization and accessibility standards.",
    "Backend Developer":
      "Study distributed systems and microservices architecture. Practice designing scalable APIs and databases.",
    "Data Analyst":
      "Strengthen your statistical knowledge and practice communicating insights to non-technical stakeholders.",
  }

  const strengths = (strengthsMap[role] || strengthsMap["Frontend Developer"]).slice(0, 3)
  const weaknesses = (weaknessesMap[role] || weaknessesMap["Frontend Developer"]).slice(0, 3)
  const improvementTip = improvementTipsMap[role] || improvementTipsMap["Frontend Developer"]

  return {
    score: Math.min(10, Math.max(1, Math.round(averageScore))),
    strengths,
    weaknesses,
    improvementTip,
  }
}
