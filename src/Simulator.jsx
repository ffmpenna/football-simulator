import React, { useState, useMemo } from 'react';

// ==========================================
// 1. DADOS, ESCUDOS E HISTÓRICO DE JOGOS
// ==========================================
const TEAMS_INFO = {
  'Ind. Rivadavia': {
    short: 'IRV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Escudo_del_Club_Independiente_Rivadavia.svg',
  },
  Bolívar: {
    short: 'BOL',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Emblem_bolivar.png',
  },
  'D. La Guaira': {
    short: 'DLG',
    logo: 'https://upload.wikimedia.org/wikipedia/en/f/fa/Deportivo_La_Guaira_logo.png',
  },
  Fluminense: {
    short: 'FLU',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Fluminense_Football_Club.svg',
  },
};

const INITIAL_STATS = {
  'Ind. Rivadavia': {
    pts: 10,
    j: 4,
    v: 3,
    e: 1,
    d: 0,
    gp: 8,
    gc: 3,
    sg: 5,
    cv: 0,
    ca: 5,
  },
  Bolívar: { pts: 5, j: 4, v: 1, e: 2, d: 1, gp: 4, gc: 3, sg: 1, cv: 1, ca: 6 },
  'D. La Guaira': { pts: 3, j: 4, v: 0, e: 3, d: 1, gp: 3, gc: 6, sg: -3, cv: 0, ca: 3 },
  Fluminense: { pts: 2, j: 4, v: 0, e: 2, d: 2, gp: 2, gc: 5, sg: -3, cv: 1, ca: 11 },
};

// Histórico oficial até 07/05/2026 para a tabela saber calcular os confrontos diretos
const PAST_MATCHES = [
  { home: 'D. La Guaira', away: 'Fluminense', hScore: 0, aScore: 0 },
  { home: 'Ind. Rivadavia', away: 'Bolívar', hScore: 1, aScore: 0 },
  { home: 'Bolívar', away: 'D. La Guaira', hScore: 1, aScore: 1 },
  { home: 'Fluminense', away: 'Ind. Rivadavia', hScore: 1, aScore: 2 },
  { home: 'Ind. Rivadavia', away: 'D. La Guaira', hScore: 4, aScore: 1 },
  { home: 'Bolívar', away: 'Fluminense', hScore: 2, aScore: 0 },
];

const ROUND_5 = [
  { id: 'flu_bol', home: 'Fluminense', away: 'Bolívar' },
  { id: 'dlg_ind', home: 'D. La Guaira', away: 'Ind. Rivadavia' },
];

const ROUND_6 = [
  { id: 'flu_dlg', home: 'Fluminense', away: 'D. La Guaira' },
  { id: 'bol_ind', home: 'Bolívar', away: 'Ind. Rivadavia' },
];

const processMatchData = (teams, matchId, homeTeam, awayTeam, data) => {
  const homeCA = parseInt(data[`${matchId}_home_ca`] || '0', 10);
  const homeCV = parseInt(data[`${matchId}_home_cv`] || '0', 10);
  const awayCA = parseInt(data[`${matchId}_away_ca`] || '0', 10);
  const awayCV = parseInt(data[`${matchId}_away_cv`] || '0', 10);

  teams[homeTeam].ca += homeCA;
  teams[homeTeam].cv += homeCV;
  teams[awayTeam].ca += awayCA;
  teams[awayTeam].cv += awayCV;

  const homeScore = data[`${matchId}_home`];
  const awayScore = data[`${matchId}_away`];

  if (homeScore === '' || awayScore === '') return;

  const gHome = parseInt(homeScore, 10);
  const gAway = parseInt(awayScore, 10);

  teams[homeTeam].j += 1;
  teams[awayTeam].j += 1;
  teams[homeTeam].gp += gHome;
  teams[awayTeam].gp += gAway;
  teams[homeTeam].gc += gAway;
  teams[awayTeam].gc += gHome;
  teams[homeTeam].sg += gHome - gAway;
  teams[awayTeam].sg += gAway - gHome;

  if (gHome > gAway) {
    teams[homeTeam].v += 1;
    teams[homeTeam].pts += 3;
    teams[awayTeam].d += 1;
  } else if (gHome < gAway) {
    teams[awayTeam].v += 1;
    teams[awayTeam].pts += 3;
    teams[homeTeam].d += 1;
  } else {
    teams[homeTeam].e += 1;
    teams[homeTeam].pts += 1;
    teams[awayTeam].e += 1;
    teams[awayTeam].pts += 1;
  }
};

