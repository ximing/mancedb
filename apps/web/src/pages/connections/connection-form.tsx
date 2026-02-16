import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { view, useService } from '@rabjs/react';
import { ConnectionService } from '../../services/connection.service';
import { isElectron } from '../../utils/environment';
import type { CreateConnectionDto, UpdateConnectionDto } from '@mancedb/dto';

// Icons as simple SVG components
const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.574-2.887m2.197-2.197A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-2.033 3.533M9 9l3 3m-3 3l6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const FolderOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

// Form field component
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
}

const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
  helpText,
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-dark-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white outline-none transition-all placeholder-gray-400 dark:placeholder-dark-500 ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900'
              : 'border-gray-300 dark:border-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-dark-500">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

// Type selector component
interface TypeSelectorProps {
  value: 'local' | 's3';
  onChange: (value: 'local' | 's3') => void;
}

const TypeSelector = ({ value, onChange }: TypeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onChange('local')}
        className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
          value === 'local'
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
        }`}
      >
        <div className={`p-3 rounded-lg ${value === 'local' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-400'}`}>
          <FolderIcon />
        </div>
        <div className="text-center">
          <div className={`font-medium ${value === 'local' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
            Local
          </div>
          <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">
            Local file system
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('s3')}
        className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
          value === 's3'
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
        }`}
      >
        <div className={`p-3 rounded-lg ${value === 's3' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-400'}`}>
          <CloudIcon />
        </div>
        <div className="text-center">
          <div className={`font-medium ${value === 's3' ? 'text-purple-700 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
            S3 Storage
          </div>
          <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">
            Amazon S3 compatible
          </div>
        </div>
      </button>
    </div>
  );
};

// Test result component
interface TestResultProps {
  result: { success: boolean; message: string } | null;
}

const TestResult = ({ result }: TestResultProps) => {
  if (!result) return null;

  return (
    <div className={`p-4 rounded-lg flex items-start gap-3 ${
      result.success
        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    }`}>
      <div className={`mt-0.5 ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {result.success ? <CheckIcon /> : <XIcon />}
      </div>
      <div className="flex-1">
        <div className={`font-medium ${result.success ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
          {result.success ? 'Connection successful' : 'Connection failed'}
        </div>
        <div className={`text-sm mt-1 ${result.success ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>
          {result.message}
        </div>
      </div>
    </div>
  );
};

// Main Connection Form Page
export const ConnectionFormPage = view(() => {
  const connectionService = useService(ConnectionService);
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  // Form state
  const [formData, setFormData] = useState<CreateConnectionDto>({
    name: '',
    type: 'local',
    localPath: '',
    s3Bucket: '',
    s3Region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    s3Endpoint: '',
    dbUsername: '',
    dbPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  // Load connection data in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadConnection = async () => {
        setIsLoading(true);
        const connection = await connectionService.loadConnection(id);
        if (connection) {
          setFormData({
            name: connection.name,
            type: connection.type,
            localPath: connection.localPath || '',
            s3Bucket: connection.s3Bucket || '',
            s3Region: connection.s3Region || '',
            s3Endpoint: connection.s3Endpoint || '',
            dbUsername: connection.dbUsername || '',
            // Password is not returned from API, leave empty for edit
            dbPassword: '',
            s3AccessKey: '',
            s3SecretKey: '',
          });
        }
        setIsLoading(false);
      };
      loadConnection();
    }
  }, [isEditMode, id]);

  // Update form field
  const updateField = (field: keyof CreateConnectionDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear test result when form changes
    if (testResult) {
      setTestResult(null);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Connection name is required';
    }

    if (formData.type === 'local') {
      if (!formData.localPath?.trim()) {
        newErrors.localPath = 'Local path is required';
      }
    } else {
      if (!formData.s3Bucket?.trim()) {
        newErrors.s3Bucket = 'S3 bucket is required';
      }
      if (!formData.s3Region?.trim()) {
        newErrors.s3Region = 'S3 region is required';
      }
      // Only require access key/secret on create, not on edit
      if (!isEditMode) {
        if (!formData.s3AccessKey?.trim()) {
          newErrors.s3AccessKey = 'Access key is required';
        }
        if (!formData.s3SecretKey?.trim()) {
          newErrors.s3SecretKey = 'Secret key is required';
        }
      }
    }

    // Password is required on create, optional on edit
    if (!isEditMode && !formData.dbPassword?.trim()) {
      newErrors.dbPassword = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // First create/update the connection temporarily to test
      let connectionId = id;

      if (!isEditMode) {
        // Create temporary connection for testing
        const result = await connectionService.createConnection(formData);
        if (result) {
          connectionId = result.id;
        }
      }

      if (connectionId) {
        const result = await connectionService.testConnection(connectionId);
        setTestResult(result);

        // If we created a temp connection and test failed, clean it up
        if (!isEditMode && !result.success) {
          await connectionService.deleteConnection(connectionId);
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let success: boolean;

      if (isEditMode && id) {
        // Filter out empty values for update
        const updateData: UpdateConnectionDto = {};
        if (formData.name) updateData.name = formData.name;
        if (formData.type) updateData.type = formData.type;
        if (formData.localPath) updateData.localPath = formData.localPath;
        if (formData.s3Bucket) updateData.s3Bucket = formData.s3Bucket;
        if (formData.s3Region) updateData.s3Region = formData.s3Region;
        if (formData.s3Endpoint) updateData.s3Endpoint = formData.s3Endpoint;
        if (formData.dbUsername) updateData.dbUsername = formData.dbUsername;
        if (formData.dbPassword) updateData.dbPassword = formData.dbPassword;
        if (formData.s3AccessKey) updateData.s3AccessKey = formData.s3AccessKey;
        if (formData.s3SecretKey) updateData.s3SecretKey = formData.s3SecretKey;

        const result = await connectionService.updateConnection(id, updateData);
        success = !!result;
      } else {
        const result = await connectionService.createConnection(formData);
        success = !!result;
      }

      if (success) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <DatabaseIcon />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Connection' : 'New Connection'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-dark-400">
                  {isEditMode ? 'Update your LanceDB connection' : 'Create a new LanceDB connection'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Connection Type */}
          <section className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connection Type
            </h2>
            <TypeSelector
              value={formData.type}
              onChange={(type) => updateField('type', type)}
            />
          </section>

          {/* Basic Information */}
          <section className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <FormField
                label="Connection Name"
                name="name"
                value={formData.name}
                onChange={(value) => updateField('name', value)}
                placeholder="My LanceDB Connection"
                required
                error={errors.name}
              />

              {formData.type === 'local' ? (
                <div className="space-y-1.5">
                  <label htmlFor="localPath" className="block text-sm font-medium text-gray-700 dark:text-dark-300">
                    Local Path
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="localPath"
                      name="localPath"
                      type="text"
                      value={formData.localPath || ''}
                      onChange={(e) => updateField('localPath', e.target.value)}
                      placeholder="/path/to/lancedb"
                      className={`flex-1 px-4 py-2.5 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white outline-none transition-all placeholder-gray-400 dark:placeholder-dark-500 ${
                        errors.localPath
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900'
                          : 'border-gray-300 dark:border-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      }`}
                    />
                    {isElectron() && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const path = await window.electronAPI?.openDirectory();
                            if (path) {
                              updateField('localPath', path);
                            }
                          } catch (err) {
                            console.error('Failed to open directory dialog:', err);
                          }
                        }}
                        className="px-4 py-2.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                        title="Browse for database folder"
                      >
                        <FolderOpenIcon />
                        Browse
                      </button>
                    )}
                  </div>
                  {errors.localPath ? (
                    <p className="text-xs text-red-500">{errors.localPath}</p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-dark-500">
                      {isElectron() ? 'Select a local LanceDB database folder' : 'Absolute path to the LanceDB directory on the server'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <FormField
                    label="S3 Bucket"
                    name="s3Bucket"
                    value={formData.s3Bucket || ''}
                    onChange={(value) => updateField('s3Bucket', value)}
                    placeholder="my-bucket"
                    required
                    error={errors.s3Bucket}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Region"
                      name="s3Region"
                      value={formData.s3Region || ''}
                      onChange={(value) => updateField('s3Region', value)}
                      placeholder="us-east-1"
                      required
                      error={errors.s3Region}
                    />
                    <FormField
                      label="Endpoint (Optional)"
                      name="s3Endpoint"
                      value={formData.s3Endpoint || ''}
                      onChange={(value) => updateField('s3Endpoint', value)}
                      placeholder="https://s3.amazonaws.com"
                      helpText="Custom S3 endpoint"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Access Key"
                      name="s3AccessKey"
                      type="password"
                      value={formData.s3AccessKey || ''}
                      onChange={(value) => updateField('s3AccessKey', value)}
                      placeholder="AKIA..."
                      required={!isEditMode}
                      error={errors.s3AccessKey}
                      helpText={isEditMode ? 'Leave blank to keep existing' : undefined}
                    />
                    <FormField
                      label="Secret Key"
                      name="s3SecretKey"
                      type="password"
                      value={formData.s3SecretKey || ''}
                      onChange={(value) => updateField('s3SecretKey', value)}
                      placeholder="••••••••"
                      required={!isEditMode}
                      error={errors.s3SecretKey}
                      helpText={isEditMode ? 'Leave blank to keep existing' : undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Authentication */}
          <section className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Authentication
            </h2>
            <div className="space-y-4">
              <FormField
                label="Username"
                name="dbUsername"
                value={formData.dbUsername || ''}
                onChange={(value) => updateField('dbUsername', value)}
                placeholder="admin"
                helpText="Optional username for database access"
              />
              <FormField
                label="Password"
                name="dbPassword"
                type="password"
                value={formData.dbPassword || ''}
                onChange={(value) => updateField('dbPassword', value)}
                placeholder="••••••••"
                required={!isEditMode}
                error={errors.dbPassword}
                helpText={isEditMode ? 'Leave blank to keep existing password' : 'Password for database authentication'}
              />
            </div>
          </section>

          {/* Test Result */}
          {testResult && (
            <TestResult result={testResult} />
          )}

          {/* Error from service */}
          {connectionService.error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-red-600 dark:text-red-400">
                  <XIcon />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-red-800 dark:text-red-400">
                    Error
                  </div>
                  <div className="text-sm mt-1 text-red-700 dark:text-red-500">
                    {connectionService.error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSubmitting}
              className="px-6 py-2.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <LoaderIcon />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-gray-700 dark:text-dark-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoaderIcon />
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Create Connection'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
});
