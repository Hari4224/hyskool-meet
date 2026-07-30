/**
 * HYSKOOL MEET JavaScript SDK
 * Embed self-hosted video conferencing into any web app, Flutter WebView, or portal.
 * Usage:
 *   const meet = new HyskoolMeetSDK({
 *     domain: "hyskool.com",
 *     roomName: "Math-Class-101",
 *     parentNode: document.getElementById("meet-container"),
 *     userInfo: { displayName: "Teacher Alex", role: "host" }
 *   });
 */

(function (window) {
  class HyskoolMeetSDK {
    constructor(options = {}) {
      this.domain = options.domain || window.location.host || 'hyskool.com';
      this.roomName = options.roomName || 'default-room';
      this.parentNode = options.parentNode || document.body;
      this.jwt = options.jwt || '';
      this.userInfo = options.userInfo || { displayName: 'Guest User', role: 'attendee' };
      this.width = options.width || '100%';
      this.height = options.height || '100%';
      this.listeners = {};

      this._init();
    }

    _init() {
      const protocol = window.location.protocol.startsWith('https') ? 'https' : 'http';
      const baseUrl = `${protocol}://${this.domain}`;
      const params = new URLSearchParams({
        room: this.roomName,
        name: this.userInfo.displayName,
        role: this.userInfo.role || 'attendee',
        jwt: this.jwt,
        embed: 'true'
      });

      this.iframe = document.createElement('iframe');
      this.iframe.src = `${baseUrl}/?${params.toString()}`;
      this.iframe.style.width = this.width;
      this.iframe.style.height = this.height;
      this.iframe.style.border = 'none';
      this.iframe.style.borderRadius = '12px';
      this.iframe.allow = 'camera; microphone; display-capture; autoplay; clipboard-write';

      if (typeof this.parentNode === 'string') {
        const target = document.querySelector(this.parentNode);
        if (target) target.appendChild(this.iframe);
      } else if (this.parentNode && this.parentNode.appendChild) {
        this.parentNode.appendChild(this.iframe);
      }

      window.addEventListener('message', this._handleMessage.bind(this));
    }

    _handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      const { type, data } = event.data;
      if (type && this.listeners[type]) {
        this.listeners[type].forEach(callback => callback(data));
      }
    }

    on(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
    }

    executeCommand(command, args = {}) {
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.postMessage({ type: 'SDK_COMMAND', command, args }, '*');
      }
    }

    dispose() {
      if (this.iframe && this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
    }
  }

  window.HyskoolMeetSDK = HyskoolMeetSDK;
})(window);
