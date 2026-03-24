/**
 * AI LIVE AGENT — Interaction Script
 * Handles Voice Capture, Neural Motion Sync, and Wav2Lip Integration.
 */

document.addEventListener('DOMContentLoaded', () => {
    const _cfg = document.getElementById('sentinelConfig');
    if (!_cfg) {
        console.error('Sentinel Config Missing: Cannot initialize AI Live.');
        return;
    }

    const HOTEL_ID = _cfg.dataset.hotelId || '0';
    const CSRF_TOKEN = _cfg.dataset.csrf || '';

    const modeWriteBtn = document.getElementById('modeWriteBtn');
    const modeSpeakBtn = document.getElementById('modeSpeakBtn');
    const writeModeZone = document.getElementById('writeModeZone');
    const speakModeZone = document.getElementById('speakModeZone');
    const micStatusText = document.getElementById('micStatusText');
    const micWavePulse = document.getElementById('micWavePulse');

    // Restore missing references
    const input = document.getElementById('avatarInput');
    const sendBtn = document.getElementById('avatarSendBtn');
    const micBtn = document.getElementById('avatarMicBtn');
    const loader = document.getElementById('avatarLoader');
    const loaderStep = document.getElementById('loaderStep');
    const statusBadge = document.getElementById('avatarStatusBadge');
    const videoEl = document.getElementById('avatarVideo');
    const audioEl = document.getElementById('avatarAudio');
    const audioBar = document.getElementById('audioBar');
    const idlePh = document.getElementById('avatarIdlePlaceholder');
    const responseBox = document.getElementById('avatarResponseText');
    const noticesBox = document.getElementById('avatarNotices');

    let currentMode = 'write'; // 'write' or 'speak'
    let isTTSActive = true;
    let isListening = false;
    let isBusy = false;

    function setStatus(label, isError = false) {
        if (!statusBadge) return;
        
        if (isError) {
            statusBadge.classList.replace('bg-emerald-500/10', 'bg-rose-500/10');
            statusBadge.classList.replace('border-emerald-500/20', 'border-rose-500/20');
            statusBadge.classList.replace('text-emerald-400', 'text-rose-400');
            const glow = statusBadge.querySelector('.status-active-glow');
            if (glow) glow.style.background = '#ef4444';
        } else {
            statusBadge.classList.replace('bg-rose-500/10', 'bg-emerald-500/10');
            statusBadge.classList.replace('border-rose-500/20', 'border-emerald-500/20');
            statusBadge.classList.replace('text-rose-400', 'text-emerald-400');
            const glow = statusBadge.querySelector('.status-active-glow');
            if (glow) glow.style.background = '#10b981';
        }
        statusBadge.lastChild.textContent = ' ' + label;
    }

    const STATUS = {
        ready: () => setStatus('READY'),
        thinking: () => setStatus('THINKING'),
        speaking: () => setStatus('SPEAKING'),
        listening: () => setStatus('LISTENING'),
        error: () => setStatus('ERROR', true),
    };

    function showLoader(step) {
        if (loader) loader.classList.remove('hidden');
        if (loaderStep) loaderStep.textContent = step.toUpperCase();
    }
    
    function hideLoader() {
        if (loader) loader.classList.add('hidden');
    }

    function browserSpeak(text) {
        if (!isTTSActive || !text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        utt.voice = voices.find(v => v.name.includes('Google US English')) || voices[0];
        utt.onstart = () => STATUS.speaking();
        utt.onend = () => STATUS.ready();
        window.speechSynthesis.speak(utt);
    }

    function showNotices(degradations) {
        if (!noticesBox) return;
        noticesBox.innerHTML = '';
        if (!degradations || !degradations.length) {
            noticesBox.classList.add('hidden');
            return;
        }
        degradations.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3';
            div.innerHTML = `<i class="fas fa-info-circle"></i> ${msg}`;
            noticesBox.appendChild(div);
        });
        noticesBox.classList.remove('hidden');
    }

    async function askAvatar(query) {
        if (!query || isBusy) return;
        isBusy = true;
        if (input) input.value = '';
        if (responseBox) {
            responseBox.style.opacity = '0.5';
        }

        STATUS.thinking();
        showLoader('Neural Analysis');

        try {
            const resp = await fetch('/ask/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF_TOKEN },
                body: JSON.stringify({ query: query, hotel_id: HOTEL_ID }),
            });
            const data = await resp.json();

            if (data.status !== 'success') throw new Error(data.error || 'Link failure');

            if (responseBox) {
                responseBox.style.opacity = '1';
                responseBox.textContent = data.text;
            }

            // Update Voice Profile Badge
            const vpBadge = document.getElementById('voiceProfileBadge');
            if (vpBadge) {
                if (data.is_personalized) {
                    vpBadge.textContent = 'Personal Voice';
                    vpBadge.classList.replace('text-slate-500', 'text-primary-400');
                    vpBadge.classList.add('font-bold');
                } else {
                    vpBadge.textContent = 'System Voice';
                    vpBadge.classList.replace('text-primary-400', 'text-slate-500');
                    vpBadge.classList.remove('font-bold');
                }
            }

            if (data.has_video && data.video_url && videoEl) {
                showLoader('Syncing Motion');
                if (idlePh) idlePh.classList.add('hidden');
                videoEl.classList.remove('hidden');
                videoEl.src = data.video_url + '?t=' + Date.now();
                videoEl.loop = !!data.is_fallback;
                videoEl.load();
                
                // If it's a fallback video, we MUST play the TTS audio separately
                // because the fallback video is muted and contains the "wrong" audio.
                if (data.has_audio && data.audio_url && audioEl) {
                    audioEl.src = data.audio_url + '?t=' + Date.now();
                    audioEl.play();
                    videoEl.play();
                    STATUS.speaking();
                    
                    audioEl.onended = () => {
                        STATUS.ready();
                        videoEl.pause();
                        if (audioBar) audioBar.classList.add('hidden');
                    };
                } else {
                    // Normal synced video (Wav2Lip) or browser-speak fallback
                    videoEl.play();
                    STATUS.speaking();
                    if (data.is_fallback) {
                        browserSpeak(data.text);
                    } else {
                        videoEl.onended = () => STATUS.ready();
                    }
                }
                if (audioBar) audioBar.classList.add('hidden');
            } else if (data.has_audio && data.audio_url && audioEl) {
                audioEl.src = data.audio_url + '?t=' + Date.now();
                if (audioBar) audioBar.classList.remove('hidden');
                audioEl.play();
                STATUS.speaking();
                audioEl.onended = () => STATUS.ready();
            } else {
                browserSpeak(data.text);
            }
            showNotices(data.degradations);

        } catch (err) {
            STATUS.error();
            if (responseBox) {
                responseBox.textContent = 'NEURAL LINK ERROR: ' + err.message;
                responseBox.className = 'text-rose-400 font-bold';
                setTimeout(() => { 
                    STATUS.ready(); 
                    responseBox.className = 'text-slate-300 font-medium'; 
                }, 5000);
            }
        } finally {
            hideLoader();
            isBusy = false;
        }
    }

    function swapMode(mode) {
        if (currentMode === mode || isBusy) return;
        currentMode = mode;

        if (mode === 'write') {
            writeModeZone.classList.remove('hidden');
            speakModeZone.classList.add('hidden');
            modeWriteBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
            modeWriteBtn.classList.remove('text-slate-500');
            modeSpeakBtn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            modeSpeakBtn.classList.add('text-slate-500');
            if (recognition) recognition.stop();
        } else {
            writeModeZone.classList.add('hidden');
            speakModeZone.classList.remove('hidden');
            modeSpeakBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
            modeSpeakBtn.classList.remove('text-slate-500');
            modeWriteBtn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            modeWriteBtn.classList.add('text-slate-500');
        }
    }

    if (modeWriteBtn) modeWriteBtn.onclick = () => swapMode('write');
    if (modeSpeakBtn) modeSpeakBtn.onclick = () => swapMode('speak');

    // Speech Rec
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRec ? new SpeechRec() : null;
    if (recognition) {
        recognition.onstart = () => { 
            isListening = true; 
            if (micBtn) micBtn.classList.add('listening'); 
            if (micWavePulse) {
                micWavePulse.style.opacity = '1';
                micWavePulse.classList.add('active');
            }
            if (micStatusText) micStatusText.textContent = 'Agent is listening...';
            STATUS.listening(); 
        };
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            if (micStatusText) micStatusText.textContent = 'Processing: ' + transcript;
            askAvatar(transcript);
        };
        recognition.onend = () => { 
            isListening = false; 
            if (micBtn) micBtn.classList.remove('listening'); 
            if (micWavePulse) {
                micWavePulse.style.opacity = '0';
                micWavePulse.classList.remove('active');
            }
            if (micStatusText) micStatusText.textContent = 'Tap to start voice command';
            if (!isBusy) STATUS.ready(); 
        };
    }

    if (micBtn) {
        micBtn.onclick = () => { 
            if (recognition) isListening ? recognition.stop() : recognition.start(); 
            else alert('Speech recognition not supported in this browser.');
        };
    }

    if (sendBtn && input) {
        sendBtn.onclick = () => askAvatar(input.value.trim());
        input.onkeypress = (e) => { 
            if (e.key === 'Enter') askAvatar(input.value.trim()); 
        };
    }

    STATUS.ready();
});
