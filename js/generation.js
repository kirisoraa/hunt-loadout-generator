// js/generation.js
// Core loadout generation logic.
// Depends on: WEAPONS, TOOLS, CONSUMABLES, TAROT_CARDS from data.js
// Uses: renderEmpty from ui.js

function getCheckedValues(cls) {
  return [...document.querySelectorAll(cls)]
    .filter(c => c.checked)
    .map(c => c.value);
}

function parseList(v) {
  return (v || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

// Match helpers for dropdown-based favorites/dislikes/exclude

function matchesWeapon(name, token) {
  if (!token) return false;
  const n = name.toLowerCase();
  if (token.startsWith('weapon:')) {
    const target = token.slice(7).toLowerCase();
    return n === target;
  }
  if (token.startsWith('family:')) {
    const target = token.slice(7).toLowerCase();
    return n.includes(target);
  }
  if (token.startsWith('type:')) {
    const t = token.slice(5);
    switch (t) {
      case 'scoped': return name.toLowerCase().includes('silencer') || name.toLowerCase().includes('marksman') || name.toLowerCase().includes('deadeye') || name.toLowerCase().includes('sniper') || name.toLowerCase().includes('aperture') || name.toLowerCase().includes('bullseye') || name.toLowerCase().includes('precision');
      case 'auto': return name.toLowerCase().includes('auto') || name.toLowerCase().includes('avtomat') || name.toLowerCase().includes('cyclone') || name.toLowerCase().includes('swift');
      case 'silencer': return name.toLowerCase().includes('silencer');
      case 'melee': return name.toLowerCase().includes('bat') || name.toLowerCase().includes('machete') || name.toLowerCase().includes('katana') || name.toLowerCase().includes('saber') || name.toLowerCase().includes('axe') || name.toLowerCase().includes('hammer');
      case 'shotgun': return name.toLowerCase().includes('shotgun') || name.toLowerCase().includes('rival 78') || name.toLowerCase().includes('romero 77') || name.toLowerCase().includes('terminus') || name.toLowerCase().includes('specter 1882') || name.toLowerCase().includes('slate') || name.toLowerCase().includes('auto-5');
      case 'long-range': return name.length > 3; // handled via size in data; we'll approximate by size check elsewhere
      case 'crossbow': return name.toLowerCase().includes('crossbow') || name.toLowerCase().includes('bow');
      default: return false;
    }
  }
  // Fallback: substring
  return n.includes(token.toLowerCase());
}

function matchesExclude(name, excludes) {
  if (!excludes.length) return false;
  const n = name.toLowerCase();
  return excludes.some(e => {
    if (e.startsWith('weapon:')) return n === e.slice(7).toLowerCase();
    if (e.startsWith('family:')) return n.includes(e.slice(7).toLowerCase());
    if (e.startsWith('type:')) {
      const t = e.slice(5);
      switch (t) {
        case 'scoped': return name.toLowerCase().includes('silencer') || name.toLowerCase().includes('marksman') || name.toLowerCase().includes('deadeye') || name.toLowerCase().includes('sniper') || name.toLowerCase().includes('aperture') || name.toLowerCase().includes('bullseye') || name.toLowerCase().includes('precision');
        case 'auto': return name.toLowerCase().includes('auto') || name.toLowerCase().includes('avtomat') || name.toLowerCase().includes('cyclone') || name.toLowerCase().includes('swift');
        case 'silencer': return name.toLowerCase().includes('silencer');
        case 'melee': return name.toLowerCase().includes('bat') || name.toLowerCase().includes('machete') || name.toLowerCase().includes('katana') || name.toLowerCase().includes('saber') || name.toLowerCase().includes('axe') || name.toLowerCase().includes('hammer');
        case 'shotgun': return name.toLowerCase().includes('shotgun') || name.toLowerCase().includes('rival 78') || name.toLowerCase().includes('romero 77') || name.toLowerCase().includes('terminus') || name.toLowerCase().includes('specter 1882') || name.toLowerCase().includes('slate') || name.toLowerCase().includes('auto-5');
        case 'long-range': return name.length > 3;
        case 'crossbow': return name.toLowerCase().includes('crossbow') || name.toLowerCase().includes('bow');
        default: return n.includes(e.toLowerCase());
      }
    }
    return n.includes(e.toLowerCase());
  });
}

function isFavorited(w, favs) {
  if (!favs.length) return false;
  return favs.some(token => matchesWeapon(w.name, token));
}

function isDisliked(w, dis) {
  if (!dis.length) return false;
  return dis.some(token => matchesWeapon(w.name, token));
}

function weightedPick(items, weightFn) {
  if (!items.length) return null;
  const weights = items.map(w => weightFn(w));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function readPreferences() {
  const quartermaster = document.getElementById('p-quartermaster').checked;
  const capacity = quartermaster ? 6 : 5;
  const playstyle = document.querySelector('input[name="playstyle"]:checked').value;

  const pSizes = getCheckedValues('.primary-size').map(Number);
  const pAmmos = getCheckedValues('.primary-ammo');
  const pScope = document.getElementById('p-scope').checked;
  const pAuto = document.getElementById('p-auto').checked;
  const pScarce = document.getElementById('p-scarce').checked;

  const sSizes = getCheckedValues('.secondary-size').map(Number);
  const sAmmos = getCheckedValues('.secondary-ammo');
  const sPistol = document.getElementById('s-pistol').checked;
  const sShotgun = document.getElementById('s-shotgun').checked;

  const equipEnabled = document.getElementById('p-equip-enabled').checked;
  const equipCount = parseInt(document.getElementById('p-equip-count').value);

  const eHealing = document.getElementById('e-healing').checked;
  const eExplosives = document.getElementById('e-explosives').checked;
  const eTraps = document.getElementById('e-traps').checked;
  const eFire = document.getElementById('e-fire').checked;
  const eThrowables = document.getElementById('e-throwables').checked;
  const eShots = document.getElementById('e-shots').checked;
  const eTarot = document.getElementById('e-tarot').checked;

  const synergy = document.getElementById('p-synergy').checked;

  const favorites = getFavoritesSelections();
  const dislikes = getDislikesSelections();
  const excludes = getExcludeSelections();

  return {
    capacity,
    playstyle,
    pSizes, pAmmos, pScope, pAuto, pScarce,
    sSizes, sAmmos, sPistol, sShotgun,
    equipEnabled,
    equipCount,
    eHealing, eExplosives, eTraps, eFire, eThrowables, eShots, eTarot,
    synergy,
    favorites, dislikes, excludes
  };
}

function buildWeaponWeights(prefs) {
  const { playstyle, pScope, pAuto, favorites, dislikes } = prefs;

  function weightPrimary(w) {
    let weight = 1;

    if (isFavorited(w, favorites)) weight *= 15;
    if (isDisliked(w, dislikes)) weight *= 0.02;

    if (pScope && w.scoped) weight *= 4;
    if (pScope && !w.scoped) weight *= 0.4;

    if (pAuto && w.auto) weight *= 4;
    if (pAuto && !w.auto && w.ammo !== 'Melee') weight *= 0.5;

    switch (playstyle) {
      case 'aggressive':
        if (w.category === 'shotgun') weight *= 2.2;
        else if (w.size <= 2) weight *= 1.6;
        else if (w.size >= 4) weight *= 0.5;
        break;
      case 'sniper':
        if (w.scoped && w.size >= 3) weight *= 2.4;
        if (w.ammo === 'Special Long' || w.ammo === 'Long') weight *= 1.4;
        if (w.size <= 1) weight *= 0.2;
        break;
      case 'stealth':
        if (w.category === 'special') weight *= 1.8;
        if (w.scoped && w.size >= 3) weight *= 1.3;
        if (w.category === 'shotgun') weight *= 0.7;
        break;
      case 'weird':
        if (w.category === 'special') weight *= 2.5;
        if (w.name.includes('Bomb Lance')) weight *= 3;
        if (w.name.includes('Dual') || (w.category === 'pistol' && w.size <= 1)) weight *= 1.6;
        break;
      default: // balanced
        if (w.size >= 3 && w.size <= 4) weight *= 1.1;
        break;
    }

    return Math.max(weight, 0.05);
  }

  function weightSecondary(w, primary) {
    let weight = 1;

    if (isFavorited(w, favorites)) weight *= 15;
    if (isDisliked(w, dislikes)) weight *= 0.02;

    if (prefs.sShotgun && w.category === 'shotgun') weight *= 4;
    if (prefs.sPistol && (w.category === 'pistol' || w.category === 'melee')) weight *= 1.5;

    if (prefs.synergy) {
      // Long-range/sniper primary: prefer close-range backup
      if (
        primary.size >= 4 &&
        (primary.scoped || primary.ammo === 'Special Long' || primary.ammo === 'Long')
      ) {
        if (w.category === 'pistol' || w.category === 'shotgun' || w.category === 'melee') {
          weight *= 2.5;
        } else if (w.size >= 4) {
          weight *= 0.6;
        }
      }
      // Shotgun primary: prefer mid-range backup
      if (primary.category === 'shotgun') {
        if (w.category === 'rifle' && w.size >= 2) weight *= 1.8;
        if (w.category === 'shotgun') weight *= 0.7;
      }
      // Crossbow/bow primary: prefer fast backup
      if (primary.category === 'special') {
        if (w.category === 'pistol' || w.category === 'rifle') weight *= 1.6;
      }
    }

    switch (playstyle) {
      case 'aggressive':
        if (w.category === 'shotgun' || w.size <= 2) weight *= 1.4;
        break;
      case 'sniper':
        if (w.category === 'pistol' || w.category === 'shotgun') weight *= 1.6;
        break;
      case 'stealth':
        if (w.category === 'pistol' || w.size <= 1) weight *= 1.4;
        break;
      case 'weird':
        if (w.category === 'special') weight *= 2;
        if (w.name.includes('Bomb Lance')) weight *= 2.5;
        break;
      default: // balanced
        if (w.size <= 2) weight *= 1.1;
        break;
    }

    return Math.max(weight, 0.05);
  }

  return { weightPrimary, weightSecondary };
}

function buildWeaponFilters(prefs) {
  const { capacity, pSizes, pAmmos, pScarce, excludes, sSizes, sAmmos, sPistol } = prefs;

  function filterPrimary(w) {
    if (!pSizes.includes(w.size)) return false;
    if (w.ammo !== "Melee" && !pAmmos.includes(w.ammo)) return false;
    if (w.scarce && !pScarce) return false;
    if (matchesExclude(w.name, excludes)) return false;
    if (w.size >= capacity) return false; // must leave room for secondary
    return true;
  }

  function filterSecondary(w, primary) {
    if (w.name === primary.name) return false;
    if (!sSizes.includes(w.size)) return false;

    const remaining = capacity - primary.size;
    if (w.size > remaining) return false;

    if (w.ammo !== "Melee" && !sAmmos.includes(w.ammo)) return false;
    if (matchesExclude(w.name, excludes)) return false;
    if (sPistol && w.category !== 'pistol' && w.category !== 'melee') return false;
    return true;
  }

  return { filterPrimary, filterSecondary };
}

function buildEquipmentConfig(prefs) {
  const {
    eHealing, eExplosives, eTraps, eFire, eThrowables, eShots,
    excludes, synergy, playstyle
  } = prefs;

  const allowedTypes = new Set();
  if (eHealing) allowedTypes.add('healing');
  if (eExplosives) allowedTypes.add('explosive');
  if (eTraps) allowedTypes.add('trap');
  if (eFire) allowedTypes.add('fire');
  if (eThrowables) allowedTypes.add('throwable');
  if (eShots) allowedTypes.add('shot');

  // Always allow these general types
  allowedTypes.add('resupply');
  allowedTypes.add('melee');
  allowedTypes.add('pocket');
  allowedTypes.add('distraction');
  allowedTypes.add('utility');
  allowedTypes.add('poison');
  allowedTypes.add('beetle');
  allowedTypes.add('placeable');

  const equipBias = {
    aggressive: ['explosive', 'healing', 'shot', 'fire'],
    sniper: ['healing', 'trap', 'distraction', 'shot'],
    stealth: ['poison', 'distraction', 'trap', 'healing'],
    weird: ['explosive', 'fire', 'trap', 'shot'],
    balanced: ['healing', 'explosive', 'shot']
  };

  const biasOrder = equipBias[playstyle] || equipBias.balanced;

  function equipWeight(item) {
    let w = 1;
    if (item.type === 'healing') w *= 1.6;
    if (item.type === 'explosive') w *= 1.3;
    if (item.type === 'distraction') w *= 1.2;
    if (biasOrder.includes(item.type)) w *= 1.4;
    return w;
  }

  const allEquip = [...TOOLS, ...CONSUMABLES];
  const usedNames = new Set();

  function pickFrom(pool, typeFilter) {
    const filtered = pool.filter(item => {
      if (usedNames.has(item.name)) return false;
      if (matchesExclude(item.name, excludes)) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (!typeFilter && !allowedTypes.has(item.type)) return false;
      return true;
    });

    if (!filtered.length) return null;

    // Use equipWeight when filling general equipment and synergy is on
    const useWeights = !typeFilter && synergy;
    if (useWeights) {
      const chosen = weightedPick(filtered, eq => equipWeight(eq));
      usedNames.add(chosen.name);
      return chosen;
    }

    const chosen = filtered[Math.floor(Math.random() * filtered.length)];
    usedNames.add(chosen.name);
    return chosen;
  }

  return { allEquip, usedNames, pickFrom };
}

function findWeaponByName(name) {
  return WEAPONS.find(w => w.name === name) || null;
}

function generateLoadout() {
  const prefs = readPreferences();
  const { filterPrimary, filterSecondary } = buildWeaponFilters(prefs);
  const { weightPrimary, weightSecondary } = buildWeaponWeights(prefs);

  const MAX_ATTEMPTS = 60;
  let primary = null;
  let secondary = null;

  const lockedP = findWeaponByName(lockedPrimaryName);
  const lockedS = findWeaponByName(lockedSecondaryName);

  const primaryLocked = !!lockedP;
  const secondaryLocked = !!lockedS;

  // If both locked, just re-render with same weapons (equipment still can be rerolled if desired; for now keep same)
  if (primaryLocked && secondaryLocked) {
    if (lockedP.size + lockedS.size > prefs.capacity) {
      renderEmpty("Locked weapons exceed capacity. Unlock one or enable Quartermaster.");
      return;
    }
    primary = lockedP;
    secondary = lockedS;
  } else if (primaryLocked) {
    // Use locked primary, roll secondary
    primary = lockedP;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidates = WEAPONS.filter(w => filterSecondary(w, primary));
      if (!candidates.length) break;
      secondary = weightedPick(candidates, w => weightSecondary(w, primary));
      if (secondary) break;
    }
  } else if (secondaryLocked) {
    // Use locked secondary, roll primary
    secondary = lockedS;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidates = WEAPONS.filter(w => {
        if (!filterPrimary(w)) return false;
        if (w.name === secondary.name) return false;
        const remaining = prefs.capacity - secondary.size;
        if (w.size > remaining) return false;
        return true;
      });
      if (!candidates.length) break;
      primary = weightedPick(candidates, w => weightPrimary(w));
      if (primary) break;
    }
  } else {
    // Normal: roll both
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const primaryCandidates = WEAPONS.filter(filterPrimary);
      if (!primaryCandidates.length) {
        renderEmpty("No valid primary weapon for current filters. Try relaxing some.");
        return;
      }

      primary = weightedPick(primaryCandidates, w => weightPrimary(w));

      const secondaryCandidates = WEAPONS.filter(w => filterSecondary(w, primary));
      if (!secondaryCandidates.length) continue;

      secondary = weightedPick(secondaryCandidates, w => weightSecondary(w, primary));
      if (secondary) break;
    }
  }

  if (!primary || !secondary) {
    renderEmpty("No valid weapon combination found. Try relaxing some filters or unlock a weapon.");
    return;
  }

  // Equipment selection
  const equipment = [];

  if (prefs.equipEnabled) {
    const { allEquip, pickFrom } = buildEquipmentConfig(prefs);
    const {
      eHealing, eExplosives, eTraps, eFire, eThrowables, eShots, eTarot, equipCount
    } = prefs;

    if (eHealing) {
      const h = pickFrom(allEquip, 'healing');
      if (h) equipment.push(h);
    }
    if (eExplosives) {
      const e = pickFrom(allEquip, 'explosive');
      if (e) equipment.push(e);
    }
    if (eTraps) {
      const t = pickFrom(allEquip, 'trap');
      if (t) equipment.push(t);
    }
    if (eFire) {
      const f = pickFrom(allEquip, 'fire');
      if (f) equipment.push(f);
    }
    if (eThrowables) {
      const th = pickFrom(allEquip, 'throwable');
      if (th) equipment.push(th);
    }
    if (eShots) {
      const s = pickFrom(allEquip, 'shot');
      if (s) equipment.push(s);
    }
    if (eTarot) {
      const card = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
      const tarotItem = { name: card, type: "tarot" };
      if (!prefs.excludes.some(e => card.toLowerCase().includes(e))) {
        equipment.push(tarotItem);
      }
    }

    while (equipment.length < equipCount) {
      const item = pickFrom(allEquip);
      if (!item) break;
      equipment.push(item);
    }
  }

  renderLoadout(primary, secondary, equipment, prefs.capacity);
}
