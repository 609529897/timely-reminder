(function() {
  let toast = null;
  let pulseTimer = null;
  let countdownTimer = null;
  let textEl = null;
  let baseMessage = '';

  const toastStyles = {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: '2147483647',
    borderRadius: '14px',
    background: 'rgba(17,17,26,0.94)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f2f2f7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif',
    lineHeight: '1.47059',
    backdropFilter: 'blur(20px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.35)',
    opacity: '0',
    transform: 'translateY(-8px)',
    transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)',
    cursor: 'pointer',
    pointerEvents: 'auto',
    overflow: 'hidden',
    userSelect: 'none',
    WebkitFontSmoothing: 'antialiased'
  };

  const innerStyles = {
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    fontWeight: '500',
    letterSpacing: '0'
  };

  const closeStyles = {
    fontSize: '12px', opacity: '0.5', flexShrink: '0', lineHeight: '1',
    padding: '2px', transition: 'opacity 0.15s', marginLeft: '4px', fontWeight: '300'
  };

  function fmtCountdown(ms) {
    if (ms <= 0) return '即将结束';
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  function updateCountdownText(endTime) {
    if (!textEl) return;
    const remain = endTime - Date.now();
    textEl.textContent = baseMessage + ' · ' + fmtCountdown(remain);
    if (remain <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown(endTime) {
    if (countdownTimer) clearInterval(countdownTimer);
    updateCountdownText(endTime);
    countdownTimer = setInterval(() => updateCountdownText(endTime), 1000);
  }

  function createToast(emoji, text, stay, endTime) {
    removeToast();
    baseMessage = text || '';

    const c = Object.assign(document.createElement('div'), {});
    Object.assign(c.style, toastStyles);

    const inner = Object.assign(document.createElement('div'), {});
    Object.assign(inner.style, innerStyles);

    const iconEl = Object.assign(document.createElement('span'), { textContent: emoji || '⏰' });
    Object.assign(iconEl.style, { fontSize: '18px', flexShrink: '0', lineHeight: '1', opacity: '0.9' });

    textEl = Object.assign(document.createElement('span'), {});
    Object.assign(textEl.style, { flex: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    textEl.textContent = text || '';

    const closeEl = Object.assign(document.createElement('span'), { textContent: '✕' });
    Object.assign(closeEl.style, closeStyles);
    closeEl.addEventListener('mouseenter', () => closeEl.style.opacity = '0.8');
    closeEl.addEventListener('mouseleave', () => closeEl.style.opacity = '0.4');
    closeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
      if (stay) {
        try { chrome.runtime.sendMessage({ type: 'clear-active-toast' }); } catch (_) {}
      }
    });

    inner.append(iconEl, textEl, closeEl);
    c.appendChild(inner);

    if (stay) {
      const bar = Object.assign(document.createElement('div'), {});
      Object.assign(bar.style, { height: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' });
      const fill = Object.assign(document.createElement('div'), {});
      Object.assign(fill.style, { height: '100%', width: '0%', background: 'linear-gradient(90deg,#3d8bff,#8b5cf6,#f2577a)', transition: 'width 1s linear' });
      bar.appendChild(fill);
      c.appendChild(bar);
      startPulse(c);
      if (endTime) startCountdown(endTime);
    }

    document.body.appendChild(c);
    toast = c;

    requestAnimationFrame(() => {
      c.style.opacity = '1';
      c.style.transform = 'translateY(0)';
    });

    if (!stay) {
      c.addEventListener('click', removeToast);
      setTimeout(removeToast, 8000);
    }
  }

  function startPulse(el) {
    let dir = 1;
    let val = 0;
    pulseTimer = setInterval(() => {
      val += 0.06 * dir;
      if (val >= 1) { val = 1; dir = -1; }
      if (val <= 0) { val = 0; dir = 1; }
      el.style.boxShadow = `0 12px 40px rgba(139,92,246,${0.25 + val * 0.3})`;
    }, 500);
  }

  function removeToast() {
    if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    textEl = null;
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(() => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); toast = null; }, 300);
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'show-toast') {
      createToast(msg.emoji || '⏰', msg.text || '', !!msg.stay, msg.endTime);
    } else if (msg.type === 'hide-toast') {
      removeToast();
    }
  });

  chrome.runtime.sendMessage({ type: 'get-toast-state' }, (state) => {
    if (state && state.stay) {
      createToast(state.emoji || '⏰', state.text || '', true, state.endTime);
    }
  });
})();
