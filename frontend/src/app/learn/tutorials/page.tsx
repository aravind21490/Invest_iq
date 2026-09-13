"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  BookOpen,
  Flame,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { CURRICULUM_TIERS, LessonTopic } from "@/lib/curriculum-data";

export default function TutorialsPage() {
  const [selectedTopicId, setSelectedTopicId] = useState<string>("t1-1");
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState<number>(1);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [recommendedLesson, setRecommendedLesson] = useState<{
    recommended_lesson_id: string;
    lesson_title: string;
    tier_id: number;
    tier_title: string;
    pattern_type: string;
    trigger_source: string;
    rationale: string;
    nudge_message: string;
    has_active_flag: boolean;
  } | null>(null);

  // Flatten all topics for easy index lookup
  const allTopics: LessonTopic[] = React.useMemo(() => {
    return CURRICULUM_TIERS.flatMap((t) => t.topics);
  }, []);

  const activeTopic =
    allTopics.find((t) => t.id === selectedTopicId) || allTopics[0];

  const currentTopicIndex = allTopics.findIndex((t) => t.id === activeTopic.id);
  const nextTopic =
    currentTopicIndex < allTopics.length - 1 ? allTopics[currentTopicIndex + 1] : null;

  // Check URL query param and load user progress from DB & agent recommendation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const topicParam = params.get("topic");
      if (topicParam && allTopics.some((t) => t.id === topicParam)) {
        setSelectedTopicId(topicParam);
      }
    }

    fetch("/api/user/portfolio")
      .then((res) => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        return ct.includes("application/json") ? res.json() : null;
      })
      .then((data) => {
        if (data && data.success && data.learn) {
          setCompletedTopics(data.learn.completedTopics || []);
          setStreakDays(data.learn.streakDays || 1);
        }
      })
      .catch((err) => console.error("Error loading learn progress:", err));

    fetch("/api/agents/next-lesson")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.success && data.recommended_lesson_id) {
          setRecommendedLesson(data);
        }
      })
      .catch((err) => console.debug("Error loading next lesson recommendation:", err));
  }, [allTopics]);

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setQuizSelection(null);
    setQuizSubmitted(false);
  };

  const handleCompleteTopic = async (topicId: string, score: number = 100) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, score }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return;
      const data = await res.json();
      if (data.success && data.progress) {
        setCompletedTopics(data.progress.completedTopics);
        setStreakDays(data.progress.streakDays);
      }
    } catch (err) {
      console.error("Error saving learn progress:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const totalTopicsCount = allTopics.length;
  const completedCount = completedTopics.length;
  const progressPercent = Math.round((completedCount / totalTopicsCount) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* Academy Header & Progress Bar */}
      <div className="fintech-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Invest IQ Academy
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Market Mastery Curriculum
            </h1>
            <p className="text-xs text-muted-foreground">
              Structured progressive curriculum from Absolute Basics to Advanced Options and Risk Management.
            </p>
          </div>

          {/* User Progress Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">
              <Flame className="h-4 w-4 text-amber-500" />
              <span>{streakDays} Day Streak</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
              <Award className="h-4 w-4" />
              <span>
                {completedCount}/{totalTopicsCount} Done ({progressPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Progress: {progressPercent}% of Curriculum Mastered</span>
            <span>{totalTopicsCount - completedCount} lessons remaining</span>
          </div>
        </div>
      </div>

      {/* AI Lesson Sequencing Recommendation Banner (Pinned Focus) */}
      {recommendedLesson && (
        <div className="fintech-card p-4 sm:p-5 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative overflow-hidden space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-md bg-primary/20 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Personalized Lesson Recommendation
              </span>
              {recommendedLesson.has_active_flag && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  {recommendedLesson.trigger_source === "watchdog" ? "Behavioral Guardrail" : "Trade Setup Debrief"}
                </span>
              )}
            </div>

            {activeTopic.id !== recommendedLesson.recommended_lesson_id && (
              <button
                onClick={() => handleSelectTopic(recommendedLesson.recommended_lesson_id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all self-start sm:self-auto shadow-sm"
              >
                <span>Study This Lesson</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {recommendedLesson.lesson_title}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({recommendedLesson.tier_title})
              </span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
              {recommendedLesson.nudge_message}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Sidebar Curriculum / Right Active Lesson */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 6 Tiers Curriculum Menu (4 cols) */}
        <div className="lg:col-span-4 space-y-4 max-h-[850px] overflow-y-auto pr-1">
          {CURRICULUM_TIERS.map((tier) => {
            const tierTopicIds = tier.topics.map((t) => t.id);
            const tierCompleted = tierTopicIds.filter((id) =>
              completedTopics.includes(id)
            ).length;
            const isTierDone = tierCompleted === tier.topics.length;

            return (
              <div
                key={tier.id}
                className="fintech-card p-3.5 space-y-2.5 border-border/80"
              >
                {/* Tier Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        isTierDone
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                          : "bg-primary/15 text-primary border-primary/20"
                      }`}
                    >
                      {tier.badge}
                    </span>
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {tier.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {tierCompleted}/{tier.topics.length}
                  </span>
                </div>

                {/* Tier Topic Buttons (Maintains exact 6-tier progression without reordering) */}
                <div className="space-y-1">
                  {tier.topics.map((topic) => {
                    const isCompleted = completedTopics.includes(topic.id);
                    const isCurrent = topic.id === activeTopic.id;
                    const isRecommended = topic.id === recommendedLesson?.recommended_lesson_id;

                    return (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all ${
                          isCurrent
                            ? "bg-secondary text-foreground font-bold shadow-2xs border border-primary/40"
                            : isRecommended
                            ? "border border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : isRecommended ? (
                            <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-border flex items-center justify-center text-[9px] text-muted-foreground shrink-0 font-mono">
                              •
                            </div>
                          )}
                          <span className="truncate">{topic.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isRecommended && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.2 rounded border border-primary/25">
                              Focus
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {topic.duration}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Lesson Reader & Quiz (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="fintech-card p-6 sm:p-8 space-y-6">
            {/* Lesson Title & Tier Badge */}
            <div className="space-y-2 border-b border-border/80 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {activeTopic.tierTitle}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {activeTopic.duration}
                  </span>
                </div>

                {completedTopics.includes(activeTopic.id) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="h-3.5 w-3.5" />
                    Completed
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {activeTopic.title}
              </h2>
            </div>

            {/* Core Explanation */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Concept Explanation
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {activeTopic.explanation}
              </p>
            </div>

            {/* Real-World Practical Example */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Real-World Market Example
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeTopic.example}
              </p>
            </div>

            {/* Interactive Concept Check / Quiz */}
            <div className="fintech-card p-5 space-y-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                  <HelpCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Concept Check Quiz
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Test your understanding to earn curriculum mastery credit
                  </p>
                </div>
              </div>

              <p className="text-xs font-semibold text-foreground">
                {activeTopic.quiz.question}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {activeTopic.quiz.options.map((option, idx) => {
                  let btnStyle = "border-border bg-card hover:bg-muted text-foreground";
                  if (quizSubmitted) {
                    if (idx === activeTopic.quiz.answerIndex) {
                      btnStyle = "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold";
                    } else if (idx === quizSelection) {
                      btnStyle = "border-red-500/50 bg-red-500/15 text-red-400 font-semibold";
                    }
                  } else if (quizSelection === idx) {
                    btnStyle = "border-primary bg-primary/10 text-primary font-semibold";
                  }

                  return (
                    <button
                      key={idx}
                      disabled={quizSubmitted}
                      onClick={() => setQuizSelection(idx)}
                      className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center gap-3 ${btnStyle}`}
                    >
                      <span className="h-5 w-5 rounded-full border border-border flex items-center justify-center font-bold text-[10px] shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quiz Feedback & Explanation */}
              {!quizSubmitted ? (
                <button
                  onClick={() => {
                    if (quizSelection !== null) {
                      setQuizSubmitted(true);
                      const isCorrect = quizSelection === activeTopic.quiz.answerIndex;
                      if (isCorrect) {
                        handleCompleteTopic(activeTopic.id, 100);
                      }
                    }
                  }}
                  disabled={quizSelection === null}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Submit Answer
                </button>
              ) : (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1 animate-in fade-in-0 duration-200 ${
                    quizSelection === activeTopic.quiz.answerIndex
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {quizSelection === activeTopic.quiz.answerIndex ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Correct! Topic completed.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span>Incorrect. Review explanation below:</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {activeTopic.quiz.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-4 border-t border-border gap-4">
              <button
                onClick={() => handleCompleteTopic(activeTopic.id, 100)}
                disabled={isSaving || completedTopics.includes(activeTopic.id)}
                className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  completedTopics.includes(activeTopic.id)
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "border border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {completedTopics.includes(activeTopic.id)
                    ? "Lesson Completed"
                    : isSaving
                    ? "Saving..."
                    : "Mark as Completed"}
                </span>
              </button>

              {nextTopic && (
                <button
                  onClick={() => handleSelectTopic(nextTopic.id)}
                  className="py-2 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>Next: {nextTopic.title}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
