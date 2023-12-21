# typedoc-plugin-external-resolver

Resolves third-party classes, interfaces, enums, and other symbols to their
respective external documentation, so long as the external documentation was
generated with TypeDoc.

This is a rewrite of the
[canvas-ui-typedoc-resolver](https://www.npmjs.com/package/@rafern/canvas-ui-typedoc-resolver)
plugin to support libraries other than `canvas-ui`.

## Installing

`npm install --save-dev typedoc-plugin-external-resolver`

## Usage

Add the `--plugin typedoc-plugin-external-resolver` option to your typedoc call.
For example:

```sh
typedoc --options typedoc.json --plugin typedoc-plugin-external-resolver
```

Add a `externalDocumentation` option to your `typedoc.json`. For example:

```json
{
    "externalDocumentation": {
        "example-package": {
            "dtsPath": "~/dist/index.d.ts",
            "externalBaseURL": "https://www.example.com/api-documentation"
        }
    }
}
```

Each key is a package name that will have external symbols resolved. Each
package has an associated `dtsPath` and `externalBaseURL` option. `dtsPath` is a
path to the type definitions file of the package, which will be used to parse
which symbols the package is exporting. If the path starts with a `~`, then the
path will be relative to its node_modules package folder. `externalBaseURL` is
the URL prefix used for resolving the URLs.

The plugin will then resolve unknown symbols to each of the supplied libraries
whenever possible, by using the supplied base URL as a prefix. For example, if
the configuration above is used, and a reference was found to a class named
`ExampleClass` and it was detected as part of the `example-package` library,
then the symbol will be resolved to
`https://www.example.com/api-documentation/classes/ExampleClass.html`.

Member references are added as part of the URL anchor, for TypeDoc
compatibility. Other symbol types, such as `enums`, are also supported. For
example, an enum named `ExampleEnum`, with an enum value of `EnumValueD` would
be resolved to
`https://www.example.com/api-documentation/enums/ExampleEnum.html#EnumValueD`
when using the configuration above.

## Special thanks

Special thanks to Playko ([website](https://www.playko.com/),
[github](https://github.com/playkostudios)) where this project started and is
currently being developed at.

## License

This project is licensed under the MIT license (see the LICENSE file)

This project uses the following open-source projects:
- [@types/node (DefinitelyTyped)](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) licensed under the MIT license
- [esbuild](https://github.com/evanw/esbuild) licensed under the MIT license
- [resolve-package-path](https://github.com/stefanpenner/resolve-package-path) licensed under the MIT license
- [typedoc](https://github.com/TypeStrong/TypeDoc) licensed under the Apache 2.0 license
- [typescript](https://github.com/Microsoft/TypeScript) licensed under the Apache 2.0 license