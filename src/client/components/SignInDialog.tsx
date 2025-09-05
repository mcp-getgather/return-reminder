import { useEffect, useRef, useState } from 'react';
import type { BrandConfig } from '../modules/Config';
import {
  transformData,
  type PurchaseHistory,
} from '../modules/DataTransformSchema';

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConnect: (data: PurchaseHistory[]) => void;
  brandConfig: BrandConfig;
  linkId: string | null;
}

export function SignInDialog({
  isOpen,
  onClose,
  onSuccessConnect,
  brandConfig,
  linkId,
}: SignInDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();

      // Start polling for completion
      if (linkId && !isPolling) {
        setIsPolling(true);
        setPollingError(null);

        // Poll for authentication completion
        const pollForAuth = async () => {
          let attempts = 0;
          const maxAttempts = 120; // 2 minute max

          while (attempts < maxAttempts) {
            try {
              const response = await fetch('/internal/mcp/poll-auth', {
                method: 'POST',
                headers: {
                  accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  link_id: linkId,
                }),
              });

              if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data?.status === 'FINISHED') {
                  return true;
                }
              }
            } catch (error) {
              console.log('Polling attempt failed:', error);
            }

            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          throw new Error('Authentication timed out. Please try again.');
        };

        // Execute the polling and data retrieval flow
        pollForAuth()
          .then(() => {
            // Authentication complete, now retrieve the data
            return fetch('/internal/mcp/retrieve-data', {
              method: 'POST',
              headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                brand_id: brandConfig.brand_id,
              }),
            });
          })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((result) => {
            if (!result.success) {
              throw new Error(result.error || 'Failed to retrieve data');
            }
            
            // Transform the data on the client side
            const transformedData = transformData(
              result.data,
              brandConfig.dataTransform
            ) as PurchaseHistory[];

            onSuccessConnect(transformedData);
            onClose();
          })
          .catch((error) => {
            console.error('Authentication flow failed:', error);
            setPollingError(
              error.message || 'Authentication failed. Please try again.'
            );
            setIsPolling(false);
          });
      }
    } else {
      dialog.close();
      setIsPolling(false);
      setPollingError(null);
    }
  }, [isOpen, brandConfig, onSuccessConnect, onClose, isPolling, linkId]);

  return (
    <dialog
      onClose={onClose}
      ref={dialogRef}
      className="m-0 p-0 bg-transparent w-full h-full max-w-full max-h-full"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={onClose}
        style={{ zIndex: 0 }}
      >
        <div
          className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 1 }}
        >
          <div className="flex items-center justify-center mb-6">
            <img
              src={brandConfig.logo_url}
              alt={`${brandConfig.brand_name} logo`}
              className="h-8 w-auto"
            />
          </div>

          <h3 className="text-lg font-medium text-center leading-6 text-gray-900 mb-4">
            Authentication in Progress
          </h3>
          <div className="text-center">
            {pollingError ? (
              <>
                <p className="text-red-600 mb-4">{pollingError}</p>
                <button
                  onClick={() => {
                    // Clear error and close
                    setPollingError(null);
                    setIsPolling(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Please complete the authentication process in the opened tab
                  to connect your {brandConfig.brand_name} account.
                </p>
                <p className="text-sm text-gray-500">
                  This dialog will close automatically when authentication is
                  complete.
                </p>
                {isPolling && (
                  <div className="mt-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
