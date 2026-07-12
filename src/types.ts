/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  name: string;
  wins: number;
  losses: number;
  milestones: number; // First to 10 points (worth 1 match point)
  matchWins: number;  // Matches won (worth 2 match points)
  bonuses: number;    // Reached 10 points AND won the match (worth +1 bonus point)
  totalPoints: number;// Calculated total points (milestones + matchWins + bonuses)
  pointsFor: number;  // Sum of individual game points scored (e.g. 21)
  pointsAgainst: number; // Sum of individual game points conceded
}

export type MatchType = 
  | 'round-robin' 
  | 'semi-final' 
  | 'final' 
  | 'bronze' 
  | 'progressive-r1' 
  | 'progressive-r2' 
  | 'progressive-r3' 
  | 'doubles-exhibition';

export interface MatchLog {
  timestamp: string;
  type: 'point_p1' | 'point_p2' | 'fault_grace' | 'fault_grace_p1' | 'fault_grace_p2' | 'fault_point_p1' | 'fault_point_p2' | 'milestone' | 'win' | 'undo' | 'system';
  message: string;
  scoreState: { score1: number; score2: number };
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  status: 'pending' | 'active' | 'completed';
  round: number; // Round of the match
  type: MatchType;
  score1: number;
  score2: number;
  firstTo10Id: string | null;
  winnerId: string | null;
  pointsAwarded1: number;
  pointsAwarded2: number;
  hasGraceRuleBeenUsed: boolean;
  p1GraceRuleUsed?: boolean;
  p2GraceRuleUsed?: boolean;
  timerSeconds: number;
  server: 'player1' | 'player2';
  serveCount: number; // 0 to 4 (alternates every 5 serves for 21-point game)
  logs: MatchLog[];
  day?: number; // Optional day of the tournament (multi-day support)
}

export interface TournamentConfig {
  pointsToWin: number;       // Default 21
  winByTwo: boolean;         // Default true
  servesPerChange: number;   // Default 5 for 21-point game, 2 for 11-point game
  enableFourPointRule: boolean; // Default true
  enableGraceRule: boolean;     // Default true
}

export interface StreamConfig {
  externalUrl?: string; // YouTube/Twitch URL
  activeSource?: string; // 'none', 'external', or 'camera:<camId>'
  audioSource?: string; // 'none' or 'camera:<camId>'
  overlays?: string[]; // active overlays e.g. ['score', 'bracket', 'logo']
}

export interface TournamentState {
  players: Player[];
  matches: Match[];
  currentMatchId: string | null;
  round: number;
  status: 'setup' | 'active' | 'bracket' | 'completed';
  config: TournamentConfig;
  standingOverrides?: Record<string, Partial<Player>>;
  stream?: StreamConfig;
}
