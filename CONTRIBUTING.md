# Contributing to EchoEcho

Thank you for your interest in contributing to EchoEcho! This document provides guidelines and steps for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up Clarinet for contract development:
   ```bash
   clarinet install
   ```
5. Create a new branch for your feature or fix

## Development Setup

### Frontend
```bash
npm run dev
```

### Smart Contracts
```bash
cd contracts
clarinet check
clarinet test
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Write clear commit messages
- Update documentation if needed
- Add tests for new features
- Ensure all tests pass before submitting

## Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for formatting
- Follow existing code patterns in the codebase

## Reporting Issues

- Use the issue templates when available
- Provide clear reproduction steps
- Include environment details

## Questions?

Feel free to open a discussion or reach out to the maintainers.
