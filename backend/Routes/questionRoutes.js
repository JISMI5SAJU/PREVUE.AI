import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import crypto from "crypto";
import { PDFParse } from "pdf-parse";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import InterviewResult from "../models/interviewResult.js";
import HrInterviewSchedule from "../models/hrInterviewSchedule.js";
import sendEmail from "../utils/sendEmail.js";
import userModel from "../models/user.js";

const router = express.Router();
const TOTAL_QUESTIONS = 10;
const SUPPORTED_ROLES = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "Full Stack Developer",
  "DevOps Engineer"
];

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["application/pdf", "text/plain"];
    const ext = (file.originalname || "").toLowerCase();
    const hasAllowedExt = ext.endsWith(".pdf") || ext.endsWith(".txt");

    if (allowedMimeTypes.includes(file.mimetype) || hasAllowedExt) {
      return cb(null, true);
    }

    cb(new Error("Only PDF or TXT resumes are allowed"));
  },
});

const normalizeQuestion = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isQuestionDuplicate = (candidateQuestion = "", previousQuestions = []) => {
  const candidateNormalized = normalizeQuestion(candidateQuestion);
  if (!candidateNormalized) return false;

  const candidateTokens = new Set(candidateNormalized.split(" ").filter(Boolean));
  if (candidateTokens.size === 0) return false;

  for (const previousQuestion of previousQuestions) {
    const previousNormalized = normalizeQuestion(previousQuestion || "");
    if (!previousNormalized) continue;

    if (previousNormalized === candidateNormalized) {
      return true;
    }

    const previousTokens = new Set(previousNormalized.split(" ").filter(Boolean));
    if (previousTokens.size === 0) continue;

    const overlap = [...candidateTokens].filter((token) => previousTokens.has(token)).length;
    const similarity = overlap / Math.max(candidateTokens.size, previousTokens.size);

    if (similarity >= 0.8) {
      return true;
    }
  }

  return false;
};

const isSameTopicAsLastQuestion = (candidateQuestion = "", lastQuestion = "") => {
  const candidateNormalized = normalizeQuestion(candidateQuestion);
  const lastNormalized = normalizeQuestion(lastQuestion);

  if (!candidateNormalized || !lastNormalized) return false;

  const stopWords = new Set([
    "what", "why", "how", "when", "where", "which", "who", "can", "could", "would", "should",
    "is", "are", "was", "were", "do", "does", "did", "the", "a", "an", "and", "or", "to", "of",
    "in", "on", "for", "with", "about", "explain", "describe", "tell", "me", "you", "your"
  ]);

  const candidateTokens = new Set(candidateNormalized.split(" ").filter((t) => t && !stopWords.has(t)));
  const lastTokens = new Set(lastNormalized.split(" ").filter((t) => t && !stopWords.has(t)));

  if (candidateTokens.size === 0 || lastTokens.size === 0) return false;

  const overlap = [...candidateTokens].filter((token) => lastTokens.has(token)).length;
  const similarity = overlap / Math.max(candidateTokens.size, lastTokens.size);

  return similarity >= 0.5;
};

const isOverusedSoftwareDevOpening = (question = "") => {
  const normalized = normalizeQuestion(question);
  if (!normalized) return false;

  const hasGenericKickoff = /(hey there|to kick things off|walk me through a time)/.test(normalized);
  const hasDataStructureTradeoff = /choose between.*data structure|two different data structures/.test(normalized);

  return hasGenericKickoff || hasDataStructureTradeoff;
};

// Protect all endpoints
router.use(authenticateToken);

