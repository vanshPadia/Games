/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, TournamentConfig } from '../types';
import { UserPlus, Trash2, Trophy, HelpCircle, Shuffle, ChevronRight, Settings } from 'lucide-react';

interface RulesConfigProps {
  onStartTournament: (players: Player[], config: TournamentConfig) => void;
}

const DEFAULT_NAMES = [
  'Alex Chen', 'Becca Miller', 'Charlie Smith', 'Daniel Novak', 
  'Emma Watson', 'Felix Kim', 'Grace Hopper', 'Hugo Vance'
];

export default function RulesConfig({ onStartTournament }: RulesConfigProps) {
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Alex Chen', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
    { id: '2', name: 'Becca Miller', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
    { id: '3', name: 'Charlie Smith', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
    { id: '4', name: 'Daniel Novak', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
  ]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [config, setConfig] = useState<TournamentConfig>({
    pointsToWin: 21,
    winByTwo: true,
    servesPerChange: 5,
    enableFourPointRule: true,
    enableGraceRule: true,
  });

  const [ruleSet, setRuleSet] = useState<'custom' | 'standard'>('custom');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRuleSetChange = (type: 'custom' | 'standard') => {
    setRuleSet(type);
    if (type === 'custom') {
      setConfig({
        pointsToWin: 21,
        winByTwo: true,
        servesPerChange: 5,
        enableFourPointRule: true,
        enableGraceRule: true,
      });
    } else {
      setConfig({
        pointsToWin: 11,
        winByTwo: true,
        servesPerChange: 2,
        enableFourPointRule: false,
        enableGraceRule: false,
      });
    }
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    
    if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('A player with this name already exists!');
      return;
    }
    setErrorMsg(null);

    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      name: trimmed,
      wins: 0,
      losses: 0,
      milestones: 0,
      matchWins: 0,
      bonuses: 0,
      totalPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0
    };

    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
    setErrorMsg(null);
  };

  const handleAddRandomPlayers = () => {
    const available = DEFAULT_NAMES.filter(
      name => !players.some(p => p.name.toLowerCase() === name.toLowerCase())
    );
    if (available.length === 0) {
      setErrorMsg('All default players are already added! Type custom names.');
      return;
    }
    setErrorMsg(null);
    const randName = available[Math.floor(Math.random() * available.length)];
    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      name: randName,
      wins: 0,
      losses: 0,
      milestones: 0,
      matchWins: 0,
      bonuses: 0,
      totalPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0
    };
    setPlayers([...players, newPlayer]);
  };

  const handleSubmit = () => {
    if (players.length < 4) {
      setErrorMsg('Please add at least 4 players to run a balanced tournament (so we have at least 2 matches in R1).');
      return;
    }
    setErrorMsg(null);
    onStartTournament(players, config);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans text-slate-100" id="rules-config-root">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl mb-4 shadow-lg border border-emerald-500/20">
          <Trophy className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Table Tennis Tournament Manager
        </h1>
        <p className="mt-2 text-md text-slate-400">
          Configure players and rules for your customizable single-table arena.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Player Management */}
        <div className="bg-[#111625] p-6 rounded-2xl shadow-xl border border-slate-800/80 flex flex-col h-full" id="player-manager-section">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-400" />
              Players Pool ({players.length})
            </h2>
            <button
              onClick={handleAddRandomPlayers}
              type="button"
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors border border-slate-700/40"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-300" />
              Auto Add Player
            </button>
          </div>

          <form onSubmit={handleAddPlayer} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter player name..."
              className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-100 placeholder:text-slate-500"
              maxLength={25}
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-4 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              Add
            </button>
          </form>

          {errorMsg && (
            <div className="mb-4 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Players List */}
          <div className="flex-1 overflow-y-auto max-h-[300px] bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 space-y-2">
            {players.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No players added yet. Add at least 4.
              </div>
            ) : (
              players.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-900/40 px-4 py-2.5 rounded-lg border border-slate-800/60 shadow-sm transition-transform hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/20">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200">{player.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Remove Player"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3 italic">
            * Tournament requires at least 4 players. Day 1 generates initial Round 1 games, Day 2 matches up bracket-style.
          </p>
        </div>

        {/* Right Column: Rules Configurations */}
        <div className="bg-[#111625] p-6 rounded-2xl shadow-xl border border-slate-800/80 space-y-6" id="rules-settings-section">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-slate-400" />
              Tournament Settings
            </h2>
            
            {/* Rule Presets */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl mb-6 border border-slate-800/50">
              <button
                onClick={() => handleRuleSetChange('custom')}
                className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                  ruleSet === 'custom'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom 4-Point System
              </button>
              <button
                onClick={() => handleRuleSetChange('standard')}
                className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                  ruleSet === 'standard'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Standard ITTF Rules
              </button>
            </div>

            {/* Custom Rules Settings Inputs */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200 text-sm">Points to Win Game</div>
                  <div className="text-xs text-slate-500">Total game score milestone</div>
                </div>
                <select
                  value={config.pointsToWin}
                  onChange={(e) => setConfig({ ...config, pointsToWin: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-200 focus:outline-none"
                >
                  <option value={11}>11 Points</option>
                  <option value={15}>15 Points</option>
                  <option value={21}>21 Points (Traditional)</option>
                </select>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200 text-sm">Win By 2 Points</div>
                  <div className="text-xs text-slate-500">Requires a 2-point lead to win</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.winByTwo}
                  onChange={(e) => setConfig({ ...config, winByTwo: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 accent-emerald-500 bg-slate-900 border-slate-800"
                />
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200 text-sm">Serves Per Turn</div>
                  <div className="text-xs text-slate-500">Alternating serve rotation count</div>
                </div>
                <select
                  value={config.servesPerChange}
                  onChange={(e) => setConfig({ ...config, servesPerChange: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-200 focus:outline-none"
                >
                  <option value={1}>1 Serve</option>
                  <option value={2}>2 Serves</option>
                  <option value={5}>5 Serves (Traditional)</option>
                </select>
              </div>

              <div className="flex justify-between items-start py-2.5 border-b border-slate-800">
                <div className="pr-4">
                  <div className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                    Match point 4-Point System
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold">Custom</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Award up to 4 points:
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-slate-500">
                      <li>First to 10 points gets 1 match point.</li>
                      <li>Match win gets 2 match points.</li>
                      <li>First to 10 AND win gets +1 bonus point.</li>
                    </ul>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableFourPointRule}
                  onChange={(e) => setConfig({ ...config, enableFourPointRule: e.target.checked })}
                  className="w-4 h-4 mt-1 rounded text-slate-900 accent-emerald-500 bg-slate-900 border-slate-800"
                />
              </div>

              <div className="flex justify-between items-start py-2.5">
                <div className="pr-4">
                  <div className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                    First Mis-Serve Grace Rule
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold">Custom</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Each player gets a single free mis-serve warning per match. Their first service fault does not award a point to the opponent.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableGraceRule}
                  onChange={(e) => setConfig({ ...config, enableGraceRule: e.target.checked })}
                  className="w-4 h-4 mt-1 rounded text-slate-900 accent-emerald-500 bg-slate-900 border-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Rules Visual explanation */}
      {config.enableFourPointRule && (
        <div className="mt-8 bg-[#111625] rounded-2xl p-6 border border-slate-800/80 shadow-xl">
          <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-3 text-md">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            Visual Guide: The 4-Point Match System
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="bg-[#0e1220] p-3.5 rounded-xl border border-slate-800/60">
              <div className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Scenario A: Dominance (+4 Points)
              </div>
              <p className="text-xs text-slate-400">
                <strong>Player A</strong> gets to 10 points first (+1 Point) and eventually wins the match (+2 Points). Since they did both, they earn a +1 dominance bonus.
                <span className="block mt-1 font-semibold text-emerald-400">Result: Player A wins 4 - 0</span>
              </p>
            </div>
            <div className="bg-[#0e1220] p-3.5 rounded-xl border border-slate-800/60">
              <div className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Scenario B: Comeback (+1 & +2 Points)
              </div>
              <p className="text-xs text-slate-400">
                <strong>Player A</strong> gets to 10 first (+1 Point). But <strong>Player B</strong> mounts an incredible comeback and wins the match to 21 (+2 Points).
                <span className="block mt-1 font-semibold text-amber-400">Result: Player A gets 1 point, Player B gets 2 points</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Call to action */}
      <div className="mt-10 text-center">
        {errorMsg && (
          <div className="mb-4 inline-block text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl max-w-md mx-auto">
            ⚠️ {errorMsg}
          </div>
        )}
        <div className="clear-both"></div>
        <button
          onClick={handleSubmit}
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg rounded-2xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer"
        >
          Generate Fixtures & Start
          <ChevronRight className="w-5 h-5 text-slate-950" />
        </button>
      </div>
    </div>
  );
}
