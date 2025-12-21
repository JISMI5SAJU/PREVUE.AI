"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import styles from "./ProfileModal.module.css"

/**
 * Props:
 * - initialName: string
 * - initialAvatar: string (url) or null
 * - onClose: () => void
 * - onSave: (payload) => void  // payload: { name, avatarFile? } or { name, avatar } if no file
 */
export default function ProfileModal({ initialName = "", initialAvatar = null, onClose, onSave }) {
  const [name, setName] = useState(initialName ?? "")
  const [avatarPreview, setAvatarPreview] = useState(initialAvatar ?? "/placeholder-avatar.png")
  const [selectedFile, setSelectedFile] = useState(null)
  const fileRef = useRef(null)
  const lastBlobRef = useRef(null)

  // Sync props -> local state (only when prop actually changes)
  useEffect(() => {
    setName((prev) => (initialName ?? prev) === prev ? prev : (initialName ?? ""))
  }, [initialName])

  useEffect(() => {
    // avoid empty src (that causes flicker)
    setAvatarPreview(initialAvatar || "/placeholder-avatar.png")
    // Cleanup selectedFile when parent avatar changes (user logged in/out, etc.)
    setSelectedFile(null)
    // revoke any existing blob (defensive)
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }
  }, [initialAvatar])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (lastBlobRef.current) {
        URL.revokeObjectURL(lastBlobRef.current)
        lastBlobRef.current = null
      }
    }
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // revoke previous blob url if any
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }

    const blobUrl = URL.createObjectURL(file)
    lastBlobRef.current = blobUrl

    setAvatarPreview(blobUrl)
    setSelectedFile(file)
  }, [])

  const handleRemove = useCallback(() => {
    if (lastBlobRef.current) {
      URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }
    setSelectedFile(null)
    setAvatarPreview("/placeholder-avatar.png")
    // Optionally, inform parent that avatar was removed by calling onSave({ name, avatar: null })
  }, [])

  const handleSave = useCallback(() => {
    // If a new file was chosen, provide it; otherwise pass the current preview URL
    const payload = selectedFile ? { name: name.trim(), avatarFile: selectedFile } : { name: name.trim(), avatar: avatarPreview }
    onSave(payload)
  }, [name, selectedFile, avatarPreview, onSave])

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
      >
        <h3 className={styles.title}>Edit Profile</h3>

        <div className={styles.avatarRow}>
          <img
            src={avatarPreview}
            alt="Profile preview"
            className={styles.avatarPreview}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = "/images/placeholder-avatar.png"
            }}
          />

          <div className={styles.avatarControls}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <button
              type="button"
              className={styles.fileBtn}
              onClick={() => fileRef.current?.click()}
            >
              Change Photo
            </button>

            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleRemove}
            >
              Remove
            </button>
          </div>
        </div>

        <label className={styles.label}>
          Display name
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            autoFocus
          />
        </label>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            aria-label="Save profile"
          >
            Save
          </button>

          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
