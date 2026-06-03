// 2026 FIFA World Cup — complete group stage schedule (72 matches).
// Source: official calendar (kickoff times shown in Italian/CEST as published).
// Each entry: [group, matchday, homeId, awayId, dayOfJune, sortHour, timeLabel, stadium]
window.FIXTURES = (function () {
  var raw = [
    // GROUP A
    ["A",1,"A1","A2",11,21,"21:00","Mexico City"],
    ["A",1,"A3","A4",12,4,"04:00","Guadalajara"],
    ["A",2,"A4","A2",18,18,"18:00","Atlanta"],
    ["A",2,"A1","A3",19,3,"03:00","Guadalajara"],
    ["A",3,"A2","A3",25,3,"03:00","Monterrey"],
    ["A",3,"A4","A1",25,3,"03:00","Mexico City"],
    // GROUP B
    ["B",1,"B1","B2",12,21,"21:00","Toronto"],
    ["B",1,"B4","B3",13,21,"21:00","San Francisco"],
    ["B",2,"B4","B2",18,21,"21:00","Los Angeles"],
    ["B",2,"B1","B3",19,24,"24:00","Vancouver"],
    ["B",3,"B4","B1",24,21,"21:00","Vancouver"],
    ["B",3,"B2","B3",24,21,"21:00","Seattle"],
    // GROUP C
    ["C",1,"C3","C4",14,3,"03:00","Boston"],
    ["C",1,"C1","C2",14,24,"24:00","New York"],
    ["C",2,"C1","C3",20,3,"03:00","Philadelphia"],
    ["C",2,"C4","C2",20,24,"24:00","Boston"],
    ["C",3,"C2","C3",25,24,"24:00","Atlanta"],
    ["C",3,"C4","C1",25,24,"24:00","Miami"],
    // GROUP D
    ["D",1,"D1","D2",13,3,"03:00","Los Angeles"],
    ["D",1,"D3","D4",13,6,"06:00","Vancouver"],
    ["D",2,"D4","D2",19,6,"06:00","San Francisco"],
    ["D",2,"D1","D3",19,21,"21:00","Seattle"],
    ["D",3,"D4","D1",26,4,"04:00","Los Angeles"],
    ["D",3,"D2","D3",26,4,"04:00","San Francisco"],
    // GROUP E
    ["E",1,"E1","E4",14,19,"19:00","Houston"],
    ["E",1,"E2","E3",14,22,"22:00","Philadelphia"],
    ["E",2,"E1","E2",20,22,"22:00","Toronto"],
    ["E",2,"E3","E4",21,2,"02:00","Kansas City"],
    ["E",3,"E4","E2",25,22,"22:00","Philadelphia"],
    ["E",3,"E3","E1",25,22,"22:00","New York"],
    // GROUP F
    ["F",1,"F1","F2",14,22,"22:00","Dallas"],
    ["F",1,"F3","F4",15,4,"04:00","Monterrey"],
    ["F",2,"F4","F2",20,6,"06:00","Monterrey"],
    ["F",2,"F1","F3",20,19,"19:00","Houston"],
    ["F",3,"F4","F1",26,1,"01:00","Kansas City"],
    ["F",3,"F2","F3",26,1,"01:00","Dallas"],
    // GROUP G
    ["G",1,"G1","G2",15,21,"21:00","Seattle"],
    ["G",1,"G3","G4",16,3,"03:00","Los Angeles"],
    ["G",2,"G1","G3",21,21,"21:00","Los Angeles"],
    ["G",2,"G4","G2",22,3,"03:00","Vancouver"],
    ["G",3,"G4","G1",27,5,"05:00","Vancouver"],
    ["G",3,"G2","G3",27,5,"05:00","Seattle"],
    // GROUP H
    ["H",1,"H1","H2",15,18,"18:00","Atlanta"],
    ["H",1,"H3","H4",16,24,"24:00","Miami"],
    ["H",2,"H1","H3",21,18,"18:00","Atlanta"],
    ["H",2,"H4","H2",22,24,"24:00","Miami"],
    ["H",3,"H2","H3",27,2,"02:00","Houston"],
    ["H",3,"H4","H1",27,2,"02:00","Guadalajara"],
    // GROUP I
    ["I",1,"I1","I2",16,21,"21:00","New York"],
    ["I",1,"I3","I4",17,24,"24:00","Boston"],
    ["I",2,"I1","I3",22,23,"23:00","Philadelphia"],
    ["I",2,"I4","I2",23,2,"02:00","New York"],
    ["I",3,"I4","I1",26,21,"21:00","Boston"],
    ["I",3,"I2","I3",26,21,"21:00","Toronto"],
    // GROUP J
    ["J",1,"J3","J4",16,6,"06:00","San Francisco"],
    ["J",1,"J1","J2",17,3,"03:00","Kansas City"],
    ["J",2,"J1","J3",22,19,"19:00","Dallas"],
    ["J",2,"J4","J2",23,5,"05:00","San Francisco"],
    ["J",3,"J2","J3",28,4,"04:00","Kansas City"],
    ["J",3,"J4","J1",28,4,"04:00","Dallas"],
    // GROUP K
    ["K",1,"K1","K2",17,19,"19:00","Houston"],
    ["K",1,"K3","K4",18,4,"04:00","Mexico City"],
    ["K",2,"K1","K3",23,19,"19:00","Houston"],
    ["K",2,"K4","K2",24,4,"04:00","Guadalajara"],
    ["K",3,"K4","K1",28,1.5,"01:30","Miami"],
    ["K",3,"K2","K3",28,1.5,"01:30","Atlanta"],
    // GROUP L
    ["L",1,"L1","L2",17,22,"22:00","Dallas"],
    ["L",1,"L3","L4",18,1,"01:00","Toronto"],
    ["L",2,"L1","L3",23,22,"22:00","Boston"],
    ["L",2,"L4","L2",24,1,"01:00","Toronto"],
    ["L",3,"L4","L1",27,23,"23:00","New York"],
    ["L",3,"L2","L3",27,23,"23:00","Philadelphia"]
  ];
  // weekday for June 2026 (June 1 = Monday)
  var WD = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
  function wd(day) { return WD[((day - 1) % 7 + 7) % 7]; }
  var list = raw.map(function (r) {
    return {
      mid: r[2] + "_" + r[3],
      g: r[0], md: r[1], home: r[2], away: r[3],
      day: r[4], hour: r[5], time: r[6], stadium: r[7],
      sort: r[4] * 100 + r[5],
      dateLabel: wd(r[4]) + " " + r[4] + " Giu"
    };
  });
  list.sort(function (a, b) { return a.sort - b.sort; });
  return list;
})();
