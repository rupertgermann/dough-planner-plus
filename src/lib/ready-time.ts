import { addHours, format } from "date-fns";

export function defaultReadyTime() {
  const ready = addHours(new Date(), 6);
  return { date: format(ready, "yyyy-MM-dd"), time: format(ready, "HH:mm") };
}
