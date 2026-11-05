# Security

Do not post secrets, account details, private grants, user data or exploitable production vulnerabilities in public issues. Use GitHub's private vulnerability reporting for this repository when enabled, or contact the owner privately through an established channel. Ordinary viewer bugs can use the public bug form.

The kit has no production credentials, login, billing or deployment. Its development server binds to 127.0.0.1. Do not expose it to the Internet. File selection in the viewer is local; do not treat this as a general sandbox for arbitrary files from strangers. Inspect and validate untrusted models before use.

CI uses GitHub-hosted runners, read-only repository permissions and no production secrets. Fork contributions must not be run on self-hosted machines with private data. Workflows never use pull_request_target to execute submitted code. A modified validator in a PR is not trustworthy evidence by itself: maintainers review tooling/workflow changes and may run the base validator in isolation against the submitted package.
