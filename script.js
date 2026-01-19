// Главный модуль приложения
import { Api } from './modules/api.js';
import { Auth } from './modules/auth.js';
import { User } from './modules/user.js';
import { Chat } from './modules/chat.js';
import { UI } from './modules/ui.js';

// Инициализация приложения
class NexusChat {
    constructor() {
        this.api = new Api();
        this.auth = new Auth(this.api);
        this.user = new User(this.api);
        this.chat = new Chat(this.api);
        this.ui = new UI(this.api, this.auth, this.user, this.chat);
        
        this.init();
    }
    
    init() {
        // Проверяем, есть ли авторизованный пользователь
        const currentUser = this.api.getCurrentUser();
        
        if (currentUser) {
            this.ui.showMainScreen(currentUser);
            this.chat.loadChats(currentUser.id);
        } else {
            this.ui.showAuthScreen();
        }
        
        // Инициализация обработчиков событий
        this.ui.initEventListeners();
        
        console.log('NexusChat инициализирован');
    }
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.nexusChat = new NexusChat();
});

// Модуль API (имитация бэкенда)
export class Api {
    constructor() {
        // Инициализация данных, если их нет
        this.initStorage();
    }
    
    initStorage() {
        if (!localStorage.getItem('nexus_users')) {
            // Создаем демо-пользователей
            const demoUsers = [
                {
                    id: 1,
                    username: '@user1',
                    password: 'password123',
                    avatar: null,
                    banner: null,
                    status: 'online'
                },
                {
                    id: 2,
                    username: '@user2',
                    password: 'password123',
                    avatar: null,
                    banner: null,
                    status: 'online'
                },
                {
                    id: 3,
                    username: '@alex',
                    password: 'password123',
                    avatar: null,
                    banner: null,
                    status: 'away'
                },
                {
                    id: 4,
                    username: '@maria',
                    password: 'password123',
                    avatar: null,
                    banner: null,
                    status: 'offline'
                }
            ];
            
            localStorage.setItem('nexus_users', JSON.stringify(demoUsers));
        }
        
        if (!localStorage.getItem('nexus_chats')) {
            localStorage.setItem('nexus_chats', JSON.stringify({}));
        }
        
        if (!localStorage.getItem('nexus_theme')) {
            localStorage.setItem('nexus_theme', 'light');
        }
        
        // Устанавливаем тему
        const theme = localStorage.getItem('nexus_theme');
        document.getElementById('app').className = `${theme}-theme`;
    }
    
