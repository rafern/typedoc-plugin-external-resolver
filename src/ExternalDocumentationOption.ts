import type { PackageConfOption } from './PackageConfOption.js';

export interface ExternalDocumentationOption {
    [packageName: string]: PackageConfOption,
};