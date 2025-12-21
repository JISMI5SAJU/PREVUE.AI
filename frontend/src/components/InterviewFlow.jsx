import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ChevronRight,
  AlertCircle,
  Loader2,
  Camera,
  MessageSquare,
} from "lucide-react";
import styles from "./InterviewFlow.module.css";

/* ---------------- MOCK AI SERVICE ---------------- */
const mockAiService = {
  generateQuestions: async (role) => {
    await new Promise((r) => setTimeout(r, 600));
    return [
      { id: 1, text: `Tell me about yourself as a ${role}.` },
      { id: 2, text: "Explain a challenging problem you solved recently." },
      { id: 3, text: "Where do you see yourself in 3 years?" },
    ];
  },
  generateFeedback: async () => {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      score: 88,
      summary: "Clear communication and confident responses.",
      details: "Your answers were structured and relevant.",
    };
  },
};

export default function InterviewFlow({ role = "Frontend Developer", onBack }) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const [interviewComplete, setInterviewComplete] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  /* ---------------- Lock page scroll ---------------- */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  /* ---------------- Load Questions ---------------- */
  useEffect(() => {
    mockAiService.generateQuestions(role).then((q) => {
      setQuestions(q);
      setLoading(false);
    });
  }, [role]);

  /* ---------------- Speech Recognition (lazy init) ---------------- */
  const initSpeech = () => {
    if (recognitionRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        }
      }
      if (finalText) {
        setAnswer((prev) =>
          (prev + " " + finalText).replace(/\s+/g, " ").trim()
        );
      }
    };

    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  };

  /* ---------------- Auto-grow textarea ---------------- */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [answer]);

  /* ---------------- Reset per question ---------------- */
  useEffect(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setAnswer("");
  }, [index]);

  /* ---------------- Camera helpers ---------------- */
  const startCamera = async () => {
    if (cameraOn) return;
    try {
      setMediaError("");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setMediaError("Camera permission denied");
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      await startCamera();
    }
  };

  /* ---------------- Mic toggle (AUTO START CAMERA) ---------------- */
  const toggleMic = async () => {
    initSpeech();
    if (!recognitionRef.current) return;

    if (!listening) {
      await startCamera(); // 🎯 AUTO START CAMERA
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
    setListening(!listening);
  };

  /* ---------------- Next / Finish ---------------- */
  const handleNext = async () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setInterviewComplete(true);
      setGeneratingFeedback(true);
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const fb = await mockAiService.generateFeedback();
      setFeedback(fb);
      setGeneratingFeedback(false);
    }
  };

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
        Preparing interview…
      </div>
    );
  }

  /* ---------------- Feedback ---------------- */
  if (interviewComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.feedbackCard}>
          {generatingFeedback ? (
            <>
              <Loader2 className={styles.spinner} />
              <p>Analyzing your interview…</p>
            </>
          ) : (
            <>
              <h2>Interview Score: {feedback.score}%</h2>
              <p>{feedback.summary}</p>
              <p className={styles.muted}>{feedback.details}</p>
              <button onClick={onBack} className={styles.primaryBtn}>
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const progress = ((index + 1) / questions.length) * 100;
  const isLast = index === questions.length - 1;

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.container}>
      <div className={styles.interviewShell}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <MessageSquare /> {role} Interview
          </h1>
          <span className={styles.counter}>
            Question {index + 1} / {questions.length}
          </span>
        </header>

        <div className={styles.progressBar}>
          <div className={styles.progress} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.layout}>
          {/* Question */}
          <div className={styles.questionCard}>
            <h2 className={styles.questionText}>{questions[index].text}</h2>

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Type your answer or use the mic…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <div className={styles.actions}>
              <button
                onClick={toggleMic}
                className={`${styles.iconBtn} ${
                  listening ? styles.micActive : ""
                }`}
              >
                {listening ? <MicOff /> : <Mic />}
              </button>

              <button onClick={handleNext} className={styles.nextBtn}>
                {isLast ? "Finish Interview" : "Next"}
                {!isLast && <ChevronRight />}
              </button>
            </div>
          </div>

          {/* Camera */}
          <div
            className={`${styles.cameraCard} ${
              cameraOn ? styles.cameraActive : ""
            }`}
          >
            <div className={styles.cameraHeader}>
              <Camera /> Camera
              <button onClick={toggleCamera} className={styles.cameraToggle}>
                {cameraOn ? <VideoOff /> : <Video />}
              </button>
            </div>

            <div className={styles.videoBox}>
              <video ref={videoRef} autoPlay muted className={styles.video} />
              {!cameraOn && (
                <div className={styles.overlay}>
                  <VideoOff />
                  <p>Camera Disabled</p>
                </div>
              )}
              {mediaError && (
                <div className={styles.error}>
                  <AlertCircle /> {mediaError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