// MOTOR DA TABELA CORRIGIDO (Agora usa Confronto Direto como 1º Critério)
const generateStandings = (data) => {
  const teams = JSON.parse(JSON.stringify(INITIAL_STATS));

  // Captura os jogos simulados para juntar com o passado
  const simulatedMatches = [];
  [...ROUND_5, ...ROUND_6].forEach((m) => {
    processMatchData(teams, m.id, m.home, m.away, data);
    if (data[`${m.id}_home`] !== '' && data[`${m.id}_away`] !== '') {
      simulatedMatches.push({
        home: m.home,
        away: m.away,
        hScore: parseInt(data[`${m.id}_home`], 10),
        aScore: parseInt(data[`${m.id}_away`], 10),
      });
    }
  });

  const allMatches = [...PAST_MATCHES, ...simulatedMatches];

  return Object.keys(teams)
    .map((name) => ({ name, ...teams[name] }))
    .sort((a, b) => {
      // Ordena primeiro por pontos gerais
      if (b.pts !== a.pts) return b.pts - a.pts;

      // CRITÉRIO 1: CONFRONTO DIRETO (Pontos, SG, GP)
      let aPts = 0,
        bPts = 0,
        aSg = 0,
        bSg = 0,
        aGp = 0,
        bGp = 0;
      allMatches.forEach((m) => {
        if (m.home === a.name && m.away === b.name) {
          if (m.hScore > m.aScore) aPts += 3;
          else if (m.hScore < m.aScore) bPts += 3;
          else {
            aPts += 1;
            bPts += 1;
          }
          aSg += m.hScore - m.aScore;
          bSg += m.aScore - m.hScore;
          aGp += m.hScore;
          bGp += m.aScore;
        } else if (m.home === b.name && m.away === a.name) {
          if (m.hScore > m.aScore) bPts += 3;
          else if (m.hScore < m.aScore) aPts += 3;
          else {
            aPts += 1;
            bPts += 1;
          }
          bSg += m.hScore - m.aScore;
          aSg += m.aScore - m.hScore;
          bGp += m.hScore;
          aGp += m.aScore;
        }
      });

      if (bPts !== aPts) return bPts - aPts; // Desempate por Pontos no Confronto
      if (bSg !== aSg) return bSg - aSg; // Desempate por SG no Confronto
      if (bGp !== aGp) return bGp - aGp; // Desempate por GP no Confronto

      // CRITÉRIO 2, 3 e 4: REGRAS GERAIS
      if (b.sg !== a.sg) return b.sg - a.sg;
      if (b.gp !== a.gp) return b.gp - a.gp;
      if (a.cv !== b.cv) return a.cv - b.cv;
      return a.ca - b.ca;
    });
};

