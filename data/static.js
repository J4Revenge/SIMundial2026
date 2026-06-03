// Static tournament structure for the 2026 FIFA World Cup interactive bracket.
window.WC = (function () {
  const groupLetters = "ABCDEFGHIJKL".split("");

  // Default team ids per group (A1..A4 ... L1..L4). Names are editable.
  const teams = {};
  groupLetters.forEach(function (g) {
    teams[g] = [g + "1", g + "2", g + "3", g + "4"];
  });

  // Column order used by the 495-combination table (Annex C):
  // value[i] = group whose 3rd-placed team fills the slot hosted by columns below.
  const thirdCols = ["A", "B", "D", "E", "G", "I", "K", "L"];

  // pos: p=0 winner (1st), p=1 runner-up (2nd)
  // third: slot letter (one of thirdCols) + lbl = candidate groups shown on the card
  // win/lose: m = source match id
  const M = {
    73: { home: { t: "pos", g: "A", p: 1 }, away: { t: "pos", g: "B", p: 1 } },
    74: { home: { t: "pos", g: "E", p: 0 }, away: { t: "third", slot: "E", lbl: "A/B/C/D/F" } },
    75: { home: { t: "pos", g: "F", p: 0 }, away: { t: "pos", g: "C", p: 1 } },
    76: { home: { t: "pos", g: "C", p: 0 }, away: { t: "pos", g: "F", p: 1 } },
    77: { home: { t: "pos", g: "I", p: 0 }, away: { t: "third", slot: "I", lbl: "C/D/F/G/H" } },
    78: { home: { t: "pos", g: "E", p: 1 }, away: { t: "pos", g: "I", p: 1 } },
    79: { home: { t: "pos", g: "A", p: 0 }, away: { t: "third", slot: "A", lbl: "C/E/F/H/I" } },
    80: { home: { t: "pos", g: "L", p: 0 }, away: { t: "third", slot: "L", lbl: "E/H/I/J/K" } },
    81: { home: { t: "pos", g: "D", p: 0 }, away: { t: "third", slot: "D", lbl: "B/E/F/I/J" } },
    82: { home: { t: "pos", g: "G", p: 0 }, away: { t: "third", slot: "G", lbl: "A/E/H/I/J" } },
    83: { home: { t: "pos", g: "K", p: 1 }, away: { t: "pos", g: "L", p: 1 } },
    84: { home: { t: "pos", g: "H", p: 0 }, away: { t: "pos", g: "J", p: 1 } },
    85: { home: { t: "pos", g: "B", p: 0 }, away: { t: "third", slot: "B", lbl: "E/F/G/I/J" } },
    86: { home: { t: "pos", g: "J", p: 0 }, away: { t: "pos", g: "H", p: 1 } },
    87: { home: { t: "pos", g: "K", p: 0 }, away: { t: "third", slot: "K", lbl: "D/E/I/J/L" } },
    88: { home: { t: "pos", g: "D", p: 1 }, away: { t: "pos", g: "G", p: 1 } },
    // Round of 16
    89: { home: { t: "win", m: 74 }, away: { t: "win", m: 77 } },
    90: { home: { t: "win", m: 73 }, away: { t: "win", m: 75 } },
    93: { home: { t: "win", m: 83 }, away: { t: "win", m: 84 } },
    94: { home: { t: "win", m: 81 }, away: { t: "win", m: 82 } },
    91: { home: { t: "win", m: 76 }, away: { t: "win", m: 78 } },
    92: { home: { t: "win", m: 79 }, away: { t: "win", m: 80 } },
    95: { home: { t: "win", m: 86 }, away: { t: "win", m: 88 } },
    96: { home: { t: "win", m: 85 }, away: { t: "win", m: 87 } },
    // Quarter-finals
    97: { home: { t: "win", m: 89 }, away: { t: "win", m: 90 } },
    98: { home: { t: "win", m: 93 }, away: { t: "win", m: 94 } },
    99: { home: { t: "win", m: 91 }, away: { t: "win", m: 92 } },
    100: { home: { t: "win", m: 95 }, away: { t: "win", m: 96 } },
    // Semi-finals
    101: { home: { t: "win", m: 97 }, away: { t: "win", m: 98 } },
    102: { home: { t: "win", m: 99 }, away: { t: "win", m: 100 } },
    // Third place + Final
    103: { home: { t: "lose", m: 101 }, away: { t: "lose", m: 102 } },
    104: { home: { t: "win", m: 101 }, away: { t: "win", m: 102 } }
  };

  // Display order (top -> bottom) per round so the bracket connectors line up.
  const rounds = [
    { key: "r32", name: "Sedicesimi", ids: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87] },
    { key: "r16", name: "Ottavi", ids: [89, 90, 93, 94, 91, 92, 95, 96] },
    { key: "qf", name: "Quarti", ids: [97, 98, 99, 100] },
    { key: "sf", name: "Semifinali", ids: [101, 102] },
    { key: "f", name: "Finale", ids: [104] }
  ];

  return { groupLetters: groupLetters, teams: teams, thirdCols: thirdCols, M: M, rounds: rounds, thirdMatch: 103, teamNames: {
    A1: "Messico", A2: "Sudafrica", A3: "Corea del Sud", A4: "Rep. Ceca",
    B1: "Canada", B2: "Bosnia-Erzegovina", B3: "Qatar", B4: "Svizzera",
    C1: "Brasile", C2: "Marocco", C3: "Haiti", C4: "Scozia",
    D1: "Stati Uniti", D2: "Paraguay", D3: "Australia", D4: "Turchia",
    E1: "Germania", E2: "Costa d'Avorio", E3: "Ecuador", E4: "Curaçao",
    F1: "Olanda", F2: "Giappone", F3: "Svezia", F4: "Tunisia",
    G1: "Belgio", G2: "Egitto", G3: "Iran", G4: "Nuova Zelanda",
    H1: "Spagna", H2: "Capo Verde", H3: "Arabia Saudita", H4: "Uruguay",
    I1: "Francia", I2: "Senegal", I3: "Iraq", I4: "Norvegia",
    J1: "Argentina", J2: "Algeria", J3: "Austria", J4: "Giordania",
    K1: "Portogallo", K2: "RD Congo", K3: "Uzbekistan", K4: "Colombia",
    L1: "Inghilterra", L2: "Croazia", L3: "Ghana", L4: "Panama"
  } };
})();