/* ================= EXTRACT ROLE FROM RESUME ================= */
router.post("/extract-role-from-resume", resumeUpload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    let resumeText = "";
    const fileName = (req.file.originalname || "").toLowerCase();

    if (req.file.mimetype === "application/pdf" || fileName.endsWith(".pdf")) {
      const parser = new PDFParse({ data: req.file.buffer });
      const parsed = await parser.getText();
      resumeText = parsed?.text || "";
      await parser.destroy();
    } else {
      resumeText = req.file.buffer.toString("utf-8");
    }

    const cleanedResumeText = resumeText.replace(/\s+/g, " ").trim();
    if (!cleanedResumeText) {
      return res.status(400).json({ error: "Could not read resume content" });
    }

    const resumeContext = cleanedResumeText.slice(0, 12000);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const prompt = `
From the resume text below, select the most suitable role from this exact list:
${SUPPORTED_ROLES.join(", ")}

Return ONLY one role from the list. No explanation.

Resume text:
${resumeContext}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const rawRole = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    const normalizedRole = SUPPORTED_ROLES.find(
      (candidate) => candidate.toLowerCase() === rawRole.toLowerCase()
    ) || SUPPORTED_ROLES.find(
      (candidate) => rawRole.toLowerCase().includes(candidate.toLowerCase())
    ) || "Software Developer";

    return res.json({ role: normalizedRole, resumeContext });
  } catch (err) {
    console.error("Resume role extraction error:", err);
    return res.status(500).json({ error: "Failed to extract role from resume" });
  }
});

/* ================= NEXT QUESTION ================= */
router.post("/next-question", async (req, res) => {
  const {
    role = "",
    mode = "",
    difficulty = "",
    resumeContext = "",
    questionNumber = 1,
    lastQuestion = "",
    lastAnswer = "",
    history = [], // optional previous questions
  } = req.body || {};

  const qNum = Math.max(1, Math.min(TOTAL_QUESTIONS, Number(questionNumber) || 1));
  const latestHistoryEntry = Array.isArray(history) && history.length > 0
    ? history[history.length - 1]
    : null;
  const effectiveLastQuestion = lastQuestion || latestHistoryEntry?.question || "";
  const effectiveLastAnswer = lastAnswer || latestHistoryEntry?.answer || "";

  const previousQuestions = [
    ...history.map((item) => item?.question).filter(Boolean),
    effectiveLastQuestion,
  ].filter(Boolean);

  // Build conversation history text with answer quality analysis
  let historyText = "";
  let coveredTopics = [];
  
  if (history.length > 0) {
    historyText = history
      .map((item, i) => {
        // Extract topic hints from questions
        const q = item.question || "";
        if (q.toLowerCase().includes("data structure") || q.toLowerCase().includes("algorithm")) {
          coveredTopics.push("algorithms");
        }
        if (q.toLowerCase().includes("design") || q.toLowerCase().includes("architecture")) {
          coveredTopics.push("design");
        }
        if (q.toLowerCase().includes("experience") || q.toLowerCase().includes("project")) {
          coveredTopics.push("experience");
        }
        if (q.toLowerCase().includes("challenge") || q.toLowerCase().includes("difficult")) {
          coveredTopics.push("problem_solving");
        }
        return `Q${i + 1}: ${q}\nA${i + 1}: ${item.answer}`;
      })
      .join("\n\n");
  } else {
    historyText = "No previous answers - this is the first question.";
  }

  // Determine interview stage for adaptive question strategy
  const stage = qNum <= 3 ? "early" : qNum <= 6 ? "mid" : "late";
  
  // Cadence: opening -> periodic topic switch -> contextual follow-up.
  // This guarantees visible follow-up behavior while preserving interview breadth.
  const canFollowUp = Boolean(effectiveLastQuestion && effectiveLastAnswer);
  const shouldExploreNew = coveredTopics.length === 0 || qNum % 3 === 1;
  const shouldGoDeeper = qNum > 1 && !shouldExploreNew && canFollowUp;

  // Special guidance for Software Developer role
  const roleGuidance = role === "Software Developer" && mode === "Technical"
    ? `
**MANDATORY: Software Developer questions MUST ONLY cover these 3 topics (rotate through them):**
1. Data Structures & Algorithms (arrays, linked lists, trees, graphs, stacks, queues, hash maps, sorting, searching, Big O complexity analysis)
2. Object-Oriented Programming (classes, objects, inheritance, polymorphism, encapsulation, abstraction, SOLID principles, design patterns like Factory, Singleton, Strategy, Observer)
3. SQL & Databases (SELECT, JOIN, WHERE, GROUP BY, indexing, primary/foreign keys, normalization, schema design, query optimization, transactions)
`
    : "";

  // Detailed mode guidance with adaptive strategy
  const modeGuidance = mode === "HR"
    ? `
**MANDATORY FOR SCHEDULER MODE: Ask ONLY behavioral and soft skill questions.**
- NO technical questions
- NO coding, algorithms, or technology-specific topics
- Focus on: work style, teamwork, problem-solving approach, communication, adaptability, values
- At this stage (Q${qNum}), ${shouldGoDeeper ? "go DEEPER into previous topics to assess consistency" : "explore a NEW behavioral area the candidate hasn't discussed yet"}
`
    : "";

  // Dynamic topic strategy
  const topicStrategy = mode === "HR"
    ? shouldExploreNew ? "Explore a completely new behavioral dimension" : "Dive deeper into a previously mentioned behavior"
    : shouldExploreNew ? "Explore a new technical area or subtopic" : "Go deeper into a previous technical area";

  const isResumeBased = Boolean(resumeContext?.trim());
  const interviewerContext = isResumeBased
    ? `
You are a human interviewer conducting a ${mode} interview based on the candidate's resume.
Difficulty level: ${difficulty}.
Interview progress: Question ${qNum} out of ${TOTAL_QUESTIONS} (${stage} stage).
${modeGuidance}

Candidate resume content:
${resumeContext.slice(0, 12000)}
`
    : `
You are a human interviewer conducting a ${mode} interview for a ${role}.
Difficulty level: ${difficulty}.
Interview progress: Question ${qNum} out of ${TOTAL_QUESTIONS} (${stage} stage).
${modeGuidance}
${roleGuidance}
`;

  // Build organic conversation prompt - no artificial "STRATEGY" signals
  let prompt = `
${interviewerContext}

Interview conversation so far:
${historyText}

Most recent context:
${effectiveLastQuestion ? `- Last question: ${effectiveLastQuestion}` : "- Last question: N/A"}
${effectiveLastAnswer ? `- Last answer: ${effectiveLastAnswer}` : "- Last answer: N/A"}

Topics already discussed (never repeat):
${previousQuestions.length > 0 ? previousQuestions.map((q) => `- ${q}`).join("\n") : "None yet"}
`;

  // Different prompt structure based on context.
  // IMPORTANT: force topic switching cadence so interview covers breadth.
  if (qNum === 1) {
    prompt += `

This is the opening question of the interview. Start naturally and conversationally:
- Make the candidate feel comfortable
- Ask something that gets them talking about their ${mode === "HR" ? "work style and motivations" : isResumeBased ? "background and relevant experience" : "technical foundation"}
- Keep it open enough for them to show their thinking, but specific enough to guide them
`;

    if (role === "Software Developer" && mode === "Technical" && !isResumeBased) {
      prompt += `

For this specific role, diversify the first question style:
- DO NOT use greetings/openers like "Hey there" or "To kick things off"
- DO NOT ask the common "choose between two data structures" opener
- Pick exactly one opening lane for this interview: {debugging scenario, API/database design decision, OOP/design-pattern trade-off}
- Keep it practical and role-realistic, not generic trivia
`;
    }
  } else if (shouldExploreNew) {
    prompt += `

TOPIC SWITCH REQUIRED FOR THIS QUESTION.
Ask about a DIFFERENT area not covered yet in this interview:
- Do NOT ask a follow-up to the last question
- Pick a new subtopic for breadth
- Keep the flow natural, but ensure clear topic change
- Use the previous question list and avoid overlap/paraphrase
`;
  } else if (shouldGoDeeper) {
    prompt += `

FOLLOW-UP MODE REQUIRED FOR THIS QUESTION.
Previous question: "${effectiveLastQuestion}"
Candidate answer: "${effectiveLastAnswer}"

Ask a deeper follow-up that:
- Explicitly references one concrete detail from the candidate's answer
- Probes a specific part of the candidate's answer
- Requests clarification, trade-off, edge case, or concrete example
- Tests depth on the same topic without repeating wording
- Sounds like a natural continuation, not a topic reset
`;
  } else if (history.length >= 1) {
    prompt += `

The candidate has answered ${history.length} question${history.length !== 1 ? 's' : ''} so far.
Ask the next natural question that:
- Matches the ${stage} stage (${stage === "early" ? "foundation" : stage === "mid" ? "application" : "advanced/edge cases"})
- Avoids repeating any topic from the list above
- Maintains interview breadth and progression
`;
  }

  // Question generation guidelines - natural spoken interviewer style
  const resumePhrasingRules = isResumeBased
    ? `
- Reference resume details naturally, as if you remembered what they said
- Avoid repeating fixed lead-ins like "Your resume mentions" across multiple turns
`
    : "";

  const questionGuidelines = `
CRITICAL: Sound like a thoughtful human interviewer in a live conversation.

Voice & Style:
- ONE question only
- Keep it concise (about 12-28 words unless depth requires slightly more)
- Use natural spoken English and occasional contractions when it fits
- Ask with curiosity, not as a checklist
- Vary rhythm and phrasing so consecutive questions do not sound formulaic
- Do not prepend labels like "Question 4" or scripted stage directions

Quality Standards:
- Ask for concrete details, not generic definitions
- Questions should reveal DEPTH of understanding, not just surface knowledge
- Challenge them proportionally to interview stage: early=foundational, mid=practical, late=edge cases
- If following up on a previous answer, reference what they actually said (not a summary)
- In FOLLOW-UP MODE, include at least one context anchor from the candidate's latest answer
- If asking fresh, make it feel like a natural thought progression
- Obey mode instructions above strictly:
  - If prompt says "TOPIC SWITCH REQUIRED", choose a new topic area and do not continue the previous one
  - If prompt says "FOLLOW-UP MODE", stay on the same topic but deepen it
- Across 10 questions, ensure coverage of multiple subtopics instead of staying on one thread

AVOID:
- Multiple questions in one ("What is X and why is it Y?")
- Empty filler phrases and corporate buzzword wording
- Repeating nearly the same sentence structure in back-to-back turns
- Repeating question topics from the list above
${resumePhrasingRules}
`;

  // Append guidelines to final prompt
  prompt += `\n${questionGuidelines}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    let question = "Failed to generate question";
    for (let attempt = 0; attempt < 3; attempt++) {
      const retryInstruction = attempt === 0
        ? ""
        : `\n\nRetry #${attempt}: The previous output did not satisfy constraints. Generate one concise question that is clearly different and follows the mode instructions exactly.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${prompt}${retryInstruction}` }] }],
          }),
        }
      );

      const data = await response.json();
      const generatedQuestion = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!generatedQuestion) continue;

      question = generatedQuestion;
      const duplicate = isQuestionDuplicate(generatedQuestion, previousQuestions);
      const sameTopicInSwitchMode = shouldExploreNew && isSameTopicAsLastQuestion(generatedQuestion, lastQuestion);
      const overusedSoftwareDevOpening =
        qNum === 1 && role === "Software Developer" && mode === "Technical" && !isResumeBased
          ? isOverusedSoftwareDevOpening(generatedQuestion)
          : false;

      if (!duplicate && !sameTopicInSwitchMode && !overusedSoftwareDevOpening) {
        break;
      }
    }

    return res.json({ question });
  } catch (err) {
    console.error("Flash question generation error:", err);
    return res.status(500).json({ error: "Failed to generate question" });
  }
});

