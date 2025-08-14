import { useEffect, useReducer } from 'react';
import type { Choice, Prompt, Response } from '../modules/Api';
import type { BrandConfig } from '../modules/Config';
import {
  transformData,
  type PurchaseHistory,
} from '../modules/DataTransformSchema';
import Button from './Button';
import InputField from './InputField';
import type { Schema } from '../modules/Schema';
import LoadingAnimation from './LoadingAnimation';

// State type for the reducer
type HomeState = {
  initialFormValues: Record<string, string>;
  followUpFormValues: Record<string, string>;
  radioSelection: string | null;
  apiResponse: Response | null;
  apiError: string | null;
  isLoading: boolean;
};

// Action types
type HomeAction =
  | {
      type: 'UPDATE_INITIAL_FORM_VALUES';
      payload: { name: string; value: string };
    }
  | {
      type: 'UPDATE_FOLLOW_UP_FORM_VALUES';
      payload: { name: string; value: string };
    }
  | { type: 'SET_RADIO_SELECTION'; payload: string | null }
  | { type: 'SET_BUTTON_UPDATES_INITIAL'; payload: Record<string, string> }
  | { type: 'SET_BUTTON_UPDATES_FOLLOW_UP'; payload: Record<string, string> }
  | { type: 'SET_API_RESPONSE'; payload: Response }
  | { type: 'SET_API_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_FORM' }
  | { type: 'INITIALIZE_FOLLOW_UP_FORM'; payload: Record<string, string> };

// Initial state
const initialState: HomeState = {
  initialFormValues: {},
  followUpFormValues: {},
  radioSelection: null,
  apiResponse: null,
  apiError: null,
  isLoading: false,
};

// Reducer function
function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'UPDATE_INITIAL_FORM_VALUES':
      return {
        ...state,
        initialFormValues: {
          ...state.initialFormValues,
          [action.payload.name]: action.payload.value,
        },
      };

    case 'UPDATE_FOLLOW_UP_FORM_VALUES':
      return {
        ...state,
        followUpFormValues: {
          ...state.followUpFormValues,
          [action.payload.name]: action.payload.value,
        },
      };

    case 'SET_RADIO_SELECTION':
      return {
        ...state,
        radioSelection: action.payload,
      };

    case 'SET_BUTTON_UPDATES_INITIAL':
      return {
        ...state,
        initialFormValues: {
          ...state.initialFormValues,
          ...action.payload,
        },
      };

    case 'SET_BUTTON_UPDATES_FOLLOW_UP':
      return {
        ...state,
        followUpFormValues: {
          ...state.followUpFormValues,
          ...action.payload,
        },
      };

    case 'SET_API_RESPONSE':
      return {
        ...state,
        apiResponse: action.payload,
        apiError: null,
        radioSelection: null,
      };

    case 'SET_API_ERROR':
      return {
        ...state,
        apiError: action.payload,
        apiResponse: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        apiError: null,
      };

    case 'RESET_FORM':
      return {
        ...state,
        apiResponse: null,
        apiError: null,
        initialFormValues: {},
        followUpFormValues: {},
        radioSelection: null,
      };

    case 'INITIALIZE_FOLLOW_UP_FORM':
      return {
        ...state,
        followUpFormValues: action.payload,
      };

    default:
      return state;
  }
}

function reorderSchema(schema: BrandConfig['schema']): BrandConfig['schema'] {
  const buttons = schema.filter((field) => field.type === 'click');
  const nonButtons = schema.filter((field) => field.type !== 'click');

  return buttons.length === 1 ? [...nonButtons, ...buttons] : schema;
}

