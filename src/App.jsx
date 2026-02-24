import { useState, useEffect, useRef, useCallback } from "react";

const MANA_COLORS = {
  W: { name: "Plains", color: "#F9FAF4", accent: "#E8D8A0", dark: "#3D3526" },
  U: { name: "Island", color: "#0E68AB", accent: "#1A9BD7", dark: "#0A2A44" },
  B: { name: "Swamp", color: "#2B2B2B", accent: "#6B5E5E", dark: "#150B1E" },
  R: { name: "Mountain", color: "#D32029", accent: "#F0613A", dark: "#3A0A0A" },
  G: { name: "Forest", color: "#00733E", accent: "#1A9B50", dark: "#0A2A15" },
};

const THEMES = [
  { id: "obsidian", name: "Obsidian", bg: "#0D0D0F", card: "#18181B", accent: "#A78BFA", text: "#E4E4E7", muted: "#71717A", border: "#27272A", glow: "rgba(167,139,250,0.15)" },
  { id: "blood", name: "Blood Moon", bg: "#110808", card: "#1C0F0F", accent: "#EF4444", text: "#FCA5A5", muted: "#7F5555", border: "#2D1515", glow: "rgba(239,68,68,0.15)" },
  { id: "azorius", name: "Azorius", bg: "#080C14", card: "#0F1724", accent: "#60A5FA", text: "#BFDBFE", muted: "#5577AA", border: "#1E2A40", glow: "rgba(96,165,250,0.15)" },
  { id: "golgari", name: "Golgari", bg: "#0A0E08", card: "#141C10", accent: "#84CC16", text: "#D9F99D", muted: "#5A7744", border: "#1E2D15", glow: "rgba(132,204,22,0.15)" },
  { id: "orzhov", name: "Orzhov", bg: "#0E0D0B", card: "#1A1814", accent: "#D4AF37", text: "#FDE68A", muted: "#8A7744", border: "#2D2815", glow: "rgba(212,175,55,0.15)" },
];

const DEFAULT_PLAYERS = [
  { id: 1, name: "Player 1", life: 40, poison: 0, energy: 0, experience: 0, commanderDamage: {}, color: "W" },
  { id: 2, name: "Player 2", life: 40, poison: 0, energy: 0, experience: 0, commanderDamage: {}, color: "U" },
];

const FORMATS = [
  { id: "commander", name: "Commander", life: 40, players: [2, 3, 4, 5, 6] },
  { id: "standard", name: "Standard", life: 20, players: [2] },
  { id: "modern", name: "Modern", life: 20, players: [2] },
  { id: "draft", name: "Draft", life: 20, players: [2] },
  { id: "brawl", name: "Brawl", life: 25, players: [2, 3, 4] },
  { id: "two_headed", name: "Two-Headed Giant", life: 30, players: [4] },
];

const STORAGE_KEY = "mtg-life-tracker-state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const theme = THEMES.find(t => t.id === parsed.themeId) || THEMES[0];
    const format = FORMATS.find(f => f.id === parsed.formatId) || FORMATS[0];
    return { ...parsed, theme, format };
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: state.theme.id,
      formatId: state.format.id,
      players: state.players,
      turnCount: state.turnCount,
      stormCount: state.stormCount,
      gameLog: state.gameLog,
      gameHistory: state.gameHistory,
    }));
  } catch {}
}

function haptic() {
  if (navigator.vibrate) navigator.vibrate(10);
}

function DiceIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="16" r="1.2" fill="currentColor" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function CoinIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M8 8.5c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5-1.8 2.5-4 3.5-4 2-4 3.5 1.8 2.5 4 2.5 4-1 4-2.5" />
    </svg>
  );
}

function SkullIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 3.07 1.39 5.81 3.57 7.63L6 22h4v-2h4v2h2.43l.43-2.37C19.61 17.81 21 15.07 21 12c0-5.52-4.48-10-9-10zm-3 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  );
}

function BoltIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" />
    </svg>
  );
}

function StarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

function SwordsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20L20 4M14 4l6 0 0 6M4 20l4-4" /><path d="M20 20L4 4M10 4L4 4l0 6M20 20l-4-4" opacity="0.5" />
    </svg>
  );
}

function HistoryIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function FullscreenIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function AnimatedNumber({ value, theme }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(null);
  const prevVal = useRef(value);
  useEffect(() => {
    if (value !== prevVal.current) {
      setFlash(value > prevVal.current ? "up" : "down");
      const timeout = setTimeout(() => setFlash(null), 400);
      setDisplay(value);
      prevVal.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value]);
  return (
    <span style={{
      transition: "color 0.3s, text-shadow 0.3s",
      color: flash === "up" ? "#4ADE80" : flash === "down" ? "#F87171" : theme.text,
      textShadow: flash ? `0 0 20px ${flash === "up" ? "rgba(74,222,128,0.5)" : "rgba(248,113,113,0.5)"}` : "none",
    }}>
      {display}
    </span>
  );
}

function PlayerCard({ player, players, theme, format, onUpdate, onRemove, isMinimized, onToggleMinimize, rotated }) {
  const [editingName, setEditingName] = useState(false);
  const [showCommander, setShowCommander] = useState(false);
  const [showCounters, setShowCounters] = useState(false);
  const manaColor = MANA_COLORS[player.color];
  const isDead = player.life <= 0 || player.poison >= 10;
  const lifeButtons = [-5, -1, 1, 5];

  const handleButton = (fn) => (e) => { haptic(); fn(e); };

  if (isMinimized) {
    return (
      <div onClick={() => { haptic(); onToggleMinimize(); }} style={{
        background: `linear-gradient(135deg, ${theme.card}, ${manaColor.dark})`,
        border: `1px solid ${isDead ? "#7F1D1D" : theme.border}`,
        borderRadius: 12, padding: "12px 16px", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: isDead ? 0.5 : 1, transition: "all 0.3s ease",
        transform: rotated ? "rotate(180deg)" : "none",
      }}>
        <span style={{ color: theme.text, fontFamily: "'Cinzel', serif", fontSize: 14 }}>{player.name}</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {player.poison > 0 && <span style={{ color: "#84CC16", fontSize: 12 }}>☠ {player.poison}</span>}
          <span style={{ color: isDead ? "#EF4444" : theme.accent, fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 700 }}>{player.life}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(145deg, ${theme.card} 0%, ${manaColor.dark} 100%)`,
      border: `1px solid ${isDead ? "#7F1D1D" : theme.border}`,
      borderRadius: 16, padding: 0, position: "relative", overflow: "hidden",
      opacity: isDead ? 0.6 : 1, transition: "all 0.4s ease",
      boxShadow: isDead ? "inset 0 0 40px rgba(127,29,29,0.3)" : `0 4px 24px ${theme.glow}`,
      transform: rotated ? "rotate(180deg)" : "none",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${manaColor.color}, ${manaColor.accent}, transparent)` }} />
      <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {editingName ? (
            <input autoFocus defaultValue={player.name}
              onBlur={(e) => { onUpdate({ name: e.target.value }); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { onUpdate({ name: e.target.value }); setEditingName(false); } }}
              style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, fontFamily: "'Cinzel', serif", fontSize: 14, padding: "2px 8px", borderRadius: 6, outline: "none", width: 120 }} />
          ) : (
            <span onClick={() => setEditingName(true)} style={{ color: theme.text, fontFamily: "'Cinzel', serif", fontSize: 14, cursor: "pointer", letterSpacing: "0.05em" }}>{player.name}</span>
          )}
          <div style={{ display: "flex", gap: 3 }}>
            {Object.entries(MANA_COLORS).map(([key, mc]) => (
              <div key={key} onClick={handleButton(() => onUpdate({ color: key }))} style={{ width: 14, height: 14, borderRadius: "50%", background: mc.color, cursor: "pointer", border: player.color === key ? `2px solid ${theme.text}` : "2px solid transparent", transition: "all 0.2s" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleButton(onToggleMinimize)} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer", fontSize: 16, padding: 2 }}>−</button>
          {players.length > 2 && (
            <button onClick={handleButton(onRemove)} style={{ background: "none", border: "none", color: "#7F1D1D", cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ padding: "8px 16px 12px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 64, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
          <AnimatedNumber value={player.life} theme={theme} />
        </div>
        <div style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 }}>Life Total</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {lifeButtons.map((amt) => (
            <button key={amt} onClick={handleButton(() => onUpdate({ life: player.life + amt }))} style={{
              width: 44, height: 36, borderRadius: 8,
              background: amt > 0 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
              border: `1px solid ${amt > 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              color: amt > 0 ? "#4ADE80" : "#F87171", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Cinzel', serif", transition: "all 0.15s",
            }}>{amt > 0 ? `+${amt}` : amt}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 16px 8px", flexWrap: "wrap" }}>
        {player.poison > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(132,204,22,0.12)", border: "1px solid rgba(132,204,22,0.25)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#84CC16" }}>
            <SkullIcon size={12} /> {player.poison}
          </span>
        )}
        {player.energy > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#FBBF24" }}>
            <BoltIcon size={12} /> {player.energy}
          </span>
        )}
        {player.experience > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#A78BFA" }}>
            <StarIcon size={12} /> {player.experience}
          </span>
        )}
      </div>

      <div style={{ display: "flex", borderTop: `1px solid ${theme.border}` }}>
        <button onClick={handleButton(() => setShowCounters(!showCounters))} style={{
          flex: 1, padding: "10px 0", background: showCounters ? theme.glow : "transparent", border: "none",
          color: theme.muted, fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
          fontFamily: "'Cinzel', serif", transition: "all 0.2s", borderRight: `1px solid ${theme.border}`,
        }}>Counters</button>
        {format.id === "commander" && (
          <button onClick={handleButton(() => setShowCommander(!showCommander))} style={{
            flex: 1, padding: "10px 0", background: showCommander ? theme.glow : "transparent", border: "none",
            color: theme.muted, fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: "'Cinzel', serif", transition: "all 0.2s",
          }}><SwordsIcon size={12} /> Cmd Dmg</button>
        )}
      </div>

      {showCounters && (
        <div style={{ padding: 12, borderTop: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.2)" }}>
          {[
            { label: "Poison", key: "poison", icon: <SkullIcon size={14} />, color: "#84CC16" },
            { label: "Energy", key: "energy", icon: <BoltIcon size={14} />, color: "#FBBF24" },
            { label: "Experience", key: "experience", icon: <StarIcon size={14} />, color: "#A78BFA" },
          ].map((counter) => (
            <div key={counter.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: counter.color, fontSize: 12 }}>{counter.icon} {counter.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={handleButton(() => onUpdate({ [counter.key]: Math.max(0, player[counter.key] - 1) }))} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <span style={{ color: counter.color, fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{player[counter.key]}</span>
                <button onClick={handleButton(() => onUpdate({ [counter.key]: player[counter.key] + 1 }))} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ADE80", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCommander && format.id === "commander" && (
        <div style={{ padding: 12, borderTop: `1px solid ${theme.border}`, background: "rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize: 10, color: theme.muted, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Commander Damage Taken From:</div>
          {players.filter((p) => p.id !== player.id).map((opp) => {
            const dmg = player.commanderDamage[opp.id] || 0;
            const lethal = dmg >= 21;
            return (
              <div key={opp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", opacity: lethal ? 0.5 : 1 }}>
                <span style={{ color: lethal ? "#EF4444" : theme.text, fontSize: 13 }}>{opp.name} {lethal && "\u{1F480}"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={handleButton(() => { const newDmg = { ...player.commanderDamage, [opp.id]: Math.max(0, dmg - 1) }; onUpdate({ commanderDamage: newDmg }); })} style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ color: lethal ? "#EF4444" : theme.accent, fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{dmg}</span>
                  <button onClick={handleButton(() => { const newDmg = { ...player.commanderDamage, [opp.id]: dmg + 1 }; onUpdate({ commanderDamage: newDmg, life: player.life - 1 }); })} style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ADE80", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDead && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, opacity: 0.3, pointerEvents: "none" }}>{"\u{1F480}"}</div>
      )}
    </div>
  );
}

function useWakeLock() {
  const wakeLockRef = useRef(null);
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {}
      }
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, []);
}

function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  );
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isLandscape;
}

function toggleFullscreen() {
  haptic();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

export default function MTGTracker() {
  const saved = useRef(loadState()).current;

  const [theme, setTheme] = useState(saved?.theme || THEMES[0]);
  const [format, setFormat] = useState(saved?.format || FORMATS[0]);
  const [players, setPlayers] = useState(saved?.players || DEFAULT_PLAYERS);
  const [minimized, setMinimized] = useState({});
  const [stormCount, setStormCount] = useState(saved?.stormCount || 0);
  const [turnCount, setTurnCount] = useState(saved?.turnCount || 1);
  const [gameLog, setGameLog] = useState(saved?.gameLog || []);
  const [showTools, setShowTools] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [coinResult, setCoinResult] = useState(null);
  const [diceType, setDiceType] = useState(20);
  const [rolling, setRolling] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [gameHistory, setGameHistory] = useState(saved?.gameHistory || []);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useWakeLock();
  const isLandscape = useOrientation();
  const use2x2Grid = isLandscape && players.length === 4;

  // Persist state to localStorage on every change
  useEffect(() => {
    saveState({ theme, format, players, turnCount, stormCount, gameLog, gameHistory });
  }, [theme, format, players, turnCount, stormCount, gameLog, gameHistory]);

  // Track fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const logAction = useCallback((action) => {
    setGameLog((prev) => [{ action, time: new Date().toLocaleTimeString(), turn: turnCount }, ...prev].slice(0, 100));
  }, [turnCount]);

  const updatePlayer = useCallback((id, updates) => {
    setPlayers((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };
      if (updates.life !== undefined && updates.life !== p.life) { logAction(`${p.name}: ${p.life} \u2192 ${updates.life} life`); }
      if (updates.poison !== undefined && updates.poison !== p.poison) { logAction(`${p.name}: ${updates.poison} poison counters`); }
      return updated;
    }));
  }, [logAction]);

  const addPlayer = () => {
    haptic();
    const colors = Object.keys(MANA_COLORS);
    const newId = Math.max(...players.map((p) => p.id)) + 1;
    setPlayers([...players, { id: newId, name: `Player ${newId}`, life: format.life, poison: 0, energy: 0, experience: 0, commanderDamage: {}, color: colors[(newId - 1) % colors.length] }]);
  };

  const removePlayer = (id) => { if (players.length <= 2) return; setPlayers(players.filter((p) => p.id !== id)); };

  const resetGame = () => {
    haptic();
    if (gameLog.length > 0) {
      setGameHistory((prev) => [{ date: new Date().toLocaleString(), format: format.name, players: players.map((p) => ({ name: p.name, life: p.life, poison: p.poison })), turns: turnCount, log: gameLog.slice(0, 20) }, ...prev].slice(0, 20));
    }
    setPlayers(players.map((p) => ({ ...p, life: format.life, poison: 0, energy: 0, experience: 0, commanderDamage: {} })));
    setStormCount(0); setTurnCount(1); setGameLog([]); logAction("Game reset");
  };

  const rollDice = () => {
    haptic();
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * diceType) + 1);
      count++;
      if (count > 10) { clearInterval(interval); const finalResult = Math.floor(Math.random() * diceType) + 1; setDiceResult(finalResult); setRolling(false); logAction(`Rolled d${diceType}: ${finalResult}`); }
    }, 80);
  };

  const flipCoin = () => {
    haptic();
    setFlipping(true);
    let count = 0;
    const interval = setInterval(() => {
      setCoinResult(Math.random() > 0.5 ? "Heads" : "Tails");
      count++;
      if (count > 8) { clearInterval(interval); const finalResult = Math.random() > 0.5 ? "Heads" : "Tails"; setCoinResult(finalResult); setFlipping(false); logAction(`Coin flip: ${finalResult}`); }
    }, 100);
  };

  const changeFormat = (f) => {
    haptic();
    setFormat(f);
    setPlayers((prev) => {
      let updated = prev.map((p) => ({ ...p, life: f.life, poison: 0, energy: 0, experience: 0, commanderDamage: {} }));
      const maxPlayers = Math.max(...f.players);
      if (updated.length > maxPlayers) updated = updated.slice(0, maxPlayers);
      return updated;
    });
    setStormCount(0); setTurnCount(1); setGameLog([]);
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Cinzel', serif", color: theme.text, maxWidth: use2x2Grid ? "100%" : 600, margin: "0 auto", position: "relative" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 300, background: `radial-gradient(ellipse at 50% 0%, ${theme.glow}, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, padding: use2x2Grid ? "8px 8px 60px" : "16px 16px 100px" }}>
        <div style={{ textAlign: "center", paddingTop: use2x2Grid ? 4 : 12, paddingBottom: use2x2Grid ? 8 : 16 }}>
          <h1 style={{ fontSize: use2x2Grid ? 16 : 22, fontWeight: 800, letterSpacing: "0.12em", color: theme.accent, margin: 0, textTransform: "uppercase", textShadow: `0 0 30px ${theme.glow}` }}>{"\u27E1"} Life Tracker {"\u27E1"}</h1>
          <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.15em", marginTop: 4 }}>{format.name.toUpperCase()} {"\u00B7"} TURN {turnCount} {"\u00B7"} STORM {stormCount}</div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: use2x2Grid ? 8 : 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => { haptic(); setShowSettings(!showSettings); }} style={{ padding: "6px 14px", borderRadius: 8, background: showSettings ? theme.accent : "transparent", border: `1px solid ${theme.border}`, color: showSettings ? theme.bg : theme.muted, fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'Cinzel', serif" }}>{"\u2699"} Settings</button>
          <button onClick={() => { haptic(); setShowTools(!showTools); }} style={{ padding: "6px 14px", borderRadius: 8, background: showTools ? theme.accent : "transparent", border: `1px solid ${theme.border}`, color: showTools ? theme.bg : theme.muted, fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'Cinzel', serif" }}>{"\uD83C\uDFB2"} Tools</button>
          <button onClick={() => { haptic(); setShowHistory(!showHistory); }} style={{ padding: "6px 14px", borderRadius: 8, background: showHistory ? theme.accent : "transparent", border: `1px solid ${theme.border}`, color: showHistory ? theme.bg : theme.muted, fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'Cinzel', serif" }}><HistoryIcon size={12} /> Log</button>
          <button onClick={toggleFullscreen} style={{ padding: "6px 14px", borderRadius: 8, background: isFullscreen ? theme.accent : "transparent", border: `1px solid ${theme.border}`, color: isFullscreen ? theme.bg : theme.muted, fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'Cinzel', serif" }}><FullscreenIcon size={12} /> {isFullscreen ? "Exit" : "Full"}</button>
        </div>

        {showSettings && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>Format</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {FORMATS.map((f) => (
                <button key={f.id} onClick={() => changeFormat(f)} style={{ padding: "6px 12px", borderRadius: 8, background: format.id === f.id ? theme.accent : "transparent", border: `1px solid ${format.id === f.id ? theme.accent : theme.border}`, color: format.id === f.id ? theme.bg : theme.muted, fontSize: 11, cursor: "pointer", fontFamily: "'Cinzel', serif" }}>{f.name} ({f.life})</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>Theme</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => { haptic(); setTheme(t); }} style={{ padding: "6px 12px", borderRadius: 8, background: theme.id === t.id ? t.accent : "transparent", border: `1px solid ${theme.id === t.id ? t.accent : t.border}`, color: theme.id === t.id ? t.bg : t.accent, fontSize: 11, cursor: "pointer", fontFamily: "'Cinzel', serif" }}>{t.name}</button>
              ))}
            </div>
          </div>
        )}

        {showTools && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>Dice Roll</div>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 8 }}>
                  {[4, 6, 8, 10, 12, 20].map((d) => (
                    <button key={d} onClick={() => { haptic(); setDiceType(d); }} style={{ width: 30, height: 26, borderRadius: 4, background: diceType === d ? theme.accent : "transparent", border: `1px solid ${diceType === d ? theme.accent : theme.border}`, color: diceType === d ? theme.bg : theme.muted, fontSize: 10, cursor: "pointer", fontFamily: "'Cinzel', serif" }}>d{d}</button>
                  ))}
                </div>
                <button onClick={rollDice} disabled={rolling} style={{ padding: "10px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}88)`, border: "none", color: theme.bg, fontSize: 14, fontWeight: 700, cursor: rolling ? "wait" : "pointer", fontFamily: "'Cinzel', serif", boxShadow: `0 4px 16px ${theme.glow}` }}><DiceIcon size={16} /> Roll</button>
                {diceResult && (
                  <div style={{ marginTop: 10, fontSize: 36, fontWeight: 800, color: theme.accent, textShadow: `0 0 20px ${theme.glow}`, animation: rolling ? "pulse 0.15s ease infinite" : "none" }}>{diceResult}</div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>Coin Flip</div>
                <div style={{ height: 26, marginBottom: 8 }} />
                <button onClick={flipCoin} disabled={flipping} style={{ padding: "10px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}88)`, border: "none", color: theme.bg, fontSize: 14, fontWeight: 700, cursor: flipping ? "wait" : "pointer", fontFamily: "'Cinzel', serif", boxShadow: `0 4px 16px ${theme.glow}` }}><CoinIcon size={16} /> Flip</button>
                {coinResult && (
                  <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: theme.accent, textShadow: `0 0 20px ${theme.glow}`, animation: flipping ? "pulse 0.15s ease infinite" : "none" }}>{coinResult === "Heads" ? "\uD83E\uDE99" : "\u2B58"} {coinResult}</div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Storm Count</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <button onClick={() => { haptic(); setStormCount(Math.max(0, stormCount - 1)); }} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2212"}</button>
                  <span style={{ fontSize: 28, fontWeight: 700, color: theme.accent, minWidth: 30 }}>{stormCount}</span>
                  <button onClick={() => { haptic(); setStormCount(stormCount + 1); }} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ADE80", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Turn</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <button onClick={() => { haptic(); setTurnCount(Math.max(1, turnCount - 1)); }} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2212"}</button>
                  <span style={{ fontSize: 28, fontWeight: 700, color: theme.accent, minWidth: 30 }}>{turnCount}</span>
                  <button onClick={() => { haptic(); setTurnCount(turnCount + 1); setStormCount(0); logAction(`Turn ${turnCount + 1}`); }} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ADE80", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showHistory && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
            <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>Game Log</div>
            {gameLog.length === 0 ? (
              <div style={{ color: theme.muted, fontSize: 12, fontStyle: "italic" }}>No actions yet</div>
            ) : (
              gameLog.map((entry, i) => (
                <div key={i} style={{ padding: "4px 0", borderBottom: `1px solid ${theme.border}22`, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: theme.text }}>{entry.action}</span>
                  <span style={{ color: theme.muted, fontSize: 10 }}>T{entry.turn} {"\u00B7"} {entry.time}</span>
                </div>
              ))
            )}
            {gameHistory.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: theme.muted, letterSpacing: "0.1em", marginTop: 16, marginBottom: 10, textTransform: "uppercase" }}>Past Games</div>
                {gameHistory.map((game, i) => (
                  <div key={i} style={{ padding: 8, marginBottom: 6, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 11, color: theme.muted }}>{game.date} {"\u00B7"} {game.format} {"\u00B7"} {game.turns} turns</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {game.players.map((p) => (
                        <span key={p.name} style={{ marginRight: 10, color: p.life <= 0 ? "#EF4444" : theme.text }}>{p.name}: {p.life} {p.poison > 0 ? `(\u2620${p.poison})` : ""}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div style={{
          display: use2x2Grid ? "grid" : "flex",
          flexDirection: use2x2Grid ? undefined : "column",
          gridTemplateColumns: use2x2Grid ? "1fr 1fr" : undefined,
          gap: 12,
        }}>
          {players.map((player, index) => (
            <PlayerCard key={player.id} player={player} players={players} theme={theme} format={format}
              onUpdate={(updates) => updatePlayer(player.id, updates)} onRemove={() => removePlayer(player.id)}
              isMinimized={!!minimized[player.id]} onToggleMinimize={() => setMinimized((prev) => ({ ...prev, [player.id]: !prev[player.id] }))}
              rotated={use2x2Grid && index < 2}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          {players.length < Math.max(...format.players) && (
            <button onClick={addPlayer} style={{ padding: "10px 20px", borderRadius: 10, background: "transparent", border: `1px dashed ${theme.border}`, color: theme.muted, fontSize: 12, cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>+ Add Player</button>
          )}
          <button onClick={resetGame} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171", fontSize: 12, cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>{"\u21BA"} New Game</button>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
        button:hover { filter: brightness(1.15); }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
