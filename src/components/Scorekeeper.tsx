/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Match, TournamentConfig } from '../types';
import { 
  Play, Pause, RotateCcw, Volume2, AlertTriangle, 
  ChevronRight, CornerUpLeft, CheckCircle2, SwatchBook 
} from 'lucide-react';
import Modal from './Modal';

interface ScorekeeperProps {
  match: Match;
  config: TournamentConfig;
  onUpdateMatch: (match: Match) => void;
  onCompleteMatch: (match: Match) => void;
  readOnly?: boolean;
}

export default function Scorekeeper({ match, config, onUpdateMatch, onCompleteMatch, readOnly = false }: ScorekeeperProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [manualServer, setManualServer] = useState<'player1' | 'player2' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [letNotice, setLetNotice] = useState<boolean>(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const letNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to calculate active server following ITTF Rules
  const getActiveServer = (s1: number, s2: number, overrideServer: 'player1' | 'player2' | null) => {
    if (overrideServer) return overrideServer;
    const totalPoints = s1 + s2;
    const isDeuceOrGreater = s1 >= (config.pointsToWin - 1) && s2 >= (config.pointsToWin - 1);
    const currentServesPerTurn = isDeuceOrGreater ? 1 : config.servesPerChange;
    const totalTurns = Math.floor(totalPoints / currentServesPerTurn);
    return totalTurns % 2 === 0 ? 'player1' : 'player2';
  };

  // Wrapper for onUpdateMatch to always maintain synchronized active server in the Match state
  const handleUpdateMatchWithServer = (updatedMatch: Match, customManualServer?: 'player1' | 'player2' | null) => {
    const activeManual = customManualServer !== undefined ? customManualServer : manualServer;
    const computedServer = getActiveServer(updatedMatch.score1, updatedMatch.score2, activeManual);
    onUpdateMatch({
      ...updatedMatch,
      server: computedServer,
    });
  };

  // Trigger brief visual/sound notifications
  const triggerNotification = (msg: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const triggerLetNotice = () => {
    if (letNoticeTimeoutRef.current) {
      clearTimeout(letNoticeTimeoutRef.current);
    }
    setLetNotice(true);
    letNoticeTimeoutRef.current = setTimeout(() => {
      setLetNotice(false);
    }, 4500);
  };

  // Cleanup notifications on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      if (letNoticeTimeoutRef.current) clearTimeout(letNoticeTimeoutRef.current);
    };
  }, []);

  // Timer runner
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && !match.winnerId) {
      interval = setInterval(() => {
        handleUpdateMatchWithServer({
          ...match,
          timerSeconds: match.timerSeconds + 1,
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, match, manualServer]);

  // Format digital clock
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Determine active server following ITTF Rules
  const totalPoints = match.score1 + match.score2;
  const isDeuceOrGreater = match.score1 >= (config.pointsToWin - 1) && match.score2 >= (config.pointsToWin - 1);
  
  // Under standard ITTF rules, serves alternate every 2 points, but in deuce it is every 1 point.
  // Under casual/traditional rules, serves alternate every servesPerChange points.
  const currentServesPerTurn = isDeuceOrGreater ? 1 : config.servesPerChange;
  
  let activeServer: 'player1' | 'player2' = 'player1';
  if (manualServer) {
    activeServer = manualServer;
  } else {
    // Standard calculation starting from server 1
    const totalTurns = Math.floor(totalPoints / currentServesPerTurn);
    activeServer = totalTurns % 2 === 0 ? 'player1' : 'player2';
  }

  // Grace rule state values
  const p1GraceUsed = match.p1GraceRuleUsed ?? false;
  const p2GraceUsed = match.p2GraceRuleUsed ?? false;

  // Decide winner following ITTF rules (must reach pointsToWin & win by 2 if enabled)
  const getWinner = (s1: number, s2: number): 'player1' | 'player2' | null => {
    const ptLimit = config.pointsToWin;
    if (config.winByTwo) {
      if (s1 >= ptLimit && s1 - s2 >= 2) return 'player1';
      if (s2 >= ptLimit && s2 - s1 >= 2) return 'player2';
    } else {
      if (s1 >= ptLimit) return 'player1';
      if (s2 >= ptLimit) return 'player2';
    }
    return null;
  };

  // Add Point
  const handleAddPoint = (playerNum: 1 | 2) => {
    let s1 = match.score1;
    let s2 = match.score2;
    let milestoneId = match.firstTo10Id;
    let winnerId = match.winnerId;

    if (winnerId) return;

    if (playerNum === 1) {
      s1 += 1;
    } else {
      s2 += 1;
    }

    // Auto trigger timer on first score
    if (totalPoints === 0 && !isTimerRunning) {
      setIsTimerRunning(true);
    }

    const logs = [...match.logs];
    const scoringPlayerName = playerNum === 1 ? match.player1Name : match.player2Name;

    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      type: playerNum === 1 ? 'point_p1' : 'point_p2',
      message: `🏓 Point to ${scoringPlayerName}`,
      scoreState: { score1: s1, score2: s2 },
    });

    // Check Milestone (first to reach 10 points)
    let milestoneLogged = false;
    if (config.enableFourPointRule && !milestoneId) {
      if (s1 === 10) {
        milestoneId = match.player1Id;
        milestoneLogged = true;
      } else if (s2 === 10) {
        milestoneId = match.player2Id;
        milestoneLogged = true;
      }
    }

    if (milestoneLogged) {
      const milestoneWinner = s1 === 10 ? match.player1Name : match.player2Name;
      logs.push({
        timestamp: new Date().toLocaleTimeString(),
        type: 'milestone',
        message: `🏆 Milestone achieved: ${milestoneWinner} is the first to reach 10 points (+1 Match Point)`,
        scoreState: { score1: s1, score2: s2 },
      });
      triggerNotification(`🏆 Milestone! ${milestoneWinner} reached 10 points first!`);
    }

    // Check Match Win
    const determinedWinner = getWinner(s1, s2);
    if (determinedWinner) {
      winnerId = determinedWinner === 'player1' ? match.player1Id : match.player2Id;
      const winnerName = determinedWinner === 'player1' ? match.player1Name : match.player2Name;
      
      logs.push({
        timestamp: new Date().toLocaleTimeString(),
        type: 'win',
        message: `🎉 Match completed! ${winnerName} wins the match (${s1} - ${s2})`,
        scoreState: { score1: s1, score2: s2 },
      });

      triggerNotification(`🎉 Match won by ${winnerName}! Score: ${s1}-${s2}`);
      setIsTimerRunning(false);
    }

    handleUpdateMatchWithServer({
      ...match,
      score1: s1,
      score2: s2,
      firstTo10Id: milestoneId,
      winnerId,
      logs,
    });
  };

  // Handle Service Fault / Mis-Serve
  const handleServiceFault = (faultyPlayerNum: 1 | 2) => {
    let s1 = match.score1;
    let s2 = match.score2;
    let milestoneId = match.firstTo10Id;
    let winnerId = match.winnerId;

    if (winnerId) return;

    const logs = [...match.logs];
    const faultyPlayerName = faultyPlayerNum === 1 ? match.player1Name : match.player2Name;
    const opponentPlayerName = faultyPlayerNum === 1 ? match.player2Name : match.player1Name;

    const currentP1GraceUsed = match.p1GraceRuleUsed ?? false;
    const currentP2GraceUsed = match.p2GraceRuleUsed ?? false;

    const isFirstFaultForThisPlayer = faultyPlayerNum === 1 ? !currentP1GraceUsed : !currentP2GraceUsed;

    if (config.enableGraceRule && isFirstFaultForThisPlayer) {
      // GRACE WARNING APPLIED
      logs.push({
        timestamp: new Date().toLocaleTimeString(),
        type: faultyPlayerNum === 1 ? 'fault_grace_p1' : 'fault_grace_p2',
        message: `⚠️ Service Fault by ${faultyPlayerName}. Player's FIRST MIS-SERVE WARNING: No point awarded to opponent.`,
        scoreState: { score1: s1, score2: s2 },
      });

      triggerNotification(`⚠️ Mis-Serve warning for ${faultyPlayerName}! Grace rule activated—no point awarded.`);
      triggerLetNotice();

      handleUpdateMatchWithServer({
        ...match,
        p1GraceRuleUsed: faultyPlayerNum === 1 ? true : currentP1GraceUsed,
        p2GraceRuleUsed: faultyPlayerNum === 2 ? true : currentP2GraceUsed,
        hasGraceRuleBeenUsed: true,
        logs,
      });
    } else {
      // STANDARD FAULT: Opponent gets a point
      const opposingPlayerNum = faultyPlayerNum === 1 ? 2 : 1;
      
      if (opposingPlayerNum === 1) {
        s1 += 1;
      } else {
        s2 += 1;
      }

      // Check milestone
      let milestoneLogged = false;
      if (config.enableFourPointRule && !milestoneId) {
        if (s1 === 10) {
          milestoneId = match.player1Id;
          milestoneLogged = true;
        } else if (s2 === 10) {
          milestoneId = match.player2Id;
          milestoneLogged = true;
        }
      }

      logs.push({
        timestamp: new Date().toLocaleTimeString(),
        type: faultyPlayerNum === 1 ? 'fault_point_p2' : 'fault_point_p1',
        message: `❌ Service Fault by ${faultyPlayerName}. Point awarded to ${opponentPlayerName}.`,
        scoreState: { score1: s1, score2: s2 },
      });

      if (milestoneLogged) {
        const milestoneWinner = opposingPlayerNum === 1 ? match.player1Name : match.player2Name;
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          type: 'milestone',
          message: `🏆 Milestone achieved: ${milestoneWinner} is the first to reach 10 points (+1 Match Point)`,
          scoreState: { score1: s1, score2: s2 },
        });
        triggerNotification(`🏆 Milestone! ${milestoneWinner} reached 10 points first!`);
      }

      // Check Match Win
      const determinedWinner = getWinner(s1, s2);
      if (determinedWinner) {
        winnerId = determinedWinner === 'player1' ? match.player1Id : match.player2Id;
        const winnerName = determinedWinner === 'player1' ? match.player1Name : match.player2Name;
        
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          type: 'win',
          message: `🎉 Match completed! ${winnerName} wins the match (${s1} - ${s2})`,
          scoreState: { score1: s1, score2: s2 },
        });

        triggerNotification(`🎉 Match won by ${winnerName}! Score: ${s1}-${s2}`);
        setIsTimerRunning(false);
      }

      handleUpdateMatchWithServer({
        ...match,
        score1: s1,
        score2: s2,
        firstTo10Id: milestoneId,
        winnerId,
        logs,
      });
    }
  };

  // Handle Service Let / Net Re-serve replay
  const handleLetReServe = () => {
    if (match.winnerId) return;

    const logs = [...match.logs];
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      message: `🔔 Service Let called - Point replayed (Re-serve).`,
      scoreState: { score1: match.score1, score2: match.score2 },
    });

    triggerNotification('🔔 Service Let! Re-serve the ball.');
    triggerLetNotice();

    handleUpdateMatchWithServer({
      ...match,
      logs,
    });
  };

  // Undo Last Action
  const handleUndo = () => {
    if (match.logs.length <= 1) return; // Cannot undo initial state

    const lastLog = match.logs[match.logs.length - 1];
    const remainingLogs = match.logs.slice(0, -1);
    
    // Find the state of scores prior to the last logged event
    let prevScore1 = 0;
    let prevScore2 = 0;
    
    for (let i = remainingLogs.length - 1; i >= 0; i--) {
      if (remainingLogs[i].scoreState) {
        prevScore1 = remainingLogs[i].scoreState.score1;
        prevScore2 = remainingLogs[i].scoreState.score2;
        break;
      }
    }

    // Recalculate milestone from remaining logs
    let restoredMilestoneId: string | null = null;
    let restoredGraceUsed = false;
    let restoredP1GraceUsed = false;
    let restoredP2GraceUsed = false;

    remainingLogs.forEach((log) => {
      if (log.type === 'milestone') {
        restoredMilestoneId = log.message.includes(match.player1Name) ? match.player1Id : match.player2Id;
      }
      if (log.type === 'fault_grace' || log.type === 'fault_grace_p1' || log.type === 'fault_grace_p2') {
        restoredGraceUsed = true;
      }
      if (log.type === 'fault_grace_p1') {
        restoredP1GraceUsed = true;
      }
      if (log.type === 'fault_grace_p2') {
        restoredP2GraceUsed = true;
      }
    });

    triggerNotification(`↩️ Undid last action: ${lastLog.message || lastLog.type}`);

    handleUpdateMatchWithServer({
      ...match,
      score1: prevScore1,
      score2: prevScore2,
      firstTo10Id: restoredMilestoneId,
      winnerId: null, // Reset winner as we backed up
      hasGraceRuleBeenUsed: restoredGraceUsed,
      p1GraceRuleUsed: restoredP1GraceUsed,
      p2GraceRuleUsed: restoredP2GraceUsed,
      logs: remainingLogs,
    });
  };

  // Reset current match scores
  const handleResetScores = () => {
    setShowResetConfirm(true);
  };

  const confirmResetScores = () => {
    handleUpdateMatchWithServer({
      ...match,
      score1: 0,
      score2: 0,
      firstTo10Id: null,
      winnerId: null,
      hasGraceRuleBeenUsed: false,
      p1GraceRuleUsed: false,
      p2GraceRuleUsed: false,
      timerSeconds: 0,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'system',
          message: `Match scores and timer reset. Ready to play!`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    }, null);
    setManualServer(null);
    setIsTimerRunning(false);
    triggerNotification('🔄 Match score reset successfully.');
  };

  // Manual Server Override toggle
  const toggleManualServer = () => {
    if (activeServer === 'player1') {
      setManualServer('player2');
    } else {
      setManualServer('player1');
    }
  };

  // Complete and submit match
  const handleSaveMatch = () => {
    if (!match.winnerId) return;

    // Calculate final points to register
    const p1Stats = {
      milestone: match.firstTo10Id === match.player1Id,
      win: match.winnerId === match.player1Id,
    };
    const p2Stats = {
      milestone: match.firstTo10Id === match.player2Id,
      win: match.winnerId === match.player2Id,
    };

    let pts1 = 0;
    let pts2 = 0;

    if (config.enableFourPointRule) {
      if (p1Stats.milestone) pts1 += 1;
      if (p1Stats.win) pts1 += 2;
      if (p1Stats.milestone && p1Stats.win) pts1 += 1;

      if (p2Stats.milestone) pts2 += 1;
      if (p2Stats.win) pts2 += 2;
      if (p2Stats.milestone && p2Stats.win) pts2 += 1;
    } else {
      pts1 = p1Stats.win ? 2 : 0;
      pts2 = p2Stats.win ? 2 : 0;
    }

    const finalCompletedMatch: Match = {
      ...match,
      status: 'completed',
      pointsAwarded1: pts1,
      pointsAwarded2: pts2,
    };

    onCompleteMatch(finalCompletedMatch);
  };

  const getMatchTypeName = () => {
    switch (match.type) {
      case 'progressive-r1': return 'Round 1 Match';
      case 'progressive-r2': return 'Round 2 Match';
      case 'progressive-r3': return 'Round 3 Placement';
      case 'doubles-exhibition': return 'Doubles Exhibition Match';
      case 'final': return 'Grand Championship Final';
      case 'bronze': return 'Consolation Bronze Match';
      default: return match.type.toUpperCase();
    }
  };

  return (
    <div className="bg-[#0b1320] rounded-3xl shadow-xl border border-emerald-950/45 p-6 flex flex-col font-sans text-slate-100" id="scorekeeper-root">
      
      {/* Top Bar: Match details, status, timer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800/60 pb-4 mb-6 gap-4">
        <div>
          <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full border border-emerald-500/20 shadow-md inline-block">
            {getMatchTypeName()}
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Single-Table Scoreboard</h2>
        </div>

        {/* Customized digital stopwatch */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-2xl shadow-inner">
          <span className="font-mono text-2xl font-bold text-white min-w-[75px] text-center tracking-tight">
            {formatTime(match.timerSeconds)}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`p-1.5 rounded-lg transition-all ${
                isTimerRunning 
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={isTimerRunning ? 'Pause Match' : 'Start/Resume Match'}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                handleUpdateMatchWithServer({ ...match, timerSeconds: 0 });
                setIsTimerRunning(false);
              }}
              className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Let / Re-Serve Notification Banner */}
      {letNotice && (
        <div className="mb-4 bg-amber-500 text-slate-950 text-sm font-black py-3.5 px-4 rounded-2xl shadow-xl flex items-center justify-between border-2 border-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-slate-950 animate-bounce" />
            <span>⚠️ PLAY RE-SERVE! Service Let or Fault Warning applied. Play point again.</span>
          </div>
          <button onClick={() => setLetNotice(false)} className="bg-slate-950 text-amber-400 hover:bg-slate-900 font-bold text-[10px] px-2 py-1 rounded-lg">
            OK
          </button>
        </div>
      )}

      {/* Live Alerts banner */}
      {notification && (
        <div className="mb-4 bg-slate-950 text-emerald-400 text-xs font-bold py-2.5 px-4 rounded-xl border border-emerald-500/20 shadow-lg flex items-center gap-2 animate-pulse">
          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Scoreboard Layout: Split-screen players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[250px] mb-6">
        
        {/* Player 1 Card */}
        <div 
          className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all border-2 ${
            match.winnerId === match.player1Id 
              ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/5' 
              : activeServer === 'player1' && !match.winnerId
              ? 'bg-slate-900/60 border-emerald-500/40 shadow-md' 
              : 'bg-slate-950/40 border-slate-800/80 shadow-sm'
          }`}
          id="player1-score-card"
        >
          {/* Serves Glow Badge */}
          {activeServer === 'player1' && !match.winnerId && (
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-500 text-slate-950 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
              SERVING
            </div>
          )}

          {/* Player Identity */}
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white truncate pr-20">{match.player1Name}</h3>
            <div className="flex flex-wrap gap-1.5">
              {match.firstTo10Id === match.player1Id && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  🏆 Milestone (1st to 10)
                </span>
              )}
              {match.winnerId === match.player1Id && (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  🎉 Winner (+2 Match Points)
                </span>
              )}
            </div>
          </div>

          {/* Big Score Button */}
          <div className="flex flex-col items-center justify-center py-4">
            <button
              onClick={() => !readOnly && handleAddPoint(1)}
              disabled={!!match.winnerId || readOnly}
              className={`group font-mono text-7xl font-black w-36 h-36 rounded-2xl flex items-center justify-center transition-all ${
                match.winnerId || readOnly
                  ? 'text-slate-500 bg-slate-900/40 border border-slate-800/80 cursor-not-allowed'
                  : 'text-white bg-slate-900 hover:bg-slate-950 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 hover:scale-105 active:scale-95 shadow-2xl cursor-pointer'
              }`}
            >
              {match.score1}
            </button>
            {!match.winnerId && !readOnly && (
              <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-2">
                Tap to score +1 point
              </span>
            )}
            {readOnly && (
              <span className="text-[10px] text-slate-400/80 font-mono tracking-wide mt-2">
                Spectating point board
              </span>
            )}
          </div>

          {/* Lower controls: Decrement / Fault Warning */}
          <div className="flex gap-2 border-t border-slate-800/60 pt-3">
            <button
              onClick={() => {
                if (match.score1 > 0 && !readOnly) {
                  const s1 = match.score1 - 1;
                  const logs = [...match.logs];
                  logs.push({
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'point_p1',
                    message: `Subtracted point from ${match.player1Name}`,
                    scoreState: { score1: s1, score2: match.score2 }
                  });
                  handleUpdateMatchWithServer({
                    ...match,
                    score1: s1,
                    logs
                  });
                }
              }}
              disabled={match.score1 === 0 || !!match.winnerId || readOnly}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 font-bold text-xs rounded-lg transition-colors border border-slate-700/50"
            >
              -1 Pt
            </button>
            
            {config.enableGraceRule && (
              <button
                onClick={() => !readOnly && handleServiceFault(1)}
                disabled={!!match.winnerId || readOnly}
                className={`flex-[2] py-1.5 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 border ${
                  p1GraceUsed
                    ? 'bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border-rose-900/40'
                    : 'bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border-emerald-900/40'
                } disabled:opacity-30`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {p1GraceUsed ? 'Fault (+1 to Opp)' : 'Mis-Serve (Free)'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Player 2 Card */}
        <div 
          className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all border-2 ${
            match.winnerId === match.player2Id 
              ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-500/5' 
              : activeServer === 'player2' && !match.winnerId
              ? 'bg-slate-900/60 border-emerald-500/40 shadow-md' 
              : 'bg-slate-950/40 border-slate-800/80 shadow-sm'
          }`}
          id="player2-score-card"
        >
          {/* Serves Glow Badge */}
          {activeServer === 'player2' && !match.winnerId && (
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-500 text-slate-950 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
              SERVING
            </div>
          )}

          {/* Player Identity */}
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white truncate pr-20">{match.player2Name}</h3>
            <div className="flex flex-wrap gap-1.5">
              {match.firstTo10Id === match.player2Id && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  🏆 Milestone (1st to 10)
                </span>
              )}
              {match.winnerId === match.player2Id && (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  🎉 Winner (+2 Match Points)
                </span>
              )}
            </div>
          </div>

          {/* Big Score Button */}
          <div className="flex flex-col items-center justify-center py-4">
            <button
              onClick={() => !readOnly && handleAddPoint(2)}
              disabled={!!match.winnerId || readOnly}
              className={`group font-mono text-7xl font-black w-36 h-36 rounded-2xl flex items-center justify-center transition-all ${
                match.winnerId || readOnly
                  ? 'text-slate-500 bg-slate-900/40 border border-slate-800/80 cursor-not-allowed'
                  : 'text-white bg-slate-900 hover:bg-slate-950 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 hover:scale-105 active:scale-95 shadow-2xl cursor-pointer'
              }`}
            >
              {match.score2}
            </button>
            {!match.winnerId && !readOnly && (
              <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-2">
                Tap to score +1 point
              </span>
            )}
            {readOnly && (
              <span className="text-[10px] text-slate-400/80 font-mono tracking-wide mt-2">
                Spectating point board
              </span>
            )}
          </div>

          {/* Lower controls: Decrement / Fault Warning */}
          <div className="flex gap-2 border-t border-slate-800/60 pt-3">
            <button
              onClick={() => {
                if (match.score2 > 0 && !readOnly) {
                  const s2 = match.score2 - 1;
                  const logs = [...match.logs];
                  logs.push({
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'point_p2',
                    message: `Subtracted point from ${match.player2Name}`,
                    scoreState: { score1: match.score1, score2: s2 }
                  });
                  handleUpdateMatchWithServer({
                    ...match,
                    score2: s2,
                    logs
                  });
                }
              }}
              disabled={match.score2 === 0 || !!match.winnerId || readOnly}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 font-bold text-xs rounded-lg transition-colors border border-slate-700/50"
            >
              -1 Pt
            </button>
            
            {config.enableGraceRule && (
              <button
                onClick={() => !readOnly && handleServiceFault(2)}
                disabled={!!match.winnerId || readOnly}
                className={`flex-[2] py-1.5 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 border ${
                  p2GraceUsed
                    ? 'bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border-rose-900/40'
                    : 'bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border-emerald-900/40'
                } disabled:opacity-30`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {p2GraceUsed ? 'Fault (+1 to Opp)' : 'Mis-Serve (Free)'}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Rules Info, server overrides, and actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-2xl mb-6 border border-slate-800/80">
        
        {/* Rules State */}
        <div className="text-xs text-slate-400 space-y-1.5 md:border-r border-slate-800/80 pr-3">
          <div className="font-bold text-slate-200 flex items-center gap-1">
            <SwatchBook className="w-3.5 h-3.5 text-emerald-400" />
            Active Match Rules
          </div>
          <div>Play to <strong className="text-white">{config.pointsToWin} points</strong> {config.winByTwo ? '(Win by 2)' : ''}</div>
          <div>Server alternates every <strong className="text-white">{currentServesPerTurn} points</strong></div>
          {config.enableGraceRule && (
            <div className="space-y-1 mt-1">
              <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Service Warnings:</div>
              <div className="flex gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  p1GraceUsed ? 'bg-red-950/20 text-red-400 border-red-900/30' : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                }`}>
                  {match.player1Name.split(' ')[0]}: {p1GraceUsed ? 'Used' : 'Free'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  p2GraceUsed ? 'bg-red-950/20 text-red-400 border-red-900/30' : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                }`}>
                  {match.player2Name.split(' ')[0]}: {p2GraceUsed ? 'Used' : 'Free'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Server Adjustment */}
        <div className="text-xs text-slate-400 flex flex-col justify-center md:border-r border-slate-800/80 px-3 py-1 md:py-0 gap-2">
          <div className="font-bold text-slate-200">Manual Play Corrections</div>
          <button 
            onClick={() => !readOnly && toggleManualServer()}
            disabled={readOnly}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-200 font-semibold flex items-center justify-center gap-1 rounded-lg cursor-pointer text-center w-full"
          >
            Switch Server ({activeServer === 'player1' ? 'P2' : 'P1'})
          </button>
          <button 
            onClick={() => !readOnly && handleLetReServe()}
            disabled={!!match.winnerId || readOnly}
            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors text-amber-400 font-semibold flex items-center justify-center gap-1 rounded-lg cursor-pointer text-center w-full"
          >
            🔔 Call Let (Re-Serve)
          </button>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center justify-center gap-2 pl-3">
          <button
            onClick={() => !readOnly && handleUndo()}
            disabled={match.logs.length <= 1 || readOnly}
            className="flex-1 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Undo last score entry"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
            Undo Score
          </button>
          
          <button
            onClick={() => !readOnly && handleResetScores()}
            disabled={readOnly}
            className="flex-1 py-2 bg-slate-800 border border-red-900/40 hover:bg-red-950/30 disabled:opacity-30 disabled:pointer-events-none text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Reset match points"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Match
          </button>
        </div>

      </div>

      {/* Save Completed Match OR Match Logs Feed */}
      <div className="flex-1 flex flex-col justify-end">
        {match.winnerId ? (
          <div className="bg-emerald-950/25 rounded-2xl p-5 border border-emerald-800/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {readOnly ? 'Match Finished! Awaiting Submit' : "Match Complete! Let's register scores."}
              </h4>
              <p className="text-xs text-emerald-500 mt-1">
                {readOnly ? 'Scores are locked. The umpire or admin must submit this score.' : 'The leaderboard and matches standings will automatically update.'}
              </p>
            </div>
            {!readOnly ? (
              <button
                onClick={handleSaveMatch}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-105 cursor-pointer"
              >
                Submit & Continue
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </button>
            ) : (
              <span className="text-xs bg-emerald-950 border border-emerald-800/40 font-mono text-emerald-400 font-bold px-4 py-2.5 rounded-xl">
                🔒 Locked View
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Match Feed Logs</div>
            <div className="bg-slate-950/60 rounded-xl p-3 max-h-[110px] overflow-y-auto border border-slate-800/60 text-[11px] font-mono text-slate-400 space-y-1">
              {[...match.logs].reverse().map((log, idx) => (
                <div key={idx} className="flex justify-between items-start border-b border-slate-800/40 pb-1 last:border-0">
                  <span className="text-slate-500 shrink-0 mr-2">[{log.timestamp}]</span>
                  <span className="flex-1 text-slate-300">{log.message}</span>
                  <span className="text-slate-500 font-bold ml-2">({log.scoreState.score1}-{log.scoreState.score2})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmResetScores}
        title="Reset Match Score"
        message={`Are you sure you want to completely reset the score and timer for ${match.player1Name} vs ${match.player2Name}? This action cannot be undone.`}
        confirmText="Reset Match"
        cancelText="Cancel"
        type="danger"
      />

    </div>
  );
}
