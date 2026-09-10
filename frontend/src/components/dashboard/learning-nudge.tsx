"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, Award, Flame, Clock } from "lucide-react";
import { CURRICULUM_TIERS, LessonTopic } from "@/lib/curriculum-data";

export function LearningNudge() {
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState<number>(1);

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
  }, []);

  const allTopics: LessonTopic[] = React.useMemo(() => {
    return CURRICULUM_TIERS.flatMap((t) => t.topics);
  }, []);

  const totalTopics = allTopics.length;
  const completedCount = completedTopics.length;
  const progressPercent = Math.round((completedCount / totalTopics) * 100);

  // Determine the next suggested lesson
  const nextLesson =
    allTopics.find((t) => !completedTopics.includes(t.id)) || allTopics[allTopics.length - 1];

  return (
    <div className="fintech-card p-5 space-y-4 bg-gradient-to-br from-card to-muted/20 border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Invest IQ Academy Progress
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Master the markets risk-free
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
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Suggested Next Lesson Card */}
      <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Suggested Next Lesson
          </span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{nextLesson.duration}</span>
          </div>
        </div>

        <h4 className="font-semibold text-xs sm:text-sm text-foreground">
          {nextLesson.title}
        </h4>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {nextLesson.explanation}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
            <Award className="h-3.5 w-3.5" />
            <span>Unlocks: {nextLesson.tierTitle} Mastery</span>
          </div>
          <Link
            href="/learn/tutorials"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Continue Lesson</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
