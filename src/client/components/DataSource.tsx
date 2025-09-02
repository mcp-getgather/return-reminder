import { useState } from 'react';
import { SignInDialog } from './SignInDialog';
import type { BrandConfig } from '../modules/Config';
import type { PurchaseHistory } from '../modules/DataTransformSchema';

interface DataSourceProps {
  onSuccessConnect: (data: PurchaseHistory[]) => void;
  disabled?: boolean;
  brandConfig: BrandConfig;
  isConnected?: boolean;
}

interface AppConfig {
  useHostedLink: boolean;
}

export function DataSource({
  onSuccessConnect,
  disabled,
  brandConfig,
  isConnected,
}: DataSourceProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'form' | 'hosted-link'>('form');

  const handleConnect = async () => {
    // Fetch config when button is clicked
    try {
      const configResponse = await fetch('/internal/config');
      const appConfig: AppConfig = await configResponse.json();

      if (appConfig.useHostedLink) {
        try {
          const response = await fetch('/internal/hosted-link/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brand_id: brandConfig.brand_id,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create hosted link');
          }

          const data = await response.json();
          console.log('Hosted link created:', data);

          localStorage.setItem('hosted_link_id', data.link_id);
          localStorage.setItem('hosted_link_brand', brandConfig.brand_name);

          window.open(data.hosted_link_url, '_blank');

          setDialogMode('hosted-link');
          setIsDialogOpen(true);
        } catch (error) {
          console.error('Error creating hosted link:', error);
          setDialogMode('form');
          setIsDialogOpen(true);
        }
      } else {
        setDialogMode('form');
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setDialogMode('form');
      setIsDialogOpen(true);
    }
  };

  const handleSuccessConnect = (data: PurchaseHistory[]) => {
    setIsDialogOpen(false);
    onSuccessConnect(data);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <img
                src={brandConfig.logo_url}
                alt={`${brandConfig.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-medium">{brandConfig.brand_name}</h3>
              {brandConfig.is_mandatory && (
                <span className="text-xs text-gray-500">Required</span>
              )}
            </div>
          </div>
          {isConnected ? (
            <div className="px-4 py-2 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4 text-green-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>

              <span className="text-green-700 text-sm font-medium">
                Connected
              </span>
            </div>
          ) : (
            <button
              disabled={disabled}
              onClick={handleConnect}
              className={`px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors ${
                disabled || isConnected ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <SignInDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccessConnect={handleSuccessConnect}
        brandConfig={brandConfig}
        mode={dialogMode}
      />
    </>
  );
}
