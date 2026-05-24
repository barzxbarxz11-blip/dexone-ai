// State Aplikasi
let chats = {}; 
let currentChatId = null;
let selectedFile = null;

// Element Selector
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const chatContainer = document.getElementById('chat-container');
const welcomeScreen = document.getElementById('welcome-screen');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');
const sendBtn = document.getElementById('send-btn');
const fileUpload = document.getElementById('file-upload');
const attachmentPreview = document.getElementById('attachment-preview');
const chatHistoryList = document.getElementById('chat-history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const currentChatTitle = document.getElementById('current-chat-title');

// --- PENGATURAN SIDEBAR (Garis Tiga) ---
function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarOverlay.classList.toggle('hidden');
}

toggleSidebarBtn.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

// --- HANDLER INPUT TEXTAREA AUTO RESIZE ---
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight - 10) + 'px';
    sendBtn.disabled = chatInput.value.trim() === '' && !selectedFile;
});

// --- HANDLER UPLOAD FILE & GAMBAR ---
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    selectedFile = file;
    attachmentPreview.innerHTML = '';
    attachmentPreview.classList.remove('hidden');

    if (file.type.startsWith('image/')) {
        // Jika file berupa gambar, buat pratinjau thumbnail
        const reader = new FileReader();
        reader.onload = (event) => {
            attachmentPreview.innerHTML = `
                <div class="relative w-12 h-12 rounded overflow-hidden bg-zinc-800 border border-zinc-700">
                    <img src="${event.target.result}" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-col text-left">
                    <span class="text-xs text-gray-200 font-medium max-w-[150px] truncate">${file.name}</span>
                    <span class="text-[10px] text-gray-500">Gambar</span>
                </div>
                <button type="button" id="remove-file" class="text-gray-400 hover:text-white text-xs pl-2"><i class="fa-solid fa-xmark"></i></button>
            `;
            document.getElementById('remove-file').addEventListener('click', clearAttachment);
        };
        reader.readAsDataURL(file);
    } else {
        // Jika file berupa dokumen/skrip
        attachmentPreview.innerHTML = `
            <div class="w-10 h-10 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-gray-400">
                <i class="fa-solid fa-file-lines"></i>
            </div>
            <div class="flex flex-col text-left">
                <span class="text-xs text-gray-200 font-medium max-w-[150px] truncate">${file.name}</span>
                <span class="text-[10px] text-gray-500">${file.name.split('.').pop().toUpperCase()} File</span>
            </div>
            <button type="button" id="remove-file" class="text-gray-400 hover:text-white text-xs pl-2"><i class="fa-solid fa-xmark"></i></button>
        `;
        document.getElementById('remove-file').addEventListener('click', clearAttachment);
    }
    sendBtn.disabled = false;
});

function clearAttachment() {
    selectedFile = null;
    fileUpload.value = '';
    attachmentPreview.classList.add('hidden');
    attachmentPreview.innerHTML = '';
    sendBtn.disabled = chatInput.value.trim() === '';
}

// --- MANAJEMEN CHAT & RIWAYAT ---
function createNewChat() {
    const id = 'chat_' + Date.now();
    chats[id] = {
        title: 'Percakapan Baru',
        messages: []
    };
    currentChatId = id;
    renderHistory();
    switchChat(id);
    clearAttachment();
}

function switchChat(id) {
    currentChatId = id;
    const chat = chats[id];
    currentChatTitle.textContent = chat.title;

    // Kelola visibilitas Layar Awal vs Kotak Pesan
    if (chat.messages.length === 0) {
        welcomeScreen.classList.remove('hidden');
        chatMessages.classList.add('hidden');
    } else {
        welcomeScreen.classList.add('hidden');
        chatMessages.classList.remove('hidden');
        renderMessages(id);
    }

    // Sorot item aktif di sidebar
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('bg-zinc-800', 'text-white');
        if(item.dataset.id === id) item.classList.add('bg-zinc-800', 'text-white');
    });

    // Tutup sidebar otomatis di perangkat mobile setelah memilih chat
    if (window.innerWidth < 768) toggleSidebar();
}

function renderHistory() {
    // Kosongkan daftar kecuali judul kategori
    chatHistoryList.innerHTML = '<div class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Riwayat Percakapan</div>';
    
    Object.keys(chats).reverse().forEach(id => {
        const item = document.createElement('div');
        item.dataset.id = id;
        item.className = `history-item group w-full py-2.5 px-3 rounded-lg text-sm flex items-center justify-between cursor-pointer transition text-gray-400 hover:bg-zinc-800/60 hover:text-gray-200 ${id === currentChatId ? 'bg-zinc-800 text-white' : ''}`;
        item.innerHTML = `
            <div class="flex items-center space-x-2.5 min-w-0 flex-1">
                <i class="fa-regular fa-comment text-xs opacity-70"></i>
                <span class="truncate pr-2 font-medium">${chats[id].title}</span>
            </div>
        `;
        item.addEventListener('click', () => switchChat(id));
        chatHistoryList.appendChild(item);
    });
}

