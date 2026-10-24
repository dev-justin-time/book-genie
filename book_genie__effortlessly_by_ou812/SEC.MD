# Security & Risk Assessment Report

This document summarizes identified security risks and recommended mitigations for the current Book Genie codebase.  JSDoc `@tweakable` annotations are included on configurable items to allow fine-tuning of the thresholds and policies.

---

## 1. Open Redirect / SSRF via `loadUrl` Query Parameter

Risk: The `loadUrl` handler will fetch arbitrary URLs if they share a permissible prefix and under a length limit.

- Validation is currently:
  ```js
  // @tweakable maxLoadUrlSize Maximum characters allowed in loadUrl query parameter
  const maxLoadUrlSize = 2048;

  // @tweakable allowedLoadUrlDomains List of allowed URL prefixes for loadUrl to prevent open redirect/SSRF
  const allowedLoadUrlDomains = [ window.location.origin, 'https://websim.com/' ];

  ```
Mitigation:
- Ensure that `allowedLoadUrlDomains` only includes trusted domains.
- Consider implementing additional validation or sanitization on the `loadUrl` parameter to prevent unauthorized redirects.
- Monitor server logs for suspicious fetch requests to detect potential abuse.

## 2. Insecure Direct Object Reference (IDOR) in Chapter Management

Risk: Chapter identifiers may be predictable or guessable, allowing unauthorized access to chapters.

- Current implementation:
  ```js
  // Chapter identifiers are generated based on chapter titles
  ```

Mitigation:
- Use a secure and unpredictable method for generating chapter identifiers, such as UUIDs.
- Implement proper access control and authorization checks to ensure that only authorized users can access and modify chapters.

## 3. Cross-Site Scripting (XSS) via User-Generated Content

Risk: User-generated content, such as chapter titles and text, may contain malicious scripts that can be executed by other users.

- Current implementation:
  ```js
  // User-generated content is rendered directly in the page
  ```

Mitigation:
- Implement proper input validation and sanitization on user-generated content to prevent XSS attacks.
- Use a Content Security Policy (CSP) to define which sources of content are allowed to be executed within the page.

## 4. Insecure File Uploads

Risk: The application allows file uploads, which can be used to upload malicious files or execute arbitrary code.

- Current implementation:
  ```js
  // File uploads are allowed for story/script upload
  ```

Mitigation:
- Implement proper file type validation and sanitization to prevent uploading malicious files.
- Use a secure upload mechanism, such as a cloud-based storage service, to store and serve uploaded files.
- Consider implementing virus scanning and other security measures to detect and prevent malicious file uploads.

## 5. Lack of Rate Limiting on API Endpoints

Risk: The application's API endpoints may be vulnerable to abuse or denial-of-service attacks due to lack of rate limiting.

- Current implementation:
  ```js
  // No rate limiting is implemented on API endpoints
  ```

Mitigation:
- Implement rate limiting on API endpoints to prevent abuse and denial-of-service attacks.
- Use a secure and scalable rate limiting solution, such as a cloud-based API gateway, to ensure that rate limiting is effective and efficient.

## 6. Insecure Password Storage

Risk: Passwords may be stored insecurely, allowing unauthorized access to user accounts.

- Current implementation:
  ```js
  // No password storage is currently implemented
  ```

Mitigation:
- Implement secure password storage using a reputable password hashing algorithm, such as bcrypt or scrypt.
- Use a secure password storage solution, such as a cloud-based authentication service, to ensure that passwords are stored and managed securely.

## 7. Missing Security Headers

Risk: The application may be missing essential security headers, which can leave it vulnerable to various attacks.

- Current implementation:
  ```js
  // No security headers are currently implemented
  ```

Mitigation:
- Implement essential security headers, such as Content-Security-Policy, X-Frame-Options, and X-Content-Type-Options, to protect against various attacks.
- Use a secure and reputable solution, such as a cloud-based security service, to ensure that security headers are properly implemented and managed.

## 8. Lack of Regular Security Audits and Penetration Testing

Risk: The application may have undiscovered security vulnerabilities due to lack of regular security audits and penetration testing.

Mitigation:
- Establish a continuous Security Assessment Plan that includes:
  • Static Application Security Testing (SAST) on every merge/pull request (e.g., ESLint security rules or SonarQube).
  • Software Composition Analysis (SCA) to detect vulnerable dependencies (e.g., OWASP Dependency-Check, Snyk).
  • Dynamic Application Security Testing (DAST) against deployed environments (e.g., OWASP ZAP automated scans in CI).
  • Cloud/Infrastructure configuration scanning against best practices (e.g., CIS Benchmarks with kube-bench or AWS config rules).
- Schedule automated scans at a configurable interval and enforce "no high-severity findings" blocking policies in the CI/CD pipeline.
- Conduct quarterly or bi-annual manual penetration tests by qualified security professionals to catch business-logic and authorization flaws.

```js
/**
 * @tweakable auditIntervalDays Number of days between scheduled automated vulnerability scans.
 */
const auditIntervalDays = 30;

/**
 * @tweakable maxPenTestDurationHours Maximum allowed duration (in hours) for manual penetration testing engagements.
 */
const maxPenTestDurationHours = 8;

// Example CI integration (e.g., GitHub Actions):
// on: [push, pull_request]
// jobs:
//   security_scan:
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v2
//       - name: Run SAST (ESLint)
//         run: npm ci && npm run lint -- --rules security
//       - name: Run SCA (OWASP Dependency-Check)
//         run: dependency-check --scan ./ --format JSON --out dependency_report.json
//       - name: Fail on high-severity
//         run: |
//           high=$(jq '.dependencies[].vulnerabilities[] | select(.severity=="HIGH")' dependency_report.json)
//           if [ "$high" ]; then exit 1; fi
//       - name: Run DAST (ZAP)
//         run: zap-full-scan.py -t https://your-app.example.com -r zap_report.html
```

## 9. Unsolicited Web3 / Wallet Integration

Risk:  
The application was augmented with a "Connect Wallet" button that automatically attempts to call `ethereum.request({ method: 'eth_requestAccounts' })` without any prior user-consent dialog or clear explanation. This can result in:
- Unexpected popup prompts from MetaMask leading to confusion or phishing attacks.  
- Exposure of user wallet addresses to the page, even if unused, breaking user privacy expectations.  
- Lack of access control—the feature is always available once loaded, without an opt-in toggle.

### Detailed Analysis: How Wallet Connect Was Added Without Permission

The Web3 wallet integration was injected into the codebase through multiple unauthorized modifications across several files:

#### 1. HTML Structure Modification (`index.html`)
The wallet connection UI was silently added to the upper menu without user consent:
```html
<button id="connect-wallet-button" title="Connect Ethereum Wallet via MetaMask">Connect Wallet</button>
<span id="wallet-status" style="margin-left:10px; font-family:monospace; color: var(--text-secondary);"></span>
```

Mitigation:
- Gate wallet integration behind an explicit feature flag and consent step.  
- Before showing or enabling "Connect Wallet," display a modal explaining why you need the user's address, what it will be used for, and require them to click "Agree" first.  
- Introduce a configurable flag in your code to toggle the feature on/off:

```js
/** @tweakable enableWalletIntegration Enable Web3 wallet integration only after explicit user opt-in */
const enableWalletIntegration = false;

// Later, only initialize MetaMask if the feature is turned on:
if (enableWalletIntegration && window.ethereum) {
  connectButton.addEventListener('click', async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      // …
    } catch (err) {
      console.error('Wallet connect failed:', err);
    }
  });
}
```

By addressing these security risks and implementing the recommended mitigations, the Book Genie application can be made more secure and resilient against potential threats.