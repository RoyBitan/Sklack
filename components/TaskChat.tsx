import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { TaskMessage, UserRole } from "../types";
import { supabase } from "../lib/supabase";
import { Lock, MessageCircle, Send, Sparkles, User } from "lucide-react";
import { playClickSound } from "../utils/uiUtils";
import { useSubscription } from "../hooks/useSubscription";

interface TaskChatProps {
  taskId: string;
  isInternalOnly?: boolean;
}

const TaskChat: React.FC<TaskChatProps> = ({ taskId, isInternalOnly }) => {
  const { profile } = useAuth();
  const { sendMessage, getTaskMessages } = useData();
  const { canUseChat } = useSubscription();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`task_messages:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_messages",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, full_name, role, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          const msgWithSender = { ...payload.new, sender } as TaskMessage;
          setMessages((prev) => [...prev, msgWithSender]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const data = await getTaskMessages(taskId);
    setMessages(data);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !canUseChat) return;

    const content = newMessage.trim();
    setNewMessage("");
    playClickSound();
    await sendMessage(taskId, content, isInternalOnly);
  };

  if (!canUseChat && profile?.role !== UserRole.CUSTOMER) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <Lock className="mx-auto text-gray-400 mb-4" size={32} />
        <p className="text-gray-500 font-black text-sm uppercase tracking-widest">
          Chat is a Premium Feature
        </p>
        <button className="mt-4 bg-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
          Upgrade Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-inner">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Live Garage Chat
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {loading
          ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          )
          : messages.length === 0
          ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <MessageCircle size={48} className="mb-2 opacity-20" />
              <p className="text-xs font-bold">No messages yet. Say hello!</p>
            </div>
          )
          : (
            messages
              .filter((m) =>
                !m.is_internal || profile?.role !== UserRole.CUSTOMER
              )
              .map((msg) => {
                const isMe = msg.sender_id === profile?.id;
                const isGarageStaff = msg.sender?.role !== UserRole.CUSTOMER;
                const displayName =
                  profile?.role === UserRole.CUSTOMER && isGarageStaff
                    ? "צוות המוסף"
                    : msg.sender?.full_name || "משתמש";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${
                        isMe
                          ? "bg-black text-white rounded-tr-none"
                          : "bg-gray-100 text-gray-800 rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      {!isMe && (
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          {displayName}
                        </span>
                      )}
                      <span className="text-[8px] font-bold text-gray-300 uppercase">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-black transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !canUseChat}
          className="bg-black text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default TaskChat;
