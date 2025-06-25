import googleCalendarIcon from '../assets/google-calendar.svg';
import appleIcon from '../assets/apple.svg';
import outlookIcon from '../assets/outlook.svg';
import icsIcon from '../assets/ics.svg';

interface AddToCalendarProps {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timeZone?: string;
}

export function AddToCalendar({
  name,
  description,
  startDate,
  endDate,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: AddToCalendarProps) {
  const formatDateForGoogle = (date: string) => {
    return (
      new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    );
  };
  const formatDateForApple = (date: string) => {
    return (
      new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    );
  };
  const formatDateForOutlook = (date: string) => {
    return (
      new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    );
  };

  const generateGoogleCalendarUrl = () => {
    const start = formatDateForGoogle(startDate);
    const end = formatDateForGoogle(endDate);
    const encodedName = encodeURIComponent(name);
    const encodedDescription = encodeURIComponent(description);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedName}&details=${encodedDescription}&dates=${start}/${end}&ctz=${encodeURIComponent(timeZone)}`;
  };
  const generateAppleCalendarUrl = () => {
    const start = formatDateForApple(startDate);
    const end = formatDateForApple(endDate);
    const encodedName = encodeURIComponent(name);
    const encodedDescription = encodeURIComponent(description);
    return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:${encodeURIComponent(window.location.href)}%0ADTSTART:${start}%0ADTEND:${end}%0ASUMMARY:${encodedName}%0ADESCRIPTION:${encodedDescription}%0AEND:VEVENT%0AEND:VCALENDAR`;
  };
  const generateOutlookCalendarUrl = () => {
    const start = formatDateForOutlook(startDate);
    const end = formatDateForOutlook(endDate);
    const encodedName = encodeURIComponent(name);
    const encodedDescription = encodeURIComponent(description);
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedName}&body=${encodedDescription}&startdt=${start}&enddt=${end}`;
  };
  const downloadICSFile = () => {
    const formatDate = (date: string) =>
      new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const now = new Date();
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    const icsContent = `
BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//returnreminder.com//Return Reminder//EN\nBEGIN:VEVENT\nUID:${Date.now()}@returnreminder.com\nDTSTAMP:${formatDate(now.toISOString())}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${name}\nDESCRIPTION:${description}\nEND:VEVENT\nEND:VCALENDAR\n    `.trim();
    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'event.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  const calendarOptions = [
    {
      name: 'Google',
      icon: <img src={googleCalendarIcon} className="w-5 h-5" />,
      action: () => window.open(generateGoogleCalendarUrl(), '_blank'),
    },
    {
      name: 'Apple',
      icon: <img src={appleIcon} className="w-5 h-5" />,
      action: () => window.open(generateAppleCalendarUrl(), '_blank'),
    },
    {
      name: 'Outlook',
      icon: <img src={outlookIcon} className="w-5 h-5" />,
      action: () => window.open(generateOutlookCalendarUrl(), '_blank'),
    },
    {
      name: 'ICS',
      icon: <img src={icsIcon} className="w-6 h-6" />,
      action: downloadICSFile,
    },
  ];

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-sm text-gray-700 font-medium">
        Add to Calendar:
      </span>
      {calendarOptions.map((option) => (
        <button
          key={option.name}
          onClick={option.action}
          className="cursor-pointer flex items-center justify-center p-2  text-white rounded-full hover:bg-gray-200 transition-colors"
          type="button"
          title={option.name}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
