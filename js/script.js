        // =============================================
        // MAIN APPLICATION CODE
        // =============================================

        // Global variables
        let currentUser = null;
        let currentCalculation = null;
        let footprintChartInstance = null;
        let dashboardChartInstance = null;

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            // Check authentication status
            checkAuthentication();
            
            // Initialize dark mode
            initDarkMode();
            
            // Set up mobile navigation
            setupMobileNav();
            
            // Set up event listeners
            setupEventListeners();
            
            // Initialize chatbot
            initChatbot();
            
            // Show home page by default
            showPage('home');
            
            // Update greeting based on time of day
            updateTimeBasedGreeting();
        });

        // =============================================
        // AUTHENTICATION FUNCTIONS
        // =============================================

        // Check if user is authenticated
        function checkAuthentication() {
            const savedUser = localStorage.getItem('ecotrack_currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                updateUIForLoggedInUser();
            }
        }

        // Update UI for logged in user
        function updateUIForLoggedInUser() {
            const authButtons = document.getElementById('authButtons');
            
            if (currentUser) {
                // Update greeting based on time of day
                const greeting = getTimeBasedGreeting();
                
                authButtons.innerHTML = `
                    <button class="btn btn-outline" id="darkModeToggle">
                        <i class="fas fa-moon"></i> Dark Mode
                    </button>
                    <span class="user-greeting">${greeting}, ${currentUser.name.split(' ')[0]}</span>
                    <button class="btn btn-outline" onclick="showPage('dashboard')">Dashboard</button>
                    <button class="btn btn-primary" onclick="handleLogout()">Logout</button>
                `;
                
                // Re-initialize dark mode toggle
                initDarkMode();
            } else {
                authButtons.innerHTML = `
                    <button class="btn btn-outline" id="darkModeToggle">
                        <i class="fas fa-moon"></i> Dark Mode
                    </button>
                    <button class="btn btn-outline" onclick="showPage('login')">Login</button>
                    <button class="btn btn-primary" onclick="showPage('register')">Register</button>
                `;
                
                // Re-initialize dark mode toggle
                initDarkMode();
            }
        }

        // Get time-based greeting
        function getTimeBasedGreeting() {
            const hour = new Date().getHours();
            
            if (hour >= 5 && hour < 12) {
                return 'Good Morning';
            } else if (hour >= 12 && hour < 17) {
                return 'Good Afternoon';
            } else if (hour >= 17 && hour < 21) {
                return 'Good Evening';
            } else {
                return 'Good Night';
            }
        }

        // Update time-based greeting on dashboard
        function updateTimeBasedGreeting() {
            const greeting = getTimeBasedGreeting();
            const greetingElement = document.getElementById('timeGreeting');
            if (greetingElement) {
                greetingElement.textContent = greeting;
            }
        }

        // Handle user logout
        function handleLogout() {
            localStorage.removeItem('ecotrack_currentUser');
            currentUser = null;
            updateUIForLoggedInUser();
            showPage('home');
            showAlert('You have been logged out successfully', 'success');
        }

        // =============================================
        // PAGE NAVIGATION
        // =============================================

        // Show specific page
        function showPage(pageId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
            document.getElementById(pageId).classList.add('active');
            
            // Update navigation menu
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // Add active class to corresponding nav link
            if (pageId === 'home') {
                document.querySelector('.nav-link[onclick="showPage(\'home\')"]').classList.add('active');
            } else if (pageId === 'calculator') {
                document.querySelector('.nav-link[onclick="showPage(\'calculator\')"]').classList.add('active');
            } else if (pageId === 'tips') {
                document.querySelector('.nav-link[onclick="showPage(\'tips\')"]').classList.add('active');
            } else if (pageId === 'about') {
                document.querySelector('.nav-link[onclick="showPage(\'about\')"]').classList.add('active');
            }
            
            // Load page-specific content
            if (pageId === 'dashboard' && currentUser) {
                loadDashboard();
            } else if (pageId === 'dashboard' && !currentUser) {
                showPage('login');
                showAlert('Please log in to access the dashboard', 'error');
            }
            
            // Initialize calculator if on calculator page
            if (pageId === 'calculator') {
                initCalculator();
            }
            
            // Update greeting based on time of day
            updateTimeBasedGreeting();
        }

        // =============================================
        // DASHBOARD FUNCTIONS
        // =============================================

        // Load dashboard data
        function loadDashboard() {
            if (!currentUser) return;
            
            // Display personalized greeting
            const greeting = getTimeBasedGreeting();
            document.getElementById('timeGreeting').textContent = `${greeting}, ${currentUser.name}`;
            document.getElementById('userName').textContent = currentUser.name;
            
            // Load user data
            loadUserData(currentUser.id);
        }

        // Load user data for dashboard
        function loadUserData(userId) {
            const history = JSON.parse(localStorage.getItem('ecotrack_footprintHistory')) || [];
            const userHistory = history.filter(entry => entry.userId === userId);
            
            // Calculate stats
            calculateStats(userHistory);
            
            // Display activity
            displayActivity(userHistory);
            
            // Display personalized tips
            displayPersonalizedTips(userHistory);
            
            // Create footprint chart
            createDashboardChart(userHistory);
        }

        // Calculate and display user stats
        function calculateStats(history) {
            if (history.length === 0) {
                // Set default values if no history
                document.getElementById('currentFootprint').textContent = '0';
                document.getElementById('reductionPercent').textContent = '0%';
                document.getElementById('treesSaved').textContent = '0';
                document.getElementById('currentStreak').textContent = '0';
                return;
            }
            
            // Get current footprint (latest entry)
            const currentFootprint = history[history.length - 1].emissions;
            document.getElementById('currentFootprint').textContent = currentFootprint.toFixed(1);
            
            // Calculate reduction percentage (compared to first entry)
            const firstFootprint = history[0].emissions;
            const reductionPercent = ((firstFootprint - currentFootprint) / firstFootprint * 100).toFixed(1);
            document.getElementById('reductionPercent').textContent = `${reductionPercent}%`;
            
            // Calculate trees saved (rough estimate: 1 tree absorbs ~21kg CO2 per year)
            const treesSaved = (currentFootprint * 12 / 21).toFixed(1);
            document.getElementById('treesSaved').textContent = treesSaved;
            
            // Calculate current streak (days with consecutive entries)
            const currentStreak = calculateStreak(history);
            document.getElementById('currentStreak').textContent = currentStreak;
        }

        // Calculate streak of consecutive days with entries
        function calculateStreak(history) {
            if (history.length < 2) return history.length;
            
            // Sort history by date (newest first)
            const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            let streak = 1;
            for (let i = 1; i < sortedHistory.length; i++) {
                const currentDate = new Date(sortedHistory[i-1].date);
                const previousDate = new Date(sortedHistory[i].date);
                
                // Check if dates are consecutive
                const diffTime = Math.abs(currentDate - previousDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    streak++;
                } else {
                    break;
                }
            }
            
            return streak;
        }

        // Display recent activity
        function displayActivity(history) {
            const activityList = document.getElementById('activityList');
            
            if (history.length === 0) {
                activityList.innerHTML = '<li>No activity yet. Calculate your first footprint!</li>';
                return;
            }
            
            // Get recent activities (last 5)
            const recentActivities = history.slice(-5).reverse();
            
            activityList.innerHTML = recentActivities.map(activity => `
                <li>
                    <span>${activity.date}</span>
                    <span>${activity.emissions.toFixed(1)} kg CO2</span>
                </li>
            `).join('');
        }

        // Display personalized tips based on user data
        function displayPersonalizedTips(history) {
            const tipsList = document.getElementById('personalizedTips');
            
            // Default tips
            let tips = [
                "Start by calculating your carbon footprint to get personalized recommendations.",
                "Consider reducing meat consumption - even one meat-free day per week helps.",
                "Unplug electronics when not in use to save energy."
            ];
            
            // Personalized tips based on data
            if (history.length > 0) {
                const latest = history[history.length - 1];
                
                if (latest.details && latest.details.car > 100) {
                    tips.push("Consider carpooling or using public transport to reduce your transportation emissions.");
                }
                
                if (latest.details && latest.details.electricity > 300) {
                    tips.push("Switch to energy-efficient appliances and LED bulbs to reduce electricity consumption.");
                }
                
                if (history.length > 1) {
                    const reduction = ((history[0].emissions - latest.emissions) / history[0].emissions * 100).toFixed(1);
                    if (parseFloat(reduction) > 0) {
                        tips.push(`Great job! You've reduced your footprint by ${reduction}%. Keep it up!`);
                    }
                }
            }
            
            tipsList.innerHTML = tips.map(tip => `
                <div class="tip-item">${tip}</div>
            `).join('');
        }

        // Create footprint history chart for dashboard
        function createDashboardChart(history) {
            if (history.length === 0) {
                document.getElementById('footprintChart').parentElement.innerHTML = '<p>No data available yet. Calculate your footprint to see your progress!</p>';
                return;
            }
            
            const ctx = document.getElementById('footprintChart').getContext('2d');
            
            // Destroy existing chart if it exists
            if (dashboardChartInstance) {
                dashboardChartInstance.destroy();
            }
            
            // Prepare data for chart
            const labels = history.map(entry => {
                const date = new Date(entry.date);
                return `${date.getMonth()+1}/${date.getDate()}`;
            });
            
            const data = history.map(entry => entry.emissions);
            
            dashboardChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Carbon Footprint (kg CO2)',
                        data: data,
                        borderColor: '#2E7D32',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Your Footprint Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'kg CO2'
                            }
                        }
                    }
                }
            });
        }

        // =============================================
        // CALCULATOR FUNCTIONS
        // =============================================

        // Initialize calculator
        function initCalculator() {
            // Set default values
            document.getElementById('electricity').value = 200;
            document.getElementById('car').value = 100;
            document.getElementById('public-transport').value = 50;
            
            // Add event listeners
            document.getElementById('calculateBtn').addEventListener('click', calculateFootprint);
            document.getElementById('saveResultBtn').addEventListener('click', saveFootprint);
            document.getElementById('downloadResultBtn').addEventListener('click', downloadResults);
        }

        // Calculate carbon footprint
        function calculateFootprint() {
            const electricity = parseFloat(document.getElementById('electricity').value) || 0;
            const car = parseFloat(document.getElementById('car').value) || 0;
            const publicTransport = parseFloat(document.getElementById('public-transport').value) || 0;
            const diet = document.getElementById('diet').value;
            const period = document.querySelector('input[name="period"]:checked').value;
            
            // Adjust for period (convert weekly to monthly if needed)
            const multiplier = period === 'weekly' ? 4 : 1;
            
            // Emission factors (kg CO2 per unit)
            const electricityFactor = 0.5; // per kWh
            const carFactor = 0.21; // per km
            const publicTransportFactor = 0.05; // per km
            
            // Calculate emissions
            const electricityEmissions = electricity * electricityFactor * multiplier;
            const carEmissions = car * carFactor * multiplier;
            const transportEmissions = publicTransport * publicTransportFactor * multiplier;
            
            // Diet factors (monthly emissions)
            const dietFactors = {
                'vegan': 50,
                'vegetarian': 100,
                'meat-low': 150,
                'meat-medium': 250,
                'meat-high': 400
            };
            
            const dietEmissions = dietFactors[diet] || 200;
            
            // Total emissions
            const totalEmissions = electricityEmissions + carEmissions + transportEmissions + dietEmissions;
            
            // Store current calculation
            currentCalculation = {
                electricity: electricityEmissions,
                car: carEmissions,
                transport: transportEmissions,
                diet: dietEmissions,
                total: totalEmissions,
                period: period,
                details: {
                    electricity: electricity,
                    car: car,
                    publicTransport: publicTransport,
                    diet: diet
                }
            };
            
            // Display result
            document.getElementById('result').textContent = `${totalEmissions.toFixed(2)} kg CO2/${period === 'weekly' ? 'week' : 'month'}`;
            document.getElementById('resultContainer').style.display = 'block';
            
            // Create chart
            createCalculatorChart(electricityEmissions, carEmissions, transportEmissions, dietEmissions);
            
            // Highlight tips if car usage is high
            if (car > 200) {
                document.querySelectorAll('#transportTip, #transportTip2').forEach(tip => {
                    tip.classList.add('highlight');
                });
            } else {
                document.querySelectorAll('#transportTip, #transportTip2').forEach(tip => {
                    tip.classList.remove('highlight');
                });
            }
        }

        // Create emissions chart for calculator
        function createCalculatorChart(electricity, car, transport, diet) {
            const ctx = document.getElementById('footprintChartCalc').getContext('2d');
            
            // Destroy existing chart if it exists
            if (footprintChartInstance) {
                footprintChartInstance.destroy();
            }
            
            footprintChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Electricity', 'Car Travel', 'Public Transport', 'Diet'],
                    datasets: [{
                        data: [electricity, car, transport, diet],
                        backgroundColor: [
                            '#2E7D32',
                            '#4CAF50',
                            '#8BC34A',
                            '#CDDC39'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: 'Emissions Breakdown'
                        }
                    }
                }
            });
        }

        // Save footprint to localStorage
        function saveFootprint() {
            if (!currentUser) {
                showAlert('Please register or login to save your footprint history', 'error');
                showPage('register');
                return;
            }
            
            if (!currentCalculation) {
                showAlert('Please calculate your footprint first', 'error');
                return;
            }
            
            let history = JSON.parse(localStorage.getItem('ecotrack_footprintHistory')) || [];
            history.push({
                userId: currentUser.id,
                userName: currentUser.name,
                emissions: currentCalculation.total,
                date: new Date().toLocaleDateString(),
                details: currentCalculation.details
            });
            
            localStorage.setItem('ecotrack_footprintHistory', JSON.stringify(history));
            
            showAlert('Footprint saved successfully!', 'success');
        }

        // Download results
        function downloadResults() {
            if (!currentCalculation) {
                showAlert('Please calculate your footprint first', 'error');
                return;
            }
            
            const result = document.getElementById('result').textContent;
            const blob = new Blob([`EcoTrack Carbon Footprint Report\n\n${result}\n\nBreakdown:\n- Electricity: ${currentCalculation.electricity.toFixed(2)} kg CO2\n- Car Travel: ${currentCalculation.car.toFixed(2)} kg CO2\n- Public Transport: ${currentCalculation.transport.toFixed(2)} kg CO2\n- Diet: ${currentCalculation.diet.toFixed(2)} kg CO2\n\nDate: ${new Date().toLocaleDateString()}`], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ecotrack_footprint.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // =============================================
        // AUTHENTICATION FORM HANDLING
        // =============================================

        // Set up event listeners for authentication forms
        function setupAuthForms() {
            // Login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
                addPasswordToggle('loginPassword');
            }
            
            // Register form
            const registerForm = document.getElementById('registerForm');
            if (registerForm) {
                registerForm.addEventListener('submit', handleRegister);
                addPasswordStrengthIndicator();
                addPasswordToggle('registerPassword');
                addPasswordToggle('registerConfirm');
            }
        }

        // Handle login
        function handleLogin(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const loginBtn = document.querySelector('#loginForm button[type="submit"]');
            
            // Simple validation
            if (!email || !password) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            // Show loading state
            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';
            loginBtn.disabled = true;
            
            // Check if user exists
            const users = JSON.parse(localStorage.getItem('ecotrack_users')) || [];
            const user = users.find(u => u.email === email && u.password === password);
            
            // Simulate API delay
            setTimeout(() => {
                if (user) {
                    // Set current user
                    currentUser = user;
                    localStorage.setItem('ecotrack_currentUser', JSON.stringify(user));
                    updateUIForLoggedInUser();
                    
                    // Show success message
                    showAlert('Login successful! Redirecting...', 'success');
                    
                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        showPage('dashboard');
                    }, 1000);
                } else {
                    showAlert('Invalid email or password', 'error');
                }
                
                // Reset button
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }, 1500);
        }

        // Handle registration
        function handleRegister(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirm').value;
            const terms = document.getElementById('terms').checked;
            const registerBtn = document.querySelector('#registerForm button[type="submit"]');
            
            // Simple validation
            if (!fullName || !email || !password || !confirmPassword) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showAlert('Passwords do not match', 'error');
                return;
            }
            
            if (!terms) {
                showAlert('Please agree to the terms and conditions', 'error');
                return;
            }
            
            // Password strength check
            const strength = checkPasswordStrength(password);
            if (strength.level === 'weak') {
                showAlert('Please choose a stronger password', 'error');
                return;
            }
            
            // Show loading state
            const originalText = registerBtn.innerHTML;
            registerBtn.innerHTML = '<span class="spinner"></span> Creating account...';
            registerBtn.disabled = true;
            
            // Check if user already exists
            const users = JSON.parse(localStorage.getItem('ecotrack_users')) || [];
            if (users.some(user => user.email === email)) {
                showAlert('User with this email already exists', 'error');
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
                return;
            }
            
            // Simulate API delay
            setTimeout(() => {
                // Create new user
                const newUser = { 
                    id: generateId(),
                    name: fullName, 
                    email: email, 
                    password: password,
                    joined: new Date().toISOString()
                };
                
                users.push(newUser);
                localStorage.setItem('ecotrack_users', JSON.stringify(users));
                
                // Set as current user
                currentUser = newUser;
                localStorage.setItem('ecotrack_currentUser', JSON.stringify(newUser));
                updateUIForLoggedInUser();
                
                // Show success message
                showAlert('Account created successfully! Redirecting to dashboard...', 'success');
                
                // Redirect to dashboard after a delay
                setTimeout(() => {
                    showPage('dashboard');
                }, 2000);
            }, 1500);
        }

        // =============================================
        // UTILITY FUNCTIONS
        // =============================================

        // Initialize dark mode
        function initDarkMode() {
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (!darkModeToggle) return;
            
            // Check for saved dark mode preference
            const darkModeEnabled = localStorage.getItem('ecotrack_darkMode') === 'true';
            if (darkModeEnabled) {
                document.body.classList.add('dark-mode');
                darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            }
            
            // Toggle dark mode
            darkModeToggle.addEventListener('click', function() {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('ecotrack_darkMode', isDarkMode);
                
                if (isDarkMode) {
                    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
                } else {
                    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
                }
            });
        }

        // Set up mobile navigation
        function setupMobileNav() {
            const hamburger = document.getElementById('hamburger');
            const navMenu = document.getElementById('navMenu');
            
            if (hamburger && navMenu) {
                hamburger.addEventListener('click', function() {
                    navMenu.classList.toggle('active');
                    hamburger.innerHTML = navMenu.classList.contains('active') 
                        ? '<i class="fas fa-times"></i>' 
                        : '<i class="fas fa-bars"></i>';
                });
                
                // Close mobile menu when clicking on a link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', () => {
                        navMenu.classList.remove('active');
                        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
                    });
                });
            }
        }

        // Set up event listeners
        function setupEventListeners() {
            // Set up authentication forms
            setupAuthForms();
            
            // Share progress button
            const shareProgressBtn = document.getElementById('shareProgressBtn');
            if (shareProgressBtn) {
                shareProgressBtn.addEventListener('click', shareProgress);
            }
        }

        // Add password strength indicator
        function addPasswordStrengthIndicator() {
            const passwordInput = document.getElementById('registerPassword');
            const strengthBar = document.createElement('div');
            strengthBar.className = 'password-strength';
            strengthBar.innerHTML = '<div class="strength-bar"></div><div class="strength-text"></div>';
            
            passwordInput.parentNode.appendChild(strengthBar);
            
            passwordInput.addEventListener('input', function() {
                const password = this.value;
                const strength = checkPasswordStrength(password);
                
                const bar = strengthBar.querySelector('.strength-bar');
                const text = strengthBar.querySelector('.strength-text');
                
                // Remove all strength classes
                bar.classList.remove('strength-weak', 'strength-medium', 'strength-strong');
                
                // Add appropriate class and text
                if (password.length === 0) {
                    bar.style.width = '0%';
                    text.textContent = '';
                } else {
                    bar.classList.add(`strength-${strength.level}`);
                    text.textContent = strength.text;
                    text.style.color = strength.color;
                }
            });
        }

        // Check password strength
        function checkPasswordStrength(password) {
            let score = 0;
            
            // Length check
            if (password.length >= 8) score += 1;
            if (password.length >= 12) score += 1;
            
            // Character variety
            if (/[a-z]/.test(password)) score += 1; // Lowercase
            if (/[A-Z]/.test(password)) score += 1; // Uppercase
            if (/[0-9]/.test(password)) score += 1; // Numbers
            if (/[^a-zA-Z0-9]/.test(password)) score += 1; // Special characters
            
            if (score <= 2) {
                return { level: 'weak', text: 'Weak password', color: '#f44336' };
            } else if (score <= 4) {
                return { level: 'medium', text: 'Medium strength', color: '#ff9800' };
            } else {
                return { level: 'strong', text: 'Strong password', color: '#4caf50' };
            }
        }

        // Add password visibility toggle
        function addPasswordToggle(inputId) {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            const toggle = document.createElement('span');
            toggle.className = 'password-toggle';
            toggle.innerHTML = '<i class="fas fa-eye"></i>';
            toggle.style.position = 'absolute';
            toggle.style.right = '15px';
            toggle.style.top = '50%';
            toggle.style.transform = 'translateY(-50%)';
            toggle.style.cursor = 'pointer';
            toggle.style.color = '#666';
            
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(toggle);
            
            toggle.addEventListener('click', function() {
                if (input.type === 'password') {
                    input.type = 'text';
                    this.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    this.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        }

        // Generate unique ID
        function generateId() {
            return 'user_' + Math.random().toString(36).substr(2, 9);
        }

        // Show alert message
        function showAlert(message, type) {
            // Remove existing alerts
            const existingAlert = document.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            // Create alert element
            const alert = document.createElement('div');
            alert.className = `message ${type}`;
            alert.textContent = message;
            
            // Add to page
            document.querySelector('.auth-header')?.after(alert) || document.body.prepend(alert);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }

        // Share progress functionality
        function shareProgress() {
            if (!currentUser) {
                showAlert('Please log in to share your progress', 'error');
                return;
            }
            
            const history = JSON.parse(localStorage.getItem('ecotrack_footprintHistory')) || [];
            const userHistory = history.filter(entry => entry.userId === currentUser.id);
            
            if (userHistory.length === 0) {
                showAlert('Calculate your footprint first to share your progress!', 'error');
                return;
            }
            
            const currentFootprint = userHistory[userHistory.length - 1].emissions;
            const firstFootprint = userHistory[0].emissions;
            const reduction = ((firstFootprint - currentFootprint) / firstFootprint * 100).toFixed(1);
            
            const shareText = `I've reduced my carbon footprint by ${reduction}% using EcoTrack! Join me in making a difference for our planet. #EcoTrack #Sustainability`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'My EcoTrack Progress',
                    text: shareText,
                    url: window.location.href
                });
            } else {
                // Fallback for browsers that don't support Web Share API
                navigator.clipboard.writeText(shareText).then(() => {
                    showAlert('Progress copied to clipboard! Share it with your friends.', 'success');
                });
            }
        }

        // =============================================
        // CHATBOT FUNCTIONS
        // =============================================

        // Initialize chatbot
        function initChatbot() {
            const chatbotToggle = document.getElementById('chatbotToggle');
            const chatbotContainer = document.getElementById('chatbotContainer');
            const closeChatbot = document.getElementById('closeChatbot');
            const sendMessageBtn = document.getElementById('sendMessage');
            const chatbotInput = document.getElementById('chatbotInput');
            const chatbotMessages = document.getElementById('chatbotMessages');
            
            // Toggle chatbot visibility
            chatbotToggle.addEventListener('click', function() {
                chatbotContainer.classList.toggle('active');
            });
            
            closeChatbot.addEventListener('click', function() {
                chatbotContainer.classList.remove('active');
            });
            
            // Send message on button click
            sendMessageBtn.addEventListener('click', sendMessage);
            
            // Send message on Enter key
            chatbotInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Quick question chips
            document.querySelectorAll('.question-chip').forEach(chip => {
                chip.addEventListener('click', function() {
                    const question = this.getAttribute('data-question');
                    chatbotInput.value = question;
                    sendMessage();
                });
            });
            
            // AI responses database
            const aiResponses = {
                greetings: [
                    "Hello! How can I assist you with carbon footprint and sustainability today?",
                    "Hi there! I'm here to help you with all things eco-friendly.",
                    "Greetings! Ready to learn about reducing your environmental impact?"
                ],
                farewells: [
                    "Goodbye! Remember, small changes make a big difference!",
                    "See you later! Keep up the sustainable habits!",
                    "Farewell! Don't hesitate to ask if you have more questions."
                ],
                questions: {
                    "what is carbon footprint": "A carbon footprint is the total amount of greenhouse gases (including carbon dioxide and methane) that are generated by our actions. It's usually measured in tons of CO2 equivalent per year.",
                    "how can i reduce my carbon footprint": "Great question! Here are some effective ways:\n1. Use public transport or carpool\n2. Switch to renewable energy sources\n3. Reduce meat consumption\n4. Use energy-efficient appliances\n5. Reduce, reuse, and recycle\n6. Plant trees and support reforestation",
                    "how does diet affect carbon footprint": "Diet has a significant impact! Animal products, especially red meat, have much higher carbon footprints than plant-based foods. Switching to a vegetarian or vegan diet can reduce your food-related emissions by up to 50%.",
                    "what are renewable energy sources": "Renewable energy comes from natural sources that are constantly replenished, like:\n- Solar power\n- Wind energy\n- Hydropower\n- Geothermal energy\n- Biomass energy",
                    "how to calculate carbon footprint": "You can calculate it by considering:\n1. Energy usage (electricity, heating)\n2. Transportation (cars, flights)\n3. Diet and food choices\n4. Shopping habits\n5. Waste production\nUse our calculator on the homepage for an accurate measurement!",
                    "what is sdg 12": "SDG 12 stands for Sustainable Development Goal 12: Responsible Consumption and Production. It aims to ensure sustainable consumption and production patterns, reducing waste and promoting efficient use of resources.",
                    "benefits of reducing carbon footprint": "Reducing your carbon footprint helps:\n1. Combat climate change\n2. Improve air quality\n3. Conserve natural resources\n4. Protect biodiversity\n5. Create sustainable communities\n6. Save money on energy bills",
                    "what is climate change": "Climate change refers to long-term shifts in temperatures and weather patterns. These shifts may be natural, but since the 1800s, human activities have been the main driver of climate change, primarily due to burning fossil fuels.",
                    "how does transportation affect carbon footprint": "Transportation is a major contributor! Cars, planes, and ships burn fossil fuels, releasing CO2. Opting for public transport, cycling, walking, or electric vehicles can significantly reduce your transportation emissions.",
                    "what is sustainable living": "Sustainable living involves reducing your use of Earth's natural resources. It means making choices that minimize environmental impact, like using renewable energy, reducing waste, and choosing eco-friendly products."
                },
                default: "I'm not sure I understand. Could you rephrase your question? I specialize in carbon footprint, sustainability, and environmental topics."
            };
            
            function sendMessage() {
                const message = chatbotInput.value.trim();
                if (!message) return;
                
                // Add user message to chat
                addMessage(message, 'user');
                chatbotInput.value = '';
                
                // Show typing indicator
                showTypingIndicator();
                
                // Simulate AI thinking delay
                setTimeout(() => {
                    // Remove typing indicator
                    removeTypingIndicator();
                    
                    // Generate and add AI response
                    const response = generateResponse(message);
                    addMessage(response, 'bot');
                    
                    // Scroll to bottom
                    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
                }, 1000 + Math.random() * 1000);
            }
            
            function addMessage(text, sender) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${sender}-message`;
                
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                
                const messageP = document.createElement('p');
                messageP.textContent = text;
                
                const timeSpan = document.createElement('span');
                timeSpan.className = 'message-time';
                timeSpan.textContent = getCurrentTime();
                
                contentDiv.appendChild(messageP);
                contentDiv.appendChild(timeSpan);
                
                messageDiv.appendChild(avatarDiv);
                messageDiv.appendChild(contentDiv);
                
                chatbotMessages.appendChild(messageDiv);
                
                // Scroll to bottom
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }
            
            function showTypingIndicator() {
                const typingDiv = document.createElement('div');
                typingDiv.className = 'message bot-message';
                typingDiv.id = 'typingIndicator';
                
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'typing-indicator';
                
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'typing-dot';
                    contentDiv.appendChild(dot);
                }
                
                typingDiv.appendChild(avatarDiv);
                typingDiv.appendChild(contentDiv);
                
                chatbotMessages.appendChild(typingDiv);
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }
            
            function removeTypingIndicator() {
                const typingIndicator = document.getElementById('typingIndicator');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
            }
            
            function generateResponse(message) {
                const lowerMessage = message.toLowerCase();
                
                // Check for greetings
                if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
                    return getRandomResponse(aiResponses.greetings);
                }
                
                // Check for farewells
                if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
                    return getRandomResponse(aiResponses.farewells);
                }
                
                // Check for specific questions
                for (const [question, answer] of Object.entries(aiResponses.questions)) {
                    if (lowerMessage.includes(question)) {
                        return answer;
                    }
                }
                
                // Check for related keywords
                if (lowerMessage.includes('thank')) {
                    return "You're welcome! I'm always here to help with your sustainability questions.";
                }
                
                if (lowerMessage.includes('help')) {
                    return "I can help you with:\n- Carbon footprint information\n- Sustainability tips\n- Renewable energy\n- Climate change\n- SDG goals\nJust ask me a specific question!";
                }
                
                // Default response
                return aiResponses.default;
            }
            
            function getRandomResponse(responses) {
                return responses[Math.floor(Math.random() * responses.length)];
            }
            
            function getCurrentTime() {
                const now = new Date();
                return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
        }