    // Работа с пользователями
    getUsers() {
        const users = localStorage.getItem('nexus_users');
        return users ? JSON.parse(users) : [];
    }
    
    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === parseInt(id));
    }
    
    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username.toLowerCase() === username.toLowerCase());
    }
    
    searchUsers(query) {
        if (!query || query.length < 2) return [];
        
        const users = this.getUsers();
        const currentUser = this.getCurrentUser();
        
        return users.filter(user => 
            user.id !== currentUser?.id && 
            user.username.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    createUser(username, password) {
        const users = this.getUsers();
        
        // Проверяем, существует ли пользователь
        if (this.getUserByUsername(username)) {
            return { success: false, message: 'Пользователь с таким именем уже существует' };
        }
        
        // Валидация имени пользователя
        if (!username.startsWith('@')) {
            return { success: false, message: 'Имя пользователя должно начинаться с @' };
        }
        
        if (username.length < 3) {
            return { success: false, message: 'Имя пользователя должно содержать минимум 3 символа' };
        }
        
        // Валидация пароля
        if (password.length < 6) {
            return { success: false, message: 'Пароль должен содержать минимум 6 символов' };
        }
        
        // Создаем нового пользователя
        const newUser = {
            id: Date.now(),
            username,
            password,
            avatar: null,
            banner: null,
            status: 'online'
        };
        
        users.push(newUser);
        localStorage.setItem('nexus_users', JSON.stringify(users));
        
        return { success: true, user: newUser };
    }
    
    updateUser(userId, updates) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) return { success: false, message: 'Пользователь не найден' };
        
        // Проверяем уникальность имени пользователя
        if (updates.username) {
            const existingUser = this.getUserByUsername(updates.username);
            if (existingUser && existingUser.id !== userId) {
                return { success: false, message: 'Имя пользователя уже занято' };
            }
            
            if (!updates.username.startsWith('@')) {
                return { success: false, message: 'Имя пользователя должно начинаться с @' };
            }
        }
        
        // Обновляем пользователя
        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem('nexus_users', JSON.stringify(users));
        
        // Обновляем текущего пользователя, если это он
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            localStorage.setItem('nexus_current_user', JSON.stringify(users[userIndex]));
        }
        
        return { success: true, user: users[userIndex] };
    }
    
    // Авторизация
    login(username, password) {
        const user = this.getUserByUsername(username);
        
        if (!user) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        if (user.password !== password) {
            return { success: false, message: 'Неверный пароль' };
        }
        
        // Обновляем статус
        this.updateUser(user.id, { status: 'online' });
        
        // Сохраняем текущего пользователя
        const updatedUser = this.getUserById(user.id);
        localStorage.setItem('nexus_current_user', JSON.stringify(updatedUser));
        
        return { success: true, user: updatedUser };
    }
    
    logout() {
        const currentUser = this.getCurrentUser();
        
        if (currentUser) {
            // Обновляем статус
            this.updateUser(currentUser.id, { status: 'offline' });
        }
        
        localStorage.removeItem('nexus_current_user');
        return { success: true };
    }
    
    getCurrentUser() {
        const userJson = localStorage.getItem('nexus_current_user');
        return userJson ? JSON.parse(userJson) : null;
    }
    
    // Работа с чатами
    getChats(userId) {
        const chats = localStorage.getItem('nexus_chats');
        const chatsObj = chats ? JSON.parse(chats) : {};
        return chatsObj[userId] || [];
    }
    
    getChat(userId, partnerId) {
        const chats = this.getChats(userId);
        return chats.find(chat => chat.partnerId === partnerId);
    }
    
    createChat(userId, partnerId) {
        const chats = this.getChats(userId);
        const existingChat = this.getChat(userId, partnerId);
        
        if (existingChat) {
            return { success: true, chat: existingChat };
        }
        
        const partner = this.getUserById(partnerId);
        if (!partner) {
            return { success: false, message: 'Пользователь не найден' };
        }
        
        const newChat = {
            id: Date.now(),
            partnerId,
            partnerName: partner.username,
            partnerAvatar: partner.avatar,
            lastMessage: null,
            lastMessageTime: null,
            messages: [],
            unread: 0
        };
        
        chats.push(newChat);
        this.saveChats(userId, chats);
        
        return { success: true, chat: newChat };
    }
    
    saveChats(userId, chats) {
        const allChatsJson = localStorage.getItem('nexus_chats');
        const allChats = allChatsJson ? JSON.parse(allChatsJson) : {};
        allChats[userId] = chats;
        localStorage.setItem('nexus_chats', JSON.stringify(allChats));
    }
    
    addMessage(userId, partnerId, message, isFromCurrentUser = true) {
        const chats = this.getChats(userId);
        let chat = this.getChat(userId, partnerId);
        
        // Если чата нет, создаем его
        if (!chat) {
            const chatResult = this.createChat(userId, partnerId);
            if (!chatResult.success) return chatResult;
            chat = chatResult.chat;
        }
        
        // Создаем сообщение
        const newMessage = {
            id: Date.now(),
            text: message,
            time: new Date().toISOString(),
            isFromCurrentUser
        };
        
        // Добавляем сообщение в чат
        chat.messages.push(newMessage);
        chat.lastMessage = message;
        chat.lastMessageTime = newMessage.time;
        
        // Обновляем чат в списке
        const chatIndex = chats.findIndex(c => c.partnerId === partnerId);
        if (chatIndex !== -1) {
            chats[chatIndex] = chat;
        }
        
        this.saveChats(userId, chats);
        
        // Также обновляем чат у собеседника (если он существует)
        const partnerChats = this.getChats(partnerId);
        let partnerChat = this.getChat(partnerId, userId);
        
        if (!partnerChat) {
            const currentUser = this.getCurrentUser();
            const partnerChatResult = this.createChat(partnerId, userId);
            if (partnerChatResult.success) {
                partnerChat = partnerChatResult.chat;
            }
        }
        
        if (partnerChat) {
            // Добавляем сообщение с точки зрения собеседника
            const partnerMessage = {
                id: newMessage.id,
                text: message,
                time: newMessage.time,
                isFromCurrentUser: false
            };
            
            partnerChat.messages.push(partnerMessage);
            partnerChat.lastMessage = message;
            partnerChat.lastMessageTime = newMessage.time;
            partnerChat.unread = (partnerChat.unread || 0) + 1;
            
            // Обновляем чат собеседника
            const partnerChatIndex = partnerChats.findIndex(c => c.partnerId === userId);
            if (partnerChatIndex !== -1) {
                partnerChats[partnerChatIndex] = partnerChat;
            }
            
            this.saveChats(partnerId, partnerChats);
        }
        
        return { success: true, message: newMessage, chat };
    }
    
    clearChat(userId, partnerId) {
        const chats = this.getChats(userId);
        const chatIndex = chats.findIndex(chat => chat.partnerId === partnerId);
        
        if (chatIndex === -1) {
            return { success: false, message: 'Чат не найден' };
        }
        
        // Очищаем сообщения, но оставляем сам чат
        chats[chatIndex].messages = [];
        chats[chatIndex].lastMessage = null;
        chats[chatIndex].lastMessageTime = null;
        
        this.saveChats(userId, chats);
        
        return { success: true };
    }
    
    // Работа с темой
    getTheme() {
        return localStorage.getItem('nexus_theme') || 'light';
    }
    
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            localStorage.setItem('nexus_theme', theme);
            return { success: true };
        }
        
        return { success: false, message: 'Недопустимая тема' };
    }
    
    // Уведомления
    showNotification(title, message, type = 'info') {
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            time: new Date()
        };
        
        // В реальном приложении здесь был бы вызов API для отправки уведомления
        console.log(`Уведомление: ${title} - ${message}`);
        
        return { success: true, notification };
    }
}

