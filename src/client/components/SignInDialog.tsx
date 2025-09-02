import { useEffect, useRef } from 'react';
import type { BrandConfig } from '../modules/Config';
import type { PurchaseHistory } from '../modules/DataTransformSchema';
import { Form } from './Form';

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConnect: (data: PurchaseHistory[]) => void;
  brandConfig: BrandConfig;
  mode?: 'form' | 'hosted-link';
}

export function SignInDialog({
  isOpen,
  onClose,
  onSuccessConnect,
  brandConfig,
  mode = 'form',
}: SignInDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

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

          {mode === 'hosted-link' ? (
            <>
              <h3 className="text-lg font-medium text-center leading-6 text-gray-900 mb-4">
                Authentication in Progress
              </h3>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Please complete the authentication process in the opened tab to connect your {brandConfig.brand_name} account.
                </p>
                <p className="text-sm text-gray-500">
                  This dialog will close automatically when authentication is complete.
                </p>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-center leading-6 text-gray-900 mb-4">
                Sign in to {brandConfig.brand_name}
              </h3>
              <Form config={brandConfig} onSuccessConnect={onSuccessConnect} />
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
