const DEFAULT_SLOTS = [
  { id: "dawn", duration: 120000 },
  { id: "morning", duration: 180000 },
  { id: "lunch", duration: 90000 },
  { id: "evening", duration: 150000 },
  { id: "night", duration: 120000 }
];

export class DayScheduler {
  constructor(slots = DEFAULT_SLOTS) {
    this.slots = slots;
    this.dayLength = slots.reduce((sum, slot) => sum + slot.duration, 0);
    this.elapsed = 0;
    this.day = 0;
    this.currentSlotIndex = 0;
    this.slotElapsed = 0;
    this.listeners = new Set();
  }

  tick(deltaMs) {
    this.elapsed += deltaMs;
    this.slotElapsed += deltaMs;
    let wrapped = false;
    while (this.slotElapsed >= this.slots[this.currentSlotIndex].duration) {
      this.slotElapsed -= this.slots[this.currentSlotIndex].duration;
      this.currentSlotIndex = (this.currentSlotIndex + 1) % this.slots.length;
      if (this.currentSlotIndex === 0) {
        this.day += 1;
        wrapped = true;
        this.emit("dawn");
        this.emit("day", this.day);
      }
      this.emit("slot", this.currentSlot());
    }
    return wrapped;
  }

  currentSlot() {
    return this.slots[this.currentSlotIndex];
  }

  on(event, handler) {
    this.listeners.add({ event, handler });
  }

  emit(event, payload) {
    this.listeners.forEach((listener) => {
      if (listener.event === event) listener.handler(payload);
    });
  }

  reset() {
    this.elapsed = 0;
    this.day = 0;
    this.currentSlotIndex = 0;
    this.slotElapsed = 0;
  }

  get timeRatio() {
    return (this.elapsed % this.dayLength) / this.dayLength;
  }
}
