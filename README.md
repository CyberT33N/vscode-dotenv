# VSCode .env syntax highlighting

A secured PNPM-based port of [DotENV](https://github.com/zaynali53/DotENV) for VS Code.

![Example](images/screenshot.png)

## Supported filenames

The extension now handles these names without a hardcoded suffix whitelist:

- `.env`
- `.env.*` at any depth such as `.env.local`, `.env.production.local`, or `.env.team.shared`
- `.env-sample`
- `.flaskenv`

## Custom file associations

If you want to map additional non-dotenv names such as `.secrets` or `.runtime-config`, keep using `files.associations`:

```json
"files.associations": {
  ".secrets": "dotenv"
}
```

## Packaging

```bash
pnpm install
pnpm run package
```

This emits the VSIX into `artifacts/vsix/`.

## Acknowledgements

- [Zayn Ali](https://github.com/zaynali53) for [DotENV](https://github.com/zaynali53/DotENV)
- [motdotla](https://github.com/motdotla/dotenv) for the logo
