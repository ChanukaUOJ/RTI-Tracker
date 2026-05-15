export const fileTypePolicies = {
  rtiRequest: 'rtiRequest',
  rtiTemplate: 'rtiTemplate',
} as const;

export type FileTypePolicy = (typeof fileTypePolicies)[keyof typeof fileTypePolicies];

type FileTypeRules = {
  label: string;
  extensions: readonly string[];
  mimeTypes: readonly string[];
};

export const fileTypeRules: Record<FileTypePolicy, FileTypeRules> = {
  [fileTypePolicies.rtiRequest]: {
    label: 'RTI request file',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
  },
  [fileTypePolicies.rtiTemplate]: {
    label: 'RTI template file',
    extensions: ['.md'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
  },
};

export const getFileTypeRules = (policy: FileTypePolicy): FileTypeRules =>
  fileTypeRules[policy];

export const getPrimaryExtension = (policy: FileTypePolicy): string =>
  getFileTypeRules(policy).extensions[0];

export const getPrimaryMimeType = (policy: FileTypePolicy): string =>
  getFileTypeRules(policy).mimeTypes[0];

export const getAcceptValue = (policy: FileTypePolicy): string => {
  const rules = getFileTypeRules(policy);
  return [...rules.extensions, ...rules.mimeTypes].join(',');
};

export const hasAllowedExtension = (fileName: string, policy: FileTypePolicy): boolean => {
  const normalizedName = fileName.toLowerCase();
  return getFileTypeRules(policy).extensions.some((extension) =>
    normalizedName.endsWith(extension.toLowerCase())
  );
};

export const stripPrimaryExtension = (fileName: string, policy: FileTypePolicy): string => {
  const extension = getPrimaryExtension(policy);
  return fileName.replace(new RegExp(`${extension.replace('.', '\\.')}$`, 'i'), '');
};

export const isAcceptedFile = (file: File, policy: FileTypePolicy): boolean => {
  const rules = getFileTypeRules(policy);
  return rules.mimeTypes.includes(file.type) && hasAllowedExtension(file.name, policy);
};
