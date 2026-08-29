// calling.js — the live calling demo on calling.html.
//
// One WebRTC audio session against the voicebot gateway, plus the on-page
// conversation view. The transport code follows the reference client in
// ../frontend/index.html; what is added here is mode selection, the transcript
// pane, and credentials that are never baked into the page.
//
// CREDENTIALS: the API key is read from the form and kept in localStorage on
// the visitor's own machine. It is deliberately NOT hardcoded — the reference
// client has a live vk_… key committed into it, and this page is meant to be
// published, where that key would be public the moment it shipped.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // ---------------------------------------------------------------------------
  // modes
  // ---------------------------------------------------------------------------
  //
  // A mode is a workflow on the gateway. Which workflow a session gets is bound
  // to the API key server-side, not chosen by the browser — so every mode needs
  // its own key. `flow` here is the workflow file it corresponds to in
  // tempp/workflow-json, recorded so the mapping is not folklore.
  var MODES = {
    university: {
      label: 'University',
      flow: 'nimc',
      ready: true,
      role: 'Admissions counsellor',
      blurb: 'Inbound admissions. Answers course, fee and eligibility questions in ' +
             'Hinglish, switching to English when the caller does.'
    },
    school: {
      label: 'School',
      flow: null,
      ready: false,
      role: 'Front office',
      blurb: 'Admissions and parent enquiries for a school front office.'
    },
    opd: {
      label: 'Hospital OPD',
      flow: 'vps',
      ready: true,
      role: 'Patient simulation',
      blurb: 'A patient with long-standing type-two diabetes who deflects rather ' +
             'than refuses — built for clinician consultation practice.'
    },
    hotel: {
      label: 'Hotel management',
      flow: null,
      ready: false,
      role: 'Front desk',
      blurb: 'Reservations, availability and guest requests at a hotel front desk.'
    }
  };

  var mode = 'university';

  // ---------------------------------------------------------------------------
  // state
  // ---------------------------------------------------------------------------
  var pc = null, localStream = null, audioCtx = null, dc = null;
  var meterRAF = null;
  var connected = false;

  // ---------------------------------------------------------------------------
  // conversation
  // ---------------------------------------------------------------------------

  var turns = [];

  function renderTranscript() {
    var list = $('transcript');
    if (!turns.length) {
      list.innerHTML = '<p class="tx-empty">The conversation will appear here, turn by turn, as it happens.</p>';
      return;
    }
    list.innerHTML = '';
    turns.forEach(function (t) {
      var el = document.createElement('div');
      el.className = 'tx-turn tx-' + t.who + (t.partial ? ' is-partial' : '');
      el.innerHTML = '<span class="tx-who">' + (t.who === 'user' ? 'Caller' : 'Agent') + '</span>' +
                     '<p class="tx-text"></p>';
      el.querySelector('.tx-text').textContent = t.text;
      list.appendChild(el);
    });
    list.scrollTop = list.scrollHeight;
  }

  // A partial turn is replaced in place as more of it is recognised; a final one
  // is closed off so the next event starts a new bubble.
  function pushTurn(who, text, partial) {
    var last = turns[turns.length - 1];
    if (last && last.who === who && last.partial) {
      last.text = text;
      last.partial = !!partial;
    } else {
      turns.push({ who: who, text: text, partial: !!partial });
    }
    renderTranscript();
  }

  // The event contract this pane expects on the RTC data channel. The gateway
  // does not emit these yet — today its data channel carries only web_action
  // dispatches and their acks, and the conversation is delivered to the
  // configured webhook instead. Anything matching this shape renders the moment
  // the gateway starts sending it; anything else is ignored rather than shown.
  //
  //   { type: 'transcript', role: 'user' | 'assistant',
  //     text: '…', final: true | false }
  //
  function onChannelMessage(raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || msg.type !== 'transcript' || typeof msg.text !== 'string') return;
    pushTurn(msg.role === 'assistant' ? 'agent' : 'user', msg.text, !msg.final);
  }

  // ---------------------------------------------------------------------------
  // ui
  // ---------------------------------------------------------------------------

  function setStatus(state, label) {
    var dot = $('conn-dot'), txt = $('conn-text');
    dot.className = 'conn-dot is-' + state;
    txt.textContent = label;
  }

  function setPhase(phase) {
    document.body.setAttribute('data-phase', phase);
  }

  function showError(msg) {
    var el = $('call-error');
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function selectMode(key) {
    if (!MODES[key]) return;
    mode = key;
    document.querySelectorAll('.mode').forEach(function (b) {
      var on = b.dataset.mode === key;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var m = MODES[key];
    $('mode-role').textContent = m.role;
    $('mode-blurb').textContent = m.blurb;
    // The internal workflow name (nimc, vps) is a build detail — visitors get
    // told whether this desk is live, not what it is called in the repo.
    $('mode-flow').textContent = m.flow ? 'Live — you can ring this one' : 'Coming soon';
    $('mode-flow').classList.toggle('is-missing', !m.flow);
    $('agent-name').textContent = m.label;

    // Each mode is a different workflow behind a different key.
    $('apikey').value = localStorage.getItem('voxio.key.' + key) || '';
    updateReady();
  }

  function updateReady() {
    var m = MODES[mode];
    var hasKey = $('apikey').value.trim().length > 0;
    var hasServer = $('server').value.trim().length > 0;
    $('call-btn').disabled = !(hasKey && hasServer);
    $('mode-warn').hidden = m.ready;
  }

  // ---------------------------------------------------------------------------
  // level meters
  // ---------------------------------------------------------------------------

  function meter(stream, barsSel) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var src = audioCtx.createMediaStreamSource(stream);
    var an = audioCtx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    var data = new Uint8Array(an.frequencyBinCount);
    var bars = document.querySelectorAll(barsSel);
    return function tick() {
      an.getByteFrequencyData(data);
      var step = Math.floor(data.length / bars.length) || 1;
      for (var i = 0; i < bars.length; i++) {
        var sum = 0;
        for (var j = 0; j < step; j++) sum += data[i * step + j] || 0;
        var v = (sum / step) / 255;
        bars[i].style.transform = 'scaleY(' + Math.max(0.12, Math.min(1, v * 2.4)) + ')';
      }
    };
  }

  // ---------------------------------------------------------------------------
  // call
  // ---------------------------------------------------------------------------

  function waitForIce(peer) {
    return new Promise(function (resolve) {
      if (peer.iceGatheringState === 'complete') return resolve();
      // TURN relay candidates need a moment; do not wait forever for them
      var t = setTimeout(resolve, 5000);
      peer.addEventListener('icegatheringstatechange', function h() {
        if (peer.iceGatheringState === 'complete') {
          clearTimeout(t);
          peer.removeEventListener('icegatheringstatechange', h);
          resolve();
        }
      });
    });
  }

  async function startCall() {
    showError('');
    var server = $('server').value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    var apiKey = $('apikey').value.trim();
    if (!server || !apiKey) return;

    localStorage.setItem('voxio.key.' + mode, apiKey);
    localStorage.setItem('voxio.server', server);

    setPhase('calling');
    setStatus('connecting', 'Requesting microphone…');

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      setPhase('idle');
      showError('Microphone permission denied — the call needs it.');
      return;
    }

    setStatus('connecting', 'Connecting…');

    var iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    try {
      var r = await fetch('https://' + server + '/rtc/ice-servers');
      if (r.ok) {
        var j = await r.json();
        if (j && j.ice_servers) iceServers = j.ice_servers;
        else if (Array.isArray(j)) iceServers = j;
      }
    } catch (e) {
      // No TURN is survivable on an open network; it only fails behind strict NAT.
      console.warn('[ice] could not fetch ice-servers, continuing without TURN');
    }

    pc = new RTCPeerConnection({ iceServers: iceServers });

    pc.ontrack = function (e) {
      $('agent-audio').srcObject = e.streams[0];
      var tick = meter(e.streams[0], '#agent-bars .bar');
      (function loop() { if (!connected) return; tick(); requestAnimationFrame(loop); })();
    };

    pc.onconnectionstatechange = function () {
      var s = pc.connectionState;
      if (s === 'connected') {
        connected = true;
        setPhase('live');
        setStatus('live', 'Connected');
        var tick = meter(localStream, '#you-bars .bar');
        (function loop() { if (!connected) return; tick(); meterRAF = requestAnimationFrame(loop); })();
      }
      if (s === 'failed') { setStatus('failed', 'Connection failed'); endCall(true); }
      if (s === 'disconnected' || s === 'closed') { if (connected) endCall(true); }
    };

    // Opened by us so the gateway has a channel to talk back on; it is also the
    // channel the transcript contract above would arrive on.
    dc = pc.createDataChannel('chat');
    dc.onmessage = function (e) { onChannelMessage(e.data); };

    pc.ondatachannel = function (e) {
      e.channel.onmessage = function (ev) { onChannelMessage(ev.data); };
    };

    localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });

    var offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await waitForIce(pc);

    var resp;
    try {
      resp = await fetch('https://' + server + '/rtc/offer/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', api_key: apiKey },
        body: JSON.stringify({ sdp: pc.localDescription.sdp, type: pc.localDescription.type })
      });
    } catch (e) {
      setStatus('failed', 'Unreachable');
      showError('Could not reach ' + server + '.');
      endCall(true);
      return;
    }

    if (!resp.ok) {
      setStatus('failed', 'Rejected');
      showError(resp.status === 401 || resp.status === 403
        ? 'The gateway rejected that API key for this mode.'
        : 'Gateway error ' + resp.status + '.');
      endCall(true);
      return;
    }

    var answer = await resp.json();
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  function endCall(keepError) {
    connected = false;
    if (meterRAF) cancelAnimationFrame(meterRAF);
    if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
    if (dc) { try { dc.close(); } catch (e) {} dc = null; }
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
    $('agent-audio').srcObject = null;
    setPhase('idle');
    setStatus('idle', 'Not connected');
    if (!keepError) showError('');
  }

  function toggleMic() {
    if (!localStream) return;
    var t = localStream.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    $('mic-btn').classList.toggle('is-muted', !t.enabled);
    $('mic-btn').setAttribute('aria-pressed', t.enabled ? 'false' : 'true');
  }

  // ---------------------------------------------------------------------------
  // wiring
  // ---------------------------------------------------------------------------

  document.querySelectorAll('.mode').forEach(function (b) {
    b.addEventListener('click', function () { selectMode(b.dataset.mode); });
  });
  $('apikey').addEventListener('input', updateReady);
  $('server').addEventListener('input', updateReady);
  $('call-btn').addEventListener('click', startCall);
  $('hang-btn').addEventListener('click', function () { endCall(false); });
  $('mic-btn').addEventListener('click', toggleMic);

  $('server').value = localStorage.getItem('voxio.server') || '';
  selectMode(mode);
  renderTranscript();
  setStatus('idle', 'Not connected');
  setPhase('idle');

  window.addEventListener('beforeunload', function () { if (connected) endCall(true); });
})();