/* ================= CREATE INTERVIEW SESSION ================= */
router.post("/create-interview", async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { role, mode, difficulty, resumeContext = "" } = req.body || {};
  const effectiveRole = role?.trim() || (resumeContext?.trim() ? "Resume-Based Interview" : "");

  if (!effectiveRole || !mode || !difficulty) {
    return res.status(400).json({ error: "Mode and difficulty are required, plus role or resume context" });
  }

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const interviewResult = new InterviewResult({
      userId,
      role: effectiveRole,
      mode,
      difficulty,
      questions: []
    });

    await interviewResult.save();
    return res.json({ interviewId: interviewResult._id });
  } catch (err) {
    console.error("Create interview error:", err);
    return res.status(500).json({ error: "Failed to create interview session" });
  }
});

/* ================= HR SCHEDULE INTERVIEW ================= */
router.post("/schedule-interview", async (req, res) => {
  const hrUserId = req.user?._id || req.user?.id;
  const {
    candidateName = "",
    candidateEmail = "",
    role = "",
    mode = "HR",
    difficulty = "Medium",
    scheduledAt,
    notes = "",
  } = req.body || {};

  if (!hrUserId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  const normalizedCandidateName = candidateName.trim();
  const normalizedCandidateEmail = candidateEmail.trim().toLowerCase();
  const normalizedRole = role.trim();
  const normalizedMode = mode.trim();
  const normalizedDifficulty = difficulty.trim();
  const normalizedNotes = notes.trim();

  if (
    !normalizedCandidateName ||
    !normalizedCandidateEmail ||
    !normalizedRole ||
    !normalizedMode ||
    !normalizedDifficulty ||
    !scheduledAt
  ) {
    return res.status(400).json({
      error: "candidateName, candidateEmail, role, mode, difficulty, and scheduledAt are required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (!emailRegex.test(normalizedCandidateEmail)) {
    return res.status(400).json({ error: "Invalid candidate email format" });
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ error: "Invalid scheduledAt value" });
  }

  if (scheduledDate.getTime() <= Date.now()) {
    return res.status(400).json({ error: "scheduledAt must be in the future" });
  }

  try {
    const inviteToken = crypto.randomBytes(24).toString("hex");

    const schedule = await HrInterviewSchedule.create({
      hrUserId,
      candidateName: normalizedCandidateName,
      candidateEmail: normalizedCandidateEmail,
      role: normalizedRole,
      mode: normalizedMode,
      difficulty: normalizedDifficulty,
      scheduledAt: scheduledDate,
      notes: normalizedNotes,
      inviteToken,
    });

    const inviteDate = scheduledDate.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const hrEmail = req.user?.email || "HR Team";

    const interviewLink = `${appUrl}/guest-interview/${inviteToken}`;

    await sendEmail({
      to: normalizedCandidateEmail,
      subject: `Interview Scheduled for ${normalizedRole}`,
      html: `
        <h2>Interview Invitation</h2>
        <p>Hello ${normalizedCandidateName},</p>
        <p>Your interview has been scheduled. Please find the details below:</p>
        <ul>
          <li><strong>Role:</strong> ${normalizedRole}</li>
          <li><strong>Mode:</strong> ${normalizedMode}</li>
          <li><strong>Difficulty:</strong> ${normalizedDifficulty}</li>
          <li><strong>Scheduled Time:</strong> ${inviteDate}</li>
        </ul>
        ${normalizedNotes ? `<p><strong>Notes:</strong> ${normalizedNotes}</p>` : ""}
        <p>Click the secure interview link below. No signup is required; just enter your name and email:</p>
        <p><a href="${interviewLink}">${interviewLink}</a></p>
        <p style="color: #dc2626; font-weight: 600;">⚠️ Important: This link will expire 30 minutes after your scheduled interview time (${inviteDate}).</p>
        <p>Regards,<br/>${hrEmail}</p>
      `,
    });

    return res.status(201).json({
      message: "Interview scheduled and invitation email sent",
      schedule,
    });
  } catch (err) {
    console.error("Schedule interview error:", err);
    return res.status(500).json({ error: "Failed to schedule interview" });
  }
});

/* ================= HR SCHEDULED INTERVIEWS + RESULTS ================= */
router.get("/hr/scheduled-interviews", async (req, res) => {
  const hrUserId = req.user?._id || req.user?.id;

  if (!hrUserId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const schedules = await HrInterviewSchedule.find({ hrUserId })
      .sort({ createdAt: -1 })
      .lean();

    if (schedules.length === 0) {
      return res.json({ schedules: [] });
    }

    const candidateEmails = [...new Set(schedules.map((item) => item.candidateEmail?.toLowerCase()).filter(Boolean))];

    const users = await userModel.find({
      email: { $in: candidateEmails },
    }).select("_id email name").lean();

    const userIdByEmail = new Map(
      users.map((item) => [item.email?.toLowerCase(), item._id?.toString()])
    );

    const userIds = users.map((item) => item._id);
    let interviews = [];

    if (userIds.length > 0) {
      interviews = await InterviewResult.find({ userId: { $in: userIds } })
        .select("userId role mode difficulty totalScore overallCorrectness overallDepth overallStructure confidence eyeContact stability feedbackSummary createdAt")
        .sort({ createdAt: -1 })
        .lean();
    }

    const interviewsByUserId = interviews.reduce((acc, item) => {
      const key = item.userId?.toString();
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const enrichedSchedules = schedules.map((schedule) => {
      const emailKey = schedule.candidateEmail?.toLowerCase();
      const candidateUserId = userIdByEmail.get(emailKey);
      const candidateInterviews = candidateUserId ? (interviewsByUserId[candidateUserId] || []) : [];

      const matchedInterviews = candidateInterviews.filter((item) => {
        const createdAtTime = new Date(item.createdAt).getTime();
        const scheduledAtTime = new Date(schedule.scheduledAt).getTime();
        return (
          item.role === schedule.role &&
          item.mode === schedule.mode &&
          createdAtTime >= scheduledAtTime
        );
      });

      const latestResult = matchedInterviews[0] || null;

      return {
        ...schedule,
        candidateUserLinked: Boolean(candidateUserId),
        resultsCount: matchedInterviews.length,
        latestResult,
      };
    });

    return res.json({ schedules: enrichedSchedules });
  } catch (err) {
    console.error("Fetch HR schedules error:", err);
    return res.status(500).json({ error: "Failed to fetch HR scheduled interviews" });
  }
});

/* ================= SILENT EVALUATION ================= */
router.post("/evaluate", async (req, res) => {
  const userId = req.user?._id || req.user?.id; // from authenticateToken
  const { question, answer, questionNumber, role, mode, difficulty, interviewId } = req.body || {};

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  // Log warning if userId is missing (user needs to re-login)
  if (!userId) {
    console.warn("Warning: User ID not found in token. Evaluations won't be saved to database.");
  }

  // Allow empty answers (they'll get 0 score)

  // Respond immediately so frontend can move on
  res.status(200).json({ status: "received" });

  // Fire-and-forget async evaluation
  (async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY not configured");
        return;
      }

      // Step 1: Generate the ideal answer for the question
      const idealPrompt = `
You are an expert interviewer.
Provide the ideal answer for this question in concise form.

Question:
"${question}"

Respond in plain text.
`;
      const idealResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: idealPrompt }] }],
          }),
        }
      );
      const idealData = await idealResp.json();
      const idealAnswer =
        idealData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      // Step 2: Evaluate candidate's answer against ideal answer
      const evalPrompt = `
You are an expert interview evaluator.
Compare the candidate's answer with the ideal answer.

Question:
"${question}"

Ideal answer:
"${idealAnswer}"

Candidate's answer:
"${answer}"

Evaluate the answer on these criteria (each out of 10):
1. **Correctness**: How accurate is the answer?
2. **Depth**: How thorough and detailed is the explanation?
3. **Practical Experience**: Does it demonstrate real-world understanding?
4. **Structure**: Is the answer well-organized and clear?

Also provide overall feedback.

Respond in JSON format: 
{ 
  "correctness": <number>, 
  "depth": <number>, 
  "structure": <number>,
  "feedback": "<text>" 
}
`;
      const evalResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
          }),
        }
      );
      const evalData = await evalResp.json();
      const resultText =
        evalData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      let result;
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = resultText;
        const jsonMatch = resultText?.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim();
        }
        result = JSON.parse(jsonText);
      } catch {
        console.error("Failed to parse Gemini evaluation:", resultText);
        result = { 
          correctness: null, 
          depth: null, 
          structure: null, 
          feedback: resultText || "No feedback" 
        };
      }

      // Save to DB
      try {
        // Skip DB save if userId is not available
        if (!userId) {
          console.warn("Skipping database save - userId not found");
          return;
        }

        // Interview ID is required - frontend should always send it
        if (!interviewId) {
          console.error("Interview ID not provided in evaluation request");
          return;
        }

        const interviewResult = await InterviewResult.findOne({
          _id: interviewId,
          userId
        });

        if (!interviewResult) {
          console.error(`Interview ${interviewId} not found for user ${userId}`);
          return;
        }

        // Add or update question evaluation
        const questionIndex = interviewResult.questions.findIndex(
          q => q.questionNumber === questionNumber
        );

        const questionData = {
          questionNumber,
          question,
          answer: answer || "",
          idealAnswer,
          correctness: result.correctness || 0,
          depth: result.depth || 0,
          structure: result.structure || 0,
          feedback: result.feedback || ""
        };

        if (questionIndex >= 0) {
          interviewResult.questions[questionIndex] = questionData;
        } else {
          interviewResult.questions.push(questionData);
        }

        // Calculate and update overall averages after each question
        const questions = interviewResult.questions;
        if (questions.length > 0) {
          const avgCorrectness = questions.reduce((sum, q) => sum + (q.correctness || 0), 0) / questions.length;
          const avgDepth = questions.reduce((sum, q) => sum + (q.depth || 0), 0) / questions.length;
          const avgStructure = questions.reduce((sum, q) => sum + (q.structure || 0), 0) / questions.length;

          interviewResult.overallCorrectness = Math.round(avgCorrectness * 10) / 10;
          interviewResult.overallDepth = Math.round(avgDepth * 10) / 10;
          interviewResult.overallStructure = Math.round(avgStructure * 10) / 10;

          // Update total score (average of all 3 metrics, out of 10)
          interviewResult.totalScore = Math.round(
            ((interviewResult.overallCorrectness +
              interviewResult.overallDepth +
              interviewResult.overallStructure) / 3) * 10
          ) / 10;
        }

        await interviewResult.save();
      } catch (dbError) {
        console.error("Database save error:", dbError);
      }
    } catch (err) {
      console.error("Silent evaluation error:", err);
    }
  })();
});

