/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { TournamentState, Match, Player } from '../types';
import { 
  Trophy, Tv, Calendar, Users, Award, Play, AlertTriangle, Timer, Activity, Zap, ArrowLeft, ShieldAlert
} from 'lucide-react';

interface SpectatorViewProps {
  state: TournamentState;
  onToggleSpectator: () => void;
  onLaunchMatch: (matchId: string) => void;
  onUpdateMatch: (updatedMatch: Match) => void;
  isStandalone?: boolean;
}

export default function SpectatorView({ state, onToggleSpectator, onLaunchMatch, onUpdateMatch, isStandalone = false }: SpectatorViewProps) {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => {
    const active = state.matches.find((m) => m.status === 'active');
    setActiveMatch(active || null);
  }, [state.matches]);

  // Leaderboard calculation helper for spectator view
  const displayPlayers = [...state.players].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
    const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
    if (ratioB !== ratioA) {
      return ratioB - ratioA;
    }
    return a.name.localeCompare(b.name);
  }).slice(0, 10);

  // Filter upcoming pending matches for the current round
  const upcomingMatches = state.matches.filter(
    (m) => m.status === 'pending' && m.round === state.round
  );

  // Completed matches
  const completedMatches = state.matches.filter(
    (m) => m.status === 'completed'
  );

  return (
    <div className="min-h-screen bg-[#040811] font-sans text-slate-100 flex flex-col overflow-x-hidden select-none" id="spectator-viewport">
      
      {/* Sleek Presentation Header */}
      <header className="bg-[#0b1320] border-b border-emerald-950/45 px-6 py-4 shadow-2xl relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-2xl border border-emerald-400 shadow-lg shadow-emerald-500/20">
              <Tv className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-400 uppercase">
                  TT Arena Cast Panel
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Spectator Mode Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wide">
                Single-Table Master Arena • Real-Time Synchronized Display
              </p>
            </div>
          </div>

          {/* Central status pill */}
          <div className="flex items-center gap-2 bg-[#080d1a] border border-slate-800 px-4 py-2 rounded-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-300 font-mono">
              STAGE: {`Round Robin - Day ${state.round}`}
            </span>
          </div>

          {/* Exit casting */}
          {!isStandalone && (
            <button
              onClick={onToggleSpectator}
              className="text-xs font-bold px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.03]"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              Exit Spectator Mode
            </button>
          )}
        </div>
      </header>

      {/* Main Broadcast Grid */}
      {state.status === 'setup' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto text-center space-y-6">
          <div className="p-6 bg-[#0b1320] rounded-full border border-emerald-950/45 shadow-2xl relative">
            <Tv className="w-16 h-16 text-slate-500 animate-bounce" />
            <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Awaiting Arena Launch...
          </h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            The tournament coordinator is currently setting up the player roster and rules. Once they press <strong className="text-emerald-400">"Start Tournament"</strong>, this cast board will automatically refresh to display the live arena.
          </p>
          <div className="text-xs text-emerald-400 font-mono bg-emerald-950/10 px-4 py-2 rounded-xl border border-emerald-950/20">
            Tip: Connect your computer to a TV or projector and make this tab full-screen (F11).
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT AREA: Match scoreboard (takes 7 cols) */}
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
            
            {/* Live Board Widget */}
            <div className="bg-[#0b1320] rounded-3xl border border-emerald-950/45 p-8 shadow-2xl relative overflow-hidden" id="spectator-live-board">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full"></div>

              {/* Widget Header */}
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-5 mb-8">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono text-emerald-400">
                    Live Scoreboard
                  </span>
                </div>
                {activeMatch ? (
                  <div className="flex items-center gap-1.5 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/20">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                    </span>
                    Live Match
                  </div>
                ) : (
                  <div className="text-[10px] font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    VACANT
                  </div>
                )}
              </div>

              {activeMatch ? (
                <div className="space-y-8">
                  {/* Digital Score Deck */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    
                    {/* Player 1 Deck */}
                    <div className="col-span-5 text-right space-y-3">
                      <div className="flex items-center justify-end gap-2">
                        {activeMatch.server === 'player1' && (
                          <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-bounce shadow-md">
                            <Zap className="w-2.5 h-2.5 fill-current" /> SERVE
                          </span>
                        )}
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-[200px]">
                          {activeMatch.player1Name}
                        </span>
                      </div>
                      
                      {/* Giant score display */}
                      <div className={`text-6xl sm:text-8xl font-black font-mono tracking-tighter p-6 bg-[#040811] rounded-3xl border ${
                        activeMatch.winnerId === activeMatch.player1Id 
                          ? 'border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5' 
                          : 'border-slate-800/80 text-white'
                      }`}>
                        {activeMatch.score1}
                      </div>

                      {/* Milestone checks */}
                      {state.config.enableFourPointRule && activeMatch.firstTo10Id === activeMatch.player1Id && (
                        <div className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/25">
                          ⭐ Milestone Achieved
                        </div>
                      )}
                    </div>

                    {/* VS divider */}
                    <div className="col-span-2 text-center flex flex-col items-center justify-center space-y-2">
                      <span className="text-xs font-black font-mono text-slate-500 tracking-wider">VS</span>
                      <div className="w-px h-16 bg-slate-850"></div>
                      
                      {/* Timer Display */}
                      <div className="flex items-center gap-1 text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl font-mono text-xs">
                        <Timer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {Math.floor(activeMatch.timerSeconds / 60)}:
                          {String(activeMatch.timerSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Player 2 Deck */}
                    <div className="col-span-5 text-left space-y-3">
                      <div className="flex items-center justify-start gap-2">
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-[200px]">
                          {activeMatch.player2Name}
                        </span>
                        {activeMatch.server === 'player2' && (
                          <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-bounce shadow-md">
                            <Zap className="w-2.5 h-2.5 fill-current" /> SERVE
                          </span>
                        )}
                      </div>

                      {/* Giant score display */}
                      <div className={`text-6xl sm:text-8xl font-black font-mono tracking-tighter p-6 bg-[#040811] rounded-3xl border ${
                        activeMatch.winnerId === activeMatch.player2Id 
                          ? 'border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5' 
                          : 'border-slate-800/80 text-white'
                      }`}>
                        {activeMatch.score2}
                      </div>

                      {/* Milestone checks */}
                      {state.config.enableFourPointRule && activeMatch.firstTo10Id === activeMatch.player2Id && (
                        <div className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/25">
                          ⭐ Milestone Achieved
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Grace Rule Indicator if active */}
                  {state.config.enableGraceRule && activeMatch.hasGraceRuleBeenUsed && (
                    <div className="bg-rose-950/20 border border-rose-900/40 text-rose-300 p-3 rounded-2xl flex items-center gap-2.5 text-xs max-w-md mx-auto justify-center">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>One-point Grace protection shield was activated this game!</span>
                    </div>
                  )}

                  {/* Rolling Match Logs Feed */}
                  <div className="border-t border-slate-800/40 pt-6 mt-6 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 font-mono">
                      Live Arena Event Log
                    </h4>
                    <div className="space-y-1.5">
                      {activeMatch.logs.slice(-3).reverse().map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl border ${
                            idx === 0 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 font-semibold' 
                              : 'bg-slate-950/40 border-slate-900 text-slate-400 opacity-60'
                          }`}
                        >
                          <span className="truncate max-w-[320px]">{log.message}</span>
                          <span className="font-mono text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-500">
                            {log.scoreState.score1} - {log.scoreState.score2}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
                  <div className="p-4 bg-slate-900/60 text-slate-500 rounded-full border border-slate-800">
                    <Play className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-300">Single Table is Vacant</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Awaiting match deployment from the administrator dashboard. Players, please stay prepared.
                  </p>
                </div>
              )}
            </div>

            {/* Results Ticker */}
            <div className="bg-[#0b1320] rounded-3xl border border-emerald-950/45 p-5 shadow-xl">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono mb-3">
                Latest Concluded Match Results
              </h4>
              {completedMatches.length === 0 ? (
                <div className="text-xs text-slate-500 italic font-mono">No matches completed yet in this stage.</div>
              ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {completedMatches.slice(-3).reverse().map((m) => {
                    const p1Won = m.winnerId === m.player1Id;
                    return (
                      <div key={m.id} className="bg-[#040811] border border-slate-800 px-3.5 py-2.5 rounded-2xl flex items-center gap-3 shrink-0 text-xs">
                        <span className="font-mono text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 uppercase">
                          Day {m.round}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`${p1Won ? 'text-emerald-400 font-black' : 'text-slate-400 opacity-60'}`}>{m.player1Name}</span>
                          <span className="font-mono text-[10px] font-bold bg-slate-900 px-1.5 rounded text-slate-300">{m.score1}-{m.score2}</span>
                          <span className={`${!p1Won ? 'text-emerald-400 font-black' : 'text-slate-400 opacity-60'}`}>{m.player2Name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT AREA: Standings and Upcoming Match Queue */}
          <div className="col-span-1 lg:col-span-5 space-y-6">
            
            {/* Leaderboard Panel */}
            <div className="bg-[#0b1320] rounded-3xl border border-emerald-950/45 p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800/60 mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-200">
                    Top 10 Live Standings
                  </h3>
                </div>
              </div>

              <div className="space-y-1.5">
                {displayPlayers.map((p, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <div 
                      key={p.id} 
                      className={`flex justify-between items-center py-2 px-3.5 rounded-xl border transition-all ${
                        isFirst 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white font-black' 
                          : 'bg-[#040811] border-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`font-mono text-xs font-black ${isFirst ? 'text-emerald-400' : 'text-slate-500'}`}>
                          #{idx + 1}
                        </span>
                        <span className="truncate max-w-[150px]">{p.name}</span>
                        {isFirst && <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-400">{p.wins}W - {p.losses}L</span>
                        <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                          isFirst ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {p.totalPoints} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Queue Panel */}
            <div className="bg-[#0b1320] rounded-3xl border border-emerald-950/45 p-6 shadow-xl">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-800/60 mb-4">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-200">
                  Upcoming Match Queue ({upcomingMatches.length})
                </h3>
              </div>

              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  All matches in this round are completed or running!
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                  {upcomingMatches.map((m, idx) => (
                    <div key={m.id} className="bg-[#040811] border border-slate-900 p-3 rounded-2xl flex items-center justify-between text-xs hover:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="font-mono text-slate-600 text-[10px]">#{idx + 1}</span>
                        <span className="font-medium truncate max-w-[100px]">{m.player1Name}</span>
                        <span className="text-slate-600">vs</span>
                        <span className="font-medium truncate max-w-[100px]">{m.player2Name}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase bg-slate-900 text-slate-500 border border-slate-850 px-2 py-0.5 rounded-md font-mono">
                        QUEUED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
