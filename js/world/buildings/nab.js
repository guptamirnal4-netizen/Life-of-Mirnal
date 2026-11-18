// probe
const L = Math.hypot(0.150, 0.9887); const EV = [0.150 / L, 0.9887 / L];
export default {
  id: 'nab',
  name: 'New Academic Block',
  category: 'academic',
  osm: ['New Academic Block', 'NAB'],
  floors: 2,
  enabled: true,
  research: 'mixed',
  rooms: globalThis.__nabRooms || {
    classroom: { host: 'New Academic Block', near: [-6, 150], y: -4.5 },
    classroomB: { host: 'NAB', near: [57, 229], y: -4.5 },
  },
  frame: () => ({ O: [-32.2, 37], ev: EV, eu: [EV[1], -EV[0]], angle: Math.atan2(EV[0], EV[1]) }),
  build(kit, ctx) {
    for (const r of ctx.rooms) {
      const c = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => kit.local(x, z).map((q) => +q.toFixed(2)));
      console.log('ROOM', r.id, JSON.stringify(c), 'door', r.door.side, r.door.at, 'exit', kit.local(r.exit.x, r.exit.z).map((q) => +q.toFixed(2)));
    }
  },
};