const analyzeTiebreaker = (fluScore, bolScore, standings) => {
  if (fluScore === '' || bolScore === '') return null;
  const fluJ2 = parseInt(fluScore, 10);
  const bolJ2 = parseInt(bolScore, 10);
  const aggFlu = 0 + fluJ2;
  const aggBol = 2 + bolJ2;

  let ptsFluDireto = fluJ2 > bolJ2 ? 3 : fluJ2 === bolJ2 ? 1 : 0;
  let ptsBolDireto = 3 + (bolJ2 > fluJ2 ? 3 : bolJ2 === fluJ2 ? 1 : 0);

  if (ptsBolDireto > ptsFluDireto)
    return {
      status: 'bolivar',
      msg: 'Vantagem: Bolívar (Pontos no Confronto)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };

  const sgFluDireto = aggFlu - aggBol;
  if (sgFluDireto > 0)
    return {
      status: 'flu',
      msg: 'Vantagem: Fluminense (Saldo no Confronto)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (sgFluDireto < 0)
    return {
      status: 'bolivar',
      msg: 'Vantagem: Bolívar (Saldo no Confronto)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };

  const fluStats = standings.find((t) => t.name === 'Fluminense');
  const bolStats = standings.find((t) => t.name === 'Bolívar');

  if (fluStats.sg > bolStats.sg)
    return {
      status: 'flu',
      msg: 'Vantagem: Fluminense (Saldo de Gols Geral)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (bolStats.sg > fluStats.sg)
    return {
      status: 'bolivar',
      msg: 'Vantagem: Bolívar (Saldo de Gols Geral)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (fluStats.gp > bolStats.gp)
    return {
      status: 'flu',
      msg: 'Vantagem: Fluminense (Gols Pró Geral)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (bolStats.gp > fluStats.gp)
    return {
      status: 'bolivar',
      msg: 'Vantagem: Bolívar (Gols Pró Geral)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (fluStats.cv < bolStats.cv)
    return {
      status: 'flu',
      msg: 'Vantagem: Fluminense (Menos Cart. Vermelhos)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (bolStats.cv < fluStats.cv)
    return {
      status: 'bolivar',
      msg: 'Vantagem: Bolívar (Menos Cart. Vermelhos)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (fluStats.ca < bolStats.ca)
    return {
      status: 'flu',
      msg: 'Vantagem: Fluminense (Menos Cart. Amarelos)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };
  if (bolStats.ca < fluStats.ca)
    return {
      status: 'bolivar',
      msg: 'Vantagem: Bolívar (Menos Cart. Amarelos)',
      aggFlu,
      aggBol,
      fluJ2,
      bolJ2,
    };

  return {
    status: 'empate',
    msg: 'Empate Absoluto! Sorteio.',
    aggFlu,
    aggBol,
    fluJ2,
    bolJ2,
  };
};

// ==========================================
// 2. COMPONENTES VISUAIS
// ==========================================
const CardInput = ({ type, name, value, onChange }) => {
  const isYellow = type === 'ca';
  const colorFocus = isYellow
    ? 'focus:border-yellow-500 focus:ring-yellow-500/20'
    : 'focus:border-red-500 focus:ring-red-500/20';

  return (
    <div className="flex items-center gap-1 bg-black/30 px-1.5 py-1 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
      <span className="text-[10px] sm:text-xs drop-shadow-md opacity-90">
        {isYellow ? '🟨' : '🔴'}
      </span>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min="0"
        className={`w-6 h-6 sm:w-7 sm:h-7 text-center text-xs sm:text-sm font-bold text-white bg-transparent border border-transparent rounded-md outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${colorFocus}`}
        placeholder="0"
      />
    </div>
  );
};

const MatchCard = ({ match, data, onChange }) => (
  <div className="relative group flex flex-col p-3 sm:p-4 mb-3 sm:mb-4 bg-[#131826] border border-white/5 rounded-2xl hover:bg-[#1A2133] hover:border-white/10 transition-all duration-300 shadow-xl overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

    <div className="flex items-center justify-between z-10">
      <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
        <span className="font-bold text-zinc-300 uppercase tracking-tight sm:tracking-widest text-[11px] sm:text-sm text-right leading-tight">
          <span className="hidden sm:inline">{match.home}</span>
          <span className="sm:hidden">{TEAMS_INFO[match.home].short}</span>
        </span>
        <img
          src={TEAMS_INFO[match.home].logo}
          alt={match.home}
          className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-md"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4">
        <input
          type="number"
          name={`${match.id}_home`}
          value={data[`${match.id}_home`]}
          onChange={onChange}
          min="0"
          className="w-11 h-12 sm:w-14 sm:h-16 md:w-16 text-center text-xl sm:text-3xl font-black text-white bg-black/50 border border-zinc-700/50 rounded-xl outline-none focus:bg-[#0F172A] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
          placeholder="-"
        />
        <span className="text-zinc-600 font-black text-sm sm:text-lg">X</span>
        <input
          type="number"
          name={`${match.id}_away`}
          value={data[`${match.id}_away`]}
          onChange={onChange}
          min="0"
          className="w-11 h-12 sm:w-14 sm:h-16 md:w-16 text-center text-xl sm:text-3xl font-black text-white bg-black/50 border border-zinc-700/50 rounded-xl outline-none focus:bg-[#0F172A] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
          placeholder="-"
        />
      </div>

      <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3">
        <img
          src={TEAMS_INFO[match.away].logo}
          alt={match.away}
          className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-md"
        />
        <span className="font-bold text-zinc-300 uppercase tracking-tight sm:tracking-widest text-[11px] sm:text-sm text-left leading-tight">
          <span className="hidden sm:inline">{match.away}</span>
          <span className="sm:hidden">{TEAMS_INFO[match.away].short}</span>
        </span>
      </div>
    </div>

    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center z-10 px-1 sm:px-2">
      <div className="flex gap-1.5 sm:gap-2">
        <CardInput
          type="ca"
          name={`${match.id}_home_ca`}
          value={data[`${match.id}_home_ca`]}
          onChange={onChange}
        />
        <CardInput
          type="cv"
          name={`${match.id}_home_cv`}
          value={data[`${match.id}_home_cv`]}
          onChange={onChange}
        />
      </div>
      <span className="text-[8px] sm:text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
        Cartões
      </span>
      <div className="flex gap-1.5 sm:gap-2">
        <CardInput
          type="ca"
          name={`${match.id}_away_ca`}
          value={data[`${match.id}_away_ca`]}
          onChange={onChange}
        />
        <CardInput
          type="cv"
          name={`${match.id}_away_cv`}
          value={data[`${match.id}_away_cv`]}
          onChange={onChange}
        />
      </div>
    </div>
  </div>
);

const StandingsTable = ({ standings }) => (
  <div className="bg-[#131826] border border-white/5 rounded-3xl p-4 sm:p-6 shadow-2xl">
    <div className="flex items-center gap-3 mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
      <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#10B981] to-transparent rounded-full"></div>
      <div>
        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest">
          Classificação
        </h2>
        <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">
          Atualização Dinâmica
        </p>
      </div>
    </div>

    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      <table className="w-full text-sm text-center border-collapse min-w-[500px]">
        <thead>
          <tr className="bg-black/40 text-zinc-500 font-semibold uppercase tracking-widest text-[10px] sm:text-xs">
            <th className="py-3 sm:py-4 px-2 sm:px-3 w-10 sm:w-12 border-b border-white/5 sticky left-0 bg-[#131826]/95 backdrop-blur z-20">
              #
            </th>
            <th className="py-3 sm:py-4 px-3 text-left border-b border-white/5 sticky left-[40px] sm:left-[48px] bg-[#131826]/95 backdrop-blur z-20 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)]">
              Clube
            </th>
            <th className="py-3 sm:py-4 px-2 sm:px-3 border-b border-white/5 text-white">
              Pts
            </th>
            <th className="py-3 sm:py-4 px-2 sm:px-3 border-b border-white/5">J</th>
            <th className="py-3 sm:py-4 px-2 sm:px-3 border-b border-white/5">V</th>
            <th className="py-3 sm:py-4 px-2 sm:px-3 border-b border-white/5">E</th>
            <th className="py-3 sm:py-4 px-2 sm:px-3 border-b border-white/5">D</th>
            <th className="py-3 sm:py-4 px-2 sm:px-3 border-b border-white/5 text-zinc-300">
              SG
            </th>
            <th className="py-3 sm:py-4 px-2 border-b border-white/5">🔴</th>
            <th className="py-3 sm:py-4 px-2 border-b border-white/5">🟨</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {standings.map((team, index) => {
            const isQualified = index < 2;
            const isFlu = team.name === 'Fluminense';
            const teamInfo = TEAMS_INFO[team.name];

            return (
              <tr
                key={team.name}
                className={`transition-colors hover:bg-white/[0.02] ${isQualified ? 'bg-[#10B981]/[0.03]' : ''}`}
              >
                <td className="py-3 sm:py-4 px-2 sm:px-3 relative sticky left-0 bg-[#131826]/95 backdrop-blur z-10">
                  {isQualified && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  )}
                  <span
                    className={`font-bold text-xs sm:text-sm ${isQualified ? 'text-[#10B981]' : 'text-zinc-600'}`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td
                  className={`py-3 sm:py-4 px-3 text-left sticky left-[40px] sm:left-[48px] bg-[#131826]/95 backdrop-blur z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)] whitespace-nowrap`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={teamInfo.logo}
                      alt={team.name}
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                    <span
                      className={`font-black uppercase tracking-tight sm:tracking-wider text-[11px] sm:text-sm ${isFlu ? 'text-white' : 'text-zinc-400'}`}
                    >
                      <span className="hidden sm:inline">{team.name}</span>
                      <span className="sm:hidden">{teamInfo.short}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 sm:py-4 px-2 sm:px-3">
                  <span className="text-lg sm:text-xl font-black text-white">
                    {team.pts}
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-2 sm:px-3 text-zinc-500 font-medium text-xs sm:text-sm">
                  {team.j}
                </td>
                <td className="py-3 sm:py-4 px-2 sm:px-3 text-zinc-500 text-xs sm:text-sm">
                  {team.v}
                </td>
                <td className="py-3 sm:py-4 px-2 sm:px-3 text-zinc-500 text-xs sm:text-sm">
                  {team.e}
                </td>
                <td className="py-3 sm:py-4 px-2 sm:px-3 text-zinc-500 text-xs sm:text-sm">
                  {team.d}
                </td>
                <td className="py-3 sm:py-4 px-2 sm:px-3 font-bold text-zinc-300 text-xs sm:text-sm">
                  {team.sg}
                </td>
                <td className="py-3 sm:py-4 px-2">
                  <span className="text-[9px] sm:text-[10px] font-bold text-white bg-red-500/20 border border-red-500/30 px-1.5 sm:px-2 py-1 rounded">
                    {team.cv}
                  </span>
                </td>
                <td className="py-3 sm:py-4 px-2">
                  <span className="text-[9px] sm:text-[10px] font-bold text-white bg-yellow-500/20 border border-yellow-500/30 px-1.5 sm:px-2 py-1 rounded">
                    {team.ca}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const TiebreakerHUD = ({ tiebreaker }) => {
  const isDefault = !tiebreaker;

  const statusConfig = {
    bolivar: {
      border: 'border-sky-500/50',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      glow: 'shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    },
    flu: {
      border: 'border-[#10B981]/50',
      bg: 'bg-[#10B981]/10',
      text: 'text-[#10B981]',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    empate: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
  };

  const config = isDefault ? statusConfig['bolivar'] : statusConfig[tiebreaker.status];

  return (
    <div className="bg-[#131826] border border-white/5 rounded-3xl p-4 sm:p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
        <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#10B981] to-transparent rounded-full"></div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest">
            Desempate
          </h2>
          <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">
            Análise do Confronto
          </p>
        </div>
      </div>

      <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-white/5 mb-4 sm:mb-6 relative overflow-hidden">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 sm:w-32 h-24 sm:h-32 blur-[40px] rounded-full opacity-20 ${config.bg}`}
        ></div>
        <h3 className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-4 sm:mb-6 relative z-10">
          Placar Agregado
        </h3>

        <div className="flex items-center justify-between px-2 relative z-10">
          <div className="text-center flex flex-col items-center">
            <img
              src={TEAMS_INFO['Fluminense'].logo}
              alt="Flu"
              className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-80"
            />
            <div className="text-3xl sm:text-4xl font-black text-white mb-1 drop-shadow-lg">
              {isDefault ? 0 : tiebreaker.aggFlu}
            </div>
          </div>
          <div className="text-zinc-700 font-black text-lg sm:text-xl">X</div>
          <div className="text-center flex flex-col items-center">
            <img
              src={TEAMS_INFO['Bolívar'].logo}
              alt="Bol"
              className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-80"
            />
            <div className="text-3xl sm:text-4xl font-black text-white mb-1 drop-shadow-lg">
              {isDefault ? 2 : tiebreaker.aggBol}
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 relative z-10">
          <div className="flex justify-between items-center text-[10px] sm:text-xs bg-white/5 p-2 rounded-lg">
            <span className="text-zinc-500 font-medium">Jogo 1 (Ida)</span>
            <span className="font-bold text-zinc-300">BOL 2 x 0 FLU</span>
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-xs bg-white/5 p-2 rounded-lg">
            <span className="text-zinc-500 font-medium">Jogo 2 (Volta)</span>
            <span className="font-bold text-white">
              FLU {isDefault ? '-' : tiebreaker.fluJ2} x{' '}
              {isDefault ? '-' : tiebreaker.bolJ2} BOL
            </span>
          </div>
        </div>
      </div>

      <div
        className={`p-3 sm:p-4 rounded-2xl border ${config.border} ${config.bg} ${config.glow} flex flex-col items-center justify-center text-center transition-all duration-500 min-h-[70px] sm:min-h-[80px]`}
      >
        <span
          className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase mb-1 ${config.text} opacity-70`}
        >
          Cenário Atual
        </span>
        <strong className={`text-xs sm:text-sm font-bold ${config.text} leading-snug`}>
          {isDefault ? 'Bolívar lidera pelo Jogo 1' : tiebreaker.msg}
        </strong>
      </div>
    </div>
  );
};

// ==========================================
// 3. ESTRUTURA PRINCIPAL (3 COLUNAS)
// ==========================================
const Simulador = () => {
  const [data, setData] = useState({
    flu_bol_home: '',
    flu_bol_away: '',
    flu_bol_home_ca: '',
    flu_bol_home_cv: '',
    flu_bol_away_ca: '',
    flu_bol_away_cv: '',
    dlg_ind_home: '',
    dlg_ind_away: '',
    dlg_ind_home_ca: '',
    dlg_ind_home_cv: '',
    dlg_ind_away_ca: '',
    dlg_ind_away_cv: '',
    flu_dlg_home: '',
    flu_dlg_away: '',
    flu_dlg_home_ca: '',
    flu_dlg_home_cv: '',
    flu_dlg_away_ca: '',
    flu_dlg_away_cv: '',
    bol_ind_home: '',
    bol_ind_away: '',
    bol_ind_home_ca: '',
    bol_ind_home_cv: '',
    bol_ind_away_ca: '',
    bol_ind_away_cv: '',
  });

  const handleDataChange = (e) => {
    const { name, value } = e.target;
    if (value === '' || /^[0-9\b]+$/.test(value)) {
      setData((prev) => ({ ...prev, [name]: value.slice(0, 2) }));
    }
  };

  const standings = useMemo(() => generateStandings(data), [data]);
  const tiebreaker = useMemo(
    () => analyzeTiebreaker(data.flu_bol_home, data.flu_bol_away, standings),
    [data.flu_bol_home, data.flu_bol_away, standings],
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans text-zinc-200 pb-12 sm:pb-20 selection:bg-[#10B981] selection:text-white relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-[-20%] w-[80vw] h-[80vw] sm:w-[40vw] sm:h-[40vw] bg-rose-900/10 sm:bg-rose-900/20 rounded-full blur-[80px] sm:blur-[120px]"></div>
        <div className="absolute bottom-0 right-[-20%] w-[80vw] h-[80vw] sm:w-[40vw] sm:h-[40vw] bg-emerald-900/10 rounded-full blur-[80px] sm:blur-[120px]"></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-8 sm:pt-12 relative z-10">
        <header className="mb-8 sm:mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 sm:mb-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <img src={TEAMS_INFO['Fluminense'].logo} alt="Flu" className="w-4 h-4" />
            Libertadores 2026 • Grupo A
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 mb-1 sm:mb-2 leading-tight">
            SIMULADOR
          </h1>
        </header>

        {/* LAYOUT DE 3 COLUNAS */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Coluna 1: JOGOS (Rola livre) */}
          <div className="w-full lg:w-1/2 shrink-0">
            <div className="bg-[#131826] border border-white/5 rounded-3xl p-4 sm:p-6 shadow-2xl mb-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
                <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#10B981] to-transparent rounded-full"></div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest">
                    Jogos
                  </h2>
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">
                    Insira os resultados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <span className="rounded bg-zinc-800 text-white font-black text-[10px] flex items-center justify-center px-2 py-1">
                  RODADA 5
                </span>
              </div>
              <div className="space-y-3 sm:space-y-4 mb-6">
                {ROUND_5.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    data={data}
                    onChange={handleDataChange}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <span className="rounded bg-zinc-800 text-white font-black text-[10px] flex items-center justify-center px-2 py-1">
                  RODADA 6
                </span>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {ROUND_6.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    data={data}
                    onChange={handleDataChange}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 2: TABELA (Fixada) */}
          <div className="w-full flex-1 min-w-0 lg:sticky lg:top-6 space-y-6">
            <StandingsTable standings={standings} />
            <TiebreakerHUD tiebreaker={tiebreaker} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulador;
