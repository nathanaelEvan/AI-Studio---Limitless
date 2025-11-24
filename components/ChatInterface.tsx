import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { askGojo } from '../services/geminiService';
import { Message } from '../types';

interface ChatInterfaceProps {
  visible: boolean;
  onClose: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ visible, onClose }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "I'm the strongest. Ask me anything about my technique." }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, visible]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    const answer = await askGojo(query);
    setMessages(prev => [...prev, { role: 'model', text: answer }]);
    setLoading(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[90vw] h-[500px] bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gojo-blue animate-pulse" />
          <h3 className="text-white font-bold tracking-wider text-sm">JUJUTSU ARCHIVES</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-gojo-blue text-white rounded-br-none' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-slate-800 p-3 rounded-xl rounded-bl-none border border-slate-700 flex gap-2 items-center">
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
             </div>
           </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800/30 border-t border-slate-700">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-600 rounded-full py-3 px-5 pr-12 text-sm text-white focus:outline-none focus:border-gojo-blue transition placeholder-slate-500"
            placeholder="Ask about Infinity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gojo-blue rounded-full text-white hover:bg-sky-400 transition disabled:opacity-50"
          >
            {loading ? <Sparkles size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};