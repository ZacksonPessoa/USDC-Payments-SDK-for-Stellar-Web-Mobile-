# Release Checklist

1. **Update Version**: Bump version in `package.json`.
2. **Build**: Run `npm run build` to ensure everything compiles.
3. **Verify**: Run `npm run verify` to check build output.
4. **Test**: Run `npm test`.
5. **Pack**: Run `npm pack`. This generates a `.tgz` file (e.g., `zacksonpessoa-usdc-payments-sdk-0.3.3.tgz`).
6. **Commit & Tag**:
   - `git commit -am "chore: release v0.3.3"`
   - `git tag v0.3.3`
   - `git push && git push --tags`
7. **Create GitHub Release**:
   - Go to Releases -> Draft a new release.
   - Select tag `v0.3.3`.
   - Title: `v0.3.3`.
   - Description: Changelog.
   - **Attach the `.tgz` file** generated in step 5.
8. **Publish (Future)**: Run `npm publish --access public` when ready for npm registry.
