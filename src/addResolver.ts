import { createProgram, SymbolFlags, SyntaxKind } from 'typescript';
import resolvePackagePath from 'resolve-package-path';
import path from 'node:path';
import { Application } from 'typedoc';

import type { DeclarationReference } from 'typedoc';

export function addResolver(app: Application, packageName: string, packageDTSPath: string, externalBaseURL: string) {
    let packageDTSAbsPath: string;

    if (packageDTSPath.startsWith('~')) {
        // get package path
        const packageJsonPath = resolvePackagePath(packageName, process.cwd());

        if (!packageJsonPath) {
            throw new Error(`Could not find package "${packageName}".`);
        }

        const packagePath = path.dirname(packageJsonPath);
        packageDTSAbsPath = path.join(packagePath, packageDTSPath.substring(1));
    } else {
        packageDTSAbsPath = path.resolve(packageDTSPath);
    }

    // parse package types
    const program = createProgram({
        rootNames: [packageDTSAbsPath],
        options: {}
    });
    const sourceFile = program.getSourceFile(packageDTSAbsPath);

    if (!sourceFile) {
        throw new Error(`Could not get type definition file ("${packageDTSPath}") from "${packageName}".`);
    }

    const checker = program.getTypeChecker();
    const symbols = checker.getSymbolAtLocation(sourceFile);

    if (!symbols) {
        throw new Error(`Could not get symbols from "${packageName}"'s type definition file ("${packageDTSPath}").`);
    }

    const tsExports = checker.getExportsOfModule(symbols);

    const classes = new Set();
    const interfaces = new Set();
    const enums = new Set();
    const types = new Set();
    const functions = new Set();
    const variables = new Set();

    for (const tsSymbol of tsExports) {
        let symbol = tsSymbol;
        if (tsSymbol.getFlags() === SymbolFlags.Alias) {
            symbol = checker.getAliasedSymbol(tsSymbol);
        }

        const declaration = symbol.declarations?.[0];

        if (!declaration) {
            continue;
        }

        switch (declaration?.kind) {
            case SyntaxKind.ClassDeclaration:
                classes.add(symbol.name);
                break;
            case SyntaxKind.InterfaceDeclaration:
                interfaces.add(symbol.name);
                break;
            case SyntaxKind.EnumDeclaration:
                enums.add(symbol.name);
                break;
            case SyntaxKind.TypeAliasDeclaration:
                types.add(symbol.name);
                break;
            case SyntaxKind.FunctionDeclaration:
                functions.add(symbol.name);
                break;
            case SyntaxKind.VariableDeclaration:
                {
                    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);

                    if (type.getCallSignatures().length > 0) {
                        functions.add(symbol.name);
                        break;
                    }

                    variables.add(symbol.name);
                    break;
                }
        }
    }

    // make symbol resolver for exported types
    app.converter.addUnknownSymbolResolver((ref: DeclarationReference): string | undefined => {
        let strict = false;
        if (!ref.symbolReference || (ref.moduleSource !== packageName && ref.moduleSource !== undefined)) {
            return;
        } else if (ref.resolutionStart !== 'global' || ref.moduleSource === undefined) {
            // some tags don't have moduleSource set. fall back using strict
            // mode (if there is no match, return undefined instead of the base
            // url)
            strict = true;
        }

        if (ref.symbolReference.path) {
            let url = externalBaseURL;
            let first = true;

            for (const component of ref.symbolReference.path) {
                // symbol reference uses path
                const name = component.path;
                const dotNavig = component.navigation === '.';

                if (first && dotNavig) {
                    // this is an export. check the export list to guess the type
                    first = false;

                    if (classes.has(name)) {
                        url = `${url}/classes/${name}.html`;
                    } else if (interfaces.has(name)) {
                        url = `${url}/interfaces/${name}.html`;
                    } else if (enums.has(name)) {
                        url = `${url}/enums/${name}.html`;
                    } else if (types.has(name)) {
                        url = `${url}/types/${name}.html`;
                    } else if (functions.has(name)) {
                        url = `${url}/functions/${name}.html`;
                    } else if (variables.has(name)) {
                        url = `${url}/variables/${name}.html`;
                    } else if (strict) {
                        return;
                    } else {
                        console.warn(`Unknown ${packageName} export reference "${name}"; falling back to base URL`);
                        break;
                    }
                } else if (dotNavig || component.navigation === '#') {
                    // this is a member. just add it as a url fragment
                    url = `${url}#${name}`;
                }
                // XXX there can also be local navigation (~), but we are
                // ignoring that
            }

            return url;
        } else if (ref.symbolReference.meaning) {
            // symbol reference uses meaning
            // XXX untested; hasn't happened to me yet

            // convert keyword to url component
            // TODO handle members - not done yet because i dont event know
            // what the label variable looks like; i can't get this to be
            // needed in real-world testing
            const urlComponentMap = new Map([
                ['function', 'functions'],
                ['type', 'types'],
                ['class', 'classes'],
                ['interface', 'interfaces'],
                ['enum', 'enums'],
                ['var', 'variables'],
            ]);

            const meaning = ref.symbolReference.meaning;
            // XXX we know that keyword can be undefined, but if it's undefined,
            // then the map get will fail (as intended), so we can safely cast
            // it to a string
            const urlComponent = urlComponentMap.get(meaning.keyword as string);
            if (!urlComponent) {
                if (strict) {
                    return;
                } else {
                    console.warn(`Unknown ${packageName} reference meaning keyword "${meaning.keyword}" for reference "${meaning.label}"; falling back to base URL`);
                    return externalBaseURL;
                }
            }

            return `${externalBaseURL}/${urlComponent}/${meaning.label}.html`;
        } else {
            // invalid symbol reference, ignore it. this should never happen
            return;
        }
    });

    let totalSymbols = classes.size + interfaces.size + enums.size + types.size + functions.size + variables.size;
    console.log(`Registered external symbol resolver for package "${packageName}"; ${totalSymbols} symbols available`);
}