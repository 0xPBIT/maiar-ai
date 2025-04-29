# Security Policy

## Supported Versions

Our project is still in early development, and we do not support security updates for previous versions. We are still in unstable development mode (0.X.X). If a security issue is found, we will release a new unstable version that contains the fix.

## Reporting a Vulnerability

We take the security of MAIAR seriously. If you believe you have found a security vulnerability, please report it to us following these steps:

### Private Reporting Process

1. **DO NOT** create a public GitHub issue for the vulnerability
2. Send an email to contact@maiar.dev, or contact us through X ([@0xPBIT](https://x.com/0xpbit), [@dat_chillguy](https://x.com/dat_chillguy)) with:
   - A detailed description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact of the vulnerability
   - Any possible mitigations you've identified

## Security Best Practices

### For Contributors

1. **API Keys and Secrets**

   - Never commit API keys, passwords, or other secrets to the repository
   - Rotate any accidentally exposed credentials immediately

2. **Dependencies**

   - Keep all dependencies up to date
   - Do not use caret (`^`) or tilde (`~`) in your `package.json`, always use exact versions
   - Review security advisories for dependencies regularly
   - Use `pnpm audit` to check for known vulnerabilities

3. **Code Review**
   - All code changes must go through pull request review
   - Security-sensitive changes require additional review

### For Users

1. **Model Provider Security**

   - Use appropriate rate limiting for API calls
   - Monitor usage patterns for unusual activity
   - Implement proper authentication for exposed endpoints

2. **Platform Integration**
   - Use separate bot tokens for different environments
   - Implement proper permission scoping for platform APIs
   - Regular audit of platform access and permissions

## Security Features

### Current Implementation

- Environment variable based secrets management
- Type-safe API implementations
- Automated dependency updates via Dependabot
- Continuous Integration security checks
- GitHub secret scanning is enabled to alert for detected secrets in the repository
- Push protection is enabled to block commits containing [supported secrets](https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns#supported-secrets)

## Vulnerability Disclosure Policy

We follow a coordinated disclosure process:

1. Reporter submits vulnerability details
2. Our team validates and assesses the report
3. We develop and test a fix
4. Fix is deployed to supported versions
5. Public disclosure after fix is released

## Recognition

We believe in recognizing security researchers who help improve our security. Contributors who report valid security issues will be:

- Credited in our security acknowledgments (unless they wish to remain anonymous)
- Considered for our bounty program

## License Considerations

As an MIT licensed project, users should understand:

- The software is provided "as is"
- No warranty is provided
- Users are responsible for their own security implementations
- Contributors grant perpetual license to their contributions
