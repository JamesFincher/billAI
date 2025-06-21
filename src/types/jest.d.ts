import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(...classNames: string[]): R
      toHaveAttribute(attr: string, value?: string): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeVisible(): R
      toBeInvalid(): R
      toBeValid(): R
      toHaveValue(value?: string | string[]): R
      toHaveDisplayValue(value: string | string[]): R
      toBeChecked(): R
      toHaveFocus(): R
      toHaveFormValues(expectedValues: Record<string, any>): R
      toHaveStyle(css: string | Record<string, any>): R
      toHaveTextContent(text: string | RegExp): R
      toContainElement(element: HTMLElement | null): R
      toBeEmptyDOMElement(): R
    }
  }
} 