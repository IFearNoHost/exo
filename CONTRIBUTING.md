# Contributing to Exo

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Development Guide](#development-guide)
  - [Setup](#setup)
  - [Testing](#testing)
  - [Building](#building)
  - [Style Guide](#style-guide)

## Code of Conduct

This project and everyone participating in it is governed by the [Exo Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## I Have a Question

> If you want to ask a question, we assume that you have read the available [Documentation](README.md).

Before you ask a question, it is best to search for existing [Issues](https://github.com/fozooni/exo/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also creating a new issue with a label "question".

## I Want To Contribute

### Reporting Bugs

Before creating bug reports, please check this list as you might find out that you don't need to create one.

- **Check the [Discussions](https://github.com/fozooni/exo/discussions)** for a list of common questions and problems.
- **Search the existing issues** to see if the bug has already been reported.

When you are creating a bug report, please include as many details as possible. Fill out the [required template](.github/ISSUE_TEMPLATE/bug_report.yml), the information it asks for helps us resolve issues faster.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Exo, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

- Use the **Feature Request** template.
- **Provide a clear and concise description of the suggested enhancement.**
- **Explain why this enhancement would be useful** to most Exo users.

### Your First Code Contribution

1. Fork the repository.
2. Create a new branch: `git checkout -b fix/your-fix-name` or `git checkout -b feat/your-feature-name`.
3. Improve the code.
4. Add tests for your changes.
5. Push to your branch and submit a Pull Request.

## Development Guide

### Setup

Exo uses **npm**.

```bash
# Clone the repo
git clone https://github.com/fozooni/exo.git
cd exo

# Install dependencies
npm install
```

### Testing

Please ensure all tests pass before submitting a PR.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Building

To build the project for distribution (ESM/CJS/DTS):

```bash
npm run build
```

### Style Guide

- **TypeScript**: We use strict mode. No `any` unless absolutely necessary (and justified).
- **Zod**: All inputs must be validated via Zod schemas.
- **Linting**: Run `npm run lint` to check for style issues.
- **Commits**: We prefer [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat: add new adapter`
  - `fix: resolve crash in hook`
  - `docs: update readme`
