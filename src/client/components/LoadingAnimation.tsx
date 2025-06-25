import { useEffect, useState } from 'react';

export default function LoadingAnimation({
  connectingTo,
}: {
  connectingTo?: string;
}) {
  const [statusText, setStatusText] = useState(
    `Connecting to ${connectingTo}...`
  );

  useEffect(() => {
    const statuses = [
      'Setting up a secure connection…',
      'Looking up your account…',
      "Confirming it's really you…",
      'Getting your account ready…',
      'Pulling up your order history…',
      'Almost ready…',
    ];

    let currentStep = 0;

    const updateStatus = () => {
      if (currentStep < statuses.length) {
        setStatusText(statuses[currentStep]);
        currentStep++;
        setTimeout(updateStatus, 3000 + Math.random() * 2000); // Random delay between 3-5 seconds
      }
    };

    // Start status updates after a brief delay
    setTimeout(updateStatus, 800);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin"
        style={{
          animation:
            'spin 1.2s infinite cubic-bezier(0.785, 0.135, 0.15, 0.86)',
        }}
      />
      <p>{statusText}</p>
    </div>
  );
}