function renderMessages(id) {
    chatMessages.innerHTML = '';
    chats[id].messages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full animation-fade-in`;
        
        let contentHtml = '';
        
        // Render lampiran user jika ada
        if (msg.attachment) {
            if (msg.attachment.type.startsWith('image/')) {
                contentHtml += `<img src="${msg.attachment.data}" class="max-w-xs rounded-xl mb-2 border border-zinc-800 shadow-md">`;
            } else {
                contentHtml += `
                    <div class="flex items-center space-x-2 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg mb-2 max-w-xs">
                        <i class="fa-solid fa-file-lines text-gray-400"></i>
                        <span class="text-xs text-gray-300 truncate">${msg.attachment.name}</span>
                    </div>
                `;
            }
        }

        // Render teks utama atau gambar buatan AI
        if (msg.isAiImage) {
            contentHtml += `
                <div class="space-y-2">
                    <img src="${msg.text}" class="max-w-md w-full rounded-xl border border-zinc-800 shadow-xl">
                    <div class="flex space-x-2">
                        <a href="${msg.text}" download="dexone-ai-image.png" class="text-xs text-gray-400 hover:text-white flex items-center bg-zinc-900 px-2 py-1 rounded border border-zinc-800"><i class="fa-solid fa-download mr-1"></i> PNG</a>
                    </div>
                </div>
            `;
        } else {
            contentHtml += `<p class="text-sm leading-relaxed whitespace-pre-wrap">${msg.text}</p>`;
        }

        msgDiv.innerHTML = `
            <div class="flex items-start space-x-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 shadow ${msg.role === 'user' ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-emerald-400 border border-zinc-700'}">
                    ${msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div class="p-3 rounded-2xl ${msg.role === 'user' ? 'bg-zinc-800 text-gray-100 rounded-tr-none' : 'bg-transparent text-gray-200 rounded-tl-none'}">
                    ${contentHtml}
                </div>
            </div>
        `;
        chatMessages.appendChild(msgDiv);
    });
    
    // Smooth scroll ke pesan paling bawah
    setTimeout(() => {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }, 50);
}

// --- LOGIKA FORM SUBMIT DAN SIMULASI CORE AI ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text && !selectedFile) return;

    if (!currentChatId) createNewChat();

    const currentChat = chats[currentChatId];
    
    // Ganti judul percakapan berdasarkan input pertama kali user
    if (currentChat.messages.length === 0 && text) {
        currentChat.title = text.length > 24 ? text.substring(0, 24) + '...' : text;
        renderHistory();
    }

    // Siapkan objek attachment jika ada
    let msgAttachment = null;
    if (selectedFile) {
        if (selectedFile.type.startsWith('image/')) {
            msgAttachment = { name: selectedFile.name, type: selectedFile.type, data: await fileToDataURL(selectedFile) };
        } else {
            msgAttachment = { name: selectedFile.name, type: selectedFile.type, data: '#' };
        }
    }

    // Masukkan pesan User ke state
    currentChat.messages.push({ role: 'user', text: text, attachment: msgAttachment });
    
    // Refresh Tampilan Chat
    welcomeScreen.classList.add('hidden');
    chatMessages.classList.remove('hidden');
    renderMessages(currentChatId);

    // Reset Form Input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    clearAttachment();

    // --- PROSES RESPONS AI (SIMULASI) ---
    setTimeout(() => {
        let aiResponse = {};
        
        // Logika Deteksi Perintah Gambar /image
        if (text.toLowerCase().startsWith('/image')) {
            const prompt = text.replace(/\/image/i, '').trim();
            aiResponse = {
                role: 'assistant',
                isAiImage: true,
                // Menggunakan placeholder Unsplash resolusi tinggi sebagai mock-up hasil gambar AI
                text: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop`
            };
        } else {
            // Respons default simulasi teks chat biasa
            let replyText = `Terima kasih telah berinteraksi! Saya menerima pesan Anda.`;
            if (msgAttachment) replyText += `\n\nSaya juga mendeteksi bahwa Anda mengunggah berkas: *${msgAttachment.name}*. Saya siap menganalisisnya lebih lanjut.`;
            
            aiResponse = {
                role: 'assistant',
                isAiImage: false,
                text: replyText
            };
        }

        currentChat.messages.push(aiResponse);
        renderMessages(currentChatId);
    }, 1000);
});

// Helper fungsi mengubah file upload menjadi DataURL base64
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Inisialisasi awal saat web dimuat
newChatBtn.addEventListener('click', createNewChat);
createNewChat(); // Buat sesi chat pertama secara otomatis