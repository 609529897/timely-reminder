async function getReminders() {
  const data = await chrome.storage.local.get('reminders');
  return data.reminders || {};
}

async function saveReminders(r) {
  await chrome.storage.local.set({ reminders: r });
}

function playSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch (_) {}
}

function showNotification(id, title, message) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icon48.png',
    title,
    message,
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: '我知道了' },
      { title: '稍后 5 分钟' }
    ]
  });
}

async function sendPageToast(emoji, text, stay, endTime) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'show-toast', emoji, text, stay, endTime }).catch(() => {});
    }
  } catch (_) {}
}

async function sendPageToastFull(data) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { ...data }).catch(() => {});
    }
  } catch (_) {}
}

async function hidePageToast() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'hide-toast' }).catch(() => {});
    }
  } catch (_) {}
}

async function setActiveToast(data) {
  await chrome.storage.local.set({ activeToast: data || null });
}

async function clearActiveToast() {
  await chrome.storage.local.set({ activeToast: null });
}

function scheduleNext(id, r) {
  const mins = r.phase === 'work' ? r.workMinutes : r.restMinutes;
  chrome.alarms.create(id, { delayInMinutes: mins });
}

async function handleCycle(r, id) {
  const cur = r.currentCycle || 1;
  const total = r.cycles || 1;

  if (r.phase === 'work') {
    showNotification(id, '🎯 工作时间到！',
      `${r.message || '专注结束'} — 休息 ${r.restMinutes} 分钟`);
    if (r.sound) playSound();
    const endTime = Date.now() + r.restMinutes * 60000;
    sendPageToast('🎯', `${r.message || '专注'} 时间到，起来活动一下吧`, true, endTime);

    if (!r.infinite && cur >= total) {
      const data = await getReminders();
      delete data[id];
      await saveReminders(data);
      return;
    }

    r.phase = 'rest';
    r.createdAt = Date.now();
    scheduleNext(id, r);
    setActiveToast({ type: 'show-toast', emoji: '🎯', text: `${r.message || '专注'} 时间到，起来活动一下吧`, stay: true, endTime });
    const data = await getReminders();
    data[id] = r;
    await saveReminders(data);
  } else {
    showNotification(id, '☕ 休息结束！',
      `${r.infinite ? `第 ${cur} 轮完成` : `第 ${cur}/${total} 轮完成`}，准备开始下一轮`);
    if (r.sound) playSound();
    hidePageToast();
    clearActiveToast();
    setTimeout(() => sendPageToast('☕', '休息结束，继续加油 💪'), 500);

    r.phase = 'work';
    r.currentCycle = cur + 1;
    r.createdAt = Date.now();
    scheduleNext(id, r);
    const data = await getReminders();
    data[id] = r;
    await saveReminders(data);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const data = await getReminders();
  const r = data[alarm.name];
  if (r) await handleCycle(r, alarm.name);
});

chrome.notifications.onButtonClicked.addListener(async (id, idx) => {
  chrome.notifications.clear(id);
  if (idx === 0) return;
  const data = await getReminders();
  const r = data[id];
  if (r) {
    r.phase = r.phase === 'work' ? 'rest' : 'work';
    r.currentCycle = (r.currentCycle || 1) + (r.phase === 'work' ? 0 : 1);
    r.createdAt = Date.now();
    scheduleNext(id, r);
    data[id] = r;
    await saveReminders(data);
  }
});

chrome.notifications.onClicked.addListener(id => chrome.notifications.clear(id));

chrome.runtime.onInstalled.addListener(async () => {
  const d = await chrome.storage.local.get('reminders');
  if (!d.reminders) await chrome.storage.local.set({ reminders: {}, activeToast: null });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'get-toast-state') {
    chrome.storage.local.get('activeToast').then(({ activeToast }) => {
      sendResponse(activeToast || null);
    });
    return true;
  }
  if (msg.type === 'clear-active-toast') {
    clearActiveToast();
    hidePageToast(sender.tab?.id);
  }
});
