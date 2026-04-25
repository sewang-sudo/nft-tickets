import { useState } from 'react';

const AIAdvisor = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState( []);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);
  };

  const registerPolicy = async () => {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        speak('Please connect your Phantom wallet first.');
        return;
      }
      const walletPubkey = window.solana.publicKey.toString();
      const response = await fetch('http://localhost:3001/api/blink/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: walletPubkey }),
      });
      const data = await response.json();
      if (!data.transaction) {
      console.error('No transaction returned:', data);
      speak('Registration failed. Please try again.');
      return;
      }
      const { Transaction } = await import('@solana/web3.js');
      const tx = Transaction.from(Buffer.from(data.transaction, 'base64'));
      await window.solana.signTransaction(tx);
      speak('Your crop insurance policy has been registered on Solana. You are now protected.');
      setResult('Policy registered successfully on Solana.');
    } catch (err) {
      speak('Registration failed. Please try again.');
      setResult('Registration failed: ' + err.message);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support voice. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    setListening(true);

    recognition.onresult = async (event) => {
      const userMessage = event.results[0][0].transcript;
setListening(false);
setLoading(true);

const updatedMessages = [...messages, { role: 'user', content: userMessage }];
setMessages(updatedMessages);

try {
  const response = await fetch('http://localhost:3001/api/ai-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: updatedMessages }),
  });
        const data = await response.json();
        const advice = data.advice;

        try {
          const parsed = JSON.parse(advice);
          if (parsed.action === 'register') {
            setResult(parsed.message);
            speak(parsed.message);
            await registerPolicy();
          }
        } catch {
          setResult(advice);
          speak(advice);
          setMessages(prev => [...prev, { role: 'assistant', content: advice }]);
        }
      } catch (err) {
        setResult('Error getting advice. Please try again.');
      }
      setLoading(false);
    };

    recognition.onerror = () => {
      setListening(false);
      setResult('Could not hear you. Please try again.');
    };

    recognition.start();
  };

  return (
    <div className="ai-advisor">
      <h2>🎙️ AI Crop Risk Advisor</h2>
      <p>Click the button and speak. Tell me your crop, region, and season.</p>
      <button
        onClick={startListening}
        disabled={loading || listening}
        className="cryo-btn"
      >
        {listening ? '🎙️ Listening...' : loading ? '⏳ Analyzing...' : '🎙️ Ask AI'}
      </button>
      {result && (
        <div className="advice-result">
          <p>{result}</p>
          <button onClick={() => speak(result)} className="cryo-btn">
            🔊 Replay Answer
          </button>
        </div>
      )}
    </div>
  );
};

export default AIAdvisor;