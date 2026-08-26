(function () {
  var screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));

  function go(name) {
    screens.forEach(function (s) { s.classList.toggle('is-active', s.dataset.screen === name); });
    navItems.forEach(function (n) { n.classList.toggle('is-active', n.dataset.target === name); });
    document.getElementById('content').scrollTop = 0;
    window.location.hash = name;
  }

  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () { go(btn.dataset.target); });
  });

  var initial = (window.location.hash || '').replace('#', '') || 'dashboard-populated';
  if (!document.querySelector('.screen[data-screen="' + initial + '"]')) initial = 'dashboard-populated';

  window.addEventListener('hashchange', function () {
    var name = (window.location.hash || '').replace('#', '');
    if (document.querySelector('.screen[data-screen="' + name + '"]')) go(name);
  });

  /* ---------------- Add Constraint ---------------- */

  var ac = {
    behavior: 'checkpoint',
    delayMinutes: 15,

    select: function (behavior) {
      this.behavior = behavior;
      document.querySelectorAll('#ac-behaviors .behavior-row').forEach(function (el) {
        el.classList.toggle('is-selected', el.dataset.behavior === behavior);
      });
      document.getElementById('ac-reason-field').style.display = behavior === 'hardblock' ? 'none' : 'block';
    },

    stepDelay: function (delta) {
      this.delayMinutes = Math.max(1, Math.min(120, this.delayMinutes + delta));
      document.getElementById('ac-delay-val').textContent = this.delayMinutes + ' min';
    },

    togglePrivate: function (checked) {
      document.getElementById('ac-private-warning').style.display = checked ? 'block' : 'none';
    }
  };

  /* ---------------- Delay enforcement page ---------------- */

  var CIRC = 2 * Math.PI * 48; // r=48
  var delay = {
    state: 'active',
    isPrivate: false,
    set: function (state) {
      this.state = state;
      var ring = document.getElementById('delay-ring-fill');
      var readout = document.getElementById('delay-readout');
      var sub = document.getElementById('delay-sub');
      var continueBtn = document.getElementById('delay-continue');
      document.querySelectorAll('[data-delay-state]').forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.delayState === state);
      });
      if (state === 'active') {
        ring.style.stroke = 'var(--accent)';
        ring.setAttribute('stroke-dashoffset', (CIRC * 0.8).toFixed(1));
        readout.textContent = '12 min';
        sub.textContent = 'remaining · this will be ready shortly.';
        continueBtn.style.display = 'none';
      } else {
        ring.style.stroke = 'var(--accent)';
        ring.setAttribute('stroke-dashoffset', '0');
        readout.textContent = 'Ready.';
        sub.textContent = this.isPrivate ? 'This site is available again.' : 'reddit.com is available again.';
        continueBtn.style.display = 'inline-block';
        continueBtn.textContent = this.isPrivate ? 'Continue anyway' : 'Continue to reddit.com';
      }
    }
  };

  /* ---------------- PIN enforcement page ---------------- */

  var pin = {
    verify: function () { this.showError(); },
    showError: function () {
      document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
      var input = document.getElementById('pin-input');
      input.value = '';
      input.style.borderColor = 'var(--destructive)';
      input.classList.add('shake');
      input.focus();
      setTimeout(function () { input.classList.remove('shake'); }, 300);
    },
    reset: function () {
      document.getElementById('pin-error').textContent = '';
      var input = document.getElementById('pin-input');
      input.value = '';
      input.style.borderColor = '';
    }
  };

  /* ---------------- Tab Budget enforcement page ---------------- */

  var BUDGET = 10;
  var tabs = {
    total: 11,
    update: function () {
      var title = document.getElementById('tb-title');
      var sub = document.getElementById('tb-sub');
      var list = document.getElementById('tb-list');
      var closeOldestBtn = document.getElementById('tb-close-oldest');
      title.textContent = 'Tab budget: ' + this.total + ' of ' + BUDGET;
      if (this.total <= BUDGET) {
        sub.textContent = 'Back within budget — continuing to chatgpt.com…';
        list.style.display = 'none';
        closeOldestBtn.style.display = 'none';
      } else {
        sub.textContent = 'Close a tab to keep going.';
        list.style.display = 'block';
        closeOldestBtn.style.display = 'block';
      }
    },
    close: function (id) {
      var row = document.querySelector('#tb-list [data-tab="' + id + '"]');
      if (!row || row.classList.contains('closing')) return;
      row.classList.add('closing');
      this.total = Math.max(BUDGET, this.total - 1);
      setTimeout(function () { row.remove(); }, 160);
      this.update();
    },
    closeOldest: function () {
      var row = document.querySelector('#tb-list .row:not(.closing)');
      if (row) this.close(row.dataset.tab);
    },
    reset: function () {
      location.reload();
    }
  };

  /* ---------------- private constraints (Sites reveal/lock) ---------------- */

  var privacy = {
    pinSet: true,
    unlocked: false,

    setPinScenario: function (hasPin) {
      this.pinSet = hasPin;
      this.unlocked = false;
      this.applyMask(true);
      this.renderBar();
      document.querySelectorAll('[data-pin-scenario]').forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.pinScenario === (hasPin ? 'yes' : 'no'));
      });
    },

    promptUnlock: function () {
      if (!this.pinSet) return;
      document.getElementById('reveal-locked-msg').style.display = 'none';
      var entry = document.getElementById('reveal-pin-entry');
      entry.style.display = 'flex';
      document.getElementById('reveal-pin-input').focus();
    },

    attemptUnlock: function () {
      // Prototype only: any input verifies. Production checks against settings.pin.
      this.unlocked = true;
      this.applyMask(false);
      this.renderBar();
    },

    lock: function () {
      this.unlocked = false;
      this.applyMask(true);
      this.renderBar();
    },

    renderBar: function () {
      var locked = document.getElementById('reveal-locked-msg');
      var entry = document.getElementById('reveal-pin-entry');
      var unlockedEl = document.getElementById('reveal-unlocked-msg');
      var noPin = document.getElementById('reveal-no-pin-msg');
      locked.style.display = 'none';
      entry.style.display = 'none';
      unlockedEl.style.display = 'none';
      noPin.style.display = 'none';
      if (!this.pinSet) { noPin.style.display = 'flex'; return; }
      if (this.unlocked) { unlockedEl.style.display = 'flex'; } else { locked.style.display = 'flex'; }
    },

    applyMask: function (masked) {
      // Scoped through the .screen wrapper (unique per screen) rather than
      // #sites-list directly: the comparison board clones this markup's
      // *inner* HTML into a thumbnail, which duplicates the id — querying
      // by id alone would also mutate that inert thumbnail copy.
      document.querySelectorAll('.screen[data-screen="sites"] #sites-list [data-private="true"]').forEach(function (row) {
        var domainEl = row.querySelector('.domain');
        var real = row.dataset.realDomain;
        if (masked) {
          domainEl.className = 'domain is-private';
          domainEl.innerHTML = '<svg class="lock-mini"><use href="#i-lock-mini"/></svg>Private site';
        } else {
          domainEl.className = 'domain';
          domainEl.innerHTML = real + '<span class="private-tag">Private</span>';
        }
      });
    },

    editRow: function (btn) {
      var row = btn.closest('.row');
      if (row.dataset.private === 'true' && !this.unlocked) {
        if (this.pinSet) this.promptUnlock();
        document.getElementById('reveal-bar').scrollIntoView({ block: 'nearest' });
        return;
      }
      Proto.go('add-constraint');
    },

    deleteRow: function (btn) {
      // Deletion never requires unlocking — removing a private constraint
      // doesn't expose its domain.
      var row = btn.closest('.row');
      row.style.transition = 'opacity 150ms ease';
      row.style.opacity = '0';
      setTimeout(function () { row.remove(); }, 150);
    }
  };

  /* ---------------- private constraints (enforcement copy variants) ---------------- */

  function setDemoMode(group, mode) {
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.mode === mode);
    });
  }

  var privacyDemo = {
    checkpoint: function (mode) {
      var isPrivate = mode === 'private';
      document.getElementById('cp-chip').style.display = isPrivate ? 'none' : 'inline-block';
      document.getElementById('cp-reason').style.display = isPrivate ? 'none' : 'block';
      document.getElementById('cp-h1').textContent = isPrivate ? 'This site is constrained.' : 'You were heading to youtube.com.';
      document.getElementById('cp-continue').textContent = isPrivate ? 'Continue anyway' : 'Continue to youtube.com anyway';
      setDemoMode('cp-mode', mode);
    },
    delay: function (mode) {
      var isPrivate = mode === 'private';
      delay.isPrivate = isPrivate;
      document.getElementById('dl-chip').style.display = isPrivate ? 'none' : 'inline-block';
      delay.set(delay.state);
      setDemoMode('dl-mode', mode);
    },
    pin: function (mode) {
      document.getElementById('pin-chip').style.display = mode === 'private' ? 'none' : 'inline-block';
      setDemoMode('pn-mode', mode);
    },
    hardblock: function (mode) {
      document.getElementById('hb-chip').style.display = mode === 'private' ? 'none' : 'inline-block';
      setDemoMode('hb-mode', mode);
    }
  };

  /* ---------------- comparison board ---------------- */

  function buildCompare() {
    var popupSources = ['dashboard-populated', 'sites', 'add-constraint', 'settings-pin-set'];
    var enfSources = ['checkpoint', 'delay', 'pin', 'hard-block', 'tab-budget'];
    fillGrid('compare-popup', popupSources, false);
    fillGrid('compare-enf', enfSources, true);
  }

  function fillGrid(gridId, sources, isEnf) {
    var grid = document.getElementById(gridId);
    sources.forEach(function (name) {
      var src = document.querySelector('.screen[data-screen="' + name + '"] .stage').innerHTML;
      var thumb = document.createElement('div');
      thumb.className = 'thumb' + (isEnf ? ' enf' : '');
      thumb.innerHTML =
        '<div class="thumb-label">' + name.replace(/-/g, ' ') + '</div>' +
        '<div class="thumb-viewport"><div class="thumb-inner">' + src + '</div></div>';
      grid.appendChild(thumb);
    });
  }

  /* ---------------- init ---------------- */

  window.Proto = { go: go, ac: ac, delay: delay, pin: pin, tabs: tabs, privacy: privacy, privacyDemo: privacyDemo };

  var style = document.createElement('style');
  style.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}#pin-input.shake{animation:shake 300ms ease}';
  document.head.appendChild(style);

  buildCompare();
  go(initial);
})();
