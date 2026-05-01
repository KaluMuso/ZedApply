"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  profile as profileApi,
  cv as cvApi,
  cvTools,
  type UserProfile,
  type CVAnalysisResult,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SkillBadge } from "@/components/SkillBadge";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";

type Tab = "cv" | "cv-generator" | "cv-analysis" | "preferences";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const initialTab = (searchParams.get("tab") as Tab) || "cv";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const fileRef = useRef<HTMLInputElement>(null);

  // CV Generator state
  const [genJobTitle, setGenJobTitle] = useState("");
  const [genCompany, setGenCompany] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<string | null>(null);
  const [genHighlights, setGenHighlights] = useState<string[]>([]);
  const [genError, setGenError] = useState("");

  // CV Analysis state
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

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
      if (file.size > 10 * 1024 * 1024) {
        setUploadMsg("File must be under 10MB.");
        return;
      }
      setUploading(true);
      setUploadMsg("");
      try {
        const result = await cvApi.upload(token, file);
        setUploadMsg(
          `CV uploaded! ${result.skills_extracted.length} skills extracted.`
        );
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setGenerating(true);
    setGenError("");
    setGeneratedCV(null);
    try {
      const result = await cvTools.generate(token, {
        job_title: genJobTitle,
        company: genCompany || undefined,
      });
      setGeneratedCV(result.tailored_cv);
      setGenHighlights(result.highlights);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!token) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const result = await cvTools.analyze(token);
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="skeleton h-48 w-full mb-6" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-20 text-center">
        <p style={{ color: "var(--muted)" }}>Could not load profile.</p>
      </div>
    );
  }

  const tierLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter (K125/mo)",
    professional: "Professional (K250/mo)",
  };

  // Completeness
  const fields = [
    !!profileData.full_name,
    !!profileData.phone,
    profileData.cv_uploaded,
    profileData.skills.length > 0,
  ];
  const completeness = Math.round(
    (fields.filter(Boolean).length / fields.length) * 100
  );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "cv", label: "CV & Skills", icon: "file" },
    { key: "cv-generator", label: "CV Generator", icon: "edit" },
    { key: "cv-analysis", label: "CV Analysis", icon: "target" },
    { key: "preferences", label: "Preferences", icon: "settings" },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 md:py-12">
      {/* Header card */}
      <div className="card p-6 md:p-8 mb-8 fade-up">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-5 flex-1">
            <Avatar name={profileData.full_name || "User"} size={72} />
            <div>
              <h1
                className="font-display text-3xl"
                style={{ letterSpacing: "-0.01em" }}
              >
                {profileData.full_name || "Your Profile"}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {profileData.phone}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="tag tag-green">
                  <Icon name="check" size={10} /> Verified
                </span>
                <span className="tag tag-copper">
                  {tierLabels[profileData.subscription_tier] ||
                    profileData.subscription_tier}
                </span>
              </div>
            </div>
          </div>

          {/* Completeness ring */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg width={80} height={80} className="-rotate-90">
                <circle
                  cx={40}
                  cy={40}
                  r={34}
                  fill="none"
                  className="score-ring-track"
                  strokeWidth={5}
                />
                <circle
                  cx={40}
                  cy={40}
                  r={34}
                  fill="none"
                  stroke="var(--copper-500)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={
                    2 * Math.PI * 34 -
                    (completeness / 100) * 2 * Math.PI * 34
                  }
                  style={{
                    transition:
                      "stroke-dashoffset 1s cubic-bezier(0.2,0.7,0.2,1)",
                  }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold"
                style={{ color: "var(--copper-500)" }}
              >
                {completeness}%
              </span>
            </div>
            <div>
              <div className="text-sm font-medium">Profile complete</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {completeness < 100
                  ? "Add more details to improve matches"
                  : "Looking great!"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-8 overflow-x-auto scroll-thin pb-1"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 pb-3 px-3 text-sm font-medium relative whitespace-nowrap transition-colors"
            style={{
              color:
                activeTab === tab.key ? "var(--ink)" : "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
            {activeTab === tab.key && (
              <span
                className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full"
                style={{ background: "var(--copper-500)" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "cv" && (
            <>
              {/* CV Upload */}
              <div className="card p-6 fade-up">
                <div className="eyebrow mb-4">
                  {profileData.cv_uploaded ? "Your CV" : "Upload your CV"}
                </div>

                {profileData.cv_uploaded && (
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg mb-4"
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <Icon name="file" size={20} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        CV uploaded
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        {profileData.skills.length} skills extracted
                      </div>
                    </div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="btn btn-ghost btn-sm"
                    >
                      Replace
                    </button>
                  </div>
                )}

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer p-8 text-center rounded-xl transition"
                  style={{
                    border: dragActive
                      ? "2px dashed var(--green-500)"
                      : "2px dashed var(--line-2)",
                    background: dragActive ? "var(--green-50)" : "transparent",
                  }}
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
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="spinner"
                        style={{
                          borderTopColor: "var(--green-500)",
                          borderColor: "var(--line-2)",
                        }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--green-700)" }}
                      >
                        Uploading & analysing...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                        style={{
                          background: "var(--bg-2)",
                          color: "var(--muted)",
                        }}
                      >
                        <Icon name="upload" size={22} />
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--ink-2)" }}
                      >
                        Drag and drop your CV here, or{" "}
                        <span
                          className="font-medium"
                          style={{ color: "var(--green-700)" }}
                        >
                          browse
                        </span>
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--muted)" }}
                      >
                        PDF, Word, or image (max 10MB)
                      </p>
                    </>
                  )}
                </div>

                {uploadMsg && (
                  <p
                    className="mt-3 text-sm"
                    style={{
                      color:
                        uploadMsg.includes("failed") ||
                        uploadMsg.includes("Please")
                          ? "var(--danger)"
                          : "var(--success)",
                    }}
                  >
                    {uploadMsg}
                  </p>
                )}
              </div>

              {/* Extracted Skills */}
              <div className="card p-6 fade-up" style={{ animationDelay: "100ms" }}>
                <div className="eyebrow mb-4">Extracted skills</div>
                {profileData.skills.length === 0 ? (
                  <p
                    className="text-sm"
                    style={{ color: "var(--muted)" }}
                  >
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
            </>
          )}

          {activeTab === "cv-generator" && (
            <div className="card p-6 fade-up">
              <div className="eyebrow mb-2">CV Generator</div>
              <h3
                className="font-display text-xl mb-1"
                style={{ letterSpacing: "-0.01em" }}
              >
                Create a tailored CV
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--muted)" }}
              >
                Generate a CV tailored to a specific job. Our AI restructures
                your experience to highlight what matters most for each role.
              </p>

              {!profileData.cv_uploaded ? (
                <div
                  className="p-6 rounded-xl text-center"
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <Icon name="upload" size={24} />
                  <p
                    className="text-sm mt-3"
                    style={{ color: "var(--muted)" }}
                  >
                    Upload your CV first to use the generator.
                  </p>
                  <button
                    onClick={() => setActiveTab("cv")}
                    className="btn btn-ghost btn-sm mt-3"
                  >
                    Go to CV Upload
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div>
                    <label className="eyebrow mb-1.5 block">
                      Target job title
                    </label>
                    <input
                      type="text"
                      className="field"
                      placeholder="e.g. Senior Accountant"
                      value={genJobTitle}
                      onChange={(e) => setGenJobTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="eyebrow mb-1.5 block">
                      Company (optional)
                    </label>
                    <input
                      type="text"
                      className="field"
                      placeholder="e.g. ZANACO"
                      value={genCompany}
                      onChange={(e) => setGenCompany(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <span
                          className="spinner"
                          style={{
                            borderTopColor: "#faf7f2",
                            borderColor: "rgba(255,255,255,0.3)",
                          }}
                        />{" "}
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Tailored CV{" "}
                        <Icon name="arrowRight" size={14} />
                      </>
                    )}
                  </button>
                  {genError && (
                    <p className="text-sm text-center" style={{ color: "var(--danger)" }}>
                      {genError}
                    </p>
                  )}
                  {profileData.subscription_tier === "free" && (
                    <p
                      className="text-xs text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      Free plan includes 1 generated CV.{" "}
                      <Link
                        href="/pricing"
                        className="font-medium hover:underline"
                        style={{ color: "var(--copper-500)" }}
                      >
                        Upgrade for unlimited
                      </Link>
                      .
                    </p>
                  )}
                </form>

                {/* Generated result */}
                {generatedCV && (
                  <div className="mt-6 space-y-4">
                    <div className="eyebrow">Generated CV</div>
                    {genHighlights.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {genHighlights.map((h, i) => (
                          <span key={i} className="tag tag-green">{h}</span>
                        ))}
                      </div>
                    )}
                    <div
                      className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-line"
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--line)",
                        color: "var(--ink-2)",
                        maxHeight: 400,
                        overflowY: "auto",
                      }}
                    >
                      {generatedCV}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCV);
                      }}
                      className="btn btn-ghost btn-sm w-full"
                    >
                      <Icon name="download" size={14} /> Copy to clipboard
                    </button>
                  </div>
                )}
              )}
            </div>
          )}

          {activeTab === "cv-analysis" && (
            <div className="card p-6 fade-up">
              <div className="eyebrow mb-2">CV Analysis</div>
              <h3
                className="font-display text-xl mb-1"
                style={{ letterSpacing: "-0.01em" }}
              >
                How strong is your CV?
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--muted)" }}
              >
                Get an AI-powered assessment of your CV&apos;s strengths,
                weaknesses, and actionable improvements.
              </p>

              {!profileData.cv_uploaded ? (
                <div
                  className="p-6 rounded-xl text-center"
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <Icon name="upload" size={24} />
                  <p
                    className="text-sm mt-3"
                    style={{ color: "var(--muted)" }}
                  >
                    Upload your CV first to get analysis.
                  </p>
                  <button
                    onClick={() => setActiveTab("cv")}
                    className="btn btn-ghost btn-sm mt-3"
                  >
                    Go to CV Upload
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Run Analysis button */}
                  {!analysis && !analyzing && (
                    <button
                      onClick={handleAnalyze}
                      className="btn btn-primary w-full"
                    >
                      <Icon name="target" size={14} /> Run CV Analysis
                    </button>
                  )}

                  {analyzing && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <span
                        className="spinner"
                        style={{
                          width: 32,
                          height: 32,
                          borderTopColor: "var(--green-500)",
                          borderColor: "var(--line-2)",
                        }}
                      />
                      <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                        Analysing your CV with AI...
                      </p>
                    </div>
                  )}

                  {analysisError && (
                    <div
                      className="p-4 rounded-xl text-center"
                      style={{
                        background: "var(--danger-bg, #fef2f2)",
                        border: "1px solid var(--danger, #ef4444)",
                      }}
                    >
                      <p className="text-sm" style={{ color: "var(--danger)" }}>
                        {analysisError}
                      </p>
                      <button
                        onClick={handleAnalyze}
                        className="btn btn-ghost btn-sm mt-3"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {analysis && (
                    <>
                      {/* Summary */}
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: "var(--bg-2)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                          {analysis.summary}
                        </p>
                      </div>

                      {/* Summary scores */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Overall", score: analysis.overall_score, color: "var(--green-500)" },
                          { label: "Skills", score: analysis.skills_score, color: "var(--copper-500)" },
                          { label: "Format", score: analysis.format_score, color: "var(--orange-500)" },
                          { label: "Impact", score: analysis.impact_score, color: "var(--green-400)" },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="text-center p-4 rounded-xl"
                            style={{
                              background: "var(--bg-2)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            <div className="relative mx-auto" style={{ width: 56, height: 56 }}>
                              <svg width={56} height={56} className="-rotate-90">
                                <circle cx={28} cy={28} r={22} fill="none" className="score-ring-track" strokeWidth={4} />
                                <circle
                                  cx={28} cy={28} r={22} fill="none"
                                  stroke={item.color} strokeWidth={4} strokeLinecap="round"
                                  strokeDasharray={2 * Math.PI * 22}
                                  strokeDashoffset={2 * Math.PI * 22 - (item.score / 100) * 2 * Math.PI * 22}
                                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0.7,0.2,1)" }}
                                />
                              </svg>
                              <span
                                className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold"
                                style={{ color: item.color }}
                              >
                                {item.score}
                              </span>
                            </div>
                            <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                              {item.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Strengths */}
                      {analysis.strengths.length > 0 && (
                        <div>
                          <div className="eyebrow mb-3">Strengths</div>
                          <div className="space-y-3">
                            {analysis.strengths.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-lg"
                                style={{
                                  background: "var(--green-50)",
                                  border: "1px solid var(--green-200)",
                                }}
                              >
                                <div
                                  className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                                  style={{ background: "var(--green-500)", color: "#fff" }}
                                >
                                  <Icon name="check" size={10} />
                                </div>
                                <p className="text-sm" style={{ color: "var(--ink-2)" }}>{s}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Improvements */}
                      {analysis.improvements.length > 0 && (
                        <div>
                          <div className="eyebrow mb-3">Improvements</div>
                          <div className="space-y-3">
                            {analysis.improvements.map((imp, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-lg"
                                style={{
                                  background: "var(--copper-100)",
                                  border: "1px solid var(--copper-200)",
                                }}
                              >
                                <div
                                  className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                                  style={{ background: "var(--copper-500)", color: "#fff" }}
                                >
                                  <Icon name="arrowRight" size={10} />
                                </div>
                                <p className="text-sm" style={{ color: "var(--ink-2)" }}>{imp}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={handleAnalyze}
                          className="btn btn-ghost btn-sm flex-1"
                        >
                          Re-analyse
                        </button>
                        <button
                          onClick={() => setActiveTab("cv-generator")}
                          className="btn btn-accent btn-sm flex-1"
                        >
                          Generate Tailored CV <Icon name="arrowRight" size={12} />
                        </button>
                      </div>

                      <p
                        className="text-xs text-center"
                        style={{ color: "var(--muted)" }}
                      >
                        Analysis is AI-generated and may not capture everything.
                        Use it as a guide, not a final verdict.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="card p-6 fade-up">
              <div className="eyebrow mb-4">Job preferences</div>
              <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
                Set your preferences to get better matches. Your matches are
                refined based on these settings.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="eyebrow mb-1.5 block">
                    Preferred locations
                  </label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. Lusaka, Kitwe, Remote"
                    disabled
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">
                    Minimum salary (ZMW)
                  </label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. 8000"
                    disabled
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Job type</label>
                  <select className="field" disabled>
                    <option>All types</option>
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Remote</option>
                  </select>
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Preference filters are coming soon. For now, matches are
                  based on your CV skills.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plan card */}
          <div className="card p-6 fade-up" style={{ animationDelay: "100ms" }}>
            <div className="eyebrow mb-3">Your plan</div>
            <div className="font-display text-2xl mb-1">
              {tierLabels[profileData.subscription_tier] ||
                profileData.subscription_tier}
            </div>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--muted)" }}
            >
              Upgrade to unlock tailored CVs, unlimited matches, and more.
            </p>
            <Link href="/pricing" className="btn btn-accent w-full btn-sm">
              Upgrade <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          {/* Quick info */}
          <div className="card p-6 fade-up" style={{ animationDelay: "200ms" }}>
            <div className="eyebrow mb-3">Account</div>
            <div className="space-y-3">
              <div>
                <div
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Name
                </div>
                <div className="text-sm font-medium">
                  {profileData.full_name || "Not set"}
                </div>
              </div>
              <div>
                <div
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Phone
                </div>
                <div className="text-sm font-mono">
                  {profileData.phone}
                </div>
              </div>
              {profileData.email && (
                <div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    Email
                  </div>
                  <div className="text-sm">{profileData.email}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="card p-6 fade-up" style={{ animationDelay: "300ms" }}>
            <div className="eyebrow mb-3">Quick links</div>
            <div className="space-y-2">
              <Link
                href="/matches"
                className="flex items-center gap-3 p-2 rounded-lg text-sm hover:bg-[var(--bg-2)] transition-colors"
                style={{ color: "var(--ink-2)" }}
              >
                <Icon name="target" size={16} /> My Matches
              </Link>
              <Link
                href="/jobs"
                className="flex items-center gap-3 p-2 rounded-lg text-sm hover:bg-[var(--bg-2)] transition-colors"
                style={{ color: "var(--ink-2)" }}
              >
                <Icon name="search" size={16} /> Browse Jobs
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 p-2 rounded-lg text-sm hover:bg-[var(--bg-2)] transition-colors"
                style={{ color: "var(--ink-2)" }}
              >
                <Icon name="star" size={16} /> Upgrade Plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
