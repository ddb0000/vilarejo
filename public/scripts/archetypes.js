export const ARCHETYPES = {
  worker: {
    label: "Worker",
    routines: {
      dawn: { targetTag: "home", phase: "wake" },
      morning: { targetTag: "field", phase: "work" },
      lunch: { targetTag: "cafe", phase: "socialize" },
      evening: { targetTag: "home", phase: "rest" },
      night: { targetTag: "home", phase: "rest" }
    },
    personality: { work: 1.2, talk: 0.9, rest: 1 },
    choreChains: {
      morning: ["field", "cafe", "home"],
      evening: ["home"]
    }
  },
  farmer: {
    label: "Farmer",
    routines: {
      dawn: { targetTag: "field", phase: "work" },
      morning: { targetTag: "field", phase: "work" },
      lunch: { targetTag: "cafe", phase: "socialize" },
      evening: { targetTag: "home", phase: "rest" },
      night: { targetTag: "home", phase: "rest" }
    },
    personality: { work: 1.3, eat: 1, rest: 0.9 },
    choreChains: {
      dawn: ["field", "field", "cafe"],
      evening: ["home"]
    }
  },
  wanderer: {
    label: "Wanderer",
    routines: {
      dawn: { targetTag: "cafe", phase: "socialize" },
      morning: { targetTag: "field", phase: "wander" },
      lunch: { targetTag: "cafe", phase: "socialize" },
      evening: { targetTag: "home", phase: "rest" },
      night: { targetTag: "home", phase: "rest" }
    },
    personality: { move: 1.2, talk: 1.1, work: 0.7 },
    choreChains: {
      morning: ["cafe", "field", "field"],
      evening: ["home", "cafe"]
    }
  },
  vendor: {
    label: "Vendor",
    routines: {
      dawn: { targetTag: "home", phase: "wake" },
      morning: { targetTag: "cafe", phase: "work" },
      lunch: { targetTag: "cafe", phase: "work" },
      evening: { targetTag: "home", phase: "rest" },
      night: { targetTag: "home", phase: "rest" }
    },
    personality: { talk: 1.2, work: 1, move: 0.9 },
    choreChains: {
      morning: ["cafe", "cafe", "home"],
      lunch: ["cafe", "field"],
      evening: ["home"]
    }
  }
};

export function resolveArchetype(id = "worker") {
  return ARCHETYPES[id] ?? ARCHETYPES.worker;
}