// Модуль авторизации
export class Auth {
    constructor(api) {
        this.api = api;
    }
    
    async register(username, password) {
        // Валидация
        if (!username || !password) {
            return { success: false, message: 'Заполните все поля' };
        }
        
        // Создаем пользователя через API
        const result = this.api.createUser(username, password);
        
        if (result.success) {
            // Автоматически входим после регистрации
            return this.login(username, password);
        }
        
        return result;
    }
    
    async login(username, password) {
        // Валидация
        if (!username || !password) {
            return { success: false, message: 'Заполните все поля' };
        }
        
        // Авторизация через API
        return this.api.login(username, password);
    }
    
    logout() {
        return this.api.logout();
    }
    
    validateUsername(username) {
        if (!username) return { valid: false, message: 'Введите имя пользователя' };
        
        if (!username.startsWith('@')) {
            return { valid: false, message: 'Имя пользователя должно начинаться с @' };
        }
        
        if (username.length < 3) {
            return { valid: false, message: 'Минимум 3 символа' };
        }
        
        if (username.length > 20) {
            return { valid: false, message: 'Максимум 20 символов' };
        }
        
        // Проверка на уникальность (только для регистрации)
        return { valid: true };
    }
    
    validatePassword(password) {
        if (!password) return { valid: false, message: 'Введите пароль' };
        
        if (password.length < 6) {
            return { valid: false, message: 'Минимум 6 символов' };
        }
        
        return { valid: true };
    }
}

// Модуль пользователя
export class User {
    constructor(api) {
        this.api = api;
    }
    
    updateProfile(userId, updates) {
        return this.api.updateUser(userId, updates);
    }
    
    updateAvatar(userId, avatarData) {
        return this.api.updateUser(userId, { avatar: avatarData });
    }
    
    updateBanner(userId, bannerData) {
        return this.api.updateUser(userId, { banner: bannerData });
    }
    
    changeTheme(theme) {
        return this.api.setTheme(theme);
    }
    
    getCurrentUser() {
        return this.api.getCurrentUser();
    }
}

// Модуль чата
export class Chat {
    constructor(api) {
        this.api = api;
        this.currentChat = null;
    }
    
    loadChats(userId) {
        return this.api.getChats(userId);
    }
    
    openChat(userId, partnerId) {
        // Создаем или получаем чат
        const chatResult = this.api.createChat(userId, partnerId);
        
        if (chatResult.success) {
            this.currentChat = chatResult.chat;
        }
        
        return chatResult;
    }
    
    sendMessage(userId, partnerId, message) {
        if (!message || message.trim() === '') {
            return { success: false, message: 'Введите текст сообщения' };
        }
        
        return this.api.addMessage(userId, partnerId, message.trim(), true);
    }
    
    clearChatHistory(userId, partnerId) {
        return this.api.clearChat(userId, partnerId);
    }
    
    searchUsers(query) {
        return this.api.searchUsers(query);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'только что';
        } else if (diffMins < 60) {
            return `${diffMins} мин назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч назад`;
        } else if (diffDays < 7) {
            return `${diffDays} дн назад`;
        } else {
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }
    }
}

