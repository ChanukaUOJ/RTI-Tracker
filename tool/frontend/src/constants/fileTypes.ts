const rulesByPolicy = {
  rtiRequest: {
    label: 'RTI request file',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
  },
  rtiHistory: {
    label: 'RTI history attachment',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
  },
  rtiTemplate: {
    label: 'RTI template file',
    extensions: ['.md'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
  },
} as const;

export const fileTypePolicies = {
  rtiRequest: 'rtiRequest',
  rtiHistory: 'rtiHistory',
  rtiTemplate: 'rtiTemplate',
} as const;

export type FileTypePolicy = keyof typeof rulesByPolicy;

type FileTypeRules = {
  label: string;
  extensions: readonly string[];
  mimeTypes: readonly string[];
};

export const fileTypeRules: Record<FileTypePolicy, FileTypeRules> = rulesByPolicy;

export const getFileTypeRules = (policy: FileTypePolicy): FileTypeRules =>
  rulesByPolicy[policy];

export const getDefaultGeneratedFileSpec = (policy: FileTypePolicy) => {
  const rules = rulesByPolicy[policy];
  return {
    extension: rules.extensions[0],
    mimeType: rules.mimeTypes[0],
  };
};

export const getAcceptValue = (policy: FileTypePolicy): string => {
  const rules = rulesByPolicy[policy];
  return [...rules.extensions, ...rules.mimeTypes].join(',');
};

export const hasAllowedExtension = (fileName: string, policy: FileTypePolicy): boolean => {
  const normalizedName = fileName.toLowerCase();
  return rulesByPolicy[policy].extensions.some((extension) =>
    normalizedName.endsWith(extension.toLowerCase())
  );
};

export const stripPrimaryExtension = (fileName: string, policy: FileTypePolicy): string => {
  const { extension } = getDefaultGeneratedFileSpec(policy);
  return fileName.replace(new RegExp(`${extension.replace('.', '\\.')}$`, 'i'), '');
};

export const isAcceptedFile = (file: File, policy: FileTypePolicy): boolean => {
  const rules = rulesByPolicy[policy];
  return rules.mimeTypes.includes(file.type) && hasAllowedExtension(file.name, policy);
};
