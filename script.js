// ============ KONFIGURASI ============
// GANTI DENGAN API KEY KAMU DARI https://aistudio.google.com/apikey
const API_KEY = 'AIzaSyDwraKSpVwKFfTuZaTNlX8COYGYiAs7_tE';  // ← GANTI INI!

// URL API GEMINI (pakai v1beta yang lebih stabil)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

// DOM Elements - PASTIKAN SEMUA ADA
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const previewName = document.getElementById('previewName');
const removeFileBtn = document.getElementById('removeFileBtn');
const loading = document.getElementById('loading');
const clearChatBtn = document.getElementById('clearChatBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const apiWarning = document.getElementById('apiWarning');

// State
let pendingFile = null;
let chatHistory = [];

// Cek API Key
function checkApiKey() {
  if (API_KEY === 'AIzaSyDwraKSpVwKFfTuZaTNlX8COYGYiAs7_tE') {
    if (apiWarning) apiWarning.style.display = 'flex';
    console.log('⚠️ API Key belum diatur!');
  } else {
    if (apiWarning) apiWarning.style.display = 'none';
  }
}

// Sembunyikan welcome screen
function hideWelcomeScreen() {
  if (welcomeScreen) {
    welcomeScreen.style.display = 'none';
  }
}

// Load chat history
function loadChatHistory() {
  const saved = localStorage.getItem('ai_chat_history');
  if (saved) {
    try {
      chatHistory = JSON.parse(saved);
      chatHistory.forEach(msg => {
        if (msg.role !== 'system') {
          addMessageToUI(msg.role === 'user' ? 'user' : 'bot', msg.content);
        }
      });
      hideWelcomeScreen();
    } catch(e) {
      console.log('Error loading history');
    }
  }
}

// Simpan chat
function saveChatHistory() {
  localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory));
}

// Hapus semua chat
function clearChat() {
  if (confirm('Hapus semua percakapan?')) {
    chatHistory = [];
    chatContainer.innerHTML = '';
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
    saveChatHistory();
    setTimeout(() => {
      addMessageToUI('bot', 'Halo! Ada yang bisa saya bantu? 🤖');
      hideWelcomeScreen();
    }, 100);
  }
}

// Tambah pesan ke UI
function addMessageToUI(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  const avatar = role === 'user' ? '👤' : '🤖';
  
  let formattedContent = content;
  if (typeof marked !== 'undefined' && role === 'bot') {
    formattedContent = marked.parse(content);
  } else {
    formattedContent = content.replace(/\n/g, '<br>');
  }
  
  messageDiv.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="message-content">
      <div class="text">${formattedContent}</div>
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
  hideWelcomeScreen();
}

// Scroll ke bawah
function scrollToBottom() {
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Baca isi file
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          type: 'image',
          data: e.target.result,
          name: file.name
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          type: 'text',
          data: e.target.result,
          name: file.name
        });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

// Kirim ke AI
async function sendToAI(userMessage, fileData = null) {
  try {
    let prompt = userMessage || (fileData ? 'Analisis file berikut' : 'Halo');
    
    if (fileData) {
      if (fileData.type === 'image') {
        prompt = `Deskripsikan gambar ini dalam bahasa Indonesia: ${userMessage || 'Apa yang ada di gambar ini?'}`;
      } else {
        prompt = `Berikut isi file ${fileData.name}:\n\n${fileData.data.slice(0, 8000)}\n\nPertanyaan: ${userMessage || 'Ringkas isi file ini dalam bahasa Indonesia'}`;
      }
    }
    
    if (!prompt.toLowerCase().includes('bahasa indonesia')) {
      prompt = `Jawab dalam bahasa Indonesia. ${prompt}`;
    }
    
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API Error');
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa menjawab.';
    
  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('API key')) {
      return '❌ **API Key tidak valid**\n\nSilakan dapatkan API Key dari [Google AI Studio](https://aistudio.google.com/apikey)';
    }
    return `❌ **Error**: ${error.message}`;
  }
}

// Kirim pesan utama
async function sendMessage() {
  console.log('sendMessage dipanggil'); // Debug
  
  const message = messageInput ? messageInput.value.trim() : '';
  if (!message && !pendingFile) {
    console.log('Tidak ada pesan atau file');
    return;
  }
  
  console.log('Mengirim pesan:', message);
  
  // Tampilkan pesan user
  let userDisplay = message || (pendingFile ? `📎 Mengirim file: ${pendingFile.name}` : '');
  addMessageToUI('user', userDisplay);
  
  chatHistory.push({ role: 'user', content: userDisplay });
  saveChatHistory();
  
  if (messageInput) messageInput.value = '';
  
  if (loading) loading.style.display = 'flex';
  
  // Buat placeholder bot
  const botMessageDiv = document.createElement('div');
  botMessageDiv.className = 'message bot';
  botMessageDiv.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="message-content">
      <div class="text"><em>Sedang mengetik...</em></div>
    </div>
  `;
  chatContainer.appendChild(botMessageDiv);
  scrollToBottom();
  
  // Kirim ke AI
  const aiResponse = await sendToAI(message, pendingFile);
  
  const textDiv = botMessageDiv.querySelector('.text');
  if (typeof marked !== 'undefined') {
    textDiv.innerHTML = marked.parse(aiResponse);
  } else {
    textDiv.innerHTML = aiResponse.replace(/\n/g, '<br>');
  }
  
  chatHistory.push({ role: 'bot', content: aiResponse });
  saveChatHistory();
  
  if (loading) loading.style.display = 'none';
  
  pendingFile = null;
  if (filePreview) filePreview.style.display = 'none';
  if (fileInput) fileInput.value = '';
  
  scrollToBottom();
}

// ============ EVENT LISTENERS ============
// Pastikan semua event listener terpasang dengan benar

if (sendBtn) {
  sendBtn.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Tombol kirim diklik');
    sendMessage();
  });
}

if (messageInput) {
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter ditekan');
      sendMessage();
    }
  });
}

if (attachBtn) {
  attachBtn.addEventListener('click', function() {
    if (fileInput) fileInput.click();
  });
}

if (fileInput) {
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileData = await readFileContent(file);
    pendingFile = {
      name: file.name,
      type: fileData.type,
      data: fileData.data
    };
    
    if (previewName) previewName.textContent = `📎 ${file.name}`;
    if (filePreview) filePreview.style.display = 'flex';
  });
}

if (removeFileBtn) {
  removeFileBtn.addEventListener('click', function() {
    pendingFile = null;
    if (filePreview) filePreview.style.display = 'none';
    if (fileInput) fileInput.value = '';
  });
}

if (clearChatBtn) {
  clearChatBtn.addEventListener('click', clearChat);
}

// Inisialisasi
checkApiKey();
loadChatHistory();

// Auto-scroll
const observer = new MutationObserver(() => {
  scrollToBottom();
  hideWelcomeScreen();
});
observer.observe(chatContainer, { childList: true, subtree: true });

console.log('Script loaded. Tombol kirim siap dipakai!');