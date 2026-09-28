/**
 * MediChain Unified API Client & Utilities
 */

const API_BASE = '/api';

const MediChain = {
  // Storage keys
  TOKEN_KEY: 'medichain_token',
  USER_KEY: 'medichain_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const u = localStorage.getItem(this.USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },

  requireAuth(allowedRoles = []) {
    const user = this.getUser();
    const token = this.getToken();

    if (!user || !token) {
      window.location.href = 'login.html';
      return null;
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (roles.length > 0 && user.role !== 'admin' && !roles.includes(user.role.toLowerCase())) {
      alert(`Access Denied: Your role '${user.role.toUpperCase()}' cannot access this dashboard. Redirecting to your dashboard.`);
      this.redirectToDashboard(user.role);
      return null;
    }

    return user;
  },

  redirectToDashboard(role) {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'manufacturer':
        window.location.href = 'manufacturer.html';
        break;
      case 'distributor':
        window.location.href = 'distributor.html';
        break;
      case 'transporter':
        window.location.href = 'transporter.html';
        break;
      case 'pharmacy':
        window.location.href = 'pharmacy.html';
        break;
      case 'admin':
        window.location.href = 'admin.html';
        break;
      default:
        window.location.href = 'index.html';
    }
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth APIs
  async login(email, password, role) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async register(formData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    this.setSession(data.token, data.user);
    return data;
  },

  // Notifications
  async getAlerts(role = 'ALL') {
    try {
      const data = await this.request(`/admin/alerts?role=${encodeURIComponent(role)}`);
      return data.alerts || [];
    } catch (e) {
      return [];
    }
  },

  // UI Toast / Alert Notification
  showToast(message, type = 'info') {
    let container = document.getElementById('medichain-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'medichain-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#1976d2'
    };
    const icons = {
      success: '✓',
      warning: '⚠',
      danger: '🚨',
      info: 'ℹ'
    };

    const bg = colors[type] || colors.info;
    const icon = icons[type] || icons.info;

    toast.style.cssText = `
      background: #ffffff;
      color: #1e293b;
      border-left: 5px solid ${bg};
      padding: 14px 18px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: slideInRight 0.3s ease-out;
    `;

    toast.innerHTML = `
      <span style="color: ${bg}; font-size: 18px; font-weight: bold;">${icon}</span>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  },

  // Setup Role Navbar with Live Notifications
  setupNavbar() {
    const user = this.getUser();
    if (!user) return;

    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.innerText = user.name || user.email;
    }

    // Add Notification Dropdown if not already present
    const userContainer = document.querySelector('.dashboard-user') || document.querySelector('.auth-nav-right');
    if (userContainer && !document.getElementById('notifBell')) {
      const notifWrapper = document.createElement('div');
      notifWrapper.style.cssText = 'position: relative; display: inline-block; margin-right: 15px;';
      notifWrapper.innerHTML = `
        <button id="notifBell" style="background: rgba(25,118,210,0.08); border: 1px solid #d0e1fd; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; font-size: 16px;">
          🔔
          <span id="notifBadge" style="display: none; position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; border-radius: 10px; font-size: 11px; font-weight: bold; padding: 2px 6px;">0</span>
        </button>
        <div id="notifDropdown" style="display: none; position: absolute; right: 0; top: 46px; width: 320px; background: white; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.18); border: 1px solid #e2e8f0; z-index: 1000; max-height: 360px; overflow-y: auto; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
            <strong style="color: #0f172a; font-size: 13px;">Live Alerts & Notifications</strong>
            <small style="color: #64748b; font-size: 11px;">Real-time</small>
          </div>
          <div id="notifList" style="font-size: 12px; color: #475569;">Loading alerts...</div>
        </div>
      `;
      userContainer.insertBefore(notifWrapper, userContainer.firstChild);

      const bell = document.getElementById('notifBell');
      const dropdown = document.getElementById('notifDropdown');

      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });

      // Poll alerts
      this.refreshAlerts(user.role);
      setInterval(() => this.refreshAlerts(user.role), 10000);
    }
  },

  async refreshAlerts(role) {
    const alerts = await this.getAlerts(role);
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');

    if (!badge || !list) return;

    if (alerts.length > 0) {
      badge.innerText = alerts.length;
      badge.style.display = 'inline-block';
      list.innerHTML = alerts.slice(0, 5).map(a => {
        const borderColors = {
          WARNING: '#f59e0b',
          DANGER: '#ef4444',
          SUCCESS: '#10b981',
          INFO: '#1976d2'
        };
        const bc = borderColors[a.type] || '#1976d2';
        return `
          <div style="border-left: 3px solid ${bc}; padding: 6px 10px; margin-bottom: 8px; background: #f8fafc; border-radius: 4px;">
            <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">${a.message}</div>
            <div style="font-size: 10px; color: #94a3b8;">${new Date(a.timestamp).toLocaleTimeString()}</div>
          </div>
        `;
      }).join('');
    } else {
      badge.style.display = 'none';
      list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 10px;">No new alerts.</div>`;
    }
  },

  // QR Code Generation helper (renders cleanly into an img or svg)
  generateQRDataURL(text) {
    // Generate an encoded SVG data URL representing a functional QR-like code with batch locator
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}`;
  }
};

window.MediChain = MediChain;
