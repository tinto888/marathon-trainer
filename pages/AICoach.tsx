import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Trash2, Bot, User } from "lucide-react";
import { Streamdown } from "streamdown";

const QUICK_QUESTIONS = [
  "오늘 훈련 후 회복을 위해 무엇을 해야 하나요?",
  "마라톤 레이스 페이스 전략을 알려주세요",
  "무릎 통증이 있는데 계속 달려도 될까요?",
  "장거리 훈련 전 영양 섭취는 어떻게 해야 하나요?",
  "인터벌 훈련의 장점과 방법을 알려주세요",
  "대회 2주 전 테이퍼링 방법을 알려주세요",
];

export default function AICoach() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading } = trpc.coach.history.useQuery();
  const chat = trpc.coach.chat.useMutation({
    onSuccess: () => {
      utils.coach.history.invalidate();
      setInput("");
    },
    onError: (e) => toast.error(`오류: ${e.message}`),
  });
  const clearHistory = trpc.coach.clearHistory.useMutation({
    onSuccess: () => {
      utils.coach.history.invalidate();
      toast.success("대화 기록이 초기화되었습니다.");
    },
  });

  const [input, setInput] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, chat.isPending]);

  const handleSend = () => {
    if (!input.trim()) return;
    chat.mutate({ message: input.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const me = user as { avatarEmoji?: string; avatarColor?: string; avatarImageUrl?: string } | null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <div className="mono-label mb-1">AI COACH CHAT</div>
          <h1 className="text-3xl font-black">AI 코치 채팅</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => clearHistory.mutate()}
          disabled={clearHistory.isPending || !history?.length}>
          <Trash2 className="w-4 h-4 mr-2" />대화 초기화
        </Button>
      </div>

      {/* Chat area */}
      <div className="blueprint-card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : !history || history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="font-bold text-lg mb-2">AI 코치와 대화를 시작하세요</h3>
              <p className="text-muted-foreground text-sm text-center mb-6 max-w-sm">
                훈련 고민, 부상 예방, 페이스 전략, 영양 관리 등 무엇이든 물어보세요.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {QUICK_QUESTIONS.slice(0, 4).map((q) => (
                  <button key={q}
                    onClick={() => { setInput(q); }}
                    className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-sm text-left transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {history.map((msg) => (
                <div key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-primary/10 border border-primary/30" : ""}`}
                    style={msg.role === "user" ? {
                      backgroundColor: (me?.avatarColor || "#06b6d4") + "22",
                      border: `2px solid ${me?.avatarColor || "#06b6d4"}`,
                    } : {}}>
                    {msg.role === "assistant" ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : me?.avatarImageUrl ? (
                      <img src={me.avatarImageUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-sm">{me?.avatarEmoji || "🏃"}</span>
                    )}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-muted/50 rounded-tl-sm"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {chat.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 border border-primary/30 shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick questions (when has history) */}
        {history && history.length > 0 && (
          <div className="px-4 py-2 border-t border-border/50 flex gap-2 overflow-x-auto shrink-0">
            {QUICK_QUESTIONS.slice(0, 3).map((q) => (
              <button key={q}
                onClick={() => setInput(q)}
                className="px-3 py-1.5 rounded-full border border-border hover:border-primary/50 text-xs whitespace-nowrap transition-all shrink-0">
                {q.length > 20 ? q.slice(0, 20) + "..." : q}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="AI 코치에게 질문하세요... (Enter로 전송)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chat.isPending}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={chat.isPending || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 mono-label">
            AI 코치는 훈련 조언을 제공하지만, 부상 시 전문 의료진 상담을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
