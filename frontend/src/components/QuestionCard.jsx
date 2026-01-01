import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, ChevronRight, Loader2 } from "lucide-react";
import styles from "./QuestionCard.module.css";

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  answer,
  onAnswerChange,
  onMicToggle,
  onCameraToggle,
  onNext,
  listening,
  cameraOn,
  loading = false,
}) {
  const textareaRef = useRef(null);

  /* ================= AUTO GROW TEXTAREA ================= */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [answer]);

  return (
    <div className={styles.questionCard}>
      {loading ? (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} />
          <span>Loading next question…</span>
        </div>
      ) : (
        <>
          <h2>{question}</h2>

          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Answer here…"
            className={styles.answerField}
          />

          <div className={styles.actions}>
            <div className={styles.leftControls}>
              <button
                onClick={() => onMicToggle()}
                className={listening ? styles.micActive : ""}
                title={listening ? "Stop Recording" : "Start Recording"}
              >
                {listening ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              <button
                onClick={() => onCameraToggle()}
                className={cameraOn ? styles.cameraActive : ""}
                title={cameraOn ? "Stop Camera" : "Start Camera"}
              >
                {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>

            <button onClick={onNext} className={styles.nextButton}>
              {questionNumber === totalQuestions ? "Finish" : "Next"}
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
