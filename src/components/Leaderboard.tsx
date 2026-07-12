/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, TournamentConfig } from '../types';
import { Award, Zap, TrendingUp } from 'lucide-react';

interface LeaderboardProps {
  players: Player[];
  config: TournamentConfig;
  isStageCompleted: boolean;
}

export default function Leaderboard({ players, config, isStageCompleted }: LeaderboardProps) {
  return (
    <div className="bg-[#0b1320] rounded-3xl shadow-xl border border-emerald-950/45 p-6 flex flex-col font-sans text-slate-100" id="leaderboard-root">
      
      {/* Title block */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            Live Standings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Round Robin Stage standings. Standard Caspin & Caspin-Grace scoring.
          </p>
        </div>
        {isStageCompleted && (
          <span className="bg-emerald-500/10 text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/20 shadow-md">
            Stage Finished
          </span>
        )}
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto flex-1" id="leaderboard-table-container">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-2">Rank</th>
              <th className="py-3 px-3">Player</th>
              <th className="py-3 px-2 text-center">Played</th>
              <th className="py-3 px-2 text-center">W - L</th>
              {config.enableFourPointRule && (
                <>
                  <th className="py-3 px-2 text-center bg-amber-950/20 text-amber-400 border border-amber-900/20" title="First to 10 points (+1 pt)">Milestone</th>
                  <th className="py-3 px-2 text-center bg-emerald-950/20 text-emerald-400 border border-emerald-900/20" title="Match Win (+2 pts)">Wins</th>
                  <th className="py-3 px-2 text-center bg-lime-950/20 text-lime-400 border border-lime-900/20" title="Milestone + Match Win (+1 pt)">Bonus</th>
                </>
              )}
              <th className="py-3 px-3 text-center bg-slate-950 text-emerald-400 rounded-t-lg border border-slate-800/50">Total Pts</th>
              <th className="py-3 px-3 text-center">Pts Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {players.map((player, idx) => {
              const rank = idx + 1;
              const isTop4 = rank <= 4;
              const ratio = player.pointsAgainst === 0 
                ? player.pointsFor 
                : (player.pointsFor / player.pointsAgainst).toFixed(2);
                
              const playedCount = player.wins + player.losses;

              return (
                <tr 
                  key={player.id}
                  className={`transition-colors ${
                    isTop4 
                      ? 'bg-slate-900/10 font-semibold text-slate-200' 
                      : 'text-slate-400'
                  } hover:bg-slate-800/40`}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-2">
                    <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[11px] font-bold border ${
                      rank === 1 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                        : rank === 2 
                        ? 'bg-slate-800 text-slate-300 border-slate-700/40' 
                        : rank === 3 
                        ? 'bg-amber-600/15 text-amber-500 border-amber-600/20'
                        : isTop4
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {rank}
                    </span>
                  </td>

                  {/* Player Name */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{player.name}</span>
                      {isTop4 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="In bracket position"></span>
                      )}
                    </div>
                  </td>

                  {/* Matches Played */}
                  <td className="py-3.5 px-2 text-center font-mono text-slate-300">
                    {playedCount}
                  </td>

                  {/* Record W-L */}
                  <td className="py-3.5 px-2 text-center font-mono text-slate-300">
                    <span className="text-emerald-400 font-bold">{player.wins}</span>
                    <span className="text-slate-600 mx-1">-</span>
                    <span className="text-slate-400">{player.losses}</span>
                  </td>

                  {/* Custom points break downs */}
                  {config.enableFourPointRule && (
                    <>
                      {/* Milestone points */}
                      <td className="py-3.5 px-2 text-center font-mono text-amber-400 bg-amber-950/5 border-x border-slate-800/20">
                        {player.milestones}
                        <span className="text-[9px] text-amber-500 block font-normal">+{player.milestones * 1}p</span>
                      </td>
                      {/* Wins points */}
                      <td className="py-3.5 px-2 text-center font-mono text-emerald-400 bg-emerald-950/5 border-x border-slate-800/20">
                        {player.matchWins}
                        <span className="text-[9px] text-emerald-500 block font-normal">+{player.matchWins * 2}p</span>
                      </td>
                      {/* Bonus points */}
                      <td className="py-3.5 px-2 text-center font-mono text-lime-400 bg-lime-950/5 border-x border-slate-800/20">
                        {player.bonuses}
                        <span className="text-[9px] text-lime-500 block font-normal">+{player.bonuses * 1}p</span>
                      </td>
                    </>
                  )}

                  {/* Total Tournament Points */}
                  <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-400 bg-slate-950 border-x border-slate-800/80">
                    {player.totalPoints}
                  </td>

                  {/* Points Ratio */}
                  <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3 text-slate-500" />
                      <span>{ratio}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 block font-normal">{player.pointsFor}:{player.pointsAgainst}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom info section */}
      <div className="mt-4 bg-[#0e1220] rounded-xl p-3 border border-slate-800/80 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
        <div className="text-[10px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Point Distribution Rule (4-Point System):</strong> 
          {' '}First to 10 points gets <span className="font-semibold text-slate-200">1 Match Point</span>. Winning the game to {config.pointsToWin} points gets <span className="font-semibold text-slate-200">2 Match Points</span>. Dominance bonus (first to 10 + win) gets an additional <span className="font-semibold text-slate-200">1 Match Point</span> (Total max: 4). Ties are resolved by W-L count, then Points Ratio.
        </div>
      </div>

    </div>
  );
}