/* ================= FINALIZE INTERVIEW & CALCULATE SCORES ================= */
router.post("/finalize-interview", async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { 
    interviewId, 
    eyeContact, 
    confidence, 
    engagement,
    professionalism,
    stability,
    facePresence,
    blinkRate,
    avgConfidence
  } = req.body || {};

  if (!interviewId) {
    return res.status(400).json({ error: "Interview ID is required" });
  }

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const interviewResult = await InterviewResult.findOne({
      _id: interviewId,
      userId
    });

    if (!interviewResult) {
      return res.status(404).json({ error: "Interview not found" });
    }

    // Calculate average scores from all questions
    const questions = interviewResult.questions;
    if (questions.length > 0) {
      const avgCorrectness = questions.reduce((sum, q) => sum + (q.correctness || 0), 0) / questions.length;
      const avgDepth = questions.reduce((sum, q) => sum + (q.depth || 0), 0) / questions.length;
      const avgStructure = questions.reduce((sum, q) => sum + (q.structure || 0), 0) / questions.length;

      interviewResult.overallCorrectness = Math.round(avgCorrectness * 10) / 10;
      interviewResult.overallDepth = Math.round(avgDepth * 10) / 10;
      interviewResult.overallStructure = Math.round(avgStructure * 10) / 10;
    }

    // Set video analysis scores
    interviewResult.eyeContact = eyeContact || 0;
    interviewResult.confidence = confidence || avgConfidence || 0;
    interviewResult.engagement = engagement || 0;
    
    // Set behavioral analysis scores
    interviewResult.professionalism = professionalism || 0;
    interviewResult.stability = stability || 0;
    interviewResult.facePresence = facePresence || 0;
    interviewResult.blinkRate = blinkRate || 0;

    // Calculate total score: 70% Verbal Analysis + 30% Behavioral Analysis
    // Verbal scores are /10, include all 3 metrics
    const verbalAverage = (
      interviewResult.overallCorrectness +
      interviewResult.overallDepth +
      interviewResult.overallStructure
    ) / 3;

    // Behavioral scores are /100 (percentages), convert to /10 scale
    const behavioralAverage = (
      ((eyeContact || 0) / 10) +
      ((confidence || avgConfidence || 0) / 10) +
      ((stability || 0) / 10)
    ) / 3;

    // 70% verbal (technical) + 30% behavioral (both on /10 scale)
    interviewResult.totalScore = Math.round(
      (verbalAverage * 0.7 + behavioralAverage * 0.3) * 10
    ) / 10;

    // --- Generate Qualitative Feedback (Pros/Cons) ---
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && questions.length > 0) {
        const interviewLog = questions
          .map(q => `Q: ${q.question}\nA: ${q.answer}\nScore: ${q.correctness}/10`)
          .join("\n\n");

        const summaryPrompt = `
You are an expert interview coach. Analyze this interview session and provide a summary.

Role: ${interviewResult.role}
Level: ${interviewResult.difficulty}

Interview Log:
${interviewLog}

Task:
1. Identify 3 strong points (Pros) where the candidate performed well.
2. Identify 3 areas for improvement (Cons - specifically what they lacked or got wrong).
3. Provide a 1-sentence strategic advice (Improvement Plan).

Return ONLY valid JSON in this format:
{
  "pros": ["string", "string", "string"],
  "cons": ["string", "string", "string"],
  "improvementPlan": "string"
}
`;

        const summaryResp = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
            }),
          }
        );

        const summaryData = await summaryResp.json();
        const summaryText = summaryData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (summaryText) {
          let jsonText = summaryText;
            const jsonMatch = summaryText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              jsonText = jsonMatch[1].trim();
            }
          const parsedSummary = JSON.parse(jsonText);
          
          interviewResult.feedbackSummary = {
            pros: parsedSummary.pros || [],
            cons: parsedSummary.cons || [],
            improvementPlan: parsedSummary.improvementPlan || ""
          };
        }
      }
    } catch (aiErr) {
      console.error("AI Summary Generation Failed:", aiErr);
      // Don't fail the request, just continue without AI summary
    }

    await interviewResult.save();

    return res.json({
      success: true,
      results: {
        correctness: interviewResult.overallCorrectness,
        depth: interviewResult.overallDepth,
        structure: interviewResult.overallStructure,
        eyeContact: interviewResult.eyeContact,
        confidence: interviewResult.confidence,
        engagement: interviewResult.engagement,
        totalScore: interviewResult.totalScore,
        feedbackSummary: interviewResult.feedbackSummary // Include this in response
      }
    });
  } catch (err) {
    console.error("Finalize interview error:", err);
    return res.status(500).json({ error: "Failed to finalize interview" });
  }
});

