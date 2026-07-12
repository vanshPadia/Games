/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, Player } from '../types';
import { Play, Users, Shuffle, Plus, Swords, AlertCircle } from 'lucide-react';

interface QueueManagerProps {
  matches: Match[];
  players: Player[];
  activeMatchId: string | null;
  round: number;
  onLaunchMatch: (matchId: string) => void;
  onCreateCustomMatch: (p1Id: string, p2Id: string) => void;
  onAutoMatchmake: () => void;
  userRole?: 'spectator' | 'umpire' | 'admin';
}

export default function QueueManager({
  matches,
  players,
  activeMatchId,
  round,
  onLaunchMatch,
  onCreateCustomMatch,
  onAutoMatchmake,
  userRole = 'spectator',
}: QueueManagerProps) {
  const [customP1, setCustomP1] = useState('');
  const [customP2, setCustomP2] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract pending matches for the current round (which could be progressive-r1 or r2, etc.)
  const queuedMatches = matches.filter(
    (m) => m.status === 'pending' && m.round === round && m.type !== 'doubles-exhibition'
  );

  // Completed matches for the current round
  const completedCount = matches.filter(
    (m) => m.status === 'completed' && m.round === round && m.type !== 'doubles-exhibition'
  ).length;

  const totalCount = matches.filter(
    (m) => m.round === round && m.type !== 'doubles-exhibition'
  ).length;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customP1 || !customP2) {
      setErrorMsg('Please select both players to create a match!');
      return;
    }
    if (customP1 === customP2) {
      setErrorMsg('A player cannot play against themselves! Select two different players.');
      return;
    }
    setErrorMsg(null);
    onCreateCustomMatch(customP1, customP2);
    setCustomP1('');
    setCustomP2('');
  };

  return (
    <div className="bg-[#0b1320] rounded-3xl shadow-xl border border-emerald-950/45 p-6 flex flex-col font-sans text-slate-100" id="queue-manager-root">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800/60 gap-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Arena Match Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Single table queue. Select next match to launch onto the live table scorekeeper.
          </p>
        </div>

        {/* Progress pill */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1 text-[11px] font-semibold text-slate-300">
          Round Progress: <strong className="text-white">{completedCount}/{totalCount} Matches</strong>
        </div>
      </div>

      {/* Manual Selection Hub / Override */}
      {userRole === 'admin' && (
        <div className="mb-6 bg-[#0e1220] p-4 rounded-2xl border border-slate-800/60" id="match-overrides-section">
          <h3 className="text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-emerald-400" />
            Deploy Custom Exhibition Match
          </h3>

          <form onSubmit={handleCreateCustom} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Player 1</label>
              <select
                value={customP1}
                onChange={(e) => setCustomP1(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Choose Player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-600 font-bold text-xs pb-3 hidden sm:block">VS</div>

            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Player 2</label>
              <select
                value={customP2}
                onChange={(e) => setCustomP2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Choose Player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              Deploy
            </button>
          </form>

          {errorMsg && (
            <div className="mt-3 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Up Next / Queued list */}
      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Up Next In Queue ({queuedMatches.length})
          </h3>
          {queuedMatches.length > 0 && userRole === 'admin' && (
            <button
              onClick={onAutoMatchmake}
              className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Automatically pick a match where players are most rested"
            >
              <Shuffle className="w-3 h-3 text-emerald-400" />
              Smart Matchmaker
            </button>
          )}
        </div>

        {queuedMatches.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 border border-slate-800/60 rounded-2xl text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-600 animate-pulse" />
            <div className="font-semibold text-slate-300">
              No remaining pending matches for Round {round}!
            </div>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              If all matches are done, you can advance to the next round day or championship bracket using the banner above!
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="queued-list-scroll">
            {queuedMatches.map((match, idx) => {
              const isFirstOnDeck = idx === 0;

              return (
                <div
                  key={match.id}
                  className={`flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-xl transition-all border ${
                    isFirstOnDeck
                      ? 'bg-slate-900 text-white border-slate-800 shadow-md ring-2 ring-emerald-400/20'
                      : 'bg-slate-950/40 text-slate-300 border-slate-800/80 hover:bg-slate-900/40'
                  }`}
                >
                  {/* Players Matchup Info */}
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isFirstOnDeck 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400/30 font-black' 
                        : 'bg-slate-800 text-slate-400 border-slate-700/40'
                    }`}>
                      {isFirstOnDeck ? 'ON DECK' : `MATCH ${idx + 1}`}
                    </span>
                    <div className="font-semibold text-sm">
                      <span className={isFirstOnDeck ? 'text-white' : 'text-slate-200'}>
                        {match.player1Name}
                      </span>
                      <span className="mx-2 text-xs font-normal text-slate-500">vs</span>
                      <span className={isFirstOnDeck ? 'text-white' : 'text-slate-200'}>
                        {match.player2Name}
                      </span>
                    </div>
                  </div>

                  {/* Manual start actions */}
                  {userRole !== 'spectator' && (
                    <button
                      onClick={() => onLaunchMatch(match.id)}
                      className={`mt-3 sm:mt-0 w-full sm:w-auto text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                        isFirstOnDeck
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-[1.03]'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Launch this match onto the live table scorekeeper"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Launch Game
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
