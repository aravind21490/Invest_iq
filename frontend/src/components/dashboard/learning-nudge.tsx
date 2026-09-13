"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, Award, Flame, Clock } from "lucide-react";
import { CURRICULUM_TIERS, LessonTopic } from "@/lib/curriculum-data";

export function LearningNudge() {
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState<number>(1);
  const [agentRec, setAgentRec] = useState<{
    recommended_lesson_id: string;
    lesson_title: string;
    tier_title: string;
    nudge_message: string;
    has_active_flag: boolean;
    pattern_type?: string;
    trigger_source?: string;
  } | null>(null);

  useEffect(() => {
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
      .catch((err) => console.error("Error loading learn progress for dashboard nudge:", err));

    fetch("/api/agents/next-lesson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.recommended_lesson_id) {
          setAgentRec(data);
        }
      })
      .catch((err) => console.debug("Error loading next lesson in dashboard nudge:", err));
  }, []);

  const allTopics: LessonTopic[] = React.useMemo(() => {
    return CURRICULUM_TIERS.flatMap((t) => t.topics);
  }, []);

  const totalTopics = allTopics.length;
  const completedCount = completedTopics.length;
  const progressPercent = Math.round((completedCount / totalTopics) * 100);

  // Determine the next suggested lesson: prioritize agent recommendation if present
  const recTopic = agentRec ? allTopics.find((t) => t.id === agentRec.recommended_lesson_id) : null;
  const nextLesson =
    recTopic ||
    allTopics.find((t) => !completedTopics.includes(t.id)) ||
    allTopics[allTopics.length - 1];

  const hasActiveFlag = Boolean(agentRec?.has_active_flag);

  return (
    <div
      className={`fintech-card p-5 space-y-4 transition-all duration-300 ${
        hasActiveFlag
          ? "bg-gradient-to-br from-amber-500/[0.04] via-card to-card border-amber-500/30"
          : "bg-gradient-to-br from-card to-muted/20 border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              hasActiveFlag
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/10 text-primary"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Invest IQ Academy Progress
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {hasActiveFlag ? "Targeted behavioral mastery" : "Master the markets risk-free"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
            <Flame className="h-3 w-3 text-amber-500" />
            {streakDays}d Streak
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {progressPercent}% Done
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{nextLesson.tierTitle}</span>
          <span>
            {completedCount} of {totalTopics} completed
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasActiveFlag ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Suggested / Remediated Next Lesson Card */}
      <div
        className={`p-3.5 rounded-xl border space-y-2 transition-all ${
          hasActiveFlag
            ? "bg-amber-500/[0.05] border-amber-500/30 shadow-sm"
            : "bg-card border-border/80"
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {hasActiveFlag ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
              Active Behavioral Remediation
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              Suggested Next Lesson
            </span>
          )}

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{nextLesson.duration || "5 min"}</span>
          </div>
        </div>

        <h4 className="font-semibold text-xs sm:text-sm text-foreground">
          {agentRec?.lesson_title || nextLesson.title}
        </h4>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {agentRec?.nudge_message || nextLesson.explanation}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
            <Award className="h-3.5 w-3.5" />
            <span>
              {hasActiveFlag ? "Emotional Discipline Target" : `Unlocks: ${nextLesson.tierTitle} Mastery`}
            </span>
          </div>
          <Link
            href={`/learn/tutorials?topic=${nextLesson.id}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasActiveFlag
                ? "bg-amber-500 text-black hover:bg-amber-400 font-bold shadow-sm"
                : "text-primary hover:underline"
            }`}
          >
            <span>Study Lesson ({nextLesson.duration || "5 min"})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
