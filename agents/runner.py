"""
agents/runner.py - Invest IQ Shared Agent Execution Runner

Provides a shared execution pattern for all agent types:
- Single-step and bounded multi-step tool-calling loops (bounded at max 4 steps)
- Reuses the existing Groq LLM setup from explainer.py
- Converts Python callable functions into OpenAI/Groq function-calling schemas
- Full execution audit trace capturing all intermediate tool calls and responses
- Deterministic fallback when GROQ_API_KEY is not configured
"""

import os
import json
import inspect
import logging
from typing import Dict, List, Any, Optional, Callable

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger("investiq.agents.runner")

DEFAULT_MODEL = "llama-3.1-8b-instant"


def _build_function_schema(fn: Callable) -> Dict[str, Any]:
    """Inspect Python callable to generate OpenAI/Groq compatible JSON schema."""
    sig = inspect.signature(fn)
    doc = inspect.getdoc(fn) or f"Execute {fn.__name__}"

    properties: Dict[str, Any] = {}
    required: List[str] = []

    type_mapping = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
    }

    for param_name, param in sig.parameters.items():
        if param_name in ("self", "cls", "user_id", "userId"):
            continue

        param_type = "string"
        if param.annotation != inspect.Parameter.empty:
            # Handle typing constructs or native types
            ann = param.annotation
            ann_origin = getattr(ann, "__origin__", ann)
            if ann_origin in type_mapping:
                param_type = type_mapping[ann_origin]
            elif hasattr(ann, "__args__"):
                # Handle Optional[T]
                args = [a for a in ann.__args__ if a is not type(None)]
                if args and args[0] in type_mapping:
                    param_type = type_mapping[args[0]]

        prop_def: Dict[str, Any] = {"type": param_type, "description": f"Parameter {param_name}"}
        if param_type == "array":
            prop_def["items"] = {"type": "string"}

        properties[param_name] = prop_def

        if param.default == inspect.Parameter.empty:
            required.append(param_name)

    return {
        "type": "function",
        "function": {
            "name": fn.__name__,
            "description": doc.split("\n\n")[0],
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


def _get_groq_client():
    """Retrieve initialized Groq client if GROQ_API_KEY is set."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key or not groq_key.strip():
        return None
    try:
        from groq import Groq
        return Groq(api_key=groq_key.strip())
    except Exception as e:
        logger.warning("Could not initialize Groq client: %s", e)
        return None


def run_agent(
    goal: str,
    allowed_tools: Optional[List[Callable]] = None,
    context: Optional[Dict[str, Any]] = None,
    system_prompt: Optional[str] = None,
    max_steps: int = 4,
    enforce_json: bool = False,
) -> Dict[str, Any]:
    """
    Execute an agent goal using a bounded tool-calling loop (max 4 steps).
    Returns structured results including response content, structured payload,
    and the full tool-call execution trace.
    """
    allowed_tools = allowed_tools or []
    tool_map = {fn.__name__: fn for fn in allowed_tools}
    tool_schemas = [_build_function_schema(fn) for fn in allowed_tools] if allowed_tools else []

    client = _get_groq_client()
    tool_trace: List[Dict[str, Any]] = []

    # 1. Fallback execution if Groq client is not configured
    if not client:
        return _run_deterministic_agent(
            goal=goal,
            allowed_tools=allowed_tools,
            context=context,
            enforce_json=enforce_json,
        )

    # 2. Prepare conversation messages
    default_system = (
        "You are an expert, disciplined financial educator and technical market analyst for Invest IQ. "
        "Your role is strictly educational. You NEVER give financial advice, and you NEVER advise "
        "buying or selling any real security. Use objective, probabilistic language grounded strictly in computed metrics. "
        "Always adhere to risk discipline and highlight realistic market caveats."
    )
    sys_msg = system_prompt or default_system

    messages: List[Dict[str, Any]] = [{"role": "system", "content": sys_msg}]

    if context:
        messages.append({
            "role": "user",
            "content": f"Context:\n{json.dumps(context, default=str)}\n\nTask:\n{goal}",
        })
    else:
        messages.append({"role": "user", "content": goal})

    step_count = 0
    final_content = ""

    while step_count < max_steps:
        step_count += 1
        call_kwargs: Dict[str, Any] = {
            "model": DEFAULT_MODEL,
            "messages": messages,
            "temperature": 0.2,
        }
        if tool_schemas:
            call_kwargs["tools"] = tool_schemas
            call_kwargs["tool_choice"] = "auto"
        if enforce_json and not tool_schemas:
            call_kwargs["response_format"] = {"type": "json_object"}

        try:
            completion = client.chat.completions.create(**call_kwargs)
        except Exception as e:
            logger.warning("Groq tool completion failed: %s. Falling back to deterministic reasoning.", e)
            return _run_deterministic_agent(
                goal=goal,
                allowed_tools=allowed_tools,
                context=context,
                enforce_json=enforce_json,
                trace_so_far=tool_trace,
            )

        msg = completion.choices[0].message
        final_content = msg.content or ""

        # If LLM requested tool execution
        if msg.tool_calls:
            # Append assistant message with tool calls
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            })

            # Execute each requested tool
            for tc in msg.tool_calls:
                fn_name = tc.function.name
                raw_args = tc.function.arguments
                try:
                    args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except Exception:
                    args = {}

                if not isinstance(args, dict):
                    args = {}

                # CRITICAL SECURITY GUARDRAIL: USER_ID IS NEVER LLM-CONTROLLABLE
                # 1. Strip any client/model-supplied user_id or userId parameter
                auth_user_id = context.get("user_id") if context else None
                args.pop("user_id", None)
                args.pop("userId", None)

                if fn_name in tool_map:
                    try:
                        tool_fn = tool_map[fn_name]
                        fn_params = inspect.signature(tool_fn).parameters

                        # 2. Forcibly inject the session-derived authenticated user_id if the callable expects it
                        if "user_id" in fn_params and auth_user_id:
                            args["user_id"] = str(auth_user_id)
                        elif "userId" in fn_params and auth_user_id:
                            args["userId"] = str(auth_user_id)

                        tool_result = tool_fn(**args)
                    except Exception as err:
                        logger.error("Tool '%s' raised exception: %s", fn_name, err)
                        tool_result = {"error": f"Tool execution failed: {str(err)}"}
                else:
                    tool_result = {"error": f"Tool '{fn_name}' is not in allowed tools."}

                # Record tool trace
                tool_trace.append({
                    "step": step_count,
                    "tool": fn_name,
                    "arguments": args,
                    "result": tool_result,
                })

                # Append tool response
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(tool_result, default=str),
                })
        else:
            # No tool call needed, agent reached final answer
            break

    # Parse structured JSON if present or requested
    structured = None
    if enforce_json or final_content.strip().startswith("{"):
        try:
            structured = json.loads(final_content)
        except Exception:
            structured = None

    return {
        "success": True,
        "content": final_content,
        "structured": structured,
        "tool_trace": tool_trace,
        "steps_taken": step_count,
        "provider": "Groq Llama-3.1",
    }


def _run_deterministic_agent(
    goal: str,
    allowed_tools: List[Callable],
    context: Optional[Dict[str, Any]] = None,
    enforce_json: bool = False,
    trace_so_far: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Deterministic rule-based agent execution when operating offline or without GROQ_API_KEY.
    Dynamically resolves and executes tools from allowed_tools matching the user's inquiry,
    then synthesizes a grounded, educational technical response.
    """
    import re
    trace: List[Dict[str, Any]] = list(trace_so_far or [])
    ctx = context or {}
    tool_map = {fn.__name__: fn for fn in allowed_tools}
    goal_lower = goal.lower()

    # 1. Resolve User ID
    user_id = str(ctx.get("user_id") or "usr_demo").strip()

    # 2. Extract Symbol (from context, or regex from goal)
    symbol = ctx.get("symbol")
    if not symbol:
        sym_match = re.search(r"\b([A-Z0-9_\-]{2,15}\.NS)\b", goal, re.IGNORECASE)
        if sym_match:
            symbol = sym_match.group(1).upper()
        else:
            # Common symbols without .NS
            common_candidates = [
                "RELIANCE", "TCS", "HDFCBANK", "TATAMOTORS", "INFY", "SBIN",
                "IRFC", "REC", "TATACHEM", "ITC", "WIPRO", "ICICIBANK", "LT",
            ]
            for cand in common_candidates:
                if re.search(rf"\b{cand}\b", goal, re.IGNORECASE):
                    symbol = f"{cand}.NS"
                    break

    # 3. Dynamic Tool Resolution (bounded at max 4 steps)
    executed_tools: Dict[str, Any] = {}

    # Tool A: Watchlist
    if len(trace) < 4 and "get_user_watchlist" in tool_map and ("watchlist" in goal_lower or "watched" in goal_lower):
        try:
            fn = tool_map["get_user_watchlist"]
            call_kwargs = {"user_id": user_id} if "user_id" in inspect.signature(fn).parameters else {}
            res = fn(**call_kwargs)
            trace.append({"step": len(trace) + 1, "tool": "get_user_watchlist", "arguments": {"user_id": user_id}, "result": res})
            executed_tools["watchlist"] = res
        except Exception as e:
            logger.debug("Tool get_user_watchlist error: %s", e)

    # Tool B: Trade Pattern
    if len(trace) < 4 and "get_recent_trade_pattern" in tool_map and any(k in goal_lower for k in ["pattern", "streak", "velocity", "sizing", "concentration", "behavior", "habit"]):
        try:
            fn = tool_map["get_recent_trade_pattern"]
            sig_params = inspect.signature(fn).parameters
            call_kwargs = {}
            if "window" in sig_params:
                call_kwargs["window"] = "24h"
            if "user_id" in sig_params:
                call_kwargs["user_id"] = user_id
            res = fn(**call_kwargs)
            trace.append({"step": len(trace) + 1, "tool": "get_recent_trade_pattern", "arguments": {"user_id": user_id, "window": "24h"}, "result": res})
            executed_tools["pattern"] = res
        except Exception as e:
            logger.debug("Tool get_recent_trade_pattern error: %s", e)

    # Tool C: Trade History
    if len(trace) < 4 and "get_trade_history" in tool_map and ("trade" in goal_lower or "order" in goal_lower or "history" in goal_lower) and "pattern" not in executed_tools:
        try:
            fn = tool_map["get_trade_history"]
            call_kwargs = {"user_id": user_id} if "user_id" in inspect.signature(fn).parameters else {}
            res = fn(**call_kwargs)
            trace.append({"step": len(trace) + 1, "tool": "get_trade_history", "arguments": {"user_id": user_id}, "result": res})
            executed_tools["trades"] = res
        except Exception as e:
            logger.debug("Tool get_trade_history error: %s", e)

    # Tool D: Win Rate
    if len(trace) < 4 and "get_win_rate" in tool_map:
        matched_signal = None
        for sig_name in [
            "OVERSOLD_BOUNCE", "OVERBOUGHT_EXHAUSTION", "BULLISH_MACD_CROSSOVER",
            "BEARISH_MACD_CROSSOVER", "VOLATILITY_SQUEEZE", "VOLUME_BREAKOUT",
        ]:
            if sig_name.lower().replace("_", " ") in goal_lower or sig_name.lower() in goal_lower:
                matched_signal = sig_name
                break
        if not matched_signal and any(k in goal_lower for k in ["win rate", "winrate", "backtest", "probability", "odds"]):
            if "oversold" in goal_lower:
                matched_signal = "OVERSOLD_BOUNCE"
            elif "overbought" in goal_lower:
                matched_signal = "OVERBOUGHT_EXHAUSTION"
            elif "macd" in goal_lower:
                matched_signal = "BULLISH_MACD_CROSSOVER"
            elif "squeeze" in goal_lower:
                matched_signal = "VOLATILITY_SQUEEZE"
            elif "breakout" in goal_lower:
                matched_signal = "VOLUME_BREAKOUT"
            else:
                matched_signal = "OVERSOLD_BOUNCE"

        if matched_signal:
            try:
                res = tool_map["get_win_rate"](signal_type=matched_signal)
                trace.append({"step": len(trace) + 1, "tool": "get_win_rate", "arguments": {"signal_type": matched_signal}, "result": res})
                executed_tools["win_rate"] = res
            except Exception as e:
                logger.debug("Tool get_win_rate error: %s", e)

    # Tool E: Technical Indicators
    if len(trace) < 4 and "get_indicators" in tool_map and symbol and any(k in goal_lower for k in ["indicator", "rsi", "macd", "bollinger", "price", "metric", "level"]):
        try:
            res = tool_map["get_indicators"](symbol=symbol)
            trace.append({"step": len(trace) + 1, "tool": "get_indicators", "arguments": {"symbol": symbol}, "result": res})
            executed_tools["indicators"] = res
        except Exception as e:
            logger.debug("Tool get_indicators error: %s", e)

    # Tool F: Technical Signals
    if len(trace) < 4 and "get_signals" in tool_map and symbol and ("signal" in goal_lower or "setup" in goal_lower or "breakout" in goal_lower or "indicators" not in executed_tools):
        try:
            res = tool_map["get_signals"](symbol=symbol)
            trace.append({"step": len(trace) + 1, "tool": "get_signals", "arguments": {"symbol": symbol}, "result": res})
            executed_tools["signals"] = res
        except Exception as e:
            logger.debug("Tool get_signals error: %s", e)

    # 4. Grounded Response Synthesis
    sections: List[str] = []

    if "watchlist" in executed_tools:
        wl = executed_tools["watchlist"]
        sections.append(f"Your active simulated watchlist currently contains {len(wl)} ticker(s): {', '.join(wl)}.")

    if "indicators" in executed_tools:
        ind = executed_tools["indicators"]
        snap = ind.get("snapshot", {})
        rsi_entry = snap.get("rsi")
        rsi_val = rsi_entry.get("value") if isinstance(rsi_entry, dict) else rsi_entry
        close = ind.get("price") or snap.get("close")
        rsi_str = f" with a 14-day RSI of {rsi_val:.1f}" if isinstance(rsi_val, (int, float)) else ""
        close_str = f"₹{close:,.2f}" if isinstance(close, (int, float)) else str(close)
        sections.append(
            f"Technical indicators for {ind.get('symbol')}: Current price is {close_str}{rsi_str}."
        )

    if "signals" in executed_tools:
        sig = executed_tools["signals"]
        active_sigs = sig.get("signals", [])
        if active_sigs:
            sig_descs = [f"{s.get('title', s.get('type'))} ({s.get('intensity', 'Standard')} intensity)" for s in active_sigs]
            sections.append(f"Active technical setups detected for {sig.get('symbol')}: {', '.join(sig_descs)}.")
        else:
            sections.append(f"No active breakout or reversal setups currently triggered for {sig.get('symbol')}.")

    if "win_rate" in executed_tools:
        wr = executed_tools["win_rate"]
        sig_name = wr.get("signal_type")
        win_pct = wr.get("win_rate_pct", 50.0)
        samples = wr.get("sample_size", 0)
        summary = wr.get("summary_text", "")
        sections.append(
            f"Empirical backtest analysis for '{sig_name}': Over {samples} historical benchmark occurrences, "
            f"this setup demonstrated a {win_pct:.1f}% 10-day forward win rate. {summary}"
        )

    if "pattern" in executed_tools:
        pat = executed_tools["pattern"]
        tc = pat.get("trade_count", 0)
        avg_sz = pat.get("average_position_size", 0.0)
        conc = pat.get("sector_concentration_pct", {})
        conc_str = ", ".join(f"{k}: {v}%" for k, v in conc.items()) if conc else "None"
        sections.append(
            f"Recent trading velocity (last 24h): {tc} trades executed with an average position size of ₹{avg_sz:,.2f}. "
            f"Sector concentration: {conc_str}."
        )

    if "trades" in executed_tools:
        tr = executed_tools["trades"]
        sections.append(f"Trade history contains {len(tr)} recorded execution(s).")

    if not sections:
        sections.append(f"Research analysis completed for inquiry: '{goal}'. Grounded technical queries were evaluated.")

    # Educational disclaimer requirement
    disclaimer = (
        "SIMULATION ONLY — Educational Context, Not Investment Advice. All technical indicators "
        "and historical win rates represent past probabilistic patterns and are strictly for educational practice. "
        "Invest IQ is not a SEBI-registered investment advisor, and this is not an invitation to execute real financial trades."
    )

    final_content = " ".join(sections) + " " + disclaimer

    structured_data = {
        "summary": final_content,
        "context": ctx,
        "tools_evaluated": [t["tool"] for t in trace],
        "executed_tools": list(executed_tools.keys()),
    }

    return {
        "success": True,
        "content": final_content,
        "structured": structured_data,
        "tool_trace": trace,
        "steps_taken": max(1, len(trace)),
        "provider": "Invest IQ Deterministic Engine",
    }
