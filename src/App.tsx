/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, Match, TournamentConfig, TournamentState } from './types';
import {
  generateRoundRobinMatches,
  generateProgressiveRound1Matches,
  generateProgressiveRound2Matches,
  generateProgressiveRound3Matches,
  generateDoublesExhibitionMatch,
  calculateLeaderboard,
} from './utils/tournamentHelpers';
import RulesConfig from './components/RulesConfig';
import Scorekeeper from './components/Scorekeeper';
import Leaderboard from './components/Leaderboard';
import QueueManager from './components/QueueManager';
import Modal from './components/Modal';
import TournamentControlPanel from './components/TournamentControlPanel';
import SpectatorView from './components/SpectatorView';
import { Trophy, RefreshCw, Play, Home, ArrowRight, Award, Zap, HelpCircle, Tv, Lock, Unlock, Radio, Camera } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'tt_tournament_state_v1';

export default function App() {
  const [state, setState] = useState<TournamentState>({
    players: [],
    matches: [],
    currentMatchId: null,
    round: 1,
    status: 'setup',
    config: {
      pointsToWin: 21,
      winByTwo: true,
      servesPerChange: 5,
      enableFourPointRule: true,
      enableGraceRule: true,
    },
  });

  const [showResetBracket, setShowResetBracket] = useState(false);
  const [showFullReset, setShowFullReset] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type?: 'danger' | 'warning' | 'info' | 'success' } | null>(null);
  const [isSpectatorMode, setIsSpectatorMode] = useState(() => {
    return localStorage.getItem('tt_spectator_mode') === 'true';
  });

  // Track path routing for standalone spectator page (e.g. /spectator)
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Secure Role-Based State
  const [role, setRole] = useState<'spectator' | 'umpire' | 'admin'>(() => {
    return (localStorage.getItem('tt_auth_role') as 'spectator' | 'umpire' | 'admin') || 'spectator';
  });

  const handleLockControls = () => {
    setRole('spectator');
    localStorage.setItem('tt_auth_role', 'spectator');
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isSpectatorPage = currentPath === '/spectator' || window.location.search.includes('view=spectator');
  const isSpectator = isSpectatorMode || isSpectatorPage;

  // Real-time synchronization loop with server
  useEffect(() => {
    let lastStateStr = '';

    // Initial load from server, fallback to localStorage
    const loadState = async () => {
      try {
        const res = await fetch('/api/tournament-state');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.players) && Array.isArray(data.matches)) {
            setState(data);
            lastStateStr = JSON.stringify(data);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load tournament state from server, attempting local storage fallback...', err);
      }

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.players) && Array.isArray(parsed.matches)) {
            setState(parsed);
            lastStateStr = saved;
          }
        } catch (e) {
          console.error('Error parsing local storage tournament state:', e);
        }
      }
    };

    loadState();

    // Poll the server every 1000ms for real-time synchronization across all tabs and browsers
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/tournament-state');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.players) && Array.isArray(data.matches)) {
            const stateStr = JSON.stringify(data);
            // Only update local state if it has actually changed to avoid unnecessary re-renders
            if (stateStr !== lastStateStr) {
              lastStateStr = stateStr;
              setState(data);
            }
          }
        }
      } catch (err) {
        // Fail silently during background polling
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, []);

  // Sync to local storage and push to the server on changes
  const saveAndSetState = async (newState: TournamentState) => {
    setState(newState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));

    try {
      await fetch('/api/tournament-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newState),
      });
    } catch (err) {
      console.warn('Could not synchronize state to server:', err);
    }
  };

  const toggleSpectatorMode = () => {
    const nextVal = !isSpectatorMode;
    setIsSpectatorMode(nextVal);
    localStorage.setItem('tt_spectator_mode', String(nextVal));
    
    // If they want to toggle to spectator on a specific page, update pathname
    if (nextVal) {
      window.history.pushState({}, '', '/spectator');
      setCurrentPath('/spectator');
    } else {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  // Helper to open standalone spectator cast in a new tab
  const openSpectatorTab = () => {
    window.open('/spectator', '_blank');
  };

  // Recalculate leaderboard taking manual overrides into account
  const recalculateLeaderboardWithOverrides = (
    playersList: Player[],
    matchesList: Match[],
    config: TournamentConfig,
    overrides?: Record<string, Partial<Player>>
  ) => {
    let baseLeaderboard = calculateLeaderboard(playersList, matchesList, config);
    const actualOverrides = overrides || state.standingOverrides || {};
    
    if (Object.keys(actualOverrides).length > 0) {
      baseLeaderboard = baseLeaderboard.map((p) => {
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
      
      // Re-sort after applying overrides
      baseLeaderboard.sort((a, b) => {
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
      });
    }
    return baseLeaderboard;
  };



  // Start Tournament Handlers
  const handleStartTournament = (playersList: Player[], finalConfig: TournamentConfig) => {
    // Generate Round 1 matches in Progressive Bracket format
    const generatedMatches = generateProgressiveRound1Matches(playersList);

    const newState: TournamentState = {
      players: playersList,
      matches: generatedMatches,
      currentMatchId: generatedMatches.length > 0 ? generatedMatches[0].id : null,
      round: 1,
      status: 'active',
      config: finalConfig,
      standingOverrides: {},
    };

    // Mark the first match as active initially
    if (newState.matches.length > 0) {
      newState.matches[0].status = 'active';
    }

    saveAndSetState(newState);
  };

  // Launch a selected match from queue
  const handleLaunchMatch = (matchId: string) => {
    const updatedMatches = state.matches.map((m) => {
      if (m.id === matchId) {
        return { ...m, status: 'active' as const };
      }
      // Pause or put others back to pending if they are active
      if (m.status === 'active') {
        return { ...m, status: 'pending' as const };
      }
      return m;
    });

    saveAndSetState({
      ...state,
      matches: updatedMatches,
      currentMatchId: matchId,
    });
  };

  // Update Score/Timer of active match
  const handleUpdateMatch = (updatedMatch: Match) => {
    const updatedMatches = state.matches.map((m) =>
      m.id === updatedMatch.id ? updatedMatch : m
    );

    saveAndSetState({
      ...state,
      matches: updatedMatches,
    });
  };

  // Complete a match and process standings
  const handleCompleteMatch = (completedMatch: Match) => {
    // 1. Update match list
    const updatedMatches = state.matches.map((m) =>
      m.id === completedMatch.id ? completedMatch : m
    );

    // 2. Refresh players standings using current config
    const updatedPlayers = recalculateLeaderboardWithOverrides(state.players, updatedMatches, state.config);

    // 3. Set next current match if there's any pending
    let nextMatchId: string | null = null;
    
    // Check if we are in Round 3 Bracket stage
    if (state.status === 'bracket' || state.status === 'completed') {
      let bracketMatches = [...updatedMatches];

      // Check if all Round 3 singles matches are completed
      const round3Singles = bracketMatches.filter(
        (m) => m.round === 3 && m.type !== 'doubles-exhibition'
      );
      const allRound3SinglesCompleted = round3Singles.every((m) => m.status === 'completed');

      // Check if doubles exhibition is already generated
      let doublesMatch = bracketMatches.find((m) => m.type === 'doubles-exhibition');

      if (allRound3SinglesCompleted && !doublesMatch) {
        // Generate the special Exhibition Doubles match!
        const newDoublesMatch = generateDoublesExhibitionMatch(state.players, bracketMatches);
        if (newDoublesMatch) {
          bracketMatches.push(newDoublesMatch);
          doublesMatch = newDoublesMatch;
        }
      }

      // If doubles match is complete, or we completed everything and didn't generate doubles
      const isTourneyFinished = doublesMatch ? doublesMatch.status === 'completed' : allRound3SinglesCompleted;

      saveAndSetState({
        ...state,
        matches: bracketMatches,
        players: updatedPlayers,
        currentMatchId: doublesMatch && doublesMatch.status !== 'completed' ? doublesMatch.id : null,
        status: isTourneyFinished ? 'completed' : 'bracket',
      });
      return;
    }

    // Active round progress checks
    const activeRoundMatches = updatedMatches.filter(
      (m) => m.round === state.round
    );
    const pendingActiveMatches = activeRoundMatches.filter((m) => m.status === 'pending');

    if (pendingActiveMatches.length > 0) {
      nextMatchId = pendingActiveMatches[0].id;
      // Set that next match to active
      updatedMatches.forEach((m) => {
        if (m.id === nextMatchId) {
          m.status = 'active';
        }
      });
    }

    saveAndSetState({
      ...state,
      matches: updatedMatches,
      players: updatedPlayers,
      currentMatchId: nextMatchId,
    });
  };

  // Smart picker matchmaker logic
  const handleAutoMatchmake = () => {
    const pendingInRound = state.matches.filter(
      (m) => m.status === 'pending' && m.round === state.round
    );
    if (pendingInRound.length === 0) return;

    // Smart Matchmaker Engine:
    // We count how many games each player has played so far in this tournament.
    // We prioritize games where both players are "most rested" (least matches played/active).
    const playerPlayCounts: Record<string, number> = {};
    state.players.forEach((p) => {
      playerPlayCounts[p.id] = state.matches.filter(
        (m) => m.status === 'completed' && (m.player1Id === p.id || m.player2Id === p.id)
      ).length;
    });

    // Score each pending match: Sum of play counts of both players. Lowest sum means most rested match.
    let bestMatch = pendingInRound[0];
    let minScore = Infinity;

    pendingInRound.forEach((m) => {
      const score = (playerPlayCounts[m.player1Id] || 0) + (playerPlayCounts[m.player2Id] || 0);
      if (score < minScore) {
        minScore = score;
        bestMatch = m;
      }
    });

    handleLaunchMatch(bestMatch.id);
  };

  // Manually add/deploy a custom exhibition match to the queue
  const handleCreateCustomMatch = (p1Id: string, p2Id: string) => {
    const p1 = state.players.find((p) => p.id === p1Id);
    const p2 = state.players.find((p) => p.id === p2Id);

    if (!p1 || !p2) return;

    const customMatch: Match = {
      id: `custom_${Date.now()}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: 'active', // Instantly activate it on the single table
      round: state.round as 1 | 2,
      type: 'progressive-r1', // Count it under active matches so points register
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
          message: `Custom Match Deployed on Single Table: ${p1.name} vs ${p2.name}`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    };

    // Set other active matches back to pending to respect single table
    const updatedMatches = state.matches.map((m) => {
      if (m.status === 'active') {
        return { ...m, status: 'pending' as const };
      }
      return m;
    });

    saveAndSetState({
      ...state,
      matches: [...updatedMatches, customMatch],
      currentMatchId: customMatch.id,
    });
  };

  // --- Admin Control Panel Handlers ---

  // Add player mid-round
  const handleAddPlayer = (name: string) => {
    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      name,
      wins: 0,
      losses: 0,
      milestones: 0,
      matchWins: 0,
      bonuses: 0,
      totalPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
    const updatedPlayers = [...state.players, newPlayer];
    saveAndSetState({
      ...state,
      players: updatedPlayers,
    });
  };

  // Edit/Rename player
  const handleEditPlayer = (playerId: string, newName: string) => {
    const updatedPlayers = state.players.map(p => p.id === playerId ? { ...p, name: newName } : p);
    const updatedMatches = state.matches.map(m => {
      let mCopy = { ...m };
      if (m.player1Id === playerId) mCopy.player1Name = newName;
      if (m.player2Id === playerId) mCopy.player2Name = newName;
      mCopy.logs = m.logs.map(log => ({
        ...log,
        message: log.message
          .replace(new RegExp(m.player1Name, 'g'), m.player1Id === playerId ? newName : m.player1Name)
          .replace(new RegExp(m.player2Name, 'g'), m.player2Id === playerId ? newName : m.player2Name)
      }));
      return mCopy;
    });

    saveAndSetState({
      ...state,
      players: updatedPlayers,
      matches: updatedMatches,
    });
  };

  // Delete Player completely from roster
  const handleDeletePlayer = (playerId: string) => {
    const updatedPlayers = state.players.filter(p => p.id !== playerId);
    const updatedMatches = state.matches.filter(m => m.player1Id !== playerId && m.player2Id !== playerId);
    const recalculatedPlayers = recalculateLeaderboardWithOverrides(updatedPlayers, updatedMatches, state.config, state.standingOverrides);
    
    saveAndSetState({
      ...state,
      players: recalculatedPlayers,
      matches: updatedMatches,
      currentMatchId: state.currentMatchId === playerId ? null : state.currentMatchId,
    });
  };

  // Replace player (e.g. swap Alex with Bob) while preserving score history
  const handleReplacePlayer = (playerId: string, newName: string) => {
    const updatedPlayers = state.players.map(p => p.id === playerId ? { ...p, name: newName } : p);
    const updatedMatches = state.matches.map(m => {
      let mCopy = { ...m };
      if (m.player1Id === playerId) mCopy.player1Name = newName;
      if (m.player2Id === playerId) mCopy.player2Name = newName;
      mCopy.logs = m.logs.map(log => ({
        ...log,
        message: log.message
          .replace(new RegExp(m.player1Name, 'g'), m.player1Id === playerId ? newName : m.player1Name)
          .replace(new RegExp(m.player2Name, 'g'), m.player2Id === playerId ? newName : m.player2Name)
      }));
      return mCopy;
    });

    saveAndSetState({
      ...state,
      players: updatedPlayers,
      matches: updatedMatches,
    });
  };

  // Correct a completed match's scorecard
  const handleCorrectMatch = (
    matchId: string, 
    score1: number, 
    score2: number, 
    firstTo10Id: string | null, 
    winnerId: string | null
  ) => {
    const updatedMatches = state.matches.map(m => {
      if (m.id === matchId) {
        let pts1 = 0;
        let pts2 = 0;
        
        if (state.config.enableFourPointRule) {
          const hasMilestone1 = firstTo10Id === m.player1Id;
          const hasMilestone2 = firstTo10Id === m.player2Id;
          const isWinner1 = winnerId === m.player1Id;
          const isWinner2 = winnerId === m.player2Id;
          
          if (hasMilestone1) pts1 += 1;
          if (isWinner1) pts1 += 2;
          if (hasMilestone1 && isWinner1) pts1 += 1;
          
          if (hasMilestone2) pts2 += 1;
          if (isWinner2) pts2 += 2;
          if (hasMilestone2 && isWinner2) pts2 += 1;
        } else {
          pts1 = winnerId === m.player1Id ? 2 : 0;
          pts2 = winnerId === m.player2Id ? 2 : 0;
        }

        return {
          ...m,
          score1,
          score2,
          firstTo10Id,
          winnerId,
          pointsAwarded1: pts1,
          pointsAwarded2: pts2,
          status: 'completed' as const,
        };
      }
      return m;
    });

    const recalculatedPlayers = recalculateLeaderboardWithOverrides(state.players, updatedMatches, state.config, state.standingOverrides);
    saveAndSetState({
      ...state,
      players: recalculatedPlayers,
      matches: updatedMatches,
    });
  };

  // Override standing data directly for corrections
  const handleOverrideStanding = (playerId: string, overrides: Partial<Player>) => {
    const existingOverrides = state.standingOverrides || {};
    const newOverrides = {
      ...existingOverrides,
      [playerId]: {
        ...(existingOverrides[playerId] || {}),
        ...overrides
      }
    };

    const recalculatedPlayers = recalculateLeaderboardWithOverrides(state.players, state.matches, state.config, newOverrides);
    saveAndSetState({
      ...state,
      players: recalculatedPlayers,
      standingOverrides: newOverrides,
    });
  };

  // Change currently active round/day manually
  const handleSelectRound = (roundNum: number) => {
    saveAndSetState({
      ...state,
      round: roundNum,
    });
  };

  // Add an extra round dynamically (multi-day extension)
  const handleAddRound = () => {
    const nextRound = Math.max(...state.matches.map(m => m.round), state.round) + 1;
    saveAndSetState({
      ...state,
      round: nextRound,
    });
  };

  // --- End Admin Control Handlers ---

  // Move forward from Round 1 to Round 2
  const handleNextRoundRobinDay = () => {
    if (state.round !== 1) return;

    const round1Matches = state.matches.filter((m) => m.round === 1);
    const round2Matches = generateProgressiveRound2Matches(state.players, round1Matches);

    // Set first match of Round 2 to active
    if (round2Matches.length > 0) {
      round2Matches[0].status = 'active';
    }

    saveAndSetState({
      ...state,
      matches: [...state.matches, ...round2Matches],
      round: 2,
      currentMatchId: round2Matches.length > 0 ? round2Matches[0].id : null,
    });
  };

  // Move forward from Round 2 to Round 3 Finals/Placements
  const handleAdvanceToChampionshipBracket = () => {
    const round3Matches = generateProgressiveRound3Matches(state.players, state.matches);

    if (round3Matches.length === 0) {
      setAlertConfig({
        title: 'Error Generating Round 3',
        message: 'There are not enough completed matches to generate Round 3. Please make sure preceding rounds are complete!',
        type: 'danger',
      });
      return;
    }

    saveAndSetState({
      ...state,
      matches: [...state.matches, ...round3Matches],
      currentMatchId: round3Matches[0].id,
      round: 3,
      status: 'bracket',
    });
  };

  // Reset/Clear Entire Bracket for replaying Round 3
  const handleResetBracket = () => {
    setShowResetBracket(true);
  };

  const confirmResetBracket = () => {
    const nonBracketMatches = state.matches.filter((m) => m.round === 1 || m.round === 2);
    const resetLeaderboard = recalculateLeaderboardWithOverrides(state.players, nonBracketMatches, state.config);

    saveAndSetState({
      ...state,
      matches: nonBracketMatches,
      players: resetLeaderboard,
      currentMatchId: null,
      round: 2,
      status: 'active',
      standingOverrides: {},
    });
    setShowResetBracket(false);
  };

  // Full reset of entire tournament back to rules configuration setup
  const handleFullReset = () => {
    setShowFullReset(true);
  };

  const confirmFullReset = () => {
    const defaultState: TournamentState = {
      players: [
        { id: '1', name: 'Alex Chen', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
        { id: '2', name: 'Becca Miller', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
        { id: '3', name: 'Charlie Smith', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
        { id: '4', name: 'Daniel Novak', wins: 0, losses: 0, milestones: 0, matchWins: 0, bonuses: 0, totalPoints: 0, pointsFor: 0, pointsAgainst: 0 },
      ],
      matches: [],
      currentMatchId: null,
      round: 1,
      status: 'setup',
      config: {
        pointsToWin: 21,
        winByTwo: true,
        servesPerChange: 5,
        enableFourPointRule: true,
        enableGraceRule: true,
      },
    };
    saveAndSetState(defaultState);
    setShowFullReset(false);
  };

  // Client-Side Path Navigation Helper
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleWelcomeAuthSubmit = (targetRole: 'umpire' | 'admin', passcode: string): boolean => {
    if (targetRole === 'admin' && passcode === 'admin123') {
      setRole('admin');
      localStorage.setItem('tt_auth_role', 'admin');
      navigate('/admin');
      return true;
    } else if (targetRole === 'umpire' && passcode === 'umpire123') {
      setRole('umpire');
      localStorage.setItem('tt_auth_role', 'umpire');
      navigate('/umpire');
      return true;
    }
    // Admin password also acts as Umpire
    if (targetRole === 'umpire' && passcode === 'admin123') {
      setRole('admin');
      localStorage.setItem('tt_auth_role', 'admin');
      navigate('/umpire');
      return true;
    }
    return false;
  };

  // ----------------------------------------------------
  // ROUTE 1: SPECTATOR / CAST VIEW
  // ----------------------------------------------------
  if (currentPath === '/spectator' || currentPath === '/cast') {
    return (
      <SpectatorView
        state={state}
        onToggleSpectator={() => navigate('/')}
        onLaunchMatch={handleLaunchMatch}
        onUpdateMatch={handleUpdateMatch}
        isStandalone={true} // Hidden exit controls
      />
    );
  }

  // ----------------------------------------------------
  // ROUTE 2: OFFICIAL UMPIRE DASHBOARD
  // ----------------------------------------------------
  if (currentPath === '/umpire') {
    const isUmpireAuthorized = role === 'umpire' || role === 'admin';

    if (!isUmpireAuthorized) {
      return (
        <UmpireLoginScreen 
          onAuthenticate={(passcode) => handleWelcomeAuthSubmit('umpire', passcode)} 
          onBack={() => navigate('/')}
        />
      );
    }

    const activeMatch = state.matches.find((m) => m.id === state.currentMatchId);

    return (
      <div className="min-h-screen bg-[#0b0f19] font-sans text-slate-100 flex flex-col" id="umpire-viewport-root">
        
        {/* Simple Focused Umpire Header */}
        <header className="bg-[#111625] text-white shadow-lg border-b border-slate-800/60 py-3 sm:py-4 px-4 sm:px-6 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shadow-md">
                <Award className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h1 className="text-md sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  TT Table Umpire Console
                </h1>
                <p className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wide">
                  Official Scorekeeper Mode
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                handleLockControls();
                navigate('/');
              }}
              className="text-xs bg-slate-880 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
            >
              🔒 Logout & Exit
            </button>
          </div>
        </header>

        {/* Umpire Board Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="umpire-dashboard-bento">
          
          {/* Left/Center Column: Scorekeeper Core (Read-Write) */}
          <div className="col-span-1 lg:col-span-8">
            {activeMatch ? (
              <Scorekeeper
                match={activeMatch}
                config={state.config}
                onUpdateMatch={handleUpdateMatch}
                onCompleteMatch={handleCompleteMatch}
                readOnly={false} // Umpire is authorized to score matches!
              />
            ) : (
              <div className="bg-[#111625] rounded-3xl p-12 border border-slate-800/60 shadow-lg flex flex-col items-center justify-center text-center space-y-4 py-20">
                <div className="p-4 bg-slate-800/40 text-slate-400 rounded-full border border-slate-700/50 shadow-inner">
                  <Play className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">No Active Match on Table</h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                  The game table is currently empty. Please select and launch a match from the queue on the right to begin scoring.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Queue Manager */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            <QueueManager
              matches={state.matches}
              players={state.players}
              activeMatchId={state.currentMatchId}
              round={state.round}
              onLaunchMatch={handleLaunchMatch}
              onCreateCustomMatch={handleCreateCustomMatch}
              onAutoMatchmake={handleAutoMatchmake}
              userRole="umpire" // Hides dangerous admin deploy/matchmaking buttons, only allows launching queued matches
            />
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // ROUTE 3: ADMINISTRATIVE SYSTEM
  // ----------------------------------------------------
  if (currentPath === '/admin') {
    if (role !== 'admin') {
      return (
        <AdminLoginScreen 
          onAuthenticate={(passcode) => handleWelcomeAuthSubmit('admin', passcode)} 
          onBack={() => navigate('/')}
        />
      );
    }

    // Admin Setup Flow
    if (state.status === 'setup') {
      return (
        <div className="min-h-screen bg-[#0b0f19] flex flex-col" id="admin-setup-viewport">
          <header className="bg-[#111625] text-white shadow-lg border-b border-slate-800/60 py-4 px-6 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-md">
                  <Trophy className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h1 className="text-md sm:text-lg font-black tracking-tight text-white">
                    TT Tournament Creator
                  </h1>
                  <p className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wide">
                    Administration setup phase
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleLockControls();
                  navigate('/');
                }}
                className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 font-semibold px-4 py-2 rounded-xl cursor-pointer"
              >
                Exit Setup
              </button>
            </div>
          </header>
          
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
            <RulesConfig onStartTournament={handleStartTournament} />
          </div>
        </div>
      );
    }

    const activeMatch = state.matches.find((m) => m.id === state.currentMatchId);

    // Group stage state completeness checks
    const currentRoundMatches = state.matches.filter(
      (m) => m.round === state.round && m.type !== 'doubles-exhibition'
    );
    const isRoundCompleted = currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === 'completed');

    const groupStageMatches = state.matches.filter((m) => m.round === 1 || m.round === 2);
    const isGroupStageCompleted = groupStageMatches.length > 0 && groupStageMatches.every((m) => m.status === 'completed');

    return (
      <div className="min-h-screen bg-[#0b0f19] font-sans text-slate-100 flex flex-col" id="admin-viewport-root">
        
        {/* Full Coordinator Header Bar */}
        <header className="bg-[#111625] text-white shadow-lg sticky top-0 z-50 border-b border-slate-800/60">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl border border-emerald-300 shadow-lg shadow-emerald-500/10">
                <Trophy className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h1 className="text-md sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  TT Arena Admin Console
                </h1>
                <p className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wide">
                  Full Coordinator Dashboard
                </p>
              </div>
            </div>

            {/* Stage Indicators */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 ${
                state.round === 1 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'bg-slate-800/50 text-slate-400 border border-slate-700/55'
              }`}>
                <span className="font-mono">R1</span> <span className="hidden md:inline">Day 1</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <div className={`text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 ${
                state.round === 2 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'bg-slate-800/50 text-slate-400 border border-slate-700/55'
              }`}>
                <span className="font-mono">R2</span> <span className="hidden md:inline">Day 2</span>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <div className={`text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 ${
                state.round === 3 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'bg-slate-800/50 text-slate-400 border border-slate-700/55'
              }`}>
                <span className="font-mono">R3</span> <span className="hidden md:inline">Finals</span>
              </div>
            </div>

            {/* Dedicated Sandbox Tabs Launcher */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => window.open('/spectator', '_blank')}
                className="text-xs bg-[#1a142e] hover:bg-purple-950 text-purple-300 border border-purple-800/40 font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm animate-pulse"
                title="Launch a separate view-only scoreboard casting window"
              >
                <Tv className="w-3.5 h-3.5 text-purple-400" />
                Cast Screen ↗
              </button>

              <button
                onClick={() => window.open('/umpire', '_blank')}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                title="Launch a separate official table referee panel"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Umpire Board ↗
              </button>

              <button
                onClick={handleFullReset}
                className="text-xs bg-slate-850 hover:bg-rose-950 hover:text-rose-300 font-semibold text-slate-300 px-3 py-2 rounded-lg flex items-center gap-1 transition-all border border-slate-750 cursor-pointer shadow-sm"
                title="Reset entire tournament roster and matches"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>

              <button
                onClick={() => {
                  handleLockControls();
                  navigate('/');
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-bold px-3 py-2 rounded-lg cursor-pointer"
              >
                🔒 Exit
              </button>
            </div>
          </div>
        </header>

        {/* Advancement Banners */}
        {isRoundCompleted && state.round === 1 && (
          <div className="bg-emerald-950/20 border-y border-emerald-800/60 text-center py-4 px-4 shadow-lg">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-300">
              <div className="text-sm font-bold flex items-center gap-2 text-left">
                <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span>Match Day 1 is finished! Ready to advance and pair Winners vs Winners and Losers vs Losers for Round 2?</span>
              </div>
              <button
                onClick={handleNextRoundRobinDay}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1 shadow-lg transition-all cursor-pointer"
              >
                Generate Round 2 Matches
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        )}

        {isGroupStageCompleted && state.round !== 3 && (
          <div className="bg-amber-950/20 border-y border-amber-800/60 text-center py-4 px-4 shadow-lg">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-300">
              <div className="text-sm font-bold flex items-center gap-2 text-left">
                <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>Round 2 is complete! Let's generate the Championship Finals and Consolation Matches for Round 3!</span>
              </div>
              <button
                onClick={handleAdvanceToChampionshipBracket}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1 shadow-lg transition-all cursor-pointer"
              >
                Generate Finals & Placements
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        )}

        {/* Admin Bento Board Layout */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="arena-dashboard-bento-grid">
          
          {/* Left Column: Scorekeeper Controller */}
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
            {activeMatch ? (
              <Scorekeeper
                match={activeMatch}
                config={state.config}
                onUpdateMatch={handleUpdateMatch}
                onCompleteMatch={handleCompleteMatch}
                readOnly={false}
              />
            ) : (
              <div className="bg-[#111625] rounded-3xl p-12 border border-slate-800/60 shadow-lg flex-1 flex flex-col items-center justify-center text-center space-y-4 py-20">
                <div className="p-4 bg-slate-800/40 text-slate-400 rounded-full border border-slate-700/50 shadow-inner">
                  <Play className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">No Active Match</h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                  Single table is vacant. Please select a match from the queue on the right or deploy a custom game to begin.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Setup Panels */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            {/* Leaderboard panel */}
            <Leaderboard 
              players={state.players} 
              config={state.config} 
              isStageCompleted={isGroupStageCompleted} 
            />
            
            <QueueManager
              matches={state.matches}
              players={state.players}
              activeMatchId={state.currentMatchId}
              round={state.round}
              onLaunchMatch={handleLaunchMatch}
              onCreateCustomMatch={handleCreateCustomMatch}
              onAutoMatchmake={handleAutoMatchmake}
              userRole="admin"
            />

            <TournamentControlPanel
              state={state}
              onUpdateState={saveAndSetState}
              onAddPlayer={handleAddPlayer}
              onEditPlayer={handleEditPlayer}
              onDeletePlayer={handleDeletePlayer}
              onReplacePlayer={handleReplacePlayer}
              onCorrectMatch={handleCorrectMatch}
              onOverrideStanding={handleOverrideStanding}
              onSelectRound={handleSelectRound}
              onAddRound={handleAddRound}
              userRole="admin"
            />
          </div>
        </main>

        {/* Tournament Reset Confirmation Modal */}
        <Modal
          isOpen={showFullReset}
          onClose={() => setShowFullReset(false)}
          onConfirm={confirmFullReset}
          title="Reset Entire Tournament"
          message="Are you sure you want to completely wipe the current tournament? This will erase all players, matches, schedule, custom standings overrides, and match scores. This cannot be undone."
          confirmText="Yes, Reset Everything"
          cancelText="Cancel"
          type="danger"
        />

        {/* Reset Bracket Confirmation Modal */}
        <Modal
          isOpen={showResetBracket}
          onClose={() => setShowResetBracket(false)}
          onConfirm={confirmResetBracket}
          title="Reset Round 3 Finals Bracket"
          message="Are you sure you want to reset the Round 3 finals bracket? This will remove all Round 3 match results and restore the tournament state back to the end of Round 2. This cannot be undone."
          confirmText="Reset Finals Bracket"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // ROUTE 4: WELCOME PAGE / ROLE SELECTION (DEFAULT)
  // ----------------------------------------------------
  return (
    <WelcomeScreen 
      onSelectViewer={() => navigate('/spectator')}
      onAuthenticateUmpire={(passcode) => handleWelcomeAuthSubmit('umpire', passcode)}
      onAuthenticateAdmin={(passcode) => handleWelcomeAuthSubmit('admin', passcode)}
      onNavigate={navigate}
    />
  );
}

// ----------------------------------------------------
// SUB-COMPONENTS: WELCOME & LOGIN SCREENS (INLINE STATIC)
// ----------------------------------------------------

interface WelcomeScreenProps {
  onSelectViewer: () => void;
  onAuthenticateUmpire: (pin: string) => boolean;
  onAuthenticateAdmin: (pin: string) => boolean;
  onNavigate: (path: string) => void;
}

function WelcomeScreen({ onSelectViewer, onAuthenticateUmpire, onAuthenticateAdmin, onNavigate }: WelcomeScreenProps) {
  const [activeTab, setActiveTab] = useState<'viewer' | 'umpire' | 'admin' | null>(null);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTabClick = (tab: 'viewer' | 'umpire' | 'admin') => {
    setErrorMsg(null);
    setPasscode('');
    if (tab === 'viewer') {
      onSelectViewer();
    } else {
      setActiveTab(tab);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!passcode) return;

    let success = false;
    if (activeTab === 'umpire') {
      success = onAuthenticateUmpire(passcode);
    } else if (activeTab === 'admin') {
      success = onAuthenticateAdmin(passcode);
    }

    if (!success) {
      setErrorMsg('Invalid PIN code. Please try again or contact the tournament organizer.');
      setPasscode('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center items-center p-4 font-sans text-slate-100" id="welcome-viewport-root">
      <div className="max-w-4xl w-full space-y-12 py-10 flex flex-col items-center">
        
        {/* Title branding header */}
        <div className="text-center space-y-3 max-w-2xl">
          <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 rounded-3xl border border-emerald-500/20 shadow-xl shadow-emerald-500/5 mb-2">
            <Trophy className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            TT Single-Table Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            Swiss progressive brackets, customized milestone rules, precise table referee control, and pristine screen casting. Select your access gateway below to begin.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          
          {/* Card 1: Spectator */}
          <div 
            onClick={() => handleTabClick('viewer')}
            className={`bg-[#111625] border-2 rounded-3xl p-6 shadow-xl cursor-pointer transition-all hover:scale-[1.03] flex flex-col justify-between h-72 ${
              activeTab === 'viewer' ? 'border-purple-500 shadow-purple-500/5' : 'border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="space-y-4">
              <div className="inline-flex p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                <Tv className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">Spectator Cast</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pristine, view-only television casting output. Shows live brackets, tables, points counters, and leaderboard standings with zero interference risk.
                </p>
              </div>
            </div>
            <div className="pt-4 text-xs font-bold text-purple-400 flex items-center gap-1">
              Launch Spectator Screen →
            </div>
          </div>

          {/* Card 2: Umpire */}
          <div 
            onClick={() => handleTabClick('umpire')}
            className={`bg-[#111625] border-2 rounded-3xl p-6 shadow-xl cursor-pointer transition-all hover:scale-[1.03] flex flex-col justify-between h-72 ${
              activeTab === 'umpire' ? 'border-amber-500 shadow-amber-500/5' : 'border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="space-y-4">
              <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">Umpire Console</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Secure scorekeeping deck for referee officials. Pull matches from deck queue, log active serves, call Lets, and execute score corrections.
                </p>
              </div>
            </div>
            <div className="pt-4 text-xs font-bold text-amber-400 flex items-center gap-1">
              Unlock Umpire Scoring →
            </div>
          </div>

          {/* Card 3: Admin */}
          <div 
            onClick={() => handleTabClick('admin')}
            className={`bg-[#111625] border-2 rounded-3xl p-6 shadow-xl cursor-pointer transition-all hover:scale-[1.03] flex flex-col justify-between h-72 ${
              activeTab === 'admin' ? 'border-emerald-500 shadow-emerald-500/5' : 'border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="space-y-4">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">Tournament Admin</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Total tournament cockpit. Configure points rules, establish players list, trigger Swiss pairing rounds, manage overrides, and reset database.
                </p>
              </div>
            </div>
            <div className="pt-4 text-xs font-bold text-emerald-400 flex items-center gap-1">
              Access Coordinator Desk →
            </div>
          </div>

        </div>

        {/* Horizontal Broadcast Studio Card */}
        <div className="w-full bg-[#111625]/60 hover:bg-[#111625] border border-slate-800/80 rounded-3xl p-6 shadow-xl transition-all hover:border-slate-750 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
            <div className="inline-flex p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shadow-lg shadow-red-500/5">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1 max-w-xl">
              <h3 className="text-lg font-black text-white flex items-center justify-center md:justify-start gap-2">
                Arena Broadcast Studio
                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 rounded-full font-bold uppercase tracking-widest leading-none">
                  NEW
                </span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed animate-pulse">
                Connect smartphones as high-definition wireless cameras with zero lag. Coordinate multi-views on the Director Control Center, switch program feeds, mix audio, and overlay graphic scoreboard visuals onto the cast stream in real-time.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => onNavigate('/camera')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Camera className="w-4 h-4 text-slate-400" />
              Camera Operator
            </button>
            <button
              onClick={() => onNavigate('/director')}
              className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20"
            >
              <Tv className="w-4 h-4" />
              Director Production Desk
            </button>
          </div>
        </div>

        {/* Inline Passcode Secure Form */}
        {activeTab && (
          <div className="bg-[#111625] border border-slate-800/80 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4 relative">
            <button 
              onClick={() => setActiveTab(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
            >
              ✕ Cancel
            </button>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                {activeTab === 'umpire' ? '🏓 Umpire PIN Required' : '🛡️ Admin PIN Required'}
              </h4>
              <p className="text-[11px] text-slate-400">
                Please enter the secure authorization PIN to access this dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Enter PIN Code"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-center text-sm font-semibold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              
              {errorMsg && (
                <p className="text-rose-400 text-xs font-bold leading-relaxed px-2">
                  ⚠️ {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className={`w-full font-black py-2.5 rounded-xl text-xs text-slate-950 transition-colors cursor-pointer ${
                  activeTab === 'umpire' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                Authenticate & Launch Dashboard
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

// ----------------------------------------------------
// FULL SCREEN LOGIN FALLBACKS (FOR DIRECT DEEP LINKING)
// ----------------------------------------------------

interface LoginScreenProps {
  onAuthenticate: (pin: string) => boolean;
  onBack: () => void;
}

function UmpireLoginScreen({ onAuthenticate, onBack }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAuthenticate(pin);
    if (!success) {
      setError('Invalid PIN code. Please try again or contact the tournament organizer.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#111625] border border-slate-800 rounded-3xl max-w-sm w-full p-8 space-y-6 shadow-2xl relative">
        <button onClick={onBack} className="absolute top-6 left-6 text-xs text-slate-400 hover:text-white font-bold cursor-pointer flex items-center gap-1">
          ← Back
        </button>
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">Umpire Authorization</h3>
          <p className="text-xs text-slate-400">
            Please enter your official table official PIN to unlock scorekeeper controls.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Enter Umpire PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm font-semibold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          {error && <p className="text-rose-400 text-xs font-bold text-center">⚠️ {error}</p>}
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-colors cursor-pointer">
            Authorize Table Controls
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminLoginScreen({ onAuthenticate, onBack }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAuthenticate(pin);
    if (!success) {
      setError('Invalid PIN code. Please try again or contact the tournament organizer.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#111625] border border-slate-800 rounded-3xl max-w-sm w-full p-8 space-y-6 shadow-2xl relative">
        <button onClick={onBack} className="absolute top-6 left-6 text-xs text-slate-400 hover:text-white font-bold cursor-pointer flex items-center gap-1">
          ← Back
        </button>
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">Administrator Access</h3>
          <p className="text-xs text-slate-400">
            Authorized admin PIN is required to access coordinator rules and tournament configuration.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Enter Admin PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm font-semibold tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          {error && <p className="text-rose-400 text-xs font-bold text-center">⚠️ {error}</p>}
          <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-colors cursor-pointer">
            Authorize Admin Cockpit
          </button>
        </form>
      </div>
    </div>
  );
}
