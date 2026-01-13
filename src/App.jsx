import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, LogOut, Key, Trash2 } from 'lucide-react';

const MultiAIChat = () => {
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: '',
    claude: ''
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedKeys = localStorage.getItem('apiKeys');
    const savedMessages = localStorage.getItem('messages');
    
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
    if (savedMessages) setMessages(JSON.parse(savedMessages));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('messages', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGoogleLogin = () => {
    const mockUser = {
      name: 'Demo User',
      email: 'demo@example.com',
      picture: 'https://ui-avatars.com/api/?name=Demo+User&background=4F46E5&color=fff'
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const saveApiKeys = () => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    setShowSettings(false);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('messages');
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const hasAllKeys = apiKeys.openai && apiKeys.gemini && apiKeys.claude;
    if (!hasAllKeys) {
      alert('먼저 설정에서 API 키를 모두 입력해주세요!');
      setShowSettings(true);
      return;
    }

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const aiMessage = {
      role: 'assistant',
      timestamp: new Date().toISOString(),
      responses: {
        gpt: { content: '', loading: true },
        gemini: { content: '', loading: true },
        claude: { content: '', loading: true }
      }
    };

    setMessages(prev => [...prev, aiMessage]);

    // 실제 API 호출
    const callOpenAI = async () => {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.openai}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: currentInput }],
            max_tokens: 1000
          })
        });
        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error('OpenAI Error:', error);
        return '오류가 발생했습니다: ' + error.message;
      }
    };

    const callGemini = async () => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeys.gemini}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: currentInput }]
            }]
          })
        });
        const data = await response.json();
        
        // 에러 확인
        if (data.error) {
          console.error('Gemini API Error:', data.error);
          return `Gemini 오류: ${data.error.message}`;
        }
        
        // 응답 구조 확인
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
          console.error('Unexpected Gemini response:', data);
          return 'Gemini에서 예상치 못한 응답을 받았습니다.';
        }
        
        return data.candidates[0].content.parts[0].text;
      } catch (error) {
        console.error('Gemini Error:', error);
        return '오류가 발생했습니다: ' + error.message;
      }
    };

    const callClaude = async () => {
      try {
        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            apiKey: apiKeys.claude
          })
        });
        
        const data = await response.json();
        
        // 응답 로그 (디버깅용)
        console.log('Claude response:', data);
        
        if (!response.ok) {
          console.error('Claude API Error:', data);
          return `Claude 오류: ${data.error?.message || data.error || '알 수 없는 오류'}`;
        }
        
        // 응답 구조 확인
        if (!data.content) {
          console.error('No content in Claude response:', data);
          return 'Claude에서 content가 없는 응답을 받았습니다.';
        }
        
        if (!Array.isArray(data.content) || data.content.length === 0) {
          console.error('Empty or invalid content array:', data);
          return 'Claude에서 빈 응답을 받았습니다.';
        }
        
        if (!data.content[0].text) {
          console.error('No text in content:', data);
          return 'Claude에서 텍스트가 없는 응답을 받았습니다.';
        }
        
        return data.content[0].text;
      } catch (error) {
        console.error('Claude Error:', error);
        return '오류가 발생했습니다: ' + error.message;
      }
    };

    try {
      const [gptResponse, geminiResponse, claudeResponse] = await Promise.all([
        callOpenAI(),
        callGemini(),
        callClaude()
      ]);

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        lastMessage.responses = {
          gpt: { content: gptResponse, loading: false },
          gemini: { content: geminiResponse, loading: false },
          claude: { content: claudeResponse, loading: false }
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Multi-AI Chat</h1>
            <p className="text-gray-600">ChatGPT, Gemini, Claude를 한번에</p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-200 hover:border-indigo-400 text-gray-700 font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-all"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 1클릭 시작
          </button>
          <p className="text-sm text-gray-500 mt-4">
            데모 버전: 클릭하면 바로 체험하실 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">Multi-AI Chat</h1>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">ChatGPT</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Gemini</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Claude</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="대화 초기화"
          >
            <Trash2 size={20} className="text-gray-600" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">세 AI에게 동시에 질문해보세요!</p>
            <p className="text-sm">하나의 질문으로 다양한 관점을 얻을 수 있습니다.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-6">
            {msg.role === 'user' ? (
              <div className="flex justify-end mb-4">
                <div className="bg-indigo-600 text-white rounded-2xl px-4 py-3 max-w-2xl">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ChatGPT */}
                <div className="bg-white rounded-xl border-2 border-green-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-bold text-sm">G</span>
                    </div>
                    <span className="font-semibold text-gray-800">ChatGPT</span>
                  </div>
                  {msg.responses.gpt.loading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.responses.gpt.content}</p>
                  )}
                </div>

                {/* Gemini */}
                <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">Ge</span>
                    </div>
                    <span className="font-semibold text-gray-800">Gemini</span>
                  </div>
                  {msg.responses.gemini.loading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.responses.gemini.content}</p>
                  )}
                </div>

                {/* Claude */}
                <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-sm">C</span>
                    </div>
                    <span className="font-semibold text-gray-800">Claude</span>
                  </div>
                  {msg.responses.claude.loading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.responses.claude.content}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="세 AI에게 동시에 질문하기..."
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Send size={20} />
            전송
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">API 키 설정</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* OpenAI */}
              <div className="border-2 border-green-100 rounded-xl p-4 bg-green-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">G</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">ChatGPT (OpenAI)</h3>
                      <p className="text-xs text-gray-600">가장 대중적인 AI 모델</p>
                    </div>
                  </div>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    발급받기 →
                  </a>
                </div>
                <input
                  type="password"
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                  placeholder="sk-proj-... 형식의 키를 입력하세요"
                  className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-400 bg-white"
                />
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                    💡 어떻게 발급받나요?
                  </summary>
                  <ol className="text-sm text-gray-700 mt-2 space-y-1 ml-4 list-decimal">
                    <li>위의 "발급받기" 버튼 클릭</li>
                    <li>OpenAI 계정으로 로그인 (없으면 가입)</li>
                    <li>"Create new secret key" 버튼 클릭</li>
                    <li>생성된 키를 복사해서 여기에 붙여넣기</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">
                    💰 첫 가입 시 $5 무료 크레딧 제공 (3개월 유효)
                  </p>
                </details>
              </div>

              {/* Gemini */}
              <div className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">Ge</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Gemini (Google)</h3>
                      <p className="text-xs text-gray-600">구글의 최신 AI 모델</p>
                    </div>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    발급받기 →
                  </a>
                </div>
                <input
                  type="password"
                  value={apiKeys.gemini}
                  onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})}
                  placeholder="AIza... 형식의 키를 입력하세요"
                  className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                />
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                    💡 어떻게 발급받나요?
                  </summary>
                  <ol className="text-sm text-gray-700 mt-2 space-y-1 ml-4 list-decimal">
                    <li>위의 "발급받기" 버튼 클릭</li>
                    <li>Google 계정으로 로그인</li>
                    <li>"Get API key" 또는 "Create API key" 클릭</li>
                    <li>생성된 키를 복사해서 여기에 붙여넣기</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">
                    💰 무료 할당량: 분당 15개 요청, 일일 1,500개 요청
                  </p>
                </details>
              </div>

              {/* Claude */}
              <div className="border-2 border-purple-100 rounded-xl p-4 bg-purple-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">C</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Claude (Anthropic)</h3>
                      <p className="text-xs text-gray-600">안전하고 정확한 AI</p>
                    </div>
                  </div>
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    발급받기 →
                  </a>
                </div>
                <input
                  type="password"
                  value={apiKeys.claude}
                  onChange={(e) => setApiKeys({...apiKeys, claude: e.target.value})}
                  placeholder="sk-ant-... 형식의 키를 입력하세요"
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-400 bg-white"
                />
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                    💡 어떻게 발급받나요?
                  </summary>
                  <ol className="text-sm text-gray-700 mt-2 space-y-1 ml-4 list-decimal">
                    <li>위의 "발급받기" 버튼 클릭</li>
                    <li>Anthropic 계정 생성 (이메일 인증 필요)</li>
                    <li>"Create Key" 버튼 클릭</li>
                    <li>생성된 키를 복사해서 여기에 붙여넣기</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">
                    💰 첫 가입 시 $5 무료 크레딧 제공 (30일 유효)
                  </p>
                </details>
              </div>
            </div>

            <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                🔒 보안 안내
              </h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• API 키는 절대 다른 사람과 공유하지 마세요</li>
                <li>• 키는 브라우저에만 저장되며 서버로 전송되지 않습니다</li>
                <li>• 각 AI 제공사의 무료 크레딧/할당량을 확인하세요</li>
              </ul>
            </div>

            <button
              onClick={saveApiKeys}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl mt-6 transition-colors"
            >
              저장하고 시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAIChat;
