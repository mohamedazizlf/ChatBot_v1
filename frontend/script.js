(function () {
  'use strict';
  var input = document.getElementById('message-input');
  var form = document.getElementById('chat-form');
  var send = document.getElementById('send-button');
  var messages = document.getElementById('messages');
  var recordButton = document.getElementById('record-button');
  var panel = document.getElementById('recording-panel');
  var status = document.getElementById('status-message');
  var recorder = null, stream = null, chunks = [], recording = false, pendingAudio = null, timer = null, seconds = 0, busy = false, discarded = false, requesting = false;
  var conversations = [], active = null, replyTimer = null;
  function icon(name) { return '<svg aria-hidden="true"><use href="#' + name + '"></use></svg>'; }
  function syncInput() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; send.disabled = (!input.value.trim() && !pendingAudio && !recording) || busy; }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }
  function renderHistory() {
    var history = document.getElementById('history'); history.replaceChildren();
    if (!conversations.length) { var empty = document.createElement('p'); empty.className = 'history-empty'; empty.textContent = 'A fresh space for your next idea.'; history.appendChild(empty); }
    conversations.forEach(function (conversation) { var button = document.createElement('button'); button.className = 'history-item' + (conversation === active ? ' active' : ''); button.innerHTML = icon('chat'); var title = document.createElement('span'); title.textContent = conversation.title; button.appendChild(title); button.onclick = function () { if (busy || recording || requesting) return; active = conversation; messages.replaceChildren(); conversation.items.forEach(function (item) { renderMessage(item); }); document.querySelector('.app').classList.add('chat-active'); renderHistory(); closeSidebar(); }; history.appendChild(button); });
  }
  function beginChat(title) { if (!active) { active = { title: title.slice(0, 30), items: [] }; conversations.unshift(active); renderHistory(); } document.querySelector('.app').classList.add('chat-active'); }
  function scrollDown() { requestAnimationFrame(function () { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }); }
  function responseFor(text) {
    if (/brainstorm|creative|inspiration/i.test(text)) return 'Let’s give that spark a little room to grow.\n\nHere are three directions to explore:\n\n1. A “one good thing” journal — collect a small, unexpected moment each day and turn it into a visual story.\n\n2. A neighborhood field guide — capture the places, people, and little details that make your corner of the world unique.\n\n3. A tiny creative challenge — choose one everyday object and reimagine it in five completely different ways.\n\nWhich direction feels most like you?';
    if (/write|words|message/i.test(text)) return 'Of course. The best messages sound like you, just a little clearer.\n\nWho are you writing to, and what would you like them to feel or understand? We can make it warm, professional, or somewhere in between.';
    if (/world|interesting|explain/i.test(text)) return 'Here’s a little something to spark your curiosity: trees can exchange resources through underground networks of fungi.\n\nThese relationships are called mycorrhizal networks. The fungi receive sugars from the trees, while helping them take up water and nutrients. Scientists are still studying just how much passes between neighboring trees.\n\nA forest is much more connected than it looks. What would you like to explore next?';
    if (/hello|bonjour|hi\b/i.test(text)) return 'Hello! It’s lovely to have you here. What’s on your mind today?';
    return 'That’s a good place to start. Let’s think it through together.\n\nWhat would a useful outcome look like for you? Share a little more context, and we can break it down into something clear and manageable.';
  }
  function renderMessage(item) {
    var node = document.createElement('article'); node.className = 'message ' + (item.role === 'user' ? 'user-message' : 'assistant-message');
    if (item.role === 'assistant') { var mark = document.createElement('span'); mark.className = 'assistant-mark'; mark.innerHTML = icon('spark'); node.appendChild(mark); }
    var body = document.createElement('div'); body.className = 'message-body';
    if (item.audio) { body.className = 'voice-message'; var audio = document.createElement('audio'); audio.controls = true; audio.src = item.audio; var label = document.createElement('span'); label.textContent = 'Voice message · ' + item.duration; body.append(audio, label); } else body.textContent = item.text;
    node.appendChild(body);
    if (item.role === 'assistant') { var actions = document.createElement('div'); actions.className = 'message-actions'; [['copy', 'Copy message'], ['like', 'Like response'], ['sound', 'Read aloud'], ['refresh', 'Regenerate response']].forEach(function (action) { var button = document.createElement('button'); button.className = 'icon-button'; button.setAttribute('aria-label', action[1]); button.title = action[1]; button.innerHTML = icon(action[0]); button.onclick = function () {
      if (action[0] === 'copy') { navigator.clipboard.writeText(item.text).then(function () { button.innerHTML = icon('check'); setTimeout(function () { button.innerHTML = icon('copy'); }, 1800); }).catch(function () { status.textContent = 'Your browser could not copy this message.'; }); }
      if (action[0] === 'like') { button.classList.toggle('selected'); button.setAttribute('aria-pressed', String(button.classList.contains('selected'))); }
      if (action[0] === 'sound') { if (!('speechSynthesis' in window)) { status.textContent = 'Read aloud is not available in this browser.'; return; } window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(item.text)); }
      if (action[0] === 'refresh') { body.textContent = 'Thinking…'; setTimeout(function () { body.textContent = item.text; }, 700); }
    }; actions.appendChild(button); }); node.appendChild(actions); }
    messages.appendChild(node);
  }
  function addMessage(item) { active.items.push(item); renderMessage(item); scrollDown(); }
  function sampleReply(text, audio) { busy = true; syncInput(); var typing = document.createElement('div'); typing.className = 'assistant-message typing'; typing.setAttribute('aria-label', 'Bloom is thinking'); typing.innerHTML = '<i></i><i></i><i></i>'; messages.appendChild(typing); scrollDown(); replyTimer = setTimeout(function () { typing.remove(); addMessage({ role: 'assistant', text: audio ? 'Thanks for sharing your voice message. You can play it back above.\n\nThis template uses sample replies; voice transcription and intelligent answers aren’t connected yet.' : responseFor(text) }); busy = false; syncInput(); }, 1000); }
  input.addEventListener('input', syncInput);
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', function (event) { event.preventDefault(); if (busy || requesting) return; if (recording) { stopRecording(true); return; } if (pendingAudio) { var voice = pendingAudio; beginChat('Voice conversation'); addMessage({ role: 'user', audio: voice.url, duration: voice.duration }); resetRecording(); sampleReply('', true); return; } var text = input.value.trim(); if (!text) return; beginChat(text); addMessage({ role: 'user', text: text }); input.value = ''; syncInput(); sampleReply(text, false); });
  document.querySelectorAll('.suggestion').forEach(function (button) { button.addEventListener('click', function () { input.value = button.getAttribute('data-prompt'); syncInput(); input.focus(); }); });
  document.getElementById('thinking-mode').onclick = function () { this.setAttribute('aria-pressed', String(this.getAttribute('aria-pressed') !== 'true')); };
  document.getElementById('menu-button').onclick = function () { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('open'); };
  document.getElementById('sidebar-overlay').onclick = closeSidebar;
  document.getElementById('new-chat').onclick = function () { if (requesting) return; if (recording) { discarded = true; recorder.stop(); } if (pendingAudio) URL.revokeObjectURL(pendingAudio.url); resetRecording(); clearTimeout(replyTimer); busy = false; active = null; messages.replaceChildren(); input.value = ''; document.querySelector('.app').classList.remove('chat-active'); status.textContent = ''; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); renderHistory(); closeSidebar(); syncInput(); input.focus(); };
  function timeLabel(value) { return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0'); }
  function releaseMic() { if (stream) stream.getTracks().forEach(function (track) { track.stop(); }); stream = null; }
  function resetRecording() { clearInterval(timer); recording = false; pendingAudio = null; panel.hidden = true; panel.classList.remove('ready'); document.getElementById('text-input-row').hidden = false; recordButton.classList.remove('recording'); recordButton.setAttribute('aria-label', 'Record voice message'); recordButton.title = 'Record voice message'; document.querySelector('#record-icon use').setAttribute('href', '#mic'); syncInput(); }
  function stopRecording(andSend) { if (!recorder || !recording) return; recorder.sendAfterStop = andSend; recorder.stop(); recording = false; clearInterval(timer); releaseMic(); }
  recordButton.onclick = async function () {
    if (requesting || busy) return;
    if (recording) { stopRecording(false); return; }
    if (pendingAudio) return;
    status.textContent = '';
    if (!navigator.mediaDevices || !window.MediaRecorder) { status.textContent = 'Voice recording needs a supported browser and a secure connection.'; return; }
    requesting = true; recordButton.disabled = true;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder = new MediaRecorder(stream); chunks = []; discarded = false; seconds = 0;
      recorder.ondataavailable = function (event) { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = function () { releaseMic(); if (discarded) { resetRecording(); return; } var blob = new Blob(chunks, { type: recorder.mimeType }); pendingAudio = { url: URL.createObjectURL(blob), duration: timeLabel(seconds) }; recording = false; clearInterval(timer); panel.classList.add('ready'); document.getElementById('record-label').textContent = 'Ready to send'; recordButton.classList.remove('recording'); recordButton.setAttribute('aria-label', 'Recording ready'); document.querySelector('#record-icon use').setAttribute('href', '#mic'); syncInput(); if (recorder.sendAfterStop) form.requestSubmit(); };
      recorder.start(); recording = true; panel.hidden = false; document.getElementById('text-input-row').hidden = true; document.getElementById('record-label').textContent = 'Recording'; document.getElementById('record-time').textContent = '0:00'; recordButton.classList.add('recording'); recordButton.setAttribute('aria-label', 'Stop recording'); recordButton.title = 'Stop recording'; document.querySelector('#record-icon use').setAttribute('href', '#stop'); timer = setInterval(function () { seconds++; document.getElementById('record-time').textContent = timeLabel(seconds); }, 1000); syncInput();
    } catch (error) { releaseMic(); status.textContent = error.name === 'NotAllowedError' ? 'Microphone access was declined. Allow it in your browser to record a voice message.' : 'Your microphone is unavailable. Check that it is connected and try again.'; } finally { requesting = false; recordButton.disabled = false; }
  };
  document.getElementById('cancel-recording').onclick = function () { if (recording) { discarded = true; stopRecording(false); } else if (pendingAudio) URL.revokeObjectURL(pendingAudio.url); resetRecording(); };
  window.addEventListener('pagehide', function () { releaseMic(); conversations.forEach(function (conversation) { conversation.items.forEach(function (item) { if (item.audio) URL.revokeObjectURL(item.audio); }); }); if (pendingAudio) URL.revokeObjectURL(pendingAudio.url); });
})();
