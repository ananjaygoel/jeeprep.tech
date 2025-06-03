# React + Vite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/your-org/jeeprep.tech/actions/workflows/node.js.yml/badge.svg)](https://github.com/your-org/jeeprep.tech/actions)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Accessibility

- All interactive elements use semantic HTML and ARIA roles where appropriate.
- Please test with screen readers and keyboard navigation for best results.

## Code Formatting

- This project recommends [Prettier](https://prettier.io/) for code formatting. Run `npm run format` before committing.

## Continuous Integration

- Add a GitHub Actions workflow for linting and testing. See `.github/workflows/node.js.yml` for an example.

## Testing

- Use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for writing tests.
- Run tests with `npm test`.
