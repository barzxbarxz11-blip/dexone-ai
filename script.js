// ============ KONFIGURASI ============
// GANTI DENGAN API KEY KAMU DARI https://aistudio.google.com/apikey
const API_KEY = 'AIzaSyDwraKSpVwKFfTuZaTNlX8COYGYiAs7_tE';  // ← GANTI INI!

// URL API GEMINI
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

// DOM Elements
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

// Sembunyikan welcome screen saat chat dimulai
function hideWelcomeScreen() {
  if (welcomeScreen && chatContainer.children.length > 0) {
    const hasMessages = Array.from(chatContainer.children).some(
      child => child.classList && (child.classList.contains('message') || child.classList.contains('user') || child.classList.contains('bot'))
    );
    if (hasMessages && welcomeScreen.style.display !== 'none') {
      welcomeScreen.style.display = 'none';
    }
  }
}

// Load chat history dari localStorage
function loadChatHistory() {
  const saved = localStorage.getItem('ai_chat_history');
  if (saved) {
    chatHistory = JSON.parse(saved);
    chatHistory.forEach(msg => {
      if (msg.role !== 'system') {
        addMessageToUI(msg.role === 'user' ? 'user' : 'bot', msg.content);
      }
    });
    hideWelcomeScreen();
  }
}

// Simpan chat ke localStorage
function saveChatHistory() {
  localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory));
}

// Hapus semua chat
function clearChat() {
  if (confirm('Hapus semua percakapan?')) {
    chatHistory = [];
    chatContainer.innerHTML = '';
    // Tampilkan kembali welcome screen
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
    saveChatHistory();
    // Tambah pesan selamat datang
    addMessageToUI('bot', 'Halo! Ada yang bisa saya bantu? 🤖');
    hideWelcomeScreen();
  }
}

// Tambah pesan ke UI
function addMessageToUI(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  const avatar = role === 'user' ? '👤' : '🤖';
  messageDiv.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="message-content">
      <div class="text">${content}</div>
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
  hideWelcomeScreen();
}

// Format teks (support markdown)
function formatText(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  return text.replace(/\n/g, '<br>');
}

// Scroll ke bawah
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
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

// Kirim pesan ke AI
async function sendToAI(userMessage, fileData = null) {
  try {
    let prompt = userMessage || (fileData ? `Analisis file berikut` : '');
    
    if (fileData) {
      if (fileData.type === 'image') {
        prompt = `Deskripsikan gambar ini dalam bahasa Indonesia: ${userMessage || 'Apa yang ada di gambar ini?'}`;
      } else {
        prompt = `Berikut adalah isi file ${fileData.name}:\n\n${fileData.data.slice(0, 8000)}\n\nPertanyaan: ${userMessage || 'Ringkas isi file ini dalam bahasa Indonesia'}`;
      }
    }
    
    // Tambahkan instruksi bahasa Indonesia
    if (!prompt.toLowerCase().includes('bahasa indonesia')) {
      prompt = `Jawab dalam bahasa Indonesia. ${prompt}`;
    }
    
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error API');
    }
    
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa menjawab pertanyaan itu.';
    
    return aiResponse;
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.message.includes('API key')) {
      return '❌ **API Key tidak valid**\n\nSilakan:\n1. Dapatkan API Key gratis dari [Google AI Studio](https://aistudio.google.com/apikey)\n2. Ganti `AIzaSyDwraKSpVwKFfTuZaTNlX8COYGYiAs7_tE` di file script.js';
    }
    
    return `❌ **Error**: ${error.message}\n\nCoba periksa koneksi internet atau API Key.`;
  }
}

// Kirim pesan utama
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message && !pendingFile) return;
  
  // Tampilkan pesan user
  let userDisplay = message || (pendingFile ? `📎 Mengirim file: ${pendingFile.name}` : '');
  addMessageToUI('user', userDisplay);
  
  // Simpan ke history
  chatHistory.push({ role: 'user', content: userDisplay });
  saveChatHistory();
  
  // Kosongkan input
  messageInput.value = '';
  
  // Tampilkan loading
  loading.style.display = 'flex';
  
  // Buat placeholder pesan bot
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
  
  // Update pesan bot dengan response yang sudah diformat
  const textDiv = botMessageDiv.querySelector('.text');
  if (typeof marked !== 'undefined') {
    textDiv.innerHTML = marked.parse(aiResponse);
  } else {
    textDiv.innerHTML = aiResponse.replace(/\n/g, '<br>');
  }
  
  // Simpan ke history
  chatHistory.push({ role: 'bot', content: aiResponse });
  saveChatHistory();
  
  // Sembunyikan loading
  loading.style.display = 'none';
  
  // Clear pending file
  pendingFile = null;
  filePreview.style.display = 'none';
  
  scrollToBottom();
}

// Event Listeners
attachBtn?.addEventListener('click', () => {
  fileInput.click();
});

fileInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const fileData = await readFileContent(file);
  pendingFile = {
    name: file.name,
    type: fileData.type,
    data: fileData.data
  };
  
  previewName.textContent = `📎 ${file.name}`;
  filePreview.style.display = 'flex';
});

removeFileBtn?.addEventListener('click', () => {
  pendingFile = null;
  filePreview.style.display = 'none';
  fileInput.value = '';
});

sendBtn?.addEventListener('click', sendMessage);

messageInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearChatBtn?.addEventListener('click', clearChat);

// Initialize
checkApiKey();
loadChatHistory();

// Auto-scroll saat ada pesan baru
const observer = new MutationObserver(() => {
  scrollToBottom();
  hideWelcomeScreen();
});
observer.observe(chatContainer, { childList: true, subtree: true });// Save chat to localStorage
function saveChatHistory() {
  localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory));
}

// Clear chat
function clearChat() {
  if (confirm('Hapus semua percakapan?')) {
    chatHistory = [];
    chatContainer.innerHTML = '';
    addMessageToUI('bot', 'Chat telah direset. Ada yang bisa aku bantu? 🤖');
    saveChatHistory();
  }
}

// Add message to UI
function addMessageToUI(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const avatar = role === 'user' ? '👤' : '🤖';
  
  messageDiv.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="message-content">
      <div class="text">${content}</div>
    </div>
  `;
  
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Parse markdown in response
function formatResponse(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  return text.replace(/\n/g, '<br>');
}

// Update message with formatted content
function updateMessageWithFormat(messageDiv, text) {
  const contentDiv = messageDiv.querySelector('.text');
  if (typeof marked !== 'undefined') {
    contentDiv.innerHTML = marked.parse(text);
  } else {
    contentDiv.innerHTML = text.replace(/\n/g, '<br>');
  }
  scrollToBottom();
}

// Scroll to bottom
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Read file content
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

// Send message to AI (Gemini)
async function sendToAI(userMessage, fileData = null) {
  try {
    let prompt = userMessage;
    
    // If there's a file, add context
    if (fileData) {
      if (fileData.type === 'image') {
        prompt = `[User mengirim gambar: ${fileData.name}]\n\nDeskripsikan gambar ini:\n${userMessage || 'Apa yang ada di gambar ini?'}`;
      } else {
        prompt = `[User mengirim file: ${fileData.name}]\n\nIsi file:\n${fileData.data.slice(0, 8000)}\n\nPertanyaan: ${userMessage || 'Ringkas isi file ini'}`;
      }
    }
    
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API Error');
    }
    
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa menjawab itu.';
    
    return aiResponse;
    
  } catch (error) {
    console.error('Error calling AI:', error);
    
    if (error.message.includes('API key')) {
      return '❌ **Error API Key**\n\nAPI Key tidak valid. Silakan:\n1. Dapatkan API Key gratis dari [Google AI Studio](https://aistudio.google.com/apikey)\n2. Ganti `AIzaSyDwraKSpVwKFfTuZaTNlX8COYGYiAs7_tE` di file script.js';
    }
    
    return `❌ **Error**: ${error.message}\n\nCoba periksa koneksi internet atau API Key.`;
  }
}

// Send message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message && !pendingFile) return;
  
  // Add user message to UI
  let displayMessage = message || (pendingFile ? `📎 Mengirim file: ${pendingFile.name}` : '');
  addMessageToUI('user', displayMessage);
  
  // Save to history
  chatHistory.push({ role: 'user', content: displayMessage });
  saveChatHistory();
  
  // Clear input
  messageInput.value = '';
  
  // Show loading
  loading.style.display = 'flex';
  
  // Create bot message placeholder
  const botMessageDiv = document.createElement('div');
  botMessageDiv.className = 'message bot';
  botMessageDiv.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="message-content">
      <div class="text"><em>Mengetik...</em></div>
    </div>
  `;
  chatContainer.appendChild(botMessageDiv);
  scrollToBottom();
  
  // Send to AI
  const aiResponse = await sendToAI(message, pendingFile);
  
  // Update bot message
  updateMessageWithFormat(botMessageDiv, aiResponse);
  
  // Save to history
  chatHistory.push({ role: 'bot', content: aiResponse });
  saveChatHistory();
  
  // Hide loading
  loading.style.display = 'none';
  
  // Clear pending file
  pendingFile = null;
  filePreview.style.display = 'none';
}

// Handle file upload
attachBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const fileData = await readFileContent(file);
  pendingFile = {
    name: file.name,
    type: fileData.type,
    data: fileData.data
  };
  
  previewName.textContent = `📎 ${file.name}`;
  filePreview.style.display = 'flex';
});

removeFileBtn.addEventListener('click', () => {
  pendingFile = null;
  filePreview.style.display = 'none';
  fileInput.value = '';
});

// Send on button click
sendBtn.addEventListener('click', sendMessage);

// Send on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Clear chat
clearChatBtn.addEventListener('click', clearChat);

// Check API key on start
function checkApiKey() {
  if (API_KEY === 'AIzaSyDwraKSpVwKFfTuZaTNlX8COYGYiAs7_tE') {
    addMessageToUI('bot', '⚠️ **PENTING!** ⚠️\n\nKamu perlu mengganti `API_KEY` di file `script.js` dengan API Key dari Google Gemini.\n\n📝 Cara dapatkan:\n1. Buka https://aistudio.google.com/apikey\n2. Login dengan Google\n3. Klik "Create API Key"\n4. Copy dan ganti di kode');
  }
}

// Initialize
loadChatHistory();
checkApiKey();

// Auto-scroll on new messages
const observer = new MutationObserver(scrollToBottom);
observer.observe(chatContainer, { childList: true, subtree: true });
