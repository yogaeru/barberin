const TIME_START = "10:30";
const TIME_END = "21:30";
const SLOT_MINUTES = 30;

const pad = (value) => String(value).padStart(2, "0");

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${pad(hours)}:${pad(remainder)}`;
};

export const getDailyTimeSlots = () => {
  const slots = [];
  const start = timeToMinutes(TIME_START);
  const end = timeToMinutes(TIME_END);

  for (let minute = start; minute <= end; minute += SLOT_MINUTES) {
    const startTime = minutesToTime(minute);
    const endTime = minutesToTime(minute + SLOT_MINUTES);
    slots.push({ startTime, endTime, label: startTime.replace(":", ".") });
  }

  return slots;
};

export const getSlotEndTime = (startTime) =>
  minutesToTime(timeToMinutes(startTime) + SLOT_MINUTES);

export const isValidScheduleTime = (time) =>
  getDailyTimeSlots().some((slot) => slot.startTime === time);
