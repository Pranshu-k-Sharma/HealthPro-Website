import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, Sparkles, Paperclip, FileText, Copy, Check, Trash2, RefreshCw } from "lucide-react";
import * as mammoth from "mammoth";import { API_BASE } from '../config';


// ---------- Markdown → safe HTML renderer ----------
function parseMarkdown(text) {
  if (!text) return "";

  // Escape raw HTML to prevent XSS
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Inline formatting applied AFTER escaping
  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, (_, c) => `<code class="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono">${c}</code>`)
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  const lines = text.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];

    // Fenced code block
    if (raw.startsWith("```")) {
      const lang = raw.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(esc(lines[i]));
        i++;
      }
      out.push(
        `<pre class="bg-slate-900 text-emerald-300 p-3 rounded-xl my-2 overflow-x-auto text-xs font-mono border border-slate-700 leading-relaxed"><code>${codeLines.join("\n")}</code></pre>`
      );
      i++;
      continue;
    }

    // Headings
    if (raw.startsWith("### "))
      out.push(`<h4 class="font-bold text-slate-800 mt-3 mb-1 text-sm">${inline(esc(raw.slice(4)))}</h4>`);
    else if (raw.startsWith("## "))
      out.push(`<h3 class="font-semibold text-slate-800 mt-3 mb-1 text-base">${inline(esc(raw.slice(3)))}</h3>`);
    else if (raw.startsWith("# "))
      out.push(`<h2 class="font-bold text-slate-900 mt-3 mb-1 text-base">${inline(esc(raw.slice(2)))}</h2>`);

    // Unordered list
    else if (/^[\*\-] /.test(raw))
      out.push(
        `<div class="flex items-start gap-2 my-0.5 pl-1"><span class="text-emerald-500 shrink-0 mt-0.5 font-bold">•</span><span class="flex-1">${inline(esc(raw.slice(2)))}</span></div>`
      );

    // Ordered list
    else if (/^\d+\. /.test(raw)) {
      const m = raw.match(/^(\d+)\. (.*)/);
      if (m)
        out.push(
          `<div class="flex items-start gap-2 my-0.5 pl-1"><span class="text-emerald-600 font-bold shrink-0 text-xs mt-0.5 min-w-[1.2rem]">${m[1]}.</span><span class="flex-1">${inline(esc(m[2]))}</span></div>`
        );
    }

    // Horizontal rule
    else if (/^-{3,}$/.test(raw.trim()) || /^\*{3,}$/.test(raw.trim()))
      out.push('<hr class="border-slate-200 my-2" />');

    // Blockquote
    else if (raw.startsWith("> "))
      out.push(
        `<div class="border-l-4 border-emerald-300 pl-3 py-0.5 my-1 text-slate-600 italic text-sm">${inline(esc(raw.slice(2)))}</div>`
      );

    // Empty line
    else if (raw.trim() === "")
      out.push('<div class="my-1.5"></div>');

    // Regular paragraph
    else
      out.push(`<p class="my-0.5 leading-relaxed">${inline(esc(raw))}</p>`);

    i++;
  }

  return out.join("");
}

function HealthChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [lastUserMsg, setLastUserMsg] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (!retryAfterSeconds) return;
    const id = setInterval(() => {
      setRetryAfterSeconds((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfterSeconds]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png|webp)$/i)) {
        alert("Please upload an Image, PDF, or Word document.");
        return;
      }
      setSelectedFile(file);

      if (file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview({ type: "image", url: reader.result, name: file.name });
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview({ type: "document", name: file.name });
      }
    }
    // reset input
    e.target.value = null;
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const copyMessage = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const clearConversation = () => {
    setMessages([]);
    setLastUserMsg(null);
  };

  const sendMessage = useCallback(async (text, file, filePreviewData, historyOverride) => {
    setLoading(true);
    try {
      let fileData = null;
      if (file) {
        if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.match(/\.docx$/i)) {
          const arrayBuffer = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsArrayBuffer(file);
          });
          const result = await mammoth.extractRawText({ arrayBuffer });
          fileData = { data: btoa(unescape(encodeURIComponent(result.value))), mimeType: "text/plain" };
        } else {
          const mimeType = file.type || (file.name.match(/\.pdf$/i) ? "application/pdf" : "image/jpeg");
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(file);
          });
          fileData = { data: base64Data, mimeType };
        }
      }

      const token = localStorage.getItem("token") || "";
      const currentHistory = historyOverride ?? messages;

      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history: currentHistory,
          fileData,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          setRetryAfterSeconds(Number(responseData.retryAfterSeconds) || 60);
        }
        throw new Error(responseData.message || "Failed to get a response from AI");
      }

      setRetryAfterSeconds(0);

      setMessages((prev) => [...prev, { role: "assistant", content: responseData.reply }]);
    } catch (err) {
      console.error("AI Error:", err);
      const msg = err.message || "Something went wrong";
      const isQuota = msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("429");
      const waitText = retryAfterSeconds > 0 ? `\\n\\nPlease retry in **${retryAfterSeconds}s**.` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isQuota
            ? `**Rate limit reached:** The current free AI provider is temporarily busy.${waitText}\n\nTip: Send one message at a time and avoid rapid retries.`
            : `**Error:** ${msg}\n\n_Make sure backend is running and one of OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY is valid in backend/.env._`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !selectedFile) || loading) return;

    const currentFile = selectedFile;
    const currentPreview = filePreview;
    const userMessage = {
      role: "user",
      content: text || `Please analyze this document: ${currentFile?.name}`,
      filePreview: currentPreview,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLastUserMsg({ text, file: currentFile, filePreview: currentPreview });
    setInput("");
    setSelectedFile(null);
    setFilePreview(null);

    await sendMessage(text, currentFile, currentPreview, updatedMessages.slice(0, -1));
  };

  const handleRetry = async () => {
    if (!lastUserMsg || loading) return;
    // Remove last assistant message (which was the error) and retry
    setMessages((prev) => {
      const trimmed = prev.filter((_, i) => !(i === prev.length - 1 && prev[i].role === "assistant"));
      return trimmed;
    });
    await sendMessage(lastUserMsg.text, lastUserMsg.file, lastUserMsg.filePreview);
  };

  const suggestedQuestions = [
    "What are the benefits of staying hydrated?",
    "Explain my prescription to me",
    "What do these lab report values mean?",
    "Tips for managing stress",
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-button transition-all duration-300 hover:scale-110 hover:shadow-button-hover focus:outline-none focus:ring-4 focus:ring-emerald-500/25`}
        aria-label="Open AI health assistant"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed z-50 flex flex-col bg-slate-50 shadow-2xl transition-all duration-300 ease-out border-brand-border ${isOpen
          ? "inset-4 sm:inset-auto sm:bottom-[90px] sm:right-6 sm:h-[600px] sm:w-[420px] sm:max-h-[85vh] sm:rounded-3xl border"
          : "inset-4 sm:inset-auto sm:bottom-[90px] sm:right-6 sm:h-0 sm:w-[420px] sm:max-h-0 sm:overflow-hidden sm:rounded-3xl opacity-0 pointer-events-none"
          }`}
        style={{
          boxShadow: isOpen ? "0 25px 50px -12px rgba(16, 185, 129, 0.25)" : "none",
        }}
      >
        {/* Header */}
        <div className="flex z-10 items-center justify-between bg-brand-gradient px-4 py-4 sm:px-5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-1">
                Health AI
                <Sparkles size={14} className="text-yellow-300" />
              </h3>
              <p className="text-xs text-emerald-100">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                title="Clear conversation"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-white/90 transition hover:bg-white/20 hover:text-white"
              title="Close Assistant"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-slate-50/80 p-4 sm:p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-sm border border-emerald-50 text-emerald-600">
                <Sparkles size={28} />
              </div>
              <p className="mb-2 font-bold text-slate-800 text-lg">
                I'm your AI Medical Assistant
              </p>
              <p className="mb-6 max-w-[280px] text-sm text-slate-500">
                Ask any health question, or click the paperclip icon to upload a prescription/report and I'll explain it simply!
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-brand-green hover:bg-[#E6F9F4] hover:text-emerald-800"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user"
                      ? "bg-brand-blue text-white rounded-br-sm shadow-md"
                      : "bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-sm"
                      }`}
                  >
                    {m.role === "assistant" && (
                      <div className="mb-2 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <Bot size={14} className="text-brand-green" />
                        <span className="text-xs font-bold text-brand-green uppercase tracking-wide">Health AI</span>
                      </div>
                    )}

                    {/* Render Document/Image if user uploaded one */}
                    {m.filePreview && m.filePreview.type === "image" && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                        <img src={m.filePreview.url} alt="Uploaded" className="max-w-full h-auto max-h-48 object-cover" />
                      </div>
                    )}
                    {m.filePreview && m.filePreview.type === "document" && (
                      <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-blue-500/20 text-blue-50">
                        <FileText size={18} />
                        <span className="text-sm font-medium truncate">{m.filePreview.name}</span>
                      </div>
                    )}

                    {/* Render Text with full markdown support */}
                    {m.content && (
                      <div
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(m.content) }}
                      />
                    )}

                    {/* Copy + Retry buttons for assistant messages */}
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => copyMessage(m.content, i)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition px-1.5 py-0.5 rounded-lg hover:bg-slate-100"
                          title="Copy response"
                        >
                          {copiedIndex === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedIndex === i ? "Copied!" : "Copy"}</span>
                        </button>
                        {m.isError && (
                          <button
                            onClick={handleRetry}
                            disabled={loading}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 transition px-1.5 py-0.5 rounded-lg hover:bg-emerald-50 ml-1 disabled:opacity-50"
                            title="Retry"
                          >
                            <RefreshCw size={12} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-green" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-slate-400">Health AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 shrink-0">
          {/* File Preview before sending */}
          {filePreview && (
            <div className="px-4 pt-3 pb-1">
              <div className="relative inline-flex items-center gap-2 border border-slate-200 rounded-lg p-2 bg-slate-50 pr-8">
                {filePreview.type === "image" ? (
                  <img src={filePreview.url} alt="Preview" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex items-center gap-2 text-brand-blue">
                    <FileText size={20} />
                    <span className="text-sm font-semibold truncate max-w-[120px]">{filePreview.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 z-10"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 p-3 sm:p-4"
          >
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition"
              title="Upload prescription, PDF, or Word document"
            >
              <Paperclip size={22} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={filePreview ? "Ask about this file..." : "Ask a health question..."}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !filePreview)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-button transition hover:bg-brand-gradient-hover hover:shadow-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default HealthChatbot;
