/**
 * voice.js - Invest IQ Browser-Native Voice Narration Controller
 * 
 * Leverages HTML5 SpeechSynthesis API for 100% free, zero-latency audio narration
 * of AI plain-English explanations and market reports.
 */

class VoiceNarrator {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.selectedVoice = null;
    this.activeButton = null;

    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API not supported in this browser.');
      return;
    }

    this.initVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.initVoices();
    }
  }

  initVoices() {
    const voices = this.synth.getVoices();
    // Prefer natural English voices (Google US English, Microsoft Mark, Samantha, etc.)
    this.selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium')))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
  }

  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/₹/g, 'Rupees ')
      .replace(/INR/g, 'Rupees ')
      .replace(/EMA/g, 'E M A ')
      .replace(/RSI/g, 'R S I ')
      .replace(/MACD/g, 'M A C D ')
      .replace(/SMA/g, 'S M A ')
      .replace(/NSE/g, 'N S E ')
      .replace(/STT/g, 'S T T ')
      .replace(/STCG/g, 'Short Term Capital Gains ')
      .replace(/([0-9]+)\.([0-9]+)x/g, '$1 point $2 times')
      .replace(/[#*`_~]/g, '')
      .trim();
  }

  speak(text, buttonElement = null) {
    if (!this.synth) {
      alert('Your browser does not support SpeechSynthesis voice narration.');
      return;
    }

    // Toggle pause/stop if already speaking the same text
    if (this.isPlaying && this.activeButton === buttonElement) {
      if (this.isPaused) {
        this.synth.resume();
        this.isPaused = false;
        this.updateButtonUI(buttonElement, 'playing');
      } else {
        this.synth.pause();
        this.isPaused = true;
        this.updateButtonUI(buttonElement, 'paused');
      }
      return;
    }

    // Stop any previous speech
    this.stop();

    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned) return;

    this.currentUtterance = new SpeechSynthesisUtterance(cleaned);
    if (this.selectedVoice) {
      this.currentUtterance.voice = this.selectedVoice;
    }
    this.currentUtterance.rate = this.rate;
    this.currentUtterance.pitch = this.pitch;

    this.activeButton = buttonElement;
    this.isPlaying = true;
    this.isPaused = false;
    this.updateButtonUI(buttonElement, 'playing');

    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.updateButtonUI(this.activeButton, 'idle');
      this.activeButton = null;
    };

    this.currentUtterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isPlaying = false;
      this.isPaused = false;
      this.updateButtonUI(this.activeButton, 'idle');
      this.activeButton = null;
    };

    this.synth.speak(this.currentUtterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      if (this.activeButton) {
        this.updateButtonUI(this.activeButton, 'idle');
        this.activeButton = null;
      }
    }
  }

  setSpeed(rate) {
    this.rate = rate;
  }

  updateButtonUI(button, state) {
    if (!button) return;
    if (state === 'playing') {
      button.classList.add('btn-narrating');
      button.innerHTML = '<span class="pulse-dot"></span> Pause Voice';
    } else if (state === 'paused') {
      button.classList.remove('btn-narrating');
      button.innerHTML = '▶ Resume Voice';
    } else {
      button.classList.remove('btn-narrating');
      button.innerHTML = '🔊 Listen (Voice)';
    }
  }
}

// Global instance for UI access
window.investIqVoice = window.finsimVoice = new VoiceNarrator();

// Global helper invoked by onclick handlers
function narrateExplanation(textId, buttonElement) {
  const elem = document.getElementById(textId);
  const text = elem ? (elem.innerText || elem.textContent) : textId;
  (window.investIqVoice || window.finsimVoice).speak(text, buttonElement);
}
