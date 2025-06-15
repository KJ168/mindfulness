import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MessageSquare, Plus, Send, Smile, Trash2, User, XCircle } from 'lucide-react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import ReactMarkdown from 'react-markdown';
import { sendToMindfulness } from '../api/chatbot';

const CHAT_SESSIONS_KEY = 'mindfulnessChatSessions';
const MAX_RESPONSE_LENGTH = 5000;
const BANNED_WORDS = new Set([
  'kafir', 'bom', 'gay', 'lesbi', 'trans', 'transgender', 'homo', 'dick', 'iblis', 'lonte', 'pokkai',
  'agama', 'islam', 'kristen', 'buddha', 'hindu', 'konghucu', 'yahudi', 'genoshida', 'genosida', 'perang'
]);

class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Chat Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Oops! Terjadi kesalahan</h2>
            <p className="text-gray-600 mb-4">Silakan refresh halaman atau coba lagi nanti.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ChatbotPage = () => {
  const [message, setMessage] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const chatEndRef = useRef(null);
  const emojiPickerButtonRef = useRef(null);
  const emojiPickerPopupRef = useRef(null);
  const navigate = useNavigate();

  const generateUniqueId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const handleNewChat = useCallback(() => {
    const newSessionId = generateUniqueId('session');
    const initialBotMessage = {
      id: generateUniqueId('bot'),
      text: "Halo! Saya Mindfulness, asisten AI kamu untuk mendengarkan dan membantu dalam hal kesehatan mental. Ceritakan perasaanmu atau masalahmu, aku akan berusaha membantumu.",
      sender: "bot",
      timestamp: new Date(),
      followUps: [],
      follow_up_answers: [],
      recommended_responses_to_follow_up_answers: []
    };
    const newSession = {
      id: newSessionId,
      name: `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      messages: [initialBotMessage],
      lastUpdated: new Date()
    };
    setChatSessions([newSession]);
    setActiveSessionId(newSessionId);
    setMessage('');
    setShowEmojiPicker(false);
  }, []);

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleDeleteSession = (sessionIdToDelete, event) => {
    event.stopPropagation();
    const remaining = chatSessions.filter(s => s.id !== sessionIdToDelete);
    setChatSessions(remaining);
    if (activeSessionId === sessionIdToDelete) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatSessions(parsed);
        setActiveSessionId(parsed[0]?.id || null);
      } catch {
        handleNewChat();
      }
    } else {
      handleNewChat();
    }
    setIsInitialized(true);
  }, [handleNewChat]);

  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatSessions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        emojiPickerPopupRef.current &&
        !emojiPickerPopupRef.current.contains(e.target) &&
        emojiPickerButtonRef.current &&
        !emojiPickerButtonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cancelTyping = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsBotTyping(false);
  };

  const handleSendMessage = async (isFollowUp = false) => {
    const text = message.trim();
    if (!text || !activeSessionId) return;

    const userMsg = {
      id: generateUniqueId('user'),
      text,
      sender: "user",
      timestamp: new Date()
    };

    setIsBotTyping(true);
    setChatSessions(prev => prev.map(s => s.id === activeSessionId
      ? { ...s, messages: [...s.messages, userMsg], lastUpdated: new Date() }
      : s
    ));
    setMessage('');
    setShowEmojiPicker(false);

    if ([...BANNED_WORDS].some(word => text.toLowerCase().includes(word))) {
      const botMsg = {
        id: generateUniqueId('bot-banned'),
        text: "Maaf, saya tidak dapat membahas topik tersebut. Mari kita fokus pada hal-hal yang dapat membantu kesehatan mental kamu. Bagaimana perasaanmu hari ini?",
        sender: "bot",
        timestamp: new Date(),
        followUps: ["Ceritakan tentang harimu", "Apa yang membuatmu bahagia?", "Bagaimana cara kamu mengatasi stres?"],
        follow_up_answers: [],
        recommended_responses_to_follow_up_answers: []
      };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId
        ? { ...s, messages: [...s.messages, botMsg], lastUpdated: new Date() }
        : s
      ));
      setIsBotTyping(false);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const data = await sendToMindfulness(text, { signal: controller.signal });

      if (!data || !data.results || data.results.length === 0) {
        throw new Error('Invalid API response structure');
      }

      const result = data.results[0];

      if (!result.response_to_display || result.response_to_display.trim() === '') {
        throw new Error('Empty response from API');
      }

      const botMsg = {
        id: generateUniqueId('bot'),
        text: result.response_to_display.slice(0, MAX_RESPONSE_LENGTH),
        sender: "bot",
        timestamp: new Date(),
        followUps: result.follow_up_questions || [],
        follow_up_answers: result.follow_up_answers || [],
        recommended_responses_to_follow_up_answers: result.recomended_responses_to_follow_up_answers || [],
        confidence: result.confidence_score || 0,
        intent: result.intent || ''
      };

      setChatSessions(prev => prev.map(s => s.id === activeSessionId
        ? { ...s, messages: [...s.messages, botMsg], lastUpdated: new Date() }
        : s
      ));

    } catch (err) {
      const errorBotMsg = {
        id: generateUniqueId('error'),
        text: "Oops! Terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
        sender: "bot",
        timestamp: new Date(),
        followUps: ["Coba lagi", "Ceritakan dengan kata-kata lain", "Bagaimana perasaanmu sekarang?"],
        follow_up_answers: [],
        recommended_responses_to_follow_up_answers: []
      };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId
        ? { ...s, messages: [...s.messages, errorBotMsg], lastUpdated: new Date() }
        : s
      ));
    } finally {
      setIsBotTyping(false);
      setAbortController(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeSession = chatSessions.find(s => s.id === activeSessionId);

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat chat...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        {/* ... (sama seperti sebelumnya) */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
            {activeSession?.messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-start max-w-3xl ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${msg.sender === 'user' ? 'bg-blue-500' : 'bg-purple-500'} text-white`}>
                    {msg.sender === 'user' ? <User size={16} /> : <span className="font-bold">M</span>}
                  </div>
                  <div className={`rounded-xl p-3 shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                    <ReactMarkdown className="whitespace-pre-wrap">{msg.text}</ReactMarkdown>
                    {msg.followUps?.length > 0 && (
                      <ul className="mt-2 space-y-2">
                        {msg.followUps.map((q, i) => (
                          <li key={i} className="p-2 border rounded-lg bg-gray-50">
                            <p className="font-medium text-gray-700">{q}</p>
                            {msg.follow_up_answers?.[i] && (
                              <p className="text-sm text-gray-600 mt-1">💬 {msg.follow_up_answers[i]}</p>
                            )}
                            {msg.recommended_responses_to_follow_up_answers?.[i] && (
                              <p className="text-xs text-blue-600 mt-1 italic">🔹 {msg.recommended_responses_to_follow_up_answers[i]}</p>
                            )}
                            <button
                              onClick={async () => {
                                setMessage(q);
                                await handleSendMessage(true);
                              }}
                              className="text-xs text-blue-500 mt-1 hover:underline"
                            >
                              Kirim pertanyaan ini
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-1">{formatTime(msg.timestamp)}</span>
              </div>
            ))}
            {isBotTyping && (
              <div className="flex items-center text-sm text-gray-500 italic mt-2">
                <span>Mindfulness sedang mengetik...</span>
                <button onClick={cancelTyping} className="ml-2 text-red-400 hover:text-red-600"><XCircle size={18} /></button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-4 bg-white border-t">
            <div className="flex items-center border rounded-full px-2">
              <input
                className="flex-1 p-2 text-sm"
                placeholder="Ceritakan perasaanmu..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isBotTyping}
              />
              <button ref={emojiPickerButtonRef} onClick={() => setShowEmojiPicker(prev => !prev)} className="p-2">
                <Smile size={18} />
              </button>
              <button onClick={handleSendMessage} disabled={!message.trim() || isBotTyping} className="p-2 bg-blue-500 text-white rounded-full">
                <Send size={18} />
              </button>
            </div>
            {showEmojiPicker && (
              <div ref={emojiPickerPopupRef} className="absolute bottom-16 right-4 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiData) => setMessage(prev => prev + emojiData.emoji)}
                  emojiStyle={EmojiStyle.NATIVE}
                  theme={Theme.LIGHT}
                  height={350}
                  lazyLoadEmojis
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatErrorBoundary>
  );
};

export default ChatbotPage;
