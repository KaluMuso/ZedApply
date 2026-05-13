"use client";

import { useCallback, useRef, useState } from "react";
import { cv as cvApi, type UserProfile } from "@/lib/api";
import { SkillBadge } from "@/components/SkillBadge";
import { Icon } from "@/components/ui/Icon";

const VALID_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

export function CvSkillsTab({
  token,
  profileData,
  onUploaded,
}: {
  token: string;
  profileData: UserProfile;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!VALID_TYPES.includes(file.type)) {
        setUploadMsg("Please upload a PDF, Word document, or image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadMsg("File must be under 10MB.");
        return;
      }
      setUploading(true);
      setUploadMsg("");
      try {
        const result = await cvApi.upload(token, file);
        // Defensive — older backend builds occasionally return without
        // `skills_extracted`, which used to crash here with
        // "Cannot read properties of undefined (reading 'length')".
        const skillsCount = result?.skills_extracted?.length ?? 0;
        if (result?.queued) {
          setUploadMsg(
            "CV queued — we'll process it as soon as AI capacity is back."
          );
        } else {
          setUploadMsg(`CV uploaded! ${skillsCount} skills extracted.`);
        }
        onUploaded();
      } catch (err) {
        // Distinguish network errors (CORS-masked 500s, offline) from
        // app-level errors so users know to retry vs. fix input.
        let msg: string;
        if (err instanceof TypeError && /fetch/i.test(err.message)) {
          msg = "Couldn't reach the server. Please check your connection and try again.";
        } else if (err instanceof Error) {
          msg = err.message;
        } else {
          msg = "Upload failed";
        }
        setUploadMsg(msg);
      } finally {
        setUploading(false);
      }
    },
    [token, onUploaded]
  );

  return (
    <>
      <div className="card p-6">
        <div className="eyebrow mb-4">
          {profileData.cv_uploaded ? "Your CV" : "Upload your CV"}
        </div>

        {profileData.cv_uploaded && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg mb-4"
            style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
          >
            <Icon name="file" size={20} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">CV uploaded</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {(profileData.skills ?? []).length} skills extracted
              </div>
            </div>
            <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm">
              Replace
            </button>
          </div>
        )}

        {/* Hidden file input — always rendered so the Replace button above
            can trigger it, even when the dropzone below isn't shown. */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="hidden"
        />

        {/* Dropzone is only shown when no CV is uploaded yet. With a CV in
            place, the "Replace" button above is the canonical affordance —
            showing both was confusing (users wondered if their upload
            actually succeeded). */}
        {!profileData.cv_uploaded && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files[0];
            if (file) handleUpload(file);
          }}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer p-8 text-center rounded-xl transition"
          style={{
            border: dragActive ? "2px dashed var(--green-500)" : "2px dashed var(--line-2)",
            background: dragActive ? "var(--green-50)" : "transparent",
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileRef.current?.click();
          }}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <span
                className="spinner"
                style={{ borderTopColor: "var(--green-500)", borderColor: "var(--line-2)" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--green-700)" }}>
                Uploading...
              </span>
            </div>
          ) : (
            <>
              <div
                className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-2)", color: "var(--muted)" }}
              >
                <Icon name="upload" size={22} />
              </div>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                Drag and drop your CV here, or{" "}
                <span className="font-medium" style={{ color: "var(--green-700)" }}>
                  browse
                </span>
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                PDF, Word, or image (max 10MB)
              </p>
            </>
          )}
        </div>
        )}

        {uploading && profileData.cv_uploaded && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <span
              className="spinner"
              style={{ borderTopColor: "var(--green-500)", borderColor: "var(--line-2)" }}
            />
            <span className="text-sm font-medium" style={{ color: "var(--green-700)" }}>
              Replacing your CV…
            </span>
          </div>
        )}

        {uploadMsg && (
          <p
            className="mt-3 text-sm"
            style={{
              color:
                uploadMsg.includes("failed") || uploadMsg.includes("Please")
                  ? "var(--danger)"
                  : "var(--success)",
            }}
          >
            {uploadMsg}
          </p>
        )}
      </div>

      <div className="card p-6">
        <div className="eyebrow mb-4">Extracted skills</div>
        {(profileData.skills ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Upload your CV to automatically extract skills.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(profileData.skills ?? []).map((skill) => (
              <SkillBadge key={skill} skill={skill} matched />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
