"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { profile as profileApi, cv as cvApi, type UserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SkillBadge } from "@/components/SkillBadge";

export default function ProfilePage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !token) {
      router.push("/auth");
      return;
    }
    profileApi
      .get(token)
      .then(setProfileData)
      .catch(() => setProfileData(null))
      .finally(() => setLoading(false));
  }, [token, isAuthenticated, authLoading, router]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!token) return;
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];
      if (!validTypes.includes(file.type)) {
        setUploadMsg("Please upload a PDF, Word document, or image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadMsg("File must be under 5MB.");
        return;
      }
      setUploading(true);
      setUploadMsg("");
      try {
        const result = await cvApi.upload(token, file);
        setUploadMsg(`CV uploaded! ${result.skills_extracted.length} skills extracted.`);
        // Refresh profile
        const updated = await profileApi.get(token);
        setProfileData(updated);
      } catch (err) {
        setUploadMsg(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [token]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  if (loading || authLoading) {
    return <p className="text-center py-20 text-gray-500">Loading profile...</p>;
  }
  if (!profileData) {
    return <p className="text-center py-20 text-gray-500">Could not load profile.</p>;
  }

  const tierLabels: Record<string, string> = {
    mwana: "Mwana (Free)",
    mwezi: "Mwezi (K79/mo)",
    bwino: "Bwino (K199/mo)",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Your Profile</h1>

      {/* User info */}
      <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-3">
        <div>
          <p className="text-sm text-gray-500">Name</p>
          <p className="font-medium">{profileData.full_name || "Not set"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Phone</p>
          <p className="font-medium">{profileData.phone}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Subscription</p>
          <p className="font-medium">
            {tierLabels[profileData.subscription_tier] || profileData.subscription_tier}
          </p>
        </div>
      </div>

      {/* CV Upload */}
      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <h2 className="font-semibold text-lg mb-4">
          {profileData.cv_uploaded ? "Update Your CV" : "Upload Your CV"}
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragActive
              ? "border-brand-500 bg-brand-50"
              : "border-gray-300 hover:border-brand-400"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileRef.current?.click();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={onFileChange}
            className="hidden"
          />
          {uploading ? (
            <p className="text-brand-600 font-medium">Uploading...</p>
          ) : (
            <>
              <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-gray-600 text-sm">
                Drag and drop your CV here, or{" "}
                <span className="text-brand-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, Word, or image (max 5MB)
              </p>
            </>
          )}
        </div>
        {uploadMsg && (
          <p
            className={`mt-3 text-sm ${
              uploadMsg.includes("failed") || uploadMsg.includes("Please")
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {uploadMsg}
          </p>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <h2 className="font-semibold text-lg mb-3">Your Skills</h2>
        {profileData.skills.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Upload your CV to automatically extract skills.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profileData.skills.map((skill) => (
              <SkillBadge key={skill} skill={skill} matched />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
