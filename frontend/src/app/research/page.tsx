"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Terminal,
  Clock,
  Info,
} from "lucide-react";
import { useSimulator } from "@/lib/store";

interface ToolTraceItem {
  step: number;
  tool: string;
  arguments: Record<string, any>;
  result: any;
}

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  toolTrace?: ToolTraceItem[];
  latencyMs?: number;
  provider?: string;
}

const QUICK_PROMPTS = [
  "What stocks are in my watchlist?",
  "Analyze technical indicators and signals for RELIANCE.NS",
  "What is the historical win rate for OVERSOLD_BOUNCE?",
  "Review my recent trading pattern and velocity",
];

export default function ResearchAgentPage() {
  const { user } = useSimulator();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "agent",
      text:
        "Hello! I am the Invest IQ Research Agent. I have full read-only access to our quantitative engine, including technical indicators (RSI, MACD, Bollinger Bands), market signal screeners, empirical backtest win rates, your simulated watchlist, and your trading patterns. Ask me any technical market question to get started.",
      timestamp: "Just now",
      provider: "Invest IQ Engine",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/agents/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const data = await res.json();
      const agentMsgId = `msg-agent-${Date.now()}`;

      if (res.ok && data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: agentMsgId,
            sender: "agent",
            text: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            toolTrace: data.tool_trace || [],
            latencyMs: data.latency_ms,
            provider: data.provider,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: agentMsgId,
            sender: "agent",
            text: `Error: ${data.message || "Failed to process research inquiry. Please try again."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "agent",
          text: `Connection error: ${err?.message || "Failed to reach Research Agent service."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTrace = (msgId: string) => {
    setExpandedTraceId((prev) => (prev === msgId ? null : msgId));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Market Research Agent
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-3 w-3" />
              Read-Only
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Bounded multi-step agent equipped with live indicator calculators, pattern detection, and backtested statistics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border border-border">
          <Info className="h-3.5 w-3.5 text-primary" />
          <span>Interactive session: <strong>{user?.name || "Demo Trader"}</strong></span>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-muted-foreground flex items-center gap-1 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick asks:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-foreground text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 rounded-lg border border-border bg-muted/10 p-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                  isUser
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-card border border-border text-foreground shadow-xs"
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Metadata & Tool Execution Trace for Agent Responses */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-border text-[11px] text-muted-foreground flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {msg.latencyMs !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {msg.latencyMs}ms
                          </span>
                        )}
                        {msg.provider && <span>Provider: {msg.provider}</span>}
                      </div>

                      {msg.toolTrace && msg.toolTrace.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleTrace(msg.id)}
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                        >
                          <Terminal className="h-3 w-3" />
                          <span>
                            {expandedTraceId === msg.id ? "Hide" : "View"} Execution Trace ({msg.toolTrace.length} tools)
                          </span>
                          {expandedTraceId === msg.id ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expandable Trace Drawer */}
                    {expandedTraceId === msg.id && msg.toolTrace && (
                      <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2.5 border border-border font-mono text-[11px]">
                        <div className="font-semibold text-foreground flex items-center gap-1">
                          <Terminal className="h-3.5 w-3.5 text-primary" /> Bounded Tool Execution Trace:
                        </div>
                        {msg.toolTrace.map((item, idx) => (
                          <div key={idx} className="border-l-2 border-primary/50 pl-2 space-y-0.5">
                            <div className="text-primary font-bold">
                              Step {item.step}: {item.tool}()
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              Args: {JSON.stringify(item.arguments)}
                            </div>
                            <div className="text-muted-foreground text-[10px] truncate max-w-full">
                              Result: {JSON.stringify(item.result).substring(0, 140)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center text-muted-foreground text-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-lg">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>Analyzing technical indicators & querying market engine...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask about technical setups, indicators, win rates, or your trade patterns..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4 w-4" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