// Form component that renders input fields and submit button based on schema
function FormRenderer({
  schema,
  onSubmit,
  values,
  onChange,
  submitLabel,
  handleButtonClick,
  message,
  autoFocus,
}: {
  schema: BrandConfig['schema'];
  onSubmit: (e?: React.FormEvent) => void;
  values: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  submitLabel?: string;
  handleButtonClick: (fieldName: string) => void;
  message: string | null;
  autoFocus?: boolean;
}) {
  const orderedSchema = reorderSchema(schema);

  const isNeedSubmitButton = !schema.some((field) => field.type === 'click');

  const isSubmitButtonDisabled = !schema.every((field) => {
    if (['email', 'password', 'text'].includes(field.type)) {
      return !!values[field.name];
    }
    return true;
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {!!message && (
        <div className="home-error" style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}
      {orderedSchema.map((field, index) => {
        const disabled = field.dependsOnFields
          ?.split(',')
          .some((dependsOnField) => !values[dependsOnField]);

        if (['email', 'password', 'text'].includes(field.type)) {
          return (
            <InputField
              key={field.name}
              name={field.name}
              type={field.type}
              prompt={field.prompt}
              value={values[field.name] || ''}
              onChange={onChange}
              disabled={disabled}
              autoFocus={autoFocus && index === 0}
            />
          );
        }

        // Render submit button
        if (field.type === 'click') {
          return (
            <Button
              key={field.name}
              disabled={disabled}
              onClick={() => {
                handleButtonClick(field.name);
              }}
            >
              {submitLabel || field.prompt || 'Submit'}
            </Button>
          );
        }

        return null;
      })}
      {isNeedSubmitButton && (
        <Button onClick={() => onSubmit()} disabled={isSubmitButtonDisabled}>
          Submit
        </Button>
      )}
    </form>
  );
}

// ===== ERROR VIEW COMPONENT =====
function ErrorView({
  apiError,
  handleTryAgain,
}: {
  apiError: string;
  handleTryAgain: () => void;
}) {
  return (
    <>
      <h1 className="home-title">Error</h1>
      <p className="home-desc">
        Something went wrong while processing your request.
      </p>
      <div className="home-error">{apiError}</div>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={handleTryAgain}
      >
        Try Again
      </button>
    </>
  );
}

// ===== THANK YOU VIEW COMPONENT =====
function ThankYouView() {
  return (
    <>
      <p className="home-desc">
        Thank you! Your account has been successfully linked.
      </p>
    </>
  );
}

// ===== FOLLOW UP FORM VIEW COMPONENT =====
function FollowUpFormView({
  apiResponse,
  radioSelection,
  followUpFormValues,
  updateFollowUpFormValues,
  handleFormSubmission,
  handleButtonClick,
  handleRadioSelection,
  handleRadioAction,
  hasRadioButtonChoices,
  getRadioButton,
  getActionButton,
}: {
  apiResponse: Response;
  radioSelection: string | null;
  followUpFormValues: Record<string, string>;
  updateFollowUpFormValues: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFormSubmission: (
    schemaFields: BrandConfig['schema'],
    e?: React.FormEvent,
    isFollowUpForm?: boolean,
    choiceName?: string
  ) => void;
  handleButtonClick: (
    fieldName: string,
    isFollowUpForm?: boolean,
    choiceName?: string
  ) => void;
  handleRadioSelection: (choiceName: string) => void;
  handleRadioAction: () => void;
  hasRadioButtonChoices: (choices: Choice[]) => boolean;
  getRadioButton: (choice: Choice) => Prompt | null;
  getActionButton: (choice: Choice) => Prompt | null;
}) {
  const followUpChoices = apiResponse?.state?.prompt?.choices;
  if (!Array.isArray(followUpChoices)) return null;

  return (
    <>
      {/* Display state error if it exists */}
      {apiResponse?.state?.error && (
        <div className="home-error" style={{ marginBottom: '1rem' }}>
          {apiResponse.state.error}
        </div>
      )}

      {/* Radio button scenario */}
      {hasRadioButtonChoices(followUpChoices) ? (
        <>
          {apiResponse?.state?.prompt?.prompt && (
            <p className="home-desc">{apiResponse?.state?.prompt?.prompt}</p>
          )}
          <div className="flex flex-col gap-4 mt-6">
            {followUpChoices.map((choice: Choice) => {
              const radioButton = getRadioButton(choice);
              if (!radioButton) return null;
              return (
                <div key={choice.name} className="relative">
                  <label className="flex items-center p-2 px-4 bg-white border-2 border-black-200 rounded-xl cursor-pointer transition-all duration-300 ease-in-out font-medium text-gray-800 shadow-sm hover:border-black-600 hover:bg-gray-50 hover:shadow-md has-[input:checked]:border-black-600 has-[input:checked]:bg-black-50 has-[input:checked]:shadow-lg">
                    <input
                      type="radio"
                      name="radio-choice"
                      value={choice.name}
                      checked={radioSelection === choice.name}
                      onChange={() => {
                        handleRadioSelection(choice.name);
                      }}
                      className="w-5 h-5 mr-3 ml-0 cursor-pointer accent-black-600"
                    />
                    <span className="text-base font-medium text-gray-800">
                      {radioButton.prompt}
                    </span>
                  </label>
                </div>
              );
            })}
            {radioSelection && (
              <>
                {(() => {
                  const selectedChoice = followUpChoices.find(
                    (choice: Choice) => choice.name === radioSelection
                  );
                  const actionButton = selectedChoice
                    ? getActionButton(selectedChoice)
                    : null;
                  return actionButton ? (
                    <Button onClick={handleRadioAction}>
                      {actionButton.prompt}
                    </Button>
                  ) : null;
                })()}
              </>
            )}
            {!radioSelection && (
              <Button onClick={handleRadioAction} disabled>
                Submit
              </Button>
            )}
          </div>
        </>
      ) : (
        // Non-radio button multiple choices
        <>
          {apiResponse?.state?.prompt?.prompt && (
            <p className="home-desc mb-4">
              {apiResponse?.state?.prompt?.prompt}
            </p>
          )}
          <div className="home-follow-up-choices gap-4 flex flex-col">
            {followUpChoices.map((choice: Choice, index: number) => {
              if (choice.groups && choice.groups.length > 0) {
                return (
                  <FormRenderer
                    autoFocus={index === 0}
                    key={choice.name}
                    schema={choice.groups}
                    onSubmit={(e) =>
                      handleFormSubmission(choice.groups, e, true, choice.name)
                    }
                    values={followUpFormValues}
                    onChange={updateFollowUpFormValues}
                    handleButtonClick={(fieldName: string) =>
                      handleButtonClick(fieldName, true, choice.name)
                    }
                    message={choice.message}
                  />
                );
              }
              return null;
            })}
          </div>
        </>
      )}
    </>
  );
}

export function Form({
  config,
  onSuccessConnect,
}: {
  config: BrandConfig;
  onSuccessConnect: (data: PurchaseHistory[]) => void;
}) {
  // ===== STATE MANAGEMENT WITH REDUCER =====
  const [state, dispatch] = useReducer(homeReducer, initialState);
  const {
    initialFormValues,
    followUpFormValues,
    radioSelection,
    apiResponse,
    apiError,
    isLoading,
  } = state;

  const apiEndpoint = `/getgather/auth/${config.brand_id}`;

  // ===== FORM HANDLERS =====
  const updateInitialFormValues = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_INITIAL_FORM_VALUES',
      payload: { name: e.target.name, value: e.target.value },
    });
  };

  const updateFollowUpFormValues = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_FOLLOW_UP_FORM_VALUES',
      payload: { name: e.target.name, value: e.target.value },
    });
  };

  // ===== UTILITY FUNCTIONS =====
  const createButtonStateUpdates = (
    clickedButtonName: string,
    schemaFields: BrandConfig['schema'],
    apiResponseChoices?: Response['choices']
  ) => {
    // Handle multiple choices case (follow-up forms with choices)
    if (apiResponseChoices && Array.isArray(apiResponseChoices)) {
      const updates: Record<string, string> = {};

      // Find which choice contains the clicked button
      for (const choice of apiResponseChoices) {
        if (choice.groups && Array.isArray(choice.groups)) {
          const clickedPrompt = choice.groups.find(
            (prompt: Prompt) => prompt.name === clickedButtonName
          );

          if (clickedPrompt) {
            // Set ALL groups in this choice to "true"
            choice.groups.forEach((prompt: Prompt) => {
              if (prompt.type === 'click') {
                const names = prompt.name.split(',');
                names.forEach((name: string) => {
                  updates[name.trim()] = 'true';
                });
              }
            });
            break; // Found the choice, no need to check others
          }
        }
      }

      return updates;
    }

    // Handle simple schema case (initial forms or single follow-up)
    const buttonFields = schemaFields.filter((field) => field.type === 'click');

    const updates: Record<string, string> = {};

    buttonFields.forEach((field) => {
      if (field.name === clickedButtonName) {
        // Handle comma-separated field names
        const fieldNames = field.name.split(',');
        fieldNames.forEach((name: string) => {
          updates[name.trim()] = 'true';
        });
      }
    });

    return updates;
  };

  const findDefaultSubmitFieldName = (schemaFields: BrandConfig['schema']) => {
    const submitField = schemaFields.find((field) => field.type === 'click');
    if (submitField) return submitField.name;

    // If no submit field, create default name based on first input field
    const inputField = schemaFields.find((field) =>
      ['text', 'email', 'password'].includes(field.type)
    );
    return inputField ? `${inputField.name}_submit` : 'click';
  };

  // Add function to detect if we have radio button choices
  const hasRadioButtonChoices = (choices: Choice[]): boolean => {
    return choices.some((choice) =>
      choice.groups?.some(
        (prompt) =>
          prompt.name.endsWith('-radio-btn') ||
          prompt.name.endsWith('mfa_choice') ||
          prompt.type === 'selection'
      )
    );
  };

  // Add function to get the action button from a choice
  const getActionButton = (choice: Choice): Prompt | null => {
    const buttonFromChoice = choice.groups?.find(
      (prompt) =>
        prompt.type === 'click' &&
        (!prompt.name.endsWith('-radio-btn') ||
          !prompt.name.endsWith('mfa_choice'))
    );
    if (buttonFromChoice) {
      return buttonFromChoice;
    }
    return {
      name: 'submit',
      type: 'click',
      prompt: 'Submit',
      label: null,
      options: null,
    };
  };

  // Add function to get radio button from a choice
  const getRadioButton = (choice: Choice): Prompt | null => {
    return (
      choice.groups?.find(
        (prompt) =>
          prompt.name.endsWith('-radio-btn') ||
          prompt.name.endsWith('mfa_choice') ||
          prompt.type === 'selection'
      ) || null
    );
  };

  // ===== API INTERACTION =====
  const submitFormData = async (
    fieldName: string,
    isFollowUpForm = false,
    explicitButtonUpdates?: Record<string, string>,
    choiceName?: string
  ) => {
    // Clear previous errors and set loading
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'SET_LOADING', payload: true });

    let currentSchema = config.schema;
    if (isFollowUpForm) {
      if (apiResponse?.state?.prompt?.choices?.[0]?.groups) {
        currentSchema = apiResponse.state.prompt.choices[0].groups;
      }
      if (choiceName) {
        const choice = apiResponse?.state?.prompt?.choices?.find(
          (choice) => choice.name === choiceName
        );
        if (choice?.groups) {
          currentSchema = choice.groups;
        }
      }
    }

    const currentFormValues = isFollowUpForm
      ? followUpFormValues
      : initialFormValues;

    // Use explicit button updates if provided (for radio buttons), otherwise calculate
    let buttonUpdates: Record<string, string> = {};

    if (explicitButtonUpdates) {
      buttonUpdates = explicitButtonUpdates;
    } else if (
      isFollowUpForm &&
      apiResponse?.state?.prompt?.choices &&
      hasRadioButtonChoices(apiResponse.state.prompt.choices)
    ) {
      // For radio buttons, the updates are already applied to followUpFormValues
      // Don't recalculate to avoid losing the radio selection
    } else {
      // For non-radio scenarios, calculate button updates as before
      buttonUpdates = createButtonStateUpdates(
        fieldName,
        currentSchema,
        apiResponse?.choices
      );
    }

    // Update form values with button updates (only if not using explicit updates)
    if (!explicitButtonUpdates) {
      if (isFollowUpForm) {
        dispatch({
          type: 'SET_BUTTON_UPDATES_FOLLOW_UP',
          payload: buttonUpdates,
        });
      } else {
        dispatch({
          type: 'SET_BUTTON_UPDATES_INITIAL',
          payload: buttonUpdates,
        });
      }
    }

    // Prepare form data
    let formData: Record<string, string>;
    if (isFollowUpForm && apiResponse) {
      // Merge previous state with current form values and button updates
      formData = {
        ...(apiResponse.state?.inputs || {}),
        ...currentFormValues,
        ...buttonUpdates,
      };
    } else {
      formData = { ...currentFormValues, ...buttonUpdates };
    }

    // Prepare API request
    const requestBody: {
      state: {
        inputs: Record<string, string>;
        [key: string]: unknown;
      };
      profile_id?: string;
      platform?: string;
      framework?: string;
      browser?: string;
    } = {
      state: { inputs: formData },
    };

    if (isFollowUpForm && apiResponse?.profile_id) {
      requestBody.profile_id = apiResponse.profile_id;
      requestBody.state = {
        ...apiResponse.state,
        inputs: formData,
      };
    }

    const fetchWithRetry = async (retries = 3): Promise<unknown> => {
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          let responseData;
          try {
            responseData = await response.json();
          } catch (jsonErr) {
            // If JSON parsing fails, treat as error
            lastError = jsonErr;
            if (attempt === retries) throw jsonErr;
            continue;
          }

          if (!response.ok || response.status === 500 || responseData.error) {
            lastError =
              responseData.error ||
              `HTTP ${response.status}: ${response.statusText}`;
            if (attempt === retries) throw new Error(String(lastError));
            await new Promise((res) => setTimeout(res, 200));
            continue;
          }

          return responseData;
        } catch (err) {
          lastError = err;
          if (attempt === retries) throw err;
          await new Promise((res) => setTimeout(res, 200));
        }
      }
      throw lastError;
    };

    try {
      const responseData = (await fetchWithRetry(
        isFollowUpForm ? 1 : 3
      )) as Response;
      if (responseData.error) {
        dispatch({ type: 'SET_API_ERROR', payload: responseData.error });
      } else {
        // Debug: log the raw response coming back from GetGather so we can inspect what the
        // backend actually returned. This helps diagnose cases where we think we
        // sent products but the UI shows none.
        console.log('Gather API response:', responseData);
        dispatch({ type: 'SET_API_RESPONSE', payload: responseData });
      }
    } catch (error) {
      console.error('API error:', error);
      dispatch({
        type: 'SET_API_ERROR',
        payload:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // ===== EVENT HANDLERS =====
  const handleFormSubmission = (
    schemaFields: BrandConfig['schema'],
    e?: React.FormEvent,
    isFollowUpForm = false,
    choiceName?: string
  ) => {
    e?.preventDefault();
    const defaultFieldName = findDefaultSubmitFieldName(schemaFields);
    submitFormData(defaultFieldName, isFollowUpForm, undefined, choiceName);
  };

  const handleButtonClick = (
    fieldName: string,
    isFollowUpForm = false,
    choiceName?: string
  ) => {
    submitFormData(fieldName, isFollowUpForm, undefined, choiceName);
  };

  // Add radio button handler
  const handleRadioSelection = (choiceName: string) => {
    dispatch({ type: 'SET_RADIO_SELECTION', payload: choiceName });
  };

  // Add handler for radio button action
  const handleRadioAction = () => {
    if (!radioSelection || !apiResponse?.state?.prompt?.choices) return;

    const selectedChoice = apiResponse.state.prompt.choices.find(
      (choice: Choice) => choice.name === radioSelection
    );

    if (selectedChoice) {
      const actionButton = getActionButton(selectedChoice);
      const radioButton = getRadioButton(selectedChoice);

      if (actionButton && radioButton) {
        // Submit both the radio button selection and the action
        const buttonUpdates = {
          [radioButton.name]: 'true',
          [actionButton.name]: 'true',
        };

        submitFormData(actionButton.name, true, buttonUpdates);
      }
    }
  };

  const handleTryAgain = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  // ===== EFFECTS =====
  // Initialize follow-up form values when API response changes
  useEffect(() => {
    if (apiResponse?.state?.prompt?.choices) {
      const choices = apiResponse.state.prompt.choices;
      let allPrompts: BrandConfig['schema'] = [];

      // Collect all groups from all choices
      choices.forEach((choice: Choice) => {
        if (choice.groups && Array.isArray(choice.groups)) {
          allPrompts = allPrompts.concat(choice.groups);
        }
      });

      const initialValues = allPrompts.reduce(
        (acc: Record<string, string>, field: Schema) => {
          // Only initialize input fields, not buttons
          if (['email', 'password', 'text'].includes(field.type)) {
            acc[field.name] = '';
          }
          return acc;
        },
        {}
      );

      dispatch({ type: 'INITIALIZE_FOLLOW_UP_FORM', payload: initialValues });
    }
  }, [apiResponse]);

  // ===== RENDER CONDITIONS =====
  const shouldShowFollowUpForm =
    apiResponse &&
    apiResponse.state?.prompt &&
    Array.isArray(apiResponse.state.prompt.choices) &&
    apiResponse.state.prompt.choices.length > 0 &&
    apiResponse.status === 'NEED_INPUT';

  const shouldShowThankYouMessage =
    apiResponse &&
    apiResponse.status &&
    apiResponse.status !== 'NEED_INPUT' &&
    apiResponse.status !== 'FINISHED';

  const shouldShowExtractResult =
    apiResponse &&
    apiResponse.status === 'FINISHED' &&
    apiResponse.extract_result;

  const shouldShowError = apiError !== null;

  const shouldShowLoading = isLoading;

  useEffect(() => {
    if (shouldShowExtractResult) {
      // Debug: inspect the extract_result directly before any transformation.
      console.log(
        'Raw extract_result from Gather:',
        apiResponse.extract_result
      );
      const transformedData = transformData(
        apiResponse.extract_result,
        config.dataTransform
      );
      // Debug: inspect transformed purchase history that will be added to state.
      console.log('Transformed purchase history:', transformedData);
      onSuccessConnect(transformedData as unknown as PurchaseHistory[]);
    }
  }, [shouldShowExtractResult, apiResponse, config.dataTransform]);

  // ===== RENDER LOADING =====
  if (shouldShowLoading) {
    return <LoadingAnimation connectingTo={config.brand_name} />;
  }

  // ===== RENDER ERROR =====
  if (shouldShowError) {
    return <ErrorView apiError={apiError!} handleTryAgain={handleTryAgain} />;
  }

  // ===== RENDER FOLLOW-UP FORM =====
  if (shouldShowFollowUpForm) {
    return (
      <FollowUpFormView
        apiResponse={apiResponse!}
        radioSelection={radioSelection}
        followUpFormValues={followUpFormValues}
        updateFollowUpFormValues={updateFollowUpFormValues}
        handleFormSubmission={handleFormSubmission}
        handleButtonClick={handleButtonClick}
        handleRadioSelection={handleRadioSelection}
        handleRadioAction={handleRadioAction}
        hasRadioButtonChoices={hasRadioButtonChoices}
        getRadioButton={getRadioButton}
        getActionButton={getActionButton}
      />
    );
  }

  // ===== RENDER THANK YOU MESSAGE =====
  if (shouldShowThankYouMessage) {
    return <ThankYouView />;
  }

  // ===== RENDER EXTRACT RESULT =====
  if (shouldShowExtractResult) {
    return null;
  }

  // ===== RENDER INITIAL FORM =====
  return (
    <FormRenderer
      schema={config.schema}
      onSubmit={(e) => handleFormSubmission(config.schema, e)}
      values={initialFormValues}
      onChange={updateInitialFormValues}
      handleButtonClick={handleButtonClick}
      message={apiResponse?.state?.error || null}
    />
  );
}
