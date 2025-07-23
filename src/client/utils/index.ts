import type { PurchaseHistory } from '../modules/DataTransformSchema';

export const getDaysLeft = (returnDate: Date): number => {
  return Math.ceil(
    (returnDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
};

export const downloadReturnRemindersCalendar = (
  reminders: { brand: string; name: string; date?: Date }[]
) => {
  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const now = new Date();

  const events = reminders
    .map((item, index) => {
      const start = item.date ? new Date(item.date) : new Date();
      const end = item.date
        ? new Date(item.date.getTime() + 30 * 60 * 1000)
        : new Date(start.getTime() + 30 * 60 * 1000); // 30-minute reminder

      return `
  BEGIN:VEVENT
  UID:${Date.now()}-${index}@returnreminder.com
  DTSTAMP:${formatDate(now)}
  DTSTART:${formatDate(start)}
  DTEND:${formatDate(end)}
  SUMMARY:(${item.brand}) ${item.name} reaching return window
  DESCRIPTION:(${item.brand}) ${item.name} reaching return window
  END:VEVENT`;
    })
    .join('\n');

  const icsContent = `
  BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//returnreminder.com//Return Reminder//EN
  ${events}
  END:VCALENDAR
      `.trim();

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'return-reminders.ics';
  link.click();

  URL.revokeObjectURL(url);
};
export const getEarliestReturnDate = (returnDates: Date[]): Date | null => {
  const dates = returnDates.filter((date): date is Date => date !== null);

  return dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : null;
};

export const filterUniqueOrders = (
  orders: PurchaseHistory[]
): PurchaseHistory[] => {
  const seen = new Set<string>();
  return orders.filter((order) => {
    const key = `${order.brand}__${order.order_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
