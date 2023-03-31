import { Application, ParameterType } from 'typedoc';
import { addResolver } from './addResolver';

import type { ExternalDocumentationOption } from './ExternalDocumentationOption';

/*!
 * @file typedoc-plugin-external-resolver <https://github.com/rafern/typedoc-plugin-external-resolver>
 * @copyright Copyright (c) 2023, Rafael da Silva Fernandes. Licensed under the MIT license.
 */

export function load(app: Application) {
    app.options.addDeclaration({
        name: 'externalDocumentation',
        help: '\
A map for the external documentation. Keys represent the NPM package, and values must be an object containing the configuration for this specific package.\n\
Each object must contain a "dtsPath" member with the relative path to the package type definitions file, and a "externalBaseURL" member with the external base URL for the documentation of this package\
',
        type: ParameterType.Object,
        defaultValue: {},
        validate: (value) => {
            if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                throw new Error('externalDocumentation must be a non-null object');
            }

            for (const packageConf of Object.values(value)) {
                if (typeof packageConf !== 'object' || Array.isArray(packageConf)) {
                    throw new Error('externalDocumentation entries must be objects');
                }

                if (!('dtsPath' in packageConf && 'externalBaseURL' in packageConf)) {
                    throw new Error('externalDocumentation entries must contain a dtsPath and a externalBaseURL sub-option');
                }

                if (typeof packageConf.dtsPath !== 'string') {
                    throw new Error("externalDocumentation dtsPath entry sub-options must be strings");
                }

                if (typeof packageConf.externalBaseURL !== 'string') {
                    throw new Error("externalDocumentation externalBaseURL entry sub-options must be strings");
                }
            }
        }
    });

    app.on(Application.EVENT_BOOTSTRAP_END, () => {
        const externalDocumentation = app.options.getValue('externalDocumentation') as ExternalDocumentationOption;

        for (const [packageName, packageConf] of Object.entries(externalDocumentation)) {
            addResolver(app, packageName, packageConf.dtsPath, packageConf.externalBaseURL);
        }
    });
}