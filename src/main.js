// Login modal styles and functionality
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .login-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .login-modal {
    background: white;
    border-radius: 16px;
    padding: 40px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .login-modal h1 {
    text-align: center;
    color: #1a1a2e;
    margin-bottom: 8px;
    font-size: 28px;
  }

  .login-modal p {
    text-align: center;
    color: #666;
    margin-bottom: 32px;
    font-size: 14px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-weight: 500;
    font-size: 14px;
  }

  .form-group input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #e1e1e1;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .login-btn {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .login-btn:active {
    transform: translateY(0);
  }

  .divider {
    display: flex;
    align-items: center;
    margin: 24px 0;
    color: #999;
    font-size: 14px;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e1e1e1;
  }

  .divider span {
    padding: 0 16px;
  }

  .social-login {
    display: flex;
    gap: 12px;
  }

  .social-btn {
    flex: 1;
    padding: 12px;
    border: 2px solid #e1e1e1;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: border-color 0.2s, background 0.2s;
  }

  .social-btn:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }

  .signup-link {
    text-align: center;
    margin-top: 24px;
    color: #666;
    font-size: 14px;
  }

  .signup-link a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
  }

  .signup-link a:hover {
    text-decoration: underline;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .login-modal {
      margin: 20px;
      padding: 32px 24px;
      max-width: none;
    }

    .login-modal h1 {
      font-size: 24px;
    }

    .social-login {
      flex-direction: column;
    }
  }
`;

// Create style element
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Create login modal
const overlay = document.createElement('div');
overlay.className = 'login-modal-overlay';

const modal = document.createElement('div');
modal.className = 'login-modal';

modal.innerHTML = `
  <h1>Welcome Back</h1>
  <p>Sign in to continue to your account</p>
  
  <form id="loginForm">
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" placeholder="you@example.com" required />
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" placeholder="Enter your password" required />
    </div>
    
    <button type="submit" class="login-btn">Sign In</button>
  </form>
  
  <div class="divider">
    <span>or continue with</span>
  </div>
  
  <div class="social-login">
    <button class="social-btn">Google</button>
    <button class="social-btn">GitHub</button>
  </div>
  
  <p class="signup-link">
    Don't have an account? <a href="#">Sign up</a>
  </p>
`;

overlay.appendChild(modal);
document.body.appendChild(overlay);

// Handle form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  console.log('Login attempt:', email);
  // Add your login logic here
  alert('Login functionality would be implemented here');
});
