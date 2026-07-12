/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Match, TournamentState, TournamentConfig } from '../types';
import { calculateLeaderboard } from '../utils/tournamentHelpers';
import { 
  Users, Calendar, Edit3, Save, Trash2, Plus, ArrowRight, Download, Upload, Check, AlertTriangle, FileSpreadsheet, Play, CheckCircle, RefreshCw
} from 'lucide-react';

interface TournamentControlPanelProps {
  state: TournamentState;
  onUpdateState: (newState: TournamentState) => void;
  onAddPlayer: (name: string) => void;
  onEditPlayer: (playerId: string, newName: string) => void;
  onDeletePlayer: (playerId: string) => void;
  onReplacePlayer: (playerId: string, newName: string) => void;
  onSelectRound: (roundNum: number) => void;
  onAddRound: () => void;
  onCorrectMatch?: (matchId: string, score1: number, score2: number, firstTo10Id: string | null, winnerId: string | null) => void;
  onOverrideStanding?: (playerId: string, overrides: Partial<Player>) => void;
  userRole?: 'spectator' | 'umpire' | 'admin';
  onUnlock?: () => void;
}

export default function TournamentControlPanel({
  state,
  onUpdateState,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onReplacePlayer,
  onSelectRound,
  onAddRound,
  userRole = 'spectator',
  onUnlock,
}: TournamentControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'backups'>('players');
  
  // Players Tab state
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [replacingPlayerId, setReplacingPlayerId] = useState<string | null>(null);
  const [replaceName, setReplaceName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Matches Tab inline editing state
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editP1Id, setEditP1Id] = useState('');
  const [editP2Id, setEditP2Id] = useState('');
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);
  const [editStatus, setEditStatus] = useState<'pending' | 'active' | 'completed'>('pending');
  const [editWinnerId, setEditWinnerId] = useState<string | null>(null);

  // File Upload state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileMessage, setFileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Helper to recalculate match list and leaderboard in one sweep
  const handleUpdateMatchesAndRecalculate = (updatedMatches: Match[]) => {
    // 1. Calculate base leaderboard
    const baseLeaderboard = calculateLeaderboard(state.players, updatedMatches, state.config);
    
    // 2. Apply standing overrides
    const actualOverrides = state.standingOverrides || {};
    let finalPlayers = baseLeaderboard;
    if (Object.keys(actualOverrides).length > 0) {
      finalPlayers = baseLeaderboard.map((p) => {
        if (actualOverrides[p.id]) {
          const pOverrides = actualOverrides[p.id];
          const result = { ...p, ...pOverrides };
          if ('milestones' in pOverrides || 'matchWins' in pOverrides || 'bonuses' in pOverrides) {
            const milestones = pOverrides.milestones !== undefined ? pOverrides.milestones : p.milestones;
            const matchWins = pOverrides.matchWins !== undefined ? pOverrides.matchWins : p.matchWins;
            const bonuses = pOverrides.bonuses !== undefined ? pOverrides.bonuses : p.bonuses;
            result.totalPoints = milestones * 1 + matchWins * 2 + bonuses * 1;
          }
          return result;
        }
        return p;
      });
      
      // Sort after overrides
      finalPlayers.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
        const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
        if (ratioB !== ratioA) return ratioB - ratioA;
        return a.name.localeCompare(b.name);
      });
    }

    onUpdateState({
      ...state,
      matches: updatedMatches,
      players: finalPlayers
    });
  };

  // Add player submit handler
  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    onAddPlayer(newPlayerName.trim());
    setNewPlayerName('');
  };

  // Edit player name
  const handleSaveEditName = (playerId: string) => {
    if (!editName.trim()) return;
    onEditPlayer(playerId, editName.trim());
    setEditingPlayerId(null);
    setEditName('');
  };

  // Replace player submit
  const handleSaveReplacePlayer = (playerId: string) => {
    if (!replaceName.trim()) return;
    onReplacePlayer(playerId, replaceName.trim());
    setReplacingPlayerId(null);
    setReplaceName('');
  };

  // Open match edit inline controls
  const handleStartEditMatch = (m: Match) => {
    setEditingMatchId(m.id);
    setEditP1Id(m.player1Id);
    setEditP2Id(m.player2Id);
    setEditScore1(m.score1);
    setEditScore2(m.score2);
    setEditStatus(m.status);
    setEditWinnerId(m.winnerId);
  };

  // Save modified match inline
  const handleSaveMatchDetails = (matchId: string) => {
    const updatedMatches = state.matches.map((m) => {
      if (m.id !== matchId) return m;

      const p1 = state.players.find(p => p.id === editP1Id);
      const p2 = state.players.find(p => p.id === editP2Id);
      const p1Name = p1 ? p1.name : m.player1Name;
      const p2Name = p2 ? p2.name : m.player2Name;

      // Auto-compute winner if completed and not manually forced
      let winnerId = editWinnerId;
      if (editStatus === 'completed' && !winnerId) {
        if (editScore1 > editScore2) winnerId = editP1Id;
        else if (editScore2 > editScore1) winnerId = editP2Id;
      } else if (editStatus !== 'completed') {
        winnerId = null;
      }

      // Auto-compute milestone (first to 10 points)
      let firstTo10Id = m.firstTo10Id;
      if (editScore1 >= 10 && editScore2 < 10) {
        firstTo10Id = editP1Id;
      } else if (editScore2 >= 10 && editScore1 < 10) {
        firstTo10Id = editP2Id;
      } else if (editScore1 >= 10 && editScore2 >= 10 && !firstTo10Id) {
        // Tie-breaker default or keep old
        firstTo10Id = editScore1 > editScore2 ? editP1Id : editP2Id;
      }

      return {
        ...m,
        player1Id: editP1Id,
        player2Id: editP2Id,
        player1Name: p1Name,
        player2Name: p2Name,
        score1: editScore1,
        score2: editScore2,
        status: editStatus,
        winnerId: winnerId,
        firstTo10Id: firstTo10Id,
      };
    });

    handleUpdateMatchesAndRecalculate(updatedMatches);
    setEditingMatchId(null);
  };

  // Delete match completely
  const handleDeleteMatch = (matchId: string) => {
    const filtered = state.matches.filter(m => m.id !== matchId);
    handleUpdateMatchesAndRecalculate(filtered);
  };

  // Export Standings to CSV (for Excel / Google Sheets copy-paste)
  const handleExportStandingsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Player Name,Wins,Losses,Milestones (10 Pts),Match Wins (2 Pts),Bonuses (+1 Pt),Total Points,Points For,Points Against,Points Ratio\n";
    
    state.players.forEach((p, idx) => {
      const ratio = p.pointsAgainst === 0 ? p.pointsFor : (p.pointsFor / p.pointsAgainst).toFixed(3);
      csvContent += `${idx + 1},"${p.name.replace(/"/g, '""')}",${p.wins},${p.losses},${p.milestones},${p.matchWins},${p.bonuses},${p.totalPoints},${p.pointsFor},${p.pointsAgainst},${ratio}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TT_Standings_Day${state.round}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Match history to CSV
  const handleExportMatchesCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Match ID,Round,Day,Player 1,Player 2,Score 1,Score 2,Winner,Status\n";

    state.matches.forEach((m) => {
      const winnerName = m.winnerId === m.player1Id ? m.player1Name : m.winnerId === m.player2Id ? m.player2Name : "None/Pending";
      csvContent += `"${m.id}",${m.round},${m.round},"${m.player1Name.replace(/"/g, '""')}","${m.player2Name.replace(/"/g, '""')}",${m.score1},${m.score2},"${winnerName.replace(/"/g, '""')}","${m.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "TT_Match_History.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export state to JSON backup file
  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tt_tournament_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Restore state from JSON backup file
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.players && parsed.matches && parsed.config) {
          onUpdateState(parsed);
          setFileMessage({ text: '📁 Backup restored successfully! All players, scores, and logs are loaded.', type: 'success' });
        } else {
          setFileMessage({ text: '❌ Invalid backup file format. Missing players or matches data.', type: 'error' });
        }
      } catch (err) {
        setFileMessage({ text: '❌ Failed to parse file. Ensure it is a valid JSON backup.', type: 'error' });
      }
    };
    fileReader.readAsText(files[0]);
  };

  if (userRole !== 'admin') {
    return (
      <div className="bg-[#0b1320] rounded-3xl p-8 border border-slate-800 shadow-xl text-center space-y-4 py-12 flex flex-col items-center justify-center w-full" id="tournament-control-panel-root">
        <div className="p-4 bg-slate-900/60 text-slate-400 rounded-full border border-slate-800 shadow-inner">
          <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-white">Admin Operations Restricted</h3>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            You are currently authorized as <strong className="text-emerald-400 uppercase font-mono">{userRole}</strong>. Adding or editing players, custom standings corrections, or restoring database backups requires Administrator privileges.
          </p>
        </div>
        {onUnlock && (
          <button
            onClick={onUnlock}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Unlock Admin Controls
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0b1320] rounded-3xl p-6 border border-emerald-950/45 shadow-2xl shadow-emerald-950/10 space-y-6 w-full" id="tournament-control-panel-root">
      
      {/* Tab Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/60 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            Arena Control Panel & Operations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            100% manual control over opponents, match status, scorecards, custom player additions, and backups.
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-slate-950/85 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'players' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Roster
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'matches' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Manage Matches
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backups' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Data & Backup
          </button>
        </div>
      </div>

      {/* Roster tab */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <form onSubmit={handleAddPlayerSubmit} className="flex gap-2 w-full md:max-w-md">
              <input
                type="text"
                placeholder="Add Player Mid-Tournament..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Player
              </button>
            </form>
            <span className="text-slate-500 text-[11px] leading-relaxed md:text-right md:max-w-xs">
              💡 Players added mid-tournament will start with 0 points. You can schedule matches for them anytime under the "Manage Matches" tab.
            </span>
          </div>

          {/* Roster list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="admin-roster-list">
            {state.players.map((p) => {
              const playedCount = state.matches.filter(
                (m) => m.status === 'completed' && (m.player1Id === p.id || m.player2Id === p.id)
              ).length;

              return (
                <div key={p.id} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/85 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    {editingPlayerId === p.id ? (
                      <div className="flex gap-1.5 w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        />
                        <button
                          onClick={() => handleSaveEditName(p.id)}
                          className="bg-emerald-500 p-1.5 rounded-lg hover:bg-emerald-400 text-slate-950 font-bold"
                          title="Save Name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingPlayerId(null)}
                          className="bg-slate-800 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : replacingPlayerId === p.id ? (
                      <div className="flex gap-1.5 w-full">
                        <input
                          type="text"
                          placeholder="Replacement Player Name..."
                          value={replaceName}
                          onChange={(e) => setReplaceName(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        />
                        <button
                          onClick={() => handleSaveReplacePlayer(p.id)}
                          className="bg-emerald-500 p-1.5 rounded-lg hover:bg-emerald-400 text-slate-950 font-bold"
                          title="Replace Player"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setReplacingPlayerId(null)}
                          className="bg-slate-800 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-bold text-white text-sm">{p.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Games Played: {playedCount} | Standings Score: {p.totalPoints} pts
                        </p>
                      </div>
                    )}

                    {!editingPlayerId && !replacingPlayerId && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => { setEditingPlayerId(p.id); setEditName(p.name); }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded-lg"
                          title="Rename Player"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => { setReplacingPlayerId(p.id); setReplaceName(''); }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-semibold px-2.5 py-1 rounded-lg"
                          title="Replace player but keep history"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(p.id)}
                          className="text-red-400 hover:bg-red-950/40 p-1.5 rounded-lg"
                          title="Remove Player completely"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmations */}
                  {showDeleteConfirm === p.id && (
                    <div className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl text-xs space-y-2 animate-fade-in">
                      <p className="text-[10px] text-red-400 font-semibold">
                        ⚠️ Deleting will permanently erase this player and ALL of their played matches from memory. Proceed?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { onDeletePlayer(p.id); setShowDeleteConfirm(null); }}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-md"
                        >
                          Yes, Erase Player
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="bg-slate-850 text-slate-300 text-[10px] px-2.5 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manage Matches Tab */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Select Active Round/Day to View</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Switch active Day session or schedule a custom match below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={state.round}
                onChange={(e) => onSelectRound(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none"
              >
                {Array.from({ length: Math.max(3, state.round) }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Day {idx + 1} (Round {idx + 1})
                  </option>
                ))}
              </select>
              <button
                onClick={onAddRound}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md cursor-pointer whitespace-nowrap"
                title="Add a new custom round to support additional days"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Day
              </button>
            </div>
          </div>

          {/* Quick Schedule Creator */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 space-y-3">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Schedule Match for Day {state.round}
            </h4>
            <CustomMatchmakerForm 
              players={state.players} 
              round={state.round} 
              onAddMatch={(m) => {
                const nextMatches = [...state.matches, m];
                handleUpdateMatchesAndRecalculate(nextMatches);
              }} 
            />
          </div>

          {/* Detailed Matches Organizer */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">
              Matches list - Day {state.round} ({state.matches.filter(m => m.round === state.round).length})
            </h4>

            <div className="space-y-3">
              {state.matches.filter(m => m.round === state.round).map((match) => {
                const isEditing = editingMatchId === match.id;
                
                return (
                  <div 
                    key={match.id} 
                    className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 shadow-inner space-y-3 transition-all"
                  >
                    {!isEditing ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Match Info Panel */}
                        <div className="space-y-1">
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{match.player1Name}</span>
                            <span className="text-slate-500 font-normal text-xs px-1">vs</span>
                            <span>{match.player2Name}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase border ${
                              match.status === 'completed' 
                                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/20' 
                                : match.status === 'active'
                                ? 'bg-red-950/20 text-red-400 border-red-900/20 animate-pulse'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}>
                              {match.status}
                            </span>
                            <span className="font-mono text-slate-400">
                              Score: <strong className="text-slate-100">{match.score1} - {match.score2}</strong>
                            </span>
                            {match.winnerId && (
                              <span className="text-emerald-400">
                                Winner: <strong>{match.winnerId === match.player1Id ? match.player1Name : match.player2Name}</strong>
                              </span>
                            )}
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-500 font-mono uppercase">
                              {match.type.replace('progressive-', 'ROUND ')}
                            </span>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleStartEditMatch(match)}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            ✏️ Edit Details
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to permanently delete the match between ${match.player1Name} and ${match.player2Name}?`)) {
                                handleDeleteMatch(match.id);
                              }
                            }}
                            className="bg-red-950/40 hover:bg-red-900/35 text-red-400 p-1.5 rounded-lg border border-red-900/20"
                            title="Delete Match Completely"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Inline Full Match Editor */
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 space-y-4">
                        <div className="text-xs font-bold text-slate-200 uppercase border-b border-slate-850 pb-2">
                          ✏️ Admin Match Editor - Override Controls
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Swap Opponents selectors */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Player 1 (Left Side)</label>
                            <select
                              value={editP1Id}
                              onChange={(e) => setEditP1Id(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200"
                            >
                              {state.players.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Player 2 (Right Side)</label>
                            <select
                              value={editP2Id}
                              onChange={(e) => setEditP2Id(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200"
                            >
                              {state.players.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Scores Overrides */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">P1 Score</label>
                            <input
                              type="number"
                              min="0"
                              value={editScore1}
                              onChange={(e) => setEditScore1(parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">P2 Score</label>
                            <input
                              type="number"
                              min="0"
                              value={editScore2}
                              onChange={(e) => setEditScore2(parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>

                          {/* Status */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Status</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200"
                            >
                              <option value="pending">Pending (In Queue)</option>
                              <option value="active">Active (On Table)</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>

                          {/* Force Winner override */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Forced Winner (Optional)</label>
                            <select
                              value={editWinnerId || ''}
                              onChange={(e) => setEditWinnerId(e.target.value || null)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200"
                            >
                              <option value="">Auto-Detect from points</option>
                              <option value={editP1Id}>{state.players.find(p => p.id === editP1Id)?.name || 'Player 1'}</option>
                              <option value={editP2Id}>{state.players.find(p => p.id === editP2Id)?.name || 'Player 2'}</option>
                            </select>
                          </div>
                        </div>

                        {/* Save Actions */}
                        <div className="flex justify-end gap-2 border-t border-slate-850 pt-3">
                          <button
                            onClick={() => handleSaveMatchDetails(match.id)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Save & Apply
                          </button>
                          <button
                            onClick={() => setEditingMatchId(null)}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs px-4 py-2 rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Save, Backup, and Excel sheet tab */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* CSV Sheets export */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 space-y-4">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Excel / Google Sheets Exports
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Download compatible spreadsheets (CSV) of current standings or game results.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleExportStandingsCSV}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Download Standings Ticker (CSV)
                </button>

                <button
                  onClick={handleExportMatchesCSV}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Download Match History Log (CSV)
                </button>
              </div>
            </div>

            {/* JSON Backups file loader */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/60 space-y-4">
              <div>
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  JSON Database Backups
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Save a physical copy of the database to your hard drive, or restore an earlier snapshot immediately.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownloadBackup}
                  className="w-full bg-slate-950 hover:bg-emerald-950/20 border border-emerald-950/30 text-emerald-400 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download DB Snapshot (.json)
                </button>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleRestoreBackup}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Upload & Restore Backup (.json)
                  </button>
                </div>
              </div>
            </div>

          </div>

          {fileMessage && (
            <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 border ${
              fileMessage.type === 'success' 
                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' 
                : 'bg-red-950/20 text-red-400 border-red-900/30'
            }`}>
              {fileMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{fileMessage.text}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// Subcomponent: Custom matchmaking scheduler form inside the Round/Day coordinator
interface CustomMatchmakerFormProps {
  players: Player[];
  round: number;
  onAddMatch: (match: Match) => void;
}

function CustomMatchmakerForm({ players, round, onAddMatch }: CustomMatchmakerFormProps) {
  const [p1Id, setP1Id] = useState('');
  const [p2Id, setP2Id] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p1Id || !p2Id) {
      setMessage('⚠️ Please select both players!');
      return;
    }
    if (p1Id === p2Id) {
      setMessage('⚠️ A player cannot compete against themselves! Select two different players.');
      return;
    }

    const p1 = players.find(p => p.id === p1Id);
    const p2 = players.find(p => p.id === p2Id);
    if (!p1 || !p2) return;

    const newMatch: Match = {
      id: `custom_match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: 'pending',
      round: round,
      type: 'round-robin',
      score1: 0,
      score2: 0,
      firstTo10Id: null,
      winnerId: null,
      pointsAwarded1: 0,
      pointsAwarded2: 0,
      hasGraceRuleBeenUsed: false,
      p1GraceRuleUsed: false,
      p2GraceRuleUsed: false,
      timerSeconds: 0,
      server: 'player1',
      serveCount: 0,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'system',
          message: `Scheduled match on Day ${round}: ${p1.name} vs ${p2.name}`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    };

    onAddMatch(newMatch);
    setMessage(`✅ Match between ${p1.name} vs ${p2.name} scheduled for Day ${round}!`);
    setP1Id('');
    setP2Id('');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <select
            value={p1Id}
            onChange={(e) => setP1Id(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200"
          >
            <option value="">-- Choose Player 1 --</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <select
            value={p2Id}
            onChange={(e) => setP2Id(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200"
          >
            <option value="">-- Choose Player 2 --</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Schedule Match
        </button>
      </div>
      {message && (
        <div className="text-[10px] font-bold text-emerald-400">
          {message}
        </div>
      )}
    </form>
  );
}