// Модуль пользовательского интерфейса
export class UI {
    constructor(api, auth, user, chat) {
        this.api = api;
        this.auth = auth;
        this.user = user;
        this.chat = chat;
        this.currentUser = null;
        this.searchTimeout = null;
        
        // Получаем DOM-элементы
        this.elements = {
            // Экран авторизации
            authScreen: document.getElementById('auth-screen'),
            mainScreen: document.getElementById('main-screen'),
            authForm: document.getElementById('auth-form'),
            authToggleBtns: document.querySelectorAll('.toggle-btn'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            usernameError: document.getElementById('username-error'),
            passwordError: document.getElementById('password-error'),
            authSubmit: document.getElementById('auth-submit'),
            authMessage: document.getElementById('auth-message'),
            authSubmitText: document.querySelector('#auth-submit .btn-text'),
            authSubmitSpinner: document.querySelector('#auth-submit .fa-spinner'),
            
            // Основной интерфейс
            currentUsername: document.getElementById('current-username'),
            currentUserAvatar: document.getElementById('current-user-avatar'),
            userSearch: document.getElementById('user-search'),
            searchResults: document.getElementById('search-results'),
            chatsList: document.getElementById('chats-list'),
            chatsCount: document.getElementById('chats-count'),
            
            // Чат
            chatHeader: document.getElementById('chat-header'),
            chatPartnerName: document.getElementById('chat-partner-name'),
            chatPartnerAvatar: document.getElementById('chat-partner-avatar'),
            chatPartnerStatus: document.getElementById('chat-partner-status'),
            messagesList: document.getElementById('messages-list'),
            messageFormContainer: document.getElementById('message-form-container'),
            messageForm: document.getElementById('message-form'),
            messageInput: document.getElementById('message-input'),
            clearChatBtn: document.getElementById('clear-chat'),
            
            // Настройки
            settingsPanel: document.getElementById('settings-panel'),
            settingsToggle: document.getElementById('settings-toggle'),
            closeSettings: document.getElementById('close-settings'),
            profileUsername: document.getElementById('profile-username'),
            profileUsernameError: document.getElementById('profile-username-error'),
            avatarPreview: document.getElementById('avatar-preview'),
            bannerPreview: document.getElementById('banner-preview'),
            changeAvatarBtn: document.getElementById('change-avatar'),
            changeBannerBtn: document.getElementById('change-banner'),
            avatarInput: document.getElementById('avatar-input'),
            bannerInput: document.getElementById('banner-input'),
            saveProfileBtn: document.getElementById('save-profile'),
            themeOptions: document.querySelectorAll('.theme-option'),
            logoutBtn: document.getElementById('logout-btn'),
            
            // Уведомления
            notificationContainer: document.getElementById('notification-container'),
            
            // Приложение
            app: document.getElementById('app')
        };
    }
    
    initEventListeners() {
        // Переключение между входом и регистрацией
        this.elements.authToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => this.toggleAuthMode(btn.dataset.mode));
        });
        
        // Форма авторизации/регистрации
        this.elements.authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        
        // Валидация в реальном времени
        this.elements.usernameInput.addEventListener('input', () => this.validateAuthFields());
        this.elements.passwordInput.addEventListener('input', () => this.validateAuthFields());
        
        // Поиск пользователей
        this.elements.userSearch.addEventListener('input', () => this.handleUserSearch());
        
        // Отправка сообщения
        this.elements.messageForm.addEventListener('submit', (e) => this.handleMessageSubmit(e));
        
        // Очистка чата
        this.elements.clearChatBtn.addEventListener('click', () => this.handleClearChat());
        
        // Настройки
        this.elements.settingsToggle.addEventListener('click', () => this.toggleSettingsPanel(true));
        this.elements.closeSettings.addEventListener('click', () => this.toggleSettingsPanel(false));
        
        // Изменение аватара и баннера
        this.elements.changeAvatarBtn.addEventListener('click', () => this.elements.avatarInput.click());
        this.elements.changeBannerBtn.addEventListener('click', () => this.elements.bannerInput.click());
        this.elements.avatarInput.addEventListener('change', (e) => this.handleImageUpload(e, 'avatar'));
        this.elements.bannerInput.addEventListener('change', (e) => this.handleImageUpload(e, 'banner'));
        
        // Сохранение профиля
        this.elements.saveProfileBtn.addEventListener('click', () => this.handleSaveProfile());
        this.elements.profileUsername.addEventListener('input', () => this.validateProfileUsername());
        
        // Выбор темы
        this.elements.themeOptions.forEach(option => {
            option.addEventListener('click', () => this.handleThemeChange(option.dataset.theme));
        });
        
        // Выход из аккаунта
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Закрытие панели настроек при клике вне ее
        document.addEventListener('click', (e) => {
            if (this.elements.settingsPanel.classList.contains('active') &&
                !this.elements.settingsPanel.contains(e.target) &&
                !this.elements.settingsToggle.contains(e.target)) {
                this.toggleSettingsPanel(false);
            }
        });
        
        // Закрытие результатов поиска при клике вне их
        document.addEventListener('click', (e) => {
            if (!this.elements.userSearch.contains(e.target) && 
                !this.elements.searchResults.contains(e.target)) {
                this.elements.searchResults.classList.add('hidden');
            }
        });
    }
    
    // Экран авторизации
    showAuthScreen() {
        this.elements.authScreen.classList.add('active');
        this.elements.mainScreen.classList.remove('active');
        
        // Сбрасываем форму
        this.elements.authForm.reset();
        this.elements.authMessage.textContent = '';
        this.elements.authMessage.className = 'auth-message';
        
        // Устанавливаем режим входа по умолчанию
        this.toggleAuthMode('login');
    }
    
    showMainScreen(user) {
        this.currentUser = user;
        
        this.elements.authScreen.classList.remove('active');
        this.elements.mainScreen.classList.add('active');
        
        // Обновляем информацию о текущем пользователе
        this.updateUserInfo(user);
        
        // Загружаем чаты
        this.renderChats();
        
        // Применяем сохраненную тему
        this.applyTheme(this.api.getTheme());
    }
    
    toggleAuthMode(mode) {
        // Обновляем активные кнопки
        this.elements.authToggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Обновляем текст кнопки отправки
        const submitText = mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт';
        this.elements.authSubmitText.textContent = submitText;
        
        // Сбрасываем сообщения об ошибках
        this.elements.authMessage.textContent = '';
        this.elements.authMessage.className = 'auth-message';
        
        // Валидируем поля заново
        this.validateAuthFields();
    }
    
    validateAuthFields() {
        const username = this.elements.usernameInput.value.trim();
        const password = this.elements.passwordInput.value;
        
        // Валидация имени пользователя
        const usernameValidation = this.auth.validateUsername(username);
        this.elements.usernameError.textContent = usernameValidation.message || '';
        
        // Валидация пароля
        const passwordValidation = this.auth.validatePassword(password);
        this.elements.passwordError.textContent = passwordValidation.message || '';
        
        // Активация/деактивация кнопки отправки
        const isFormValid = usernameValidation.valid && passwordValidation.valid;
        this.elements.authSubmit.disabled = !isFormValid;
        
        return isFormValid;
    }
    
    async handleAuthSubmit(e) {
        e.preventDefault();
        
        if (!this.validateAuthFields()) return;
        
        const username = this.elements.usernameInput.value.trim();
        const password = this.elements.passwordInput.value;
        const isLoginMode = document.querySelector('.toggle-btn.active').dataset.mode === 'login';
        
        // Показываем индикатор загрузки
        this.elements.authSubmitText.classList.add('hidden');
        this.elements.authSubmitSpinner.classList.remove('hidden');
        this.elements.authSubmit.disabled = true;
        
        try {
            let result;
            
            if (isLoginMode) {
                result = await this.auth.login(username, password);
            } else {
                result = await this.auth.register(username, password);
            }
            
            if (result.success) {
                this.showMainScreen(result.user);
                this.showNotification('Успешный вход', `Добро пожаловать, ${result.user.username}!`, 'success');
            } else {
                this.elements.authMessage.textContent = result.message;
                this.elements.authMessage.className = 'auth-message error';
            }
        } catch (error) {
            this.elements.authMessage.textContent = 'Произошла ошибка. Попробуйте еще раз.';
            this.elements.authMessage.className = 'auth-message error';
            console.error('Auth error:', error);
        } finally {
            // Скрываем индикатор загрузки
            this.elements.authSubmitText.classList.remove('hidden');
            this.elements.authSubmitSpinner.classList.add('hidden');
            this.elements.authSubmit.disabled = false;
        }
    }
    
    // Обновление информации о пользователе
    updateUserInfo(user) {
        this.elements.currentUsername.textContent = user.username;
        
        // Обновляем аватар
        this.updateAvatarPreview(this.elements.currentUserAvatar, user.avatar);
        
        // Обновляем данные в настройках
        this.elements.profileUsername.value = user.username;
        this.updateAvatarPreview(this.elements.avatarPreview, user.avatar);
        this.updateBannerPreview(user.banner);
    }
    
    updateAvatarPreview(element, avatarData) {
        if (avatarData) {
            element.innerHTML = `<img src="${avatarData}" alt="Аватар">`;
        } else {
            element.innerHTML = '<i class="fas fa-user"></i>';
        }
    }
    
    updateBannerPreview(bannerData) {
        if (bannerData) {
            this.elements.bannerPreview.innerHTML = `
                <img src="${bannerData}" alt="Баннер">
                <button id="change-banner" class="edit-overlay">
                    <i class="fas fa-camera"></i> Сменить баннер
                </button>
            `;
            
            // Добавляем обработчик для новой кнопки
            document.getElementById('change-banner').addEventListener('click', () => {
                this.elements.bannerInput.click();
            });
        } else {
            this.elements.bannerPreview.innerHTML = `
                <button id="change-banner" class="edit-overlay">
                    <i class="fas fa-camera"></i> Сменить баннер
                </button>
            `;
            
            // Добавляем обработчик для новой кнопки
            document.getElementById('change-banner').addEventListener('click', () => {
                this.elements.bannerInput.click();
            });
        }
    }
    
    // Поиск пользователей
    handleUserSearch() {
        clearTimeout(this.searchTimeout);
        
        const query = this.elements.userSearch.value.trim();
        
        if (!query || query.length < 2) {
            this.elements.searchResults.classList.add('hidden');
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            const results = this.chat.searchUsers(query);
            this.renderSearchResults(results);
        }, 300);
    }
    
    renderSearchResults(users) {
        if (users.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="search-result-info">
                        <p>Пользователи не найдены</p>
                    </div>
                </div>
            `;
        } else {
            this.elements.searchResults.innerHTML = users.map(user => `
                <div class="search-result-item" data-user-id="${user.id}">
                    <div class="avatar-small">
                        ${user.avatar ? `<img src="${user.avatar}" alt="${user.username}">` : '<i class="fas fa-user"></i>'}
                    </div>
                    <div class="search-result-info">
                        <h4>${user.username}</h4>
                        <p>${user.status === 'online' ? 'В сети' : user.status === 'away' ? 'Неактивен' : 'Не в сети'}</p>
                    </div>
                </div>
            `).join('');
            
            // Добавляем обработчики для результатов поиска
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const userId = parseInt(item.dataset.userId);
                    this.openChatWithUser(userId);
                    this.elements.searchResults.classList.add('hidden');
                    this.elements.userSearch.value = '';
                });
            });
        }
        
        this.elements.searchResults.classList.remove('hidden');
    }
    
    // Работа с чатами
    async openChatWithUser(partnerId) {
        if (!this.currentUser) return;
        
        const result = this.chat.openChat(this.currentUser.id, partnerId);
        
        if (result.success) {
            this.chat.currentChat = result.chat;
            this.renderChat(result.chat);
            this.showChatInterface();
        } else {
            this.showNotification('Ошибка', result.message, 'error');
        }
    }
    
    renderChats() {
        if (!this.currentUser) return;
        
        const chats = this.chat.loadChats(this.currentUser.id);
        
        // Обновляем счетчик чатов
        this.elements.chatsCount.textContent = chats.length;
        
        if (chats.length === 0) {
            this.elements.chatsList.innerHTML = `
                <div class="empty-chats">
                    <i class="fas fa-comment-slash"></i>
                    <p>У вас пока нет чатов</p>
                    <p class="small-text">Начните общение, найдя пользователя через поиск</p>
                </div>
            `;
            return;
        }
        
        // Сортируем чаты по времени последнего сообщения
        const sortedChats = [...chats].sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        });
        
        this.elements.chatsList.innerHTML = sortedChats.map(chat => `
            <div class="chat-item" data-chat-partner-id="${chat.partnerId}">
                <div class="avatar-small">
                    ${chat.partnerAvatar ? `<img src="${chat.partnerAvatar}" alt="${chat.partnerName}">` : '<i class="fas fa-user"></i>'}
                </div>
                <div class="chat-info">
                    <h4>${chat.partnerName}</h4>
                    <p class="chat-preview">${chat.lastMessage || 'Нет сообщений'}</p>
                </div>
                <div class="chat-time">${chat.lastMessageTime ? this.chat.formatTime(chat.lastMessageTime) : ''}</div>
            </div>
        `).join('');
        
        // Добавляем обработчики для чатов
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const partnerId = parseInt(item.dataset.chatPartnerId);
                this.openChatWithUser(partnerId);
                
                // Выделяем активный чат
                document.querySelectorAll('.chat-item').forEach(chat => chat.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
    
    renderChat(chat) {
        if (!chat) return;
        
        // Обновляем информацию о собеседнике
        const partner = this.api.getUserById(chat.partnerId);
        
        if (partner) {
            this.elements.chatPartnerName.textContent = partner.username;
            this.elements.chatPartnerStatus.textContent = partner.status === 'online' ? 'В сети' : 'Не в сети';
            this.elements.chatPartnerStatus.className = `user-status ${partner.status}`;
            this.updateAvatarPreview(this.elements.chatPartnerAvatar, partner.avatar);
        }
        
        // Рендерим сообщения
        this.renderMessages(chat.messages);
        
        // Прокручиваем к последнему сообщению
        this.scrollToBottom();
    }
    
    renderMessages(messages) {
        if (!messages || messages.length === 0) {
            this.elements.messagesList.innerHTML = `
                <div class="empty-chats">
                    <i class="fas fa-comment"></i>
                    <p>Нет сообщений</p>
                    <p class="small-text">Начните общение, отправив первое сообщение</p>
                </div>
            `;
            return;
        }
        
        this.elements.messagesList.innerHTML = messages.map(message => `
            <div class="message ${message.isFromCurrentUser ? 'message-self' : 'message-other'}">
                ${!message.isFromCurrentUser ? `<div class="message-sender">${this.chat.currentChat?.partnerName || 'Собеседник'}</div>` : ''}
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                <div class="message-time">${this.chat.formatTime(message.time)}</div>
            </div>
        `).join('');
    }
    
    showChatInterface() {
        this.elements.chatHeader.classList.remove('hidden');
        this.elements.messageFormContainer.classList.remove('hidden');
        
        // Фокус на поле ввода
        setTimeout(() => {
            this.elements.messageInput.focus();
        }, 100);
    }
    
    async handleMessageSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser || !this.chat.currentChat) return;
        
        const message = this.elements.messageInput.value.trim();
        if (!message) return;
        
        // Отправляем сообщение
        const result = this.chat.sendMessage(
            this.currentUser.id, 
            this.chat.currentChat.partnerId, 
            message
        );
        
        if (result.success) {
            // Очищаем поле ввода
            this.elements.messageInput.value = '';
            
            // Обновляем отображение чата
            this.renderChat(result.chat);
            
            // Обновляем список чатов
            this.renderChats();
            
            // Прокручиваем к последнему сообщению
            this.scrollToBottom();
            
            // Показываем уведомление
            if (Notification.permission === 'granted' && document.hidden) {
                const partner = this.api.getUserById(this.chat.currentChat.partnerId);
                new Notification('NexusChat', {
                    body: `Новое сообщение от ${partner?.username || 'собеседника'}`,
                    icon: partner?.avatar || '/favicon.ico'
                });
            }
        } else {
            this.showNotification('Ошибка', result.message, 'error');
        }
    }
    
    async handleClearChat() {
        if (!this.currentUser || !this.chat.currentChat) return;
        
        if (confirm('Вы уверены, что хотите очистить историю этого чата?')) {
            const result = this.chat.clearChatHistory(
                this.currentUser.id, 
                this.chat.currentChat.partnerId
            );
            
            if (result.success) {
                this.renderChat(this.chat.currentChat);
                this.showNotification('История очищена', 'Все сообщения в этом чате удалены', 'info');
            } else {
                this.showNotification('Ошибка', result.message, 'error');
            }
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.elements.messagesList.scrollTop = this.elements.messagesList.scrollHeight;
        }, 100);
    }
    
    // Настройки
    toggleSettingsPanel(show) {
        if (show) {
            this.elements.settingsPanel.classList.add('active');
        } else {
            this.elements.settingsPanel.classList.remove('active');
        }
    }
    
    validateProfileUsername() {
        const username = this.elements.profileUsername.value.trim();
        const validation = this.auth.validateUsername(username);
        
        this.elements.profileUsernameError.textContent = validation.message || '';
        
        return validation.valid;
    }
    
    async handleSaveProfile() {
        if (!this.currentUser) return;
        
        const username = this.elements.profileUsername.value.trim();
        
        if (!this.validateProfileUsername()) return;
        
        // Показываем индикатор загрузки
        const originalText = this.elements.saveProfileBtn.innerHTML;
        this.elements.saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
        this.elements.saveProfileBtn.disabled = true;
        
        try {
            const result = this.user.updateProfile(this.currentUser.id, { username });
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUserInfo(result.user);
                this.showNotification('Профиль обновлен', 'Изменения сохранены успешно', 'success');
                
                // Обновляем список чатов, если имя пользователя изменилось
                this.renderChats();
            } else {
                this.elements.profileUsernameError.textContent = result.message;
                this.showNotification('Ошибка', result.message, 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Ошибка', 'Не удалось сохранить изменения', 'error');
        } finally {
            // Восстанавливаем кнопку
            this.elements.saveProfileBtn.innerHTML = originalText;
            this.elements.saveProfileBtn.disabled = false;
        }
    }
    
    async handleImageUpload(e, type) {
        const file = e.target.files[0];
        if (!file || !this.currentUser) return;
        
        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            this.showNotification('Ошибка', 'Выберите файл изображения', 'error');
            return;
        }
        
        // Проверяем размер файла (максимум 5 МБ)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Ошибка', 'Размер файла не должен превышать 5 МБ', 'error');
            return;
        }
        
        // Читаем файл как Data URL
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const imageData = event.target.result;
            
            // Показываем индикатор загрузки
            const originalText = type === 'avatar' 
                ? this.elements.changeAvatarBtn.innerHTML 
                : this.elements.changeBannerBtn.innerHTML;
            
            if (type === 'avatar') {
                this.elements.changeAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
                this.elements.changeAvatarBtn.disabled = true;
            }
            
            try {
                // Обновляем аватар или баннер
                let result;
                if (type === 'avatar') {
                    result = this.user.updateAvatar(this.currentUser.id, imageData);
                } else {
                    result = this.user.updateBanner(this.currentUser.id, imageData);
                }
                
                if (result.success) {
                    this.currentUser = result.user;
                    
                    // Обновляем превью
                    if (type === 'avatar') {
                        this.updateAvatarPreview(this.elements.avatarPreview, imageData);
                        this.updateAvatarPreview(this.elements.currentUserAvatar, imageData);
                    } else {
                        this.updateBannerPreview(imageData);
                    }
                    
                    this.showNotification('Успешно', `${type === 'avatar' ? 'Аватар' : 'Баннер'} обновлен`, 'success');
                } else {
                    this.showNotification('Ошибка', result.message, 'error');
                }
            } catch (error) {
                console.error(`Error updating ${type}:`, error);
                this.showNotification('Ошибка', `Не удалось загрузить ${type === 'avatar' ? 'аватар' : 'баннер'}`, 'error');
            } finally {
                // Восстанавливаем кнопку
                if (type === 'avatar') {
                    this.elements.changeAvatarBtn.innerHTML = originalText;
                    this.elements.changeAvatarBtn.disabled = false;
                }
                
                // Сбрасываем значение input
                e.target.value = '';
            }
        };
        
        reader.onerror = () => {
            this.showNotification('Ошибка', 'Не удалось прочитать файл', 'error');
            e.target.value = '';
        };
        
        reader.readAsDataURL(file);
    }
    
    // Темы
    applyTheme(theme) {
        document.getElementById('app').className = `${theme}-theme`;
        
        // Обновляем отображение активной темы
        this.elements.themeOptions.forEach(option => {
            const icon = option.querySelector('.check-icon');
            if (option.dataset.theme === theme) {
                option.classList.add('active');
                icon.classList.remove('hidden');
            } else {
                option.classList.remove('active');
                icon.classList.add('hidden');
            }
        });
    }
    
    handleThemeChange(theme) {
        const result = this.user.changeTheme(theme);
        
        if (result.success) {
            this.applyTheme(theme);
            this.showNotification('Тема изменена', `Применена ${theme === 'light' ? 'светлая' : 'тёмная'} тема`, 'info');
        }
    }
    
    // Выход из аккаунта
    async handleLogout() {
        if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
            const result = this.auth.logout();
            
            if (result.success) {
                this.showAuthScreen();
                this.showNotification('Вы вышли из аккаунта', 'Возвращайтесь скорее!', 'info');
            }
        }
    }
    
    // Уведомления
    showNotification(title, message, type = 'info') {
        const notificationId = Date.now();
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${notificationId}`;
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        this.elements.notificationContainer.appendChild(notification);
        
        // Автоматическое удаление уведомления через 5 секунд
        setTimeout(() => {
            const notif = document.getElementById(`notification-${notificationId}`);
            if (notif) {
                notif.style.opacity = '0';
                notif.style.transform = 'translateX(100%)';
                
                setTimeout(() => {
                    if (notif.parentNode) {
                        notif.parentNode.removeChild(notif);
                    }
                }, 300);
            }
        }, 5000);
        
        // Запрос разрешения на уведомления
        if (type === 'success' && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    // Вспомогательные методы
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем отдельные файлы для каждого модуля
// Для простоты в этом примере все модули находятся в одном файле
// В реальном проекте нужно разбить на отдельные файлы:
// modules/
//   api.js
//   auth.js
//   user.js
//   chat.js
//   ui.js