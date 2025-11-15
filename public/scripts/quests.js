export const QUESTS = [
  {
    id: "field_aid",
    label: "Field Aid",
    archetypes: ["farmer", "worker"],
    steps: [
      {
        id: "noticeFatigue",
        trigger: { need: "rest", gt: 0.6 },
        memory: "worries about field fatigue"
      },
      {
        id: "organizeLunch",
        trigger: { eventText: "market chatter" },
        memory: "organizes a lunch break for workers"
      },
      {
        id: "thankful",
        trigger: { eventText: "rumor" },
        memory: "thanks neighbors for the help",
        complete: true
      }
    ]
  },
  {
    id: "vendor_gossip",
    label: "Vendor Gossip",
    archetypes: ["vendor", "wanderer"],
    steps: [
      {
        id: "hearRumor",
        trigger: { eventText: "rumor" },
        memory: "hears the latest town rumor"
      },
      {
        id: "shareCafe",
        trigger: { location: "cafe" },
        memory: "shares rumor with cafe patrons"
      },
      {
        id: "reflect",
        trigger: { need: "social", gt: 0.5 },
        memory: "reflects on town chatter",
        complete: true
      }
    ]
  }
];
