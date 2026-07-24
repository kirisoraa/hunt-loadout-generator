// js/ui.js
// UI helpers, rendering, and event wiring.
// Depends on: generateLoadout from generation.js

function $(s, c = document) {
  return c.querySelector(s);
}

function renderEmpty(msg) {
  const container = $('#loadoutContainer');
  container.innerHTML = `<div class="loadout-empty">${msg}</div>`;
}

function renderLoadout(primary, secondary, equipment, capacity) {
  const used = primary.size + secondary.size;
  const container = $('#loadoutContainer');

  const tag = (label, cls) =>
    `<span class="tag ${cls}">${label}</span>`;

  function weaponCard(w, role, cls) {
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

  container.innerHTML = `
    <div class="loadout-header">
      <div class="loadout-header-title">Generated Loadout</div>
      <div class="capacity-badge">${used}/${capacity}</div>
    </div>
    <div class="weapons-row">
      ${weaponCard(primary, 'Primary Weapon', 'primary')}
      ${weaponCard(secondary, 'Secondary Weapon', 'secondary')}
    </div>
    <div class="equip-section">
      <div class="equip-title">Equipment (${equipment.length})</div>
      <div class="equip-grid">${equipHTML}</div>
    </div>`;
}

function toggleSection(id) {
  const sec = $('#' + id);
  sec.classList.toggle('collapsed');
}

// Wire up events when DOM is ready
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
});