/* ================= GET USER INTERVIEWS ================= */
router.get("/user-interviews", async (req, res) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const interviews = await InterviewResult.find({ userId })
      .select("role mode difficulty totalScore overallCorrectness overallDepth overallStructure confidence eyeContact stability feedbackSummary createdAt")
      .sort({ createdAt: -1 });

    return res.json({ interviews });
  } catch (err) {
    console.error("Fetch interviews error:", err);
    return res.status(500).json({ error: "Failed to fetch interview history" });
  }
});

/* ================= GET DASHBOARD ANALYTICS ================= */
router.get("/analytics", async (req, res) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const interviews = await InterviewResult.find({ userId })
      .select("role mode difficulty totalScore overallCorrectness overallDepth overallStructure eyeContact confidence stability createdAt")
      .sort({ createdAt: 1 });

    if (interviews.length === 0) {
      return res.json({
        totalInterviews: 0,
        averageScore: 0,
        recentScore: 0,
        skillTrends: [],
        performanceByDifficulty: [],
        recentInterviews: []
      });
    }

    // Calculate stats
    const scores = interviews.map(i => i.totalScore || 0);
    const totalInterviews = interviews.length;
    const averageScore = scores.reduce((a, b) => a + b, 0) / totalInterviews;
    const recentScore = scores[scores.length - 1];

    // Skill trends over time (last 10 interviews) - includes verbal and behavioral analysis
    const recentForTrends = interviews.slice(-10);
    const skillTrends = recentForTrends.map((interview, idx) => ({
      interview: idx + 1,
      // Verbal Analysis
      correctness: Math.round((interview.overallCorrectness || 0) * 10),
      depth: Math.round((interview.overallDepth || 0) * 10),
      structure: Math.round((interview.overallStructure || 0) * 10),
      // Behavioral Analysis
      eyeContact: Math.round(interview.eyeContact || 0),
      confidence: Math.round(interview.confidence || 0),
      stability: Math.round(interview.stability || 0),
      date: interview.createdAt
    }));

    // Performance by difficulty
    const difficultyGroups = { Easy: [], Medium: [], Hard: [] };
    interviews.forEach(i => {
      if (difficultyGroups[i.difficulty]) {
        difficultyGroups[i.difficulty].push(i.totalScore || 0);
      }
    });

    const performanceByDifficulty = Object.keys(difficultyGroups).map(difficulty => ({
      difficulty,
      averageScore: difficultyGroups[difficulty].length > 0
        ? Math.round((difficultyGroups[difficulty].reduce((a, b) => a + b, 0) / difficultyGroups[difficulty].length) * 10)
        : 0,
      count: difficultyGroups[difficulty].length
    }));

    // Recent interviews (last 5)
    const recentInterviews = interviews.slice(-5).reverse().map(i => ({
      role: i.role,
      score: i.totalScore,
      date: i.createdAt
    }));

    return res.json({
      totalInterviews,
      averageScore,
      recentScore,
      skillTrends,
      performanceByDifficulty,
      recentInterviews
    });
  } catch (err) {
    console.error("Analytics fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
