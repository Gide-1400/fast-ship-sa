// ============================================
// FastShip Global - Session Management
// ============================================
// ملف مشترك لإدارة جلسات المستخدمين في جميع صفحات الموقع

class SessionManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    // Initialize session management
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        try {
            // Wait for Supabase to be ready
            if (!window.supabaseClient) {
                await this._waitForSupabase();
            }

            // Check existing session
            const { data: { session }, error } = await window.supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Session check error:', error);
                this.currentUser = null;
            } else if (session) {
                await this._loadUserProfile(session.user);
                console.log('Session found, user loaded');
            } else {
                this.currentUser = null;
                console.log('No session found');
            }

            // Listen for auth changes
            window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);
                
                if (event === 'SIGNED_IN' && session) {
                    await this._loadUserProfile(session.user);
                    this._updateAllNavbars();
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this._updateAllNavbars();
                }
            });

            this.isInitialized = true;
            this._updateAllNavbars();
            console.log('Session manager initialized, final state:', this.currentUser);
            
        } catch (error) {
            console.error('Session initialization error:', error);
            this.currentUser = null;
        }
    }

    // Wait for Supabase to be loaded
    async _waitForSupabase(maxWait = 5000) {
        const startTime = Date.now();
        
        while (!window.supabaseClient && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }
    }

    // Load user profile from database
    async _loadUserProfile(authUser) {
        try {
            const { data: profile, error } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found error is OK
                console.error('Profile load error:', error);
            }

            this.currentUser = {
                id: authUser.id,
                email: authUser.email,
                profile: profile || null
            };

            console.log('User profile loaded:', this.currentUser);
            // Update UI immediately after loading profile
            this._updateAllNavbars();

        } catch (error) {
            console.error('Error loading user profile:', error);
            this.currentUser = {
                id: authUser.id,
                email: authUser.email,
                profile: null
            };
        }
    }

    // Update all navigation bars on the page
    _updateAllNavbars() {
        // Update main navbar
        this._updateNavbar();
        
        // Update any sidebar navbars (for dashboard pages)
        this._updateSidebarNavbar();
    }

    // Update main navigation bar
    _updateNavbar() {
        const notLoggedInMenu = document.getElementById('notLoggedInMenu');
        const loggedInMenu = document.getElementById('loggedInMenu');
        const userName = document.getElementById('userName');
        const userNameDisplay = document.getElementById('userNameDisplay');

        console.log('Updating navbar, isLoggedIn:', this.isLoggedIn(), 'currentUser:', this.currentUser);

        if (!notLoggedInMenu || !loggedInMenu) {
            console.log('Navbar elements not found');
            return; // Not on a page with these elements
        }

        if (this.isLoggedIn()) {
            console.log('Showing logged in state');
            // Show logged in state
            notLoggedInMenu.classList.add('hidden');
            loggedInMenu.classList.remove('hidden');
            
            const displayName = this.currentUser.profile?.full_name ||
                               this.currentUser.profile?.email?.split('@')[0] ||
                               this.currentUser.email?.split('@')[0] ||
                               'المستخدم';
            
            console.log('Display name:', displayName);
            if (userName) userName.textContent = displayName;
            if (userNameDisplay) userNameDisplay.textContent = displayName;

        } else {
            console.log('Showing logged out state');
            // Show logged out state
            notLoggedInMenu.classList.remove('hidden');
            loggedInMenu.classList.add('hidden');
        }
    }

    // Update sidebar navigation (for dashboard pages)
    _updateSidebarNavbar() {
        const userInfo = document.querySelector('.user-info');
        const userNameSidebar = document.getElementById('userNameSidebar');
        const userEmailSidebar = document.getElementById('userEmailSidebar');

        if (userInfo && this.isLoggedIn()) {
            const displayName = this.currentUser.profile?.full_name || 
                               this.currentUser.email?.split('@')[0] || 
                               'المستخدم';
            
            const email = this.currentUser.email || '';

            if (userNameSidebar) userNameSidebar.textContent = displayName;
            if (userEmailSidebar) userEmailSidebar.textContent = email;
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get user type (shipper or carrier)
    getUserType() {
        // First try to get from profile
        if (this.currentUser?.profile?.user_type) {
            return this.currentUser.profile.user_type;
        }

        // Fallback: try to get from localStorage (for backwards compatibility)
        try {
            const userData = localStorage.getItem('fastship_user');
            if (userData) {
                const user = JSON.parse(userData);
                return user.user_metadata?.user_type || null;
            }
        } catch (e) {}

        return null;
    }

    // Wait for user profile to be loaded (with timeout)
    async waitForUserProfile(maxWait = 5000) {
        const startTime = Date.now();

        while (!this.currentUser?.profile?.user_type && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return this.getUserType();
    }

    // Logout user
    async logout() {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            
            this.currentUser = null;
            
            // Clear any local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Update UI
            this._updateAllNavbars();
            
            // Redirect to home page
            if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('/public/')) {
                window.location.href = this._getHomePath();
            }
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    // Go to appropriate dashboard
    async goToDashboard() {
        if (!this.isLoggedIn()) {
            window.location.href = this._getAuthPath('login.html');
            return;
        }
        // إذا لم يوجد صف للمستخدم في جدول users، أنشئه تلقائياً
        if (!this.currentUser?.profile) {
            // جلب بيانات المستخدم من Supabase Auth/localStorage
            let userType = null;
            let fullName = null;
            let phone = null;
            let email = this.currentUser?.email;
            try {
                const userData = localStorage.getItem('fastship_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    userType = user.user_metadata?.user_type;
                    fullName = user.user_metadata?.full_name || '';
                    phone = user.user_metadata?.phone || '';
                }
            } catch (e) {}
            if (!userType) userType = 'shipper'; // fallback
            // محاولة إنشاء صف users
            try {
                const { data: userData, error: userError } = await window.supabaseClient
                    .from('users')
                    .insert([
                        {
                            auth_user_id: this.currentUser.id,
                            email: email,
                            full_name: fullName || email,
                            phone: phone || '',
                            user_type: userType
                        }
                    ])
                    .select()
                    .single();

                if (userError) {
                    alert('تعذر إنشاء بياناتك تلقائياً. يرجى التواصل مع الدعم.');
                    window.location.href = this._getAuthPath('register.html');
                    return;
                }

                // إنشاء سجل في جدول shippers أو carriers حسب نوع المستخدم
                if (userType === 'shipper') {
                    const { error: shipperError } = await window.supabaseClient
                        .from('shippers')
                        .insert([
                            {
                                user_id: userData.id,
                                company_name: fullName || email,
                                status: 'active'
                            }
                        ]);

                    if (shipperError) {
                        console.error('Error creating shipper record:', shipperError);
                        // لا تفشل العملية بالكامل إذا فشل إنشاء سجل shipper
                    }
                } else if (userType === 'carrier') {
                    const { error: carrierError } = await window.supabaseClient
                        .from('carriers')
                        .insert([
                            {
                                user_id: userData.id,
                                vehicle_type: 'any',
                                status: 'active'
                            }
                        ]);

                    if (carrierError) {
                        console.error('Error creating carrier record:', carrierError);
                        // لا تفشل العملية بالكامل إذا فشل إنشاء سجل carrier
                    }
                }

                // إعادة تحميل بيانات المستخدم بعد الإنشاء
                await this._loadUserProfile({ id: this.currentUser.id, email });
            } catch (e) {
                alert('حدث خطأ أثناء إنشاء بياناتك. يرجى التواصل مع الدعم.');
                window.location.href = this._getAuthPath('register.html');
                return;
            }
        }
        // تصحيح التوجيه حسب نوع المستخدم
        let userType = this.getUserType();
        // fallback: إذا كان userType غير موجود، جرب جلبه من localStorage
        if (!userType) {
            try {
                const userData = localStorage.getItem('fastship_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    userType = user.user_metadata?.user_type;
                }
            } catch (e) {}
        }
        if (userType === 'shipper') {
            window.location.href = this._getDashboardPath('shipper/index.html');
        } else if (userType === 'carrier') {
            window.location.href = this._getDashboardPath('carrier/index.html');
        } else {
            alert('نوع المستخدم غير معروف. يرجى إكمال بياناتك أو التواصل مع الدعم.');
            window.location.href = this._getAuthPath('register.html');
        }
    }

    // Helper to get correct path based on current location
    _getHomePath() {
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return '../../index.html';
        }
        return 'index.html';
    }

    _getAuthPath(page) {
        const path = window.location.pathname;
        if (path.includes('/pages/auth/')) {
            return page;
        } else if (path.includes('/pages/')) {
            return `../auth/${page}`;
        }
        return `pages/auth/${page}`;
    }

    _getDashboardPath(page) {
        const path = window.location.pathname;
        if (path.includes('/shipper-app/') || path.includes('/pages/shipper/')) {
            return `../${page}`;
        } else if (path.includes('/carrier-app/')) {
            return `../${page}`;
        } else if (path.includes('/pages/')) {
            return page;
        }
        return `pages/${page}`;
    }

    // Require authentication (redirect to login if not logged in)
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = this._getAuthPath('login.html');
            return false;
        }
        return true;
    }

    // Require specific user type (shipper or carrier)
    requireUserType(requiredType) {
        if (requiredType !== 'shipper' && requiredType !== 'carrier') {
            throw new Error('Invalid user type. Only shipper or carrier is supported.');
        }

        if (!this.requireAuth()) return false;

        const userType = this.getUserType();
        if (userType !== requiredType) {
            alert('غير مصرح لك بالوصول إلى هذه الصفحة');
            this.goToDashboard();
            return false;
        }
        return true;
    }

    // Create a notification for a user
    async createNotification(userId, type, title, message, relatedId = null) {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await window.supabaseClient
                .from('notifications')
                .insert([{
                    user_id: userId,
                    type: type,
                    title: title,
                    message: message,
                    related_id: relatedId,
                    is_read: false
                }])
                .select()
                .single();

            if (error) throw error;

            console.log('Notification created:', data);
            return data;
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    // Create a system notification for current user
    async createSystemNotification(title, message, relatedId = null) {
        if (!this.currentUser) return null;
        return this.createNotification(this.currentUser.id, 'system', title, message, relatedId);
    }

    // Create a shipment notification for current user
    async createShipmentNotification(title, message, shipmentId) {
        if (!this.currentUser) return null;
        return this.createNotification(this.currentUser.id, 'shipment', title, message, shipmentId);
    }

    // Create a message notification for current user
    async createMessageNotification(title, message, messageId) {
        if (!this.currentUser) return null;
        return this.createNotification(this.currentUser.id, 'message', title, message, messageId);
    }
}

// Create global session manager instance
window.sessionManager = new SessionManager();

// Global functions for backwards compatibility
window.toggleAccountMenu = function() {
    const menu = document.getElementById('accountMenu');
    const userMenu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
};

window.toggleUserMenu = function() {
    const menu = document.getElementById('userMenu');
    const accountMenu = document.getElementById('accountMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        if (accountMenu) accountMenu.classList.add('hidden');
    }
};

window.goToDashboard = function() {
    window.sessionManager.goToDashboard();
};

window.logout = async function() {
    const success = await window.sessionManager.logout();
    if (success) {
        alert('تم تسجيل الخروج بنجاح');
    } else {
        alert('حدث خطأ أثناء تسجيل الخروج');
    }
};

window.viewProfile = function() {
    alert('صفحة الملف الشخصي قيد التطوير');
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.sessionManager.init().catch(error => {
            console.error('Session manager initialization failed:', error);
        });
    }, 100);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}