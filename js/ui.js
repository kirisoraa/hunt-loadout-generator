// js/ui.js
// UI helpers, rendering, and event wiring.
// Depends on: generateLoadout from generation.js, WEAPONS from data.js

function $(s, c = document) {
  return c.querySelector(s);
}

// ---------- RENDERING ----------

function renderEmpty(msg) {
  const container = $('#loadoutContainer');
  container.innerHTML = `<div class="loadout-empty">${msg}</div>`;
}

let lockedPrimaryName = null;
let lockedSecondaryName = null;

function renderLoadout(primary, secondary, equipment, capacity) {
  const used = primary.size + secondary.size;
  const container = $('#loadoutContainer');

  const tag = (label, cls) =>
    `<span class="tag ${cls}">${label}</span>`;

  function weaponCard(w, role, cls, lockKey) {
    const locked = (lockKey === 'primary' && lockedPrimaryName === w.name) ||
                   (lockKey === 'secondary' && lockedSecondaryName === w.name);
    const lockIcon = locked ? '🔒' : '🔓';
    return `
      <div class="weapon-card ${cls}">
        <div class="weapon-role">${role}</div>
        <div class="weapon-name">${w.name}</div>
        <div class="weapon-tags">
          ${tag('Size ' + w.size, 'size')}
          ${w.ammo !== 'Melee' ? tag(w.ammo, 'ammo') : tag('Melee', 'ammo')}
          ${w.scoped ? tag('Scoped', '') : ''}
          ${w.auto ? tag('Auto', '') : ''}
          ${w.scarce ? tag('Scarce', 'special') : ''}
        </div>
        <button class="lock-btn" data-role="${lockKey}" title="Lock/Unlock this weapon">${lockIcon}</button>
      </div>`;
  }

  const equipHTML = equipment
    .map(item => {
      const extra =
        item.type === 'tarot'
          ? ' <span style="color:var(--gold-dim);font-size:0.55rem;">(Tarot)</span>'
          : '';
      return `<div class="equip-item">${item.name}${extra}</div>`;
    })
    .join('');

  const showEquipment = equipment.length > 0;

  container.innerHTML = `
    <div class="loadout-header">
      <div class="loadout-header-title">Generated Loadout</div>
      <div class="capacity-badge">${used}/${capacity}</div>
    </div>
    <div class="weapons-row">
      ${weaponCard(primary, 'Primary Weapon', 'primary', 'primary')}
      ${weaponCard(secondary, 'Secondary Weapon', 'secondary', 'secondary')}
    </div>
    ${showEquipment ? `
    <div class="equip-section">
      <div class="equip-title">Equipment (${equipment.length})</div>
      <div class="equip-grid">${equipHTML}</div>
    </div>` : ''}`;

  // Wire lock buttons
  container.querySelectorAll('.lock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      const card = btn.closest('.weapon-card');
      const name = card.querySelector('.weapon-name').textContent.trim();

      if (role === 'primary') {
        lockedPrimaryName = (lockedPrimaryName === name) ? null : name;
      } else {
        lockedSecondaryName = (lockedSecondaryName === name) ? null : name;
      }

      // Update icon immediately
      const isLocked = (role === 'primary' && lockedPrimaryName === name) ||
                       (role === 'secondary' && lockedSecondaryName === name);
      btn.textContent = isLocked ? '🔒' : '🔓';
    });
  });
}

function toggleSection(id) {
  const sec = $('#' + id);
  sec.classList.toggle('collapsed');
}

// ---------- MULTI-SELECT + TAGS ----------

function buildMultiSelectOptions() {
  // We'll build:
  // - Families (e.g., "Vetterli 71", "Mosin-Nagant", "Romero 77")
  // - Specific weapons
  // - Types (Scoped, Auto, Silencer, Melee, etc.)

  const families = new Set();
  WEAPONS.forEach(w => {
    // Derive family from base name: e.g., "Vetterli 71 Marksman" -> "Vetterli 71"
    const name = w.name;
    if (
      name.includes('Vetterli 71') ||
      name.includes('Mosin-Nagant') ||
      name.includes('Romero 77') ||
      name.includes('Rival 78') ||
      name.includes('Springfield 1866') ||
      name.includes('Bornheim No. 3') ||
      name.includes('Nagant M1895') ||
      name.includes('Centennial') ||
      name.includes('Berthier 1892') ||
      name.includes('Lebel 1886') ||
      name.includes('Krag') ||
      name.includes('Specter 1882') ||
      name.includes('Martini-Henry') ||
      name.includes('Marathon') ||
      name.includes('Sparks') ||
      name.includes('Mako 1895') ||
      name.includes('Infantry 73L') ||
      name.includes('Ranger 73') ||
      name.includes('Mosin Obrez') ||
      name.includes('Auto-5') ||
      name.includes('Dolch 96') ||
      name.includes('LeMat') ||
      name.includes('Uppercut') ||
      name.includes('Slate') ||
      name.includes('Terminus') ||
      name.includes('Maynard')
    ) {
      // Extract family prefix: everything before first known variant keyword
      const variants = [
        'Marksman', 'Deadeye', 'Sniper', 'Aperture', 'Bullseye',
        'Shorty', 'Silencer', 'Bayonet', 'Mace', 'Hatchet',
        'Talon', 'Trauma', 'Ironside', 'Riposte', 'Claw',
        'Striker', 'Swift', 'Extended', 'Match', 'Precision',
        'Avtomat', 'Alamo', 'Cyclone', 'Pointman', 'Sharpeye',
        'Brawler', 'Spitfire'
      ];
      let family = name;
      for (const v of variants) {
        const idx = name.indexOf(' ' + v);
        if (idx !== -1) {
          const candidate = name.slice(0, idx);
          if (candidate.length < family.length) family = candidate;
        }
      }
      if (family.length > 3) families.add(family);
    }
  });

  const options = [];

  // Families
  options.push({ text: '— Families —', disabled: true });
  [...families].sort().forEach(f => {
    options.push({ value: 'family:' + f, text: f });
  });

  // Specific weapons
  options.push({ text: '— Specific Weapons —', disabled: true });
  WEAPONS.sort((a, b) => a.name.localeCompare(b.name)).forEach(w => {
    options.push({ value: 'weapon:' + w.name, text: w.name });
  });

  // Types
  options.push({ text: '— Types —', disabled: true });
  options.push({ value: 'type:scoped', text: 'Scoped' });
  options.push({ value: 'type:auto', text: 'Auto / Semi-Auto' });
  options.push({ value: 'type:silencer', text: 'Silencer' });
  options.push({ value: 'type:melee', text: 'Melee' });
  options.push({ value: 'type:shotgun', text: 'Shotgun' });
  options.push({ value: 'type:long-range', text: 'Long-Range Rifles (Size 4–5)' });
  options.push({ value: 'type:crossbow', text: 'Crossbow / Bow' });

  return options;
}

function createMultiSelect(selectId, tagsId) {
  const select = $(`#${selectId}`);
  const tagsContainer = $(`#${tagsId}`);
  const options = buildMultiSelectOptions();

  options.forEach(o => {
    const opt = document.createElement('option');
    if (o.disabled) {
      opt.text = o.text;
      opt.disabled = true;
      opt.style.fontWeight = '600';
      opt.style.color = 'var(--text-muted)';
    } else {
      opt.value = o.value;
      opt.text = o.text;
    }
    select.appendChild(opt);
  });

  // When selection changes, update tags
  select.addEventListener('change', () => {
    // Move selected options into tags and deselect them
    for (const opt of select.options) {
      if (opt.selected) {
        addTag(tagsContainer, select, opt.value, opt.text);
        opt.selected = false;
      }
    }
  });

  return { select, tagsContainer };
}

function addTag(container, select, value, label) {
  const tag = document.createElement('span');
  tag.className = 'multi-tag';
  tag.textContent = label;
  tag.addEventListener('click', () => {
    // Remove tag
    tag.remove();
  });
  container.appendChild(tag);
}

function getMultiSelectValues(tagsId) {
  // We'll derive values from selected options in the corresponding select
  // For simplicity: we'll read from the select's options that are marked in data- attributes.
  // But we currently don't track which option each tag corresponds to.
  // So let's enhance: each tag stores its value in a data attribute.
  const container = $(`#${tagsId}`);
  if (!container) return [];
  return [...container.querySelectorAll('.multi-tag')]
    .map(t => t.dataset.value || t.textContent.trim());
}

// Better approach: store value in tag data-value and link to select options.
// We'll update addTag and provide a helper to read values from tags.

function createMultiSelectV2(selectId, tagsId) {
  const select = $(`#${selectId}`);
  const tagsContainer = $(`#${tagsId}`);
  const options = buildMultiSelectOptions();

  options.forEach(o => {
    const opt = document.createElement('option');
    if (o.disabled) {
      opt.text = o.text;
      opt.disabled = true;
      opt.style.fontWeight = '600';
      opt.style.color = 'var(--text-muted)';
    } else {
      opt.value = o.value;
      opt.text = o.text;
    }
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    for (const opt of select.options) {
      if (opt.selected) {
        addTagV2(tagsContainer, opt.value, opt.text);
        opt.selected = false;
      }
    }
  });

  return { select, tagsContainer };
}

function addTagV2(container, value, label) {
  const tag = document.createElement('span');
  tag.className = 'multi-tag';
  tag.textContent = label;
  tag.dataset.value = value;
  tag.addEventListener('click', () => {
    tag.remove();
  });
  container.appendChild(tag);
}

function getMultiSelectValuesV2(tagsId) {
  const container = $(`#${tagsId}`);
  if (!container) return [];
  return [...container.querySelectorAll('.multi-tag')]
    .map(t => t.dataset.value);
}

// ---------- INIT ----------

window.addEventListener('DOMContentLoaded', () => {
  // Initial loadout
  generateLoadout();

  // Roll button
  $('#rollBtn').addEventListener('click', generateLoadout);

  // Equipment count slider
  $('#p-equip-count').addEventListener('input', e => {
    $('#equip-count-val').textContent = e.target.value;
  });

  // Mobile menu toggle
  $('#menuToggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  // Multi-selects
  createMultiSelectV2('favorites-select', 'favorites-tags');
  createMultiSelectV2('dislikes-select', 'dislikes-tags');
  createMultiSelectV2('exclude-select', 'exclude-tags');
});

// Public helpers for generation.js

function getFavoritesSelections() {
  return getMultiSelectValuesV2('favorites-tags');
}

function getDislikesSelections() {
  return getMultiSelectValuesV2('dislikes-tags');
}

function getExcludeSelections() {
  return getMultiSelectValuesV2('exclude-tags');
}
