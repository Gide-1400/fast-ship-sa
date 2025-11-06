// ============================================
// FastShip Global - Test Login Helper
// ============================================
// ملف مساعد لتسهيل تسجيل الدخول للاختبار
// استخدمه في console أو أضفه كـ script tag
//
// Usage:
// 1. Open browser console
// 2. Copy and paste this code
// 3. Call: await testLogin('test@example.com', 'password123')
//
// ============================================

// Test login function
async function testLogin(email = 'test@example.com', password = 'password123') {
    try {
        console.log('🔄 Attempting test login...');

        // Sign in with Supabase
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('❌ Login error:', error);
            alert('فشل تسجيل الدخول: ' + error.message);
            return false;
        }

        if (data.user) {
            console.log('✅ Login successful:', data.user.email);

            // Wait for session manager to update
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update UI
            if (window.sessionManager) {
                await window.sessionManager.init();
                window.sessionManager._updateAllNavbars();
            }

            alert('تم تسجيل الدخول بنجاح! سيتم تحديث الصفحة...');
            window.location.reload();
            return true;
        }

    } catch (error) {
        console.error('❌ Test login failed:', error);
        alert('خطأ في تسجيل الدخول: ' + error.message);
        return false;
    }
}

// Quick test functions
async function loginAsShipper() {
    return await testLogin('shipper@test.com', 'password123');
}

async function loginAsCarrier() {
    return await testLogin('carrier@test.com', 'password123');
}

// Create test user if needed
async function createTestUser() {
    try {
        console.log('🔄 Creating test user...');

        const { data, error } = await window.supabaseClient.auth.signUp({
            email: 'test@example.com',
            password: 'password123',
            options: {
                data: {
                    full_name: 'مستخدم اختبار',
                    user_type: 'shipper'
                }
            }
        });

        if (error) {
            console.error('❌ User creation error:', error);
            alert('فشل إنشاء المستخدم: ' + error.message);
            return false;
        }

        console.log('✅ Test user created:', data.user?.email);
        alert('تم إنشاء مستخدم الاختبار. تحقق من بريدك الإلكتروني للتأكيد.');
        return true;

    } catch (error) {
        console.error('❌ Failed to create test user:', error);
        alert('خطأ في إنشاء المستخدم: ' + error.message);
        return false;
    }
}

// Check current session
function checkSession() {
    console.log('🔍 Checking current session...');

    if (window.sessionManager) {
        console.log('Session Manager Status:');
        console.log('- Is Logged In:', window.sessionManager.isLoggedIn());
        console.log('- Current User:', window.sessionManager.getCurrentUser());
        console.log('- User Type:', window.sessionManager.getUserType());
    }

    if (window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error('Session check error:', error);
            } else {
                console.log('Supabase Session:', data.session ? 'Active' : 'None');
                if (data.session) {
                    console.log('- User:', data.session.user.email);
                }
            }
        });
    }

    // Check localStorage
    const localUser = localStorage.getItem('fastship_user');
    console.log('LocalStorage User:', localUser ? JSON.parse(localUser) : 'None');
}

// Clear all sessions
function clearSessions() {
    console.log('🧹 Clearing all sessions...');

    // Clear Supabase session
    if (window.supabaseClient) {
        window.supabaseClient.auth.signOut();
    }

    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();

    // Reset session manager
    if (window.sessionManager) {
        window.sessionManager.currentUser = null;
        window.sessionManager._updateAllNavbars();
    }

    console.log('✅ All sessions cleared');
    alert('تم مسح جميع الجلسات');
    window.location.reload();
}

// Make functions global
window.testLogin = testLogin;
window.loginAsShipper = loginAsShipper;
window.loginAsCarrier = loginAsCarrier;
window.createTestUser = createTestUser;
window.checkSession = checkSession;
window.clearSessions = clearSessions;

console.log('🎯 Test login helpers loaded!');
console.log('Available functions:');
console.log('- testLogin(email, password)');
console.log('- loginAsShipper()');
console.log('- loginAsCarrier()');
console.log('- createTestUser()');
console.log('- checkSession()');
console.log('- clearSessions()');