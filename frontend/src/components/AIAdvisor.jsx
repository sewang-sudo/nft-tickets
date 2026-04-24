import { useState } from 'react';

const AIAdvisor = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
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
      const message = event.results[0][0].transcript;
      setListening(false);
      setLoading(true);

      try {
        const response = await fetch('http://localhost:3001/api/ai-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        const data = await response.json();
        setResult(data.advice);
        speak(data.advice);
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