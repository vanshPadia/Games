/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, Match, TournamentConfig, MatchType } from '../types';

/**
 * Generate Round Robin fixtures for a list of players
 * (kept as fallback or optional feature, but we default to progressive)
 */
export function generateRoundRobinMatches(players: Player[]): Match[] {
  if (players.length < 2) return [];

  const matches: Omit<Match, 'round'>[] = [];
  let matchIndex = 0;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: `match_${Date.now()}_${matchIndex++}`,
        player1Id: players[i].id,
        player2Id: players[j].id,
        player1Name: players[i].name,
        player2Name: players[j].name,
        status: 'pending',
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
            message: `Match generated: ${players[i].name} vs ${players[j].name}`,
            scoreState: { score1: 0, score2: 0 },
          },
        ],
      });
    }
  }

  const shuffled = [...matches].sort(() => Math.random() - 0.5);
  const finalMatches: Match[] = [];
  const halfCount = Math.ceil(shuffled.length / 2);

  shuffled.forEach((m, idx) => {
    const round: 1 | 2 = idx < halfCount ? 1 : 2;
    finalMatches.push({
      ...m,
      round,
    } as Match);
  });

  return finalMatches;
}

/**
 * Generate Round 1 matches in the Progressive Bracket
 */
export function generateProgressiveRound1Matches(players: Player[]): Match[] {
  if (players.length < 2) return [];

  const matches: Match[] = [];
  // Shuffle players to keep matchups fresh
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledPlayers.length - 1; i += 2) {
    const p1 = shuffledPlayers[i];
    const p2 = shuffledPlayers[i + 1];
    matches.push({
      id: `prog_r1_${i}_${Date.now()}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: i === 0 ? 'active' : 'pending',
      round: 1,
      type: 'progressive-r1',
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
          message: `Round 1 Progressive Match: ${p1.name} vs ${p2.name}`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  return matches;
}

/**
 * Generate Round 2 matches based on Round 1 results (Winners play Winners, Losers play Losers)
 */
export function generateProgressiveRound2Matches(players: Player[], completedRound1Matches: Match[]): Match[] {
  const matches: Match[] = [];
  const winners: { id: string; name: string }[] = [];
  const losers: { id: string; name: string }[] = [];

  completedRound1Matches.forEach((m) => {
    if (m.winnerId === m.player1Id) {
      winners.push({ id: m.player1Id, name: m.player1Name });
      losers.push({ id: m.player2Id, name: m.player2Name });
    } else if (m.winnerId === m.player2Id) {
      winners.push({ id: m.player2Id, name: m.player2Name });
      losers.push({ id: m.player1Id, name: m.player1Name });
    }
  });

  // Pair winners against winners
  for (let i = 0; i < winners.length - 1; i += 2) {
    const p1 = winners[i];
    const p2 = winners[i + 1];
    matches.push({
      id: `prog_r2_win_${i}_${Date.now()}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: matches.length === 0 ? 'active' : 'pending',
      round: 2,
      type: 'progressive-r2',
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
          message: `Round 2 Winners Match: ${p1.name} vs ${p2.name}`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  // Pair losers against losers
  for (let i = 0; i < losers.length - 1; i += 2) {
    const p1 = losers[i];
    const p2 = losers[i + 1];
    matches.push({
      id: `prog_r2_lose_${i}_${Date.now()}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: 'pending',
      round: 2,
      type: 'progressive-r2',
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
          message: `Round 2 Losers Match: ${p1.name} vs ${p2.name}`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  // Handle cross pairing if there are odd winner/loser counts (e.g., 6 players = 3 winners, 3 losers)
  if (winners.length % 2 !== 0 && losers.length % 2 !== 0) {
    const oddWinner = winners[winners.length - 1];
    const oddLoser = losers[losers.length - 1];
    matches.push({
      id: `prog_r2_mixed_${Date.now()}`,
      player1Id: oddWinner.id,
      player2Id: oddLoser.id,
      player1Name: oddWinner.name,
      player2Name: oddLoser.name,
      status: 'pending',
      round: 2,
      type: 'progressive-r2',
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
          message: `Round 2 Cross Match (Winner vs Loser): ${oddWinner.name} vs ${oddLoser.name}`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  return matches;
}

/**
 * Generate Round 3 matches based on player wins/losses records
 */
export function generateProgressiveRound3Matches(players: Player[], completedMatches: Match[]): Match[] {
  const playerStatsMap = new Map<string, { id: string; name: string; wins: number; losses: number }>();
  players.forEach((p) => {
    playerStatsMap.set(p.id, { id: p.id, name: p.name, wins: 0, losses: 0 });
  });

  completedMatches.forEach((m) => {
    if (m.status === 'completed' && (m.type === 'progressive-r1' || m.type === 'progressive-r2')) {
      const p1 = playerStatsMap.get(m.player1Id);
      const p2 = playerStatsMap.get(m.player2Id);
      if (p1 && p2) {
        if (m.winnerId === m.player1Id) {
          p1.wins += 1;
          p2.losses += 1;
        } else if (m.winnerId === m.player2Id) {
          p2.wins += 1;
          p1.losses += 1;
        }
      }
    }
  });

  const allPlayers = Array.from(playerStatsMap.values());
  const undefeated = allPlayers.filter((p) => p.wins === 2);
  const middle = allPlayers.filter((p) => p.wins === 1 && p.losses === 1);
  const winless = allPlayers.filter((p) => p.losses === 2);

  const matches: Match[] = [];

  // 1. Championship Match (2-0 players play each other)
  if (undefeated.length >= 2) {
    matches.push({
      id: `prog_r3_final_${Date.now()}`,
      player1Id: undefeated[0].id,
      player2Id: undefeated[1].id,
      player1Name: undefeated[0].name,
      player2Name: undefeated[1].name,
      status: 'active',
      round: 3,
      type: 'final',
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
          message: `🏆 GRAND CHAMPIONSHIP FINAL: ${undefeated[0].name} (2-0) vs ${undefeated[1].name} (2-0)`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  } else if (undefeated.length === 1 && middle.length > 0) {
    const topMiddle = middle.shift()!;
    matches.push({
      id: `prog_r3_final_${Date.now()}`,
      player1Id: undefeated[0].id,
      player2Id: topMiddle.id,
      player1Name: undefeated[0].name,
      player2Name: topMiddle.name,
      status: 'active',
      round: 3,
      type: 'final',
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
          message: `🏆 GRAND CHAMPIONSHIP FINAL: ${undefeated[0].name} (2-0) vs ${topMiddle.name} (1-1)`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  // 2. Consolation Match (1-1 players play each other)
  for (let i = 0; i < middle.length - 1; i += 2) {
    const p1 = middle[i];
    const p2 = middle[i + 1];
    matches.push({
      id: `prog_r3_bronze_${i}_${Date.now()}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: 'pending',
      round: 3,
      type: 'bronze',
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
          message: `Consolation Match (3rd-4th Place): ${p1.name} (1-1) vs ${p2.name} (1-1)`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  // 3. Lower Placement Match (0-2 players play each other)
  for (let i = 0; i < winless.length - 1; i += 2) {
    const p1 = winless[i];
    const p2 = winless[i + 1];
    matches.push({
      id: `prog_r3_placement_${i}_${Date.now()}`,
      player1Id: p1.id,
      player2Id: p2.id,
      player1Name: p1.name,
      player2Name: p2.name,
      status: 'pending',
      round: 3,
      type: 'progressive-r3',
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
          message: `Placement Match: ${p1.name} (0-2) vs ${p2.name} (0-2)`,
          scoreState: { score1: 0, score2: 0 },
        },
      ],
    });
  }

  return matches;
}

/**
 * Generate a special exhibition doubles match
 * pairs: singles champion + consolation champion   vs   singles runner-up + consolation runner-up
 */
export function generateDoublesExhibitionMatch(players: Player[], completedMatches: Match[]): Match | null {
  const finalMatch = completedMatches.find((m) => m.type === 'final' && m.status === 'completed');
  const bronzeMatch = completedMatches.find((m) => m.type === 'bronze' && m.status === 'completed');

  if (!finalMatch) return null;

  const singlesChampionId = finalMatch.winnerId;
  const singlesChampionName = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;

  const singlesRunnerUpId = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
  const singlesRunnerUpName = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Name : finalMatch.player1Name;

  let consolationChampionId = '';
  let consolationChampionName = '';
  let consolationRunnerUpId = '';
  let consolationRunnerUpName = '';

  if (bronzeMatch) {
    consolationChampionId = bronzeMatch.winnerId!;
    consolationChampionName = bronzeMatch.winnerId === bronzeMatch.player1Id ? bronzeMatch.player1Name : bronzeMatch.player2Name;

    consolationRunnerUpId = bronzeMatch.winnerId === bronzeMatch.player1Id ? bronzeMatch.player2Id : bronzeMatch.player1Id;
    consolationRunnerUpName = bronzeMatch.winnerId === bronzeMatch.player1Id ? bronzeMatch.player2Name : bronzeMatch.player1Name;
  } else {
    const others = players.filter((p) => p.id !== singlesChampionId && p.id !== singlesRunnerUpId);
    if (others.length >= 2) {
      consolationChampionId = others[0].id;
      consolationChampionName = others[0].name;
      consolationRunnerUpId = others[1].id;
      consolationRunnerUpName = others[1].name;
    } else if (others.length === 1) {
      consolationChampionId = others[0].id;
      consolationChampionName = others[0].name;
    }
  }

  const team1Name = consolationChampionName ? `${singlesChampionName} & ${consolationChampionName}` : singlesChampionName;
  const team2Name = consolationRunnerUpName ? `${singlesRunnerUpName} & ${consolationRunnerUpName}` : singlesRunnerUpName;

  return {
    id: `doubles_exhibition_${Date.now()}`,
    player1Id: `team_champ_${singlesChampionId}_${consolationChampionId}`,
    player2Id: `team_runner_${singlesRunnerUpId}_${consolationRunnerUpId}`,
    player1Name: team1Name,
    player2Name: team2Name,
    status: 'active',
    round: 3,
    type: 'doubles-exhibition',
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
        message: `🔥 SPECIAL EXHIBITION DOUBLES MATCH: Team [${singlesChampionName} + ${consolationChampionName}] vs Team [${singlesRunnerUpName} + ${consolationRunnerUpName}]`,
        scoreState: { score1: 0, score2: 0 },
      },
    ],
  };
}

/**
 * Calculate the points awarded to a player in a specific match
 */
export function calculateMatchPoints(
  match: Match,
  playerId: string,
  config: TournamentConfig
): { points: number; milestone: boolean; win: boolean; bonus: boolean } {
  const isP1 = match.player1Id === playerId;
  const isP2 = match.player2Id === playerId;

  if (!isP1 && !isP2) {
    return { points: 0, milestone: false, win: false, bonus: false };
  }

  if (match.status !== 'completed') {
    return { points: 0, milestone: false, win: false, bonus: false };
  }

  if (!config.enableFourPointRule) {
    const isWinner = match.winnerId === playerId;
    return {
      points: isWinner ? 2 : 0,
      milestone: false,
      win: isWinner,
      bonus: false,
    };
  }

  const hasMilestone = match.firstTo10Id === playerId;
  const isWinner = match.winnerId === playerId;
  const hasBonus = hasMilestone && isWinner;

  let points = 0;
  if (hasMilestone) points += 1;
  if (isWinner) points += 2;
  if (hasBonus) points += 1;

  return {
    points,
    milestone: hasMilestone,
    win: isWinner,
    bonus: hasBonus,
  };
}

/**
 * Re-calculate the leaderboard statistics based on completed matches
 */
export function calculateLeaderboard(players: Player[], matches: Match[], config: TournamentConfig): Player[] {
  const playerStatsMap = new Map<string, Player>();
  players.forEach((p) => {
    playerStatsMap.set(p.id, {
      ...p,
      wins: 0,
      losses: 0,
      milestones: 0,
      matchWins: 0,
      bonuses: 0,
      totalPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  });

  const completedSinglesMatches = matches.filter(
    (m) => m.status === 'completed' && m.type !== 'doubles-exhibition'
  );

  completedSinglesMatches.forEach((m) => {
    // Some match ids are progressive and represent normal players
    const p1 = playerStatsMap.get(m.player1Id);
    const p2 = playerStatsMap.get(m.player2Id);

    if (p1) {
      p1.pointsFor += m.score1;
      p1.pointsAgainst += m.score2;
      const p1Stats = calculateMatchPoints(m, m.player1Id, config);
      if (m.winnerId === m.player1Id) {
        p1.wins += 1;
      } else {
        p1.losses += 1;
      }
      if (p1Stats.milestone) p1.milestones += 1;
      if (p1Stats.win) p1.matchWins += 1;
      if (p1Stats.bonus) p1.bonuses += 1;
      p1.totalPoints += p1Stats.points;
    }

    if (p2) {
      p2.pointsFor += m.score2;
      p2.pointsAgainst += m.score1;
      const p2Stats = calculateMatchPoints(m, m.player2Id, config);
      if (m.winnerId === m.player2Id) {
        p2.wins += 1;
      } else {
        p2.losses += 1;
      }
      if (p2Stats.milestone) p2.milestones += 1;
      if (p2Stats.win) p2.matchWins += 1;
      if (p2Stats.bonus) p2.bonuses += 1;
      p2.totalPoints += p2Stats.points;
    }
  });

  return Array.from(playerStatsMap.values()).sort((a, b) => {
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
