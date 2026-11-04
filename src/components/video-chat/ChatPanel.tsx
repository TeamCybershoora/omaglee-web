import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Send, MessageSquare, X, Smile, CheckCheck } from 'lucide-react';
import { VideoChatState } from '../../services/state/frontendStateMachine';

export interface ChatMessage {
  id: string;
  sender: 'local' | 'stranger' | 'system';
  text: string;
  timestamp: number;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  callState: VideoChatState | string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const QUICK_EMOJIS = ['👋', '😊', '🔥', '😂', '👍', '❤️', '🇮🇳', '✨'];

export default function ChatPanel({
  messages,
  onSendMessage,
  callState,
  isMobileOpen = false,
  onCloseMobile,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConnected = callState === 'CONNECTED' || callState === 'connected';

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on active chat connection
  useEffect(() => {
    if (isConnected) {
      inputRef.current?.focus();
    }
  }, [isConnected]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !isConnected) return;

    onSendMessage(trimmed);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside
      className={`cyber-chat-panel ${isMobileOpen ? 'mobile-open' : ''}`}
      aria-label="Omaglee Text Chat Room"
    >
      {/* Chat Header */}
      <div className="chat-panel-header">
        <div className="header-title-wrap">
          <MessageSquare size={18} className="chat-header-icon" />
          <h2 className="chat-header-text">Chat</h2>
        </div>

        <div className="header-status-wrap">
          <span className={`chat-conn-pill ${isConnected ? 'connected' : 'waiting'}`}>
            <span className={`status-dot ${isConnected ? 'green-dot' : 'amber-dot'}`} />
            <span className="status-label">{isConnected ? 'Connected' : 'Waiting...'}</span>
          </span>

          {onCloseMobile && (
            <button
              type="button"
              className="chat-mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Close Chat"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed Area */}
      <div
        className="chat-feed-scroll"
        role="log"
        aria-live="polite"
        aria-label="Chat messages history"
      >
        {messages.length === 0 ? (
          <div className="chat-empty-wrapper">
            <div className="empty-bubble-icon">💬</div>
            <p className="empty-main-text">No messages yet</p>
            <p className="empty-sub-text">
              {isConnected ? 'Say hello to your match!' : 'Connect with a stranger to start chatting.'}
            </p>
          </div>
        ) : (
          <div className="chat-bubbles-stack">
            {messages.map(msg => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="system-pill-bubble">
                    <span>{msg.text}</span>
                  </div>
                );
              }

              const isLocal = msg.sender === 'local';

              return (
                <div
                  key={msg.id}
                  className={`message-row ${isLocal ? 'message-row-you' : 'message-row-stranger'}`}
                >
                  <div className={`message-bubble ${isLocal ? 'bubble-you' : 'bubble-stranger'}`}>
                    <p className="message-text">{msg.text}</p>
                    <div className="message-meta">
                      <span className="timestamp">{formatTime(msg.timestamp)}</span>
                      {isLocal && <CheckCheck size={13} className="read-receipt" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Emoji Bar (Toggled or inline) */}
      {showEmojiPicker && (
        <div className="quick-emoji-bar">
          {QUICK_EMOJIS.map(em => (
            <button
              key={em}
              type="button"
              onClick={() => addEmoji(em)}
              className="quick-emoji-btn"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Footer */}
      <form onSubmit={handleSubmit} className="chat-composer-footer">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(prev => !prev)}
          className={`composer-emoji-btn ${showEmojiPicker ? 'active' : ''}`}
          title="Insert Emoji"
          aria-label="Emoji Picker"
        >
          <Smile size={19} />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? 'Type a message...' : 'Connect to send messages...'}
          disabled={!isConnected}
          className="composer-input"
          maxLength={500}
        />

        <button
          type="submit"
          disabled={!isConnected || !inputText.trim()}
          className="composer-send-btn"
          title="Send Message"
          aria-label="Send Message"
        >
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
}
