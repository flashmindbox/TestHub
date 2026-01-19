/**
 * Button/UI Component Tests
 *
 * Tests for StudyTab UI primitive components including Button, Skeleton,
 * DropdownMenu, and other shared components.
 *
 * @module tests/components/studytab/button
 */

import { test, expect } from '@playwright/experimental-ct-react';
import React, { useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

// =============================================================================
// MOCK BUTTON COMPONENT
// =============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

/**
 * Mock Button component mirroring StudyTab/shadcn structure
 */
function Button({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  onClick,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variantStyles: Record<ButtonVariant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3 text-sm',
    lg: 'h-11 rounded-md px-8 text-lg',
    icon: 'h-10 w-10',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          data-testid="loading-spinner"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && leftIcon && <span className="mr-2" data-testid="left-icon">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2" data-testid="right-icon">{rightIcon}</span>}
    </button>
  );
}

// =============================================================================
// MOCK ICON BUTTON COMPONENT
// =============================================================================

interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

function IconButton({ icon, 'aria-label': ariaLabel, ...props }: IconButtonProps) {
  return (
    <Button size="icon" aria-label={ariaLabel} {...props} data-testid="icon-button">
      {icon}
    </Button>
  );
}

// =============================================================================
// MOCK SKELETON COMPONENT
// =============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'text' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
}

function Skeleton({ className = '', variant = 'default', width, height }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-muted rounded';

  const variantStyles: Record<string, string> = {
    default: '',
    text: 'h-4',
    circle: 'rounded-full',
    card: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'circle' ? '40px' : '100%'),
    height: height ?? (variant === 'circle' ? '40px' : variant === 'text' ? '1rem' : '100px'),
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      data-testid="skeleton"
      data-variant={variant}
      role="status"
      aria-label="Loading..."
    />
  );
}

// =============================================================================
// MOCK BADGE COMPONENT
// =============================================================================

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-border text-foreground',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      data-testid="badge"
      data-variant={variant}
    >
      {children}
    </span>
  );
}

// =============================================================================
// MOCK INPUT COMPONENT
// =============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

function Input({
  error,
  label,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
  const hasError = !!error;

  return (
    <div className="space-y-1" data-testid="input-wrapper">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
          data-testid="input-label"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          hasError ? 'border-destructive' : 'border-input'
        } ${className}`}
        aria-invalid={hasError}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        data-testid="input"
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-destructive"
          data-testid="input-error"
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className="text-sm text-muted-foreground"
          data-testid="input-helper"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MOCK MODAL/DIALOG COMPONENT
// =============================================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-md bg-background border rounded-lg shadow-lg p-6"
        data-testid="modal-content"
      >
        {/* Header */}
        <div className="mb-4">
          <h2
            id="modal-title"
            className="text-lg font-semibold"
            data-testid="modal-title"
          >
            {title}
          </h2>
          {description && (
            <p
              id="modal-description"
              className="text-sm text-muted-foreground mt-1"
              data-testid="modal-description"
            >
              {description}
            </p>
          )}
        </div>

        {/* Body */}
        <div data-testid="modal-body">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 flex justify-end gap-2" data-testid="modal-footer">
            {footer}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-muted"
          aria-label="Close modal"
          data-testid="modal-close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// TEST WRAPPER WITH STATE
// =============================================================================

function ModalTest() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)} data-testid="open-modal-btn">
        Open Modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

// =============================================================================
// MOCK ICONS
// =============================================================================

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// =============================================================================
// BUTTON VARIANT TESTS
// =============================================================================

test.describe('Button - Variants', () => {
  test('renders default variant', async ({ mount }) => {
    const component = await mount(<Button variant="default">Default</Button>);

    await expect(component).toContainText('Default');
    await expect(component.getByTestId('button')).toHaveAttribute('data-variant', 'default');
    await expect(component.getByTestId('button')).toHaveClass(/bg-primary/);
  });

  test('renders destructive variant', async ({ mount }) => {
    const component = await mount(<Button variant="destructive">Delete</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-variant', 'destructive');
    await expect(component.getByTestId('button')).toHaveClass(/bg-destructive/);
  });

  test('renders outline variant', async ({ mount }) => {
    const component = await mount(<Button variant="outline">Outline</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-variant', 'outline');
    await expect(component.getByTestId('button')).toHaveClass(/border/);
    await expect(component.getByTestId('button')).toHaveClass(/bg-background/);
  });

  test('renders secondary variant', async ({ mount }) => {
    const component = await mount(<Button variant="secondary">Secondary</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-variant', 'secondary');
    await expect(component.getByTestId('button')).toHaveClass(/bg-secondary/);
  });

  test('renders ghost variant', async ({ mount }) => {
    const component = await mount(<Button variant="ghost">Ghost</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-variant', 'ghost');
    await expect(component.getByTestId('button')).not.toHaveClass(/bg-primary/);
  });

  test('renders link variant', async ({ mount }) => {
    const component = await mount(<Button variant="link">Link</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-variant', 'link');
    await expect(component.getByTestId('button')).toHaveClass(/underline-offset-4/);
  });
});

// =============================================================================
// BUTTON SIZE TESTS
// =============================================================================

test.describe('Button - Sizes', () => {
  test('renders default size', async ({ mount }) => {
    const component = await mount(<Button size="default">Default</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-size', 'default');
    await expect(component.getByTestId('button')).toHaveClass(/h-10/);
    await expect(component.getByTestId('button')).toHaveClass(/px-4/);
  });

  test('renders small size', async ({ mount }) => {
    const component = await mount(<Button size="sm">Small</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-size', 'sm');
    await expect(component.getByTestId('button')).toHaveClass(/h-9/);
    await expect(component.getByTestId('button')).toHaveClass(/px-3/);
  });

  test('renders large size', async ({ mount }) => {
    const component = await mount(<Button size="lg">Large</Button>);

    await expect(component.getByTestId('button')).toHaveAttribute('data-size', 'lg');
    await expect(component.getByTestId('button')).toHaveClass(/h-11/);
    await expect(component.getByTestId('button')).toHaveClass(/px-8/);
  });

  test('renders icon size', async ({ mount }) => {
    const component = await mount(
      <Button size="icon" aria-label="Add">
        <PlusIcon />
      </Button>
    );

    await expect(component.getByTestId('button')).toHaveAttribute('data-size', 'icon');
    await expect(component.getByTestId('button')).toHaveClass(/h-10/);
    await expect(component.getByTestId('button')).toHaveClass(/w-10/);
  });
});

// =============================================================================
// BUTTON STATE TESTS
// =============================================================================

test.describe('Button - States', () => {
  test('handles disabled state', async ({ mount }) => {
    const component = await mount(<Button disabled>Disabled</Button>);

    await expect(component.getByTestId('button')).toBeDisabled();
    await expect(component.getByTestId('button')).toHaveAttribute('aria-disabled', 'true');
    await expect(component.getByTestId('button')).toHaveClass(/disabled:opacity-50/);
  });

  test('handles loading state', async ({ mount }) => {
    const component = await mount(<Button loading>Loading</Button>);

    await expect(component.getByTestId('button')).toBeDisabled();
    await expect(component.getByTestId('button')).toHaveAttribute('aria-busy', 'true');
    await expect(component.getByTestId('button')).toHaveAttribute('data-loading', 'true');
    await expect(component.getByTestId('loading-spinner')).toBeVisible();
  });

  test('loading spinner replaces left icon', async ({ mount }) => {
    const component = await mount(
      <Button loading leftIcon={<PlusIcon />}>
        Add Item
      </Button>
    );

    await expect(component.getByTestId('loading-spinner')).toBeVisible();
    await expect(component.getByTestId('left-icon')).not.toBeVisible();
  });

  test('disabled button does not trigger click', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button disabled onClick={() => (clicked = true)}>
        Click Me
      </Button>
    );

    await component.getByTestId('button').click({ force: true });
    expect(clicked).toBe(false);
  });
});

// =============================================================================
// BUTTON INTERACTION TESTS
// =============================================================================

test.describe('Button - Interactions', () => {
  test('triggers onClick callback', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button onClick={() => (clicked = true)}>Click Me</Button>
    );

    await component.getByTestId('button').click();
    expect(clicked).toBe(true);
  });

  test('has focus styles', async ({ mount }) => {
    const component = await mount(<Button>Focus Me</Button>);

    await component.getByTestId('button').focus();
    await expect(component.getByTestId('button')).toHaveClass(/focus-visible:ring-2/);
  });

  test('handles keyboard activation', async ({ mount, page }) => {
    let clicked = false;
    const component = await mount(
      <Button onClick={() => (clicked = true)}>Press Enter</Button>
    );

    await component.getByTestId('button').focus();
    await page.keyboard.press('Enter');

    expect(clicked).toBe(true);
  });
});

// =============================================================================
// BUTTON WITH ICONS TESTS
// =============================================================================

test.describe('Button - Icons', () => {
  test('renders with left icon', async ({ mount }) => {
    const component = await mount(
      <Button leftIcon={<PlusIcon />}>Add Item</Button>
    );

    await expect(component.getByTestId('left-icon')).toBeVisible();
    await expect(component).toContainText('Add Item');
  });

  test('renders with right icon', async ({ mount }) => {
    const component = await mount(
      <Button rightIcon={<ArrowRightIcon />}>Continue</Button>
    );

    await expect(component.getByTestId('right-icon')).toBeVisible();
    await expect(component).toContainText('Continue');
  });

  test('renders with both icons', async ({ mount }) => {
    const component = await mount(
      <Button leftIcon={<PlusIcon />} rightIcon={<ArrowRightIcon />}>
        Add and Continue
      </Button>
    );

    await expect(component.getByTestId('left-icon')).toBeVisible();
    await expect(component.getByTestId('right-icon')).toBeVisible();
  });
});

// =============================================================================
// ICON BUTTON TESTS
// =============================================================================

test.describe('IconButton', () => {
  test('renders with icon only', async ({ mount }) => {
    const component = await mount(
      <IconButton icon={<TrashIcon />} aria-label="Delete" />
    );

    await expect(component.getByTestId('icon-button')).toBeVisible();
    await expect(component.getByTestId('icon-button')).toHaveAttribute('aria-label', 'Delete');
  });

  test('has correct size for icon buttons', async ({ mount }) => {
    const component = await mount(
      <IconButton icon={<PlusIcon />} aria-label="Add" />
    );

    await expect(component.getByTestId('icon-button')).toHaveClass(/h-10/);
    await expect(component.getByTestId('icon-button')).toHaveClass(/w-10/);
  });

  test('supports variants', async ({ mount }) => {
    const component = await mount(
      <IconButton icon={<TrashIcon />} aria-label="Delete" variant="destructive" />
    );

    await expect(component.getByTestId('icon-button')).toHaveClass(/bg-destructive/);
  });
});

// =============================================================================
// BUTTON FULL WIDTH TESTS
// =============================================================================

test.describe('Button - Full Width', () => {
  test('renders full width button', async ({ mount }) => {
    const component = await mount(<Button fullWidth>Full Width</Button>);

    await expect(component.getByTestId('button')).toHaveClass(/w-full/);
  });
});

// =============================================================================
// SKELETON TESTS
// =============================================================================

test.describe('Skeleton', () => {
  test('renders default skeleton', async ({ mount }) => {
    const component = await mount(<Skeleton />);

    await expect(component.getByTestId('skeleton')).toBeVisible();
    await expect(component.getByTestId('skeleton')).toHaveClass(/animate-pulse/);
  });

  test('renders text variant', async ({ mount }) => {
    const component = await mount(<Skeleton variant="text" />);

    await expect(component.getByTestId('skeleton')).toHaveAttribute('data-variant', 'text');
    await expect(component.getByTestId('skeleton')).toHaveClass(/h-4/);
  });

  test('renders circle variant', async ({ mount }) => {
    const component = await mount(<Skeleton variant="circle" />);

    await expect(component.getByTestId('skeleton')).toHaveAttribute('data-variant', 'circle');
    await expect(component.getByTestId('skeleton')).toHaveClass(/rounded-full/);
  });

  test('renders with custom dimensions', async ({ mount }) => {
    const component = await mount(<Skeleton width={200} height={50} />);

    await expect(component.getByTestId('skeleton')).toHaveCSS('width', '200px');
    await expect(component.getByTestId('skeleton')).toHaveCSS('height', '50px');
  });

  test('has loading ARIA attributes', async ({ mount }) => {
    const component = await mount(<Skeleton />);

    await expect(component.getByTestId('skeleton')).toHaveAttribute('role', 'status');
    await expect(component.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Loading...');
  });
});

// =============================================================================
// BADGE TESTS
// =============================================================================

test.describe('Badge', () => {
  test('renders default badge', async ({ mount }) => {
    const component = await mount(<Badge>New</Badge>);

    await expect(component.getByTestId('badge')).toContainText('New');
    await expect(component.getByTestId('badge')).toHaveClass(/bg-primary/);
  });

  test('renders all variants', async ({ mount }) => {
    const variants: BadgeVariant[] = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'];

    for (const variant of variants) {
      const component = await mount(<Badge variant={variant}>{variant}</Badge>);
      await expect(component.getByTestId('badge')).toHaveAttribute('data-variant', variant);
    }
  });

  test('success badge has green styling', async ({ mount }) => {
    const component = await mount(<Badge variant="success">Complete</Badge>);

    await expect(component.getByTestId('badge')).toHaveClass(/text-green-500/);
  });

  test('warning badge has orange styling', async ({ mount }) => {
    const component = await mount(<Badge variant="warning">Pending</Badge>);

    await expect(component.getByTestId('badge')).toHaveClass(/text-orange-500/);
  });
});

// =============================================================================
// INPUT TESTS
// =============================================================================

test.describe('Input', () => {
  test('renders basic input', async ({ mount }) => {
    const component = await mount(<Input placeholder="Enter text" />);

    await expect(component.getByTestId('input')).toBeVisible();
    await expect(component.getByTestId('input')).toHaveAttribute('placeholder', 'Enter text');
  });

  test('renders with label', async ({ mount }) => {
    const component = await mount(<Input label="Email" />);

    await expect(component.getByTestId('input-label')).toContainText('Email');
  });

  test('renders with helper text', async ({ mount }) => {
    const component = await mount(<Input helperText="Enter your email address" />);

    await expect(component.getByTestId('input-helper')).toContainText('Enter your email address');
  });

  test('renders error state', async ({ mount }) => {
    const component = await mount(<Input error="This field is required" />);

    await expect(component.getByTestId('input-error')).toContainText('This field is required');
    await expect(component.getByTestId('input')).toHaveClass(/border-destructive/);
    await expect(component.getByTestId('input')).toHaveAttribute('aria-invalid', 'true');
  });

  test('error hides helper text', async ({ mount }) => {
    const component = await mount(
      <Input error="Required" helperText="Optional helper" />
    );

    await expect(component.getByTestId('input-error')).toBeVisible();
    await expect(component.getByTestId('input-helper')).not.toBeVisible();
  });

  test('handles disabled state', async ({ mount }) => {
    const component = await mount(<Input disabled />);

    await expect(component.getByTestId('input')).toBeDisabled();
    await expect(component.getByTestId('input')).toHaveClass(/disabled:opacity-50/);
  });

  test('accepts user input', async ({ mount }) => {
    const component = await mount(<Input />);

    await component.getByTestId('input').fill('Hello World');
    await expect(component.getByTestId('input')).toHaveValue('Hello World');
  });
});

// =============================================================================
// MODAL TESTS
// =============================================================================

test.describe('Modal', () => {
  test('opens when triggered', async ({ mount }) => {
    const component = await mount(<ModalTest />);

    // Initially closed
    await expect(component.getByTestId('modal')).not.toBeVisible();

    // Open modal
    await component.getByTestId('open-modal-btn').click();

    // Now visible
    await expect(component.getByTestId('modal')).toBeVisible();
    await expect(component.getByTestId('modal-title')).toContainText('Confirm Action');
  });

  test('closes on close button click', async ({ mount }) => {
    const component = await mount(<ModalTest />);

    await component.getByTestId('open-modal-btn').click();
    await expect(component.getByTestId('modal')).toBeVisible();

    await component.getByTestId('modal-close').click();
    await expect(component.getByTestId('modal')).not.toBeVisible();
  });

  test('closes on backdrop click', async ({ mount }) => {
    const component = await mount(<ModalTest />);

    await component.getByTestId('open-modal-btn').click();
    await component.getByTestId('modal-backdrop').click();

    await expect(component.getByTestId('modal')).not.toBeVisible();
  });

  test('has correct ARIA attributes', async ({ mount }) => {
    const component = await mount(<ModalTest />);

    await component.getByTestId('open-modal-btn').click();

    await expect(component.getByTestId('modal')).toHaveAttribute('role', 'dialog');
    await expect(component.getByTestId('modal')).toHaveAttribute('aria-modal', 'true');
    await expect(component.getByTestId('modal')).toHaveAttribute('aria-labelledby', 'modal-title');
    await expect(component.getByTestId('modal')).toHaveAttribute('aria-describedby', 'modal-description');
  });

  test('renders title and description', async ({ mount }) => {
    const component = await mount(<ModalTest />);

    await component.getByTestId('open-modal-btn').click();

    await expect(component.getByTestId('modal-title')).toContainText('Confirm Action');
    await expect(component.getByTestId('modal-description')).toContainText('Are you sure');
  });

  test('renders footer with buttons', async ({ mount }) => {
    const component = await mount(<ModalTest />);

    await component.getByTestId('open-modal-btn').click();

    await expect(component.getByTestId('modal-footer')).toBeVisible();
    await expect(component.getByTestId('modal-footer').locator('button')).toHaveCount(2);
  });
});

// =============================================================================
// THEME TESTS
// =============================================================================

test.describe('UI Components - Theme', () => {
  test('button renders in dark mode', async ({ mount }) => {
    const component = await mount(<Button>Dark Mode</Button>, {
      hooksConfig: { theme: 'dark' },
    });

    await expect(component.getByTestId('button')).toBeVisible();
  });

  test('button renders in light mode', async ({ mount }) => {
    const component = await mount(<Button>Light Mode</Button>, {
      hooksConfig: { theme: 'light' },
    });

    await expect(component.getByTestId('button')).toBeVisible();
  });

  test('skeleton visible in both themes', async ({ mount }) => {
    // Dark mode
    const darkComponent = await mount(<Skeleton />, {
      hooksConfig: { theme: 'dark' },
    });
    await expect(darkComponent.getByTestId('skeleton')).toBeVisible();

    // Light mode
    const lightComponent = await mount(<Skeleton />, {
      hooksConfig: { theme: 'light' },
    });
    await expect(lightComponent.getByTestId('skeleton')).toBeVisible();
  });
});

// =============================================================================
// COMBINATION TESTS
// =============================================================================

test.describe('UI Components - Combinations', () => {
  test('button with badge', async ({ mount }) => {
    const component = await mount(
      <Button>
        Notifications <Badge variant="destructive">3</Badge>
      </Button>
    );

    await expect(component.getByTestId('button')).toBeVisible();
    await expect(component.getByTestId('badge')).toContainText('3');
  });

  test('loading button in modal', async ({ mount }) => {
    const component = await mount(
      <Modal open={true} onClose={() => {}} title="Processing" footer={<Button loading>Saving...</Button>}>
        <p>Please wait</p>
      </Modal>
    );

    await expect(component.getByTestId('modal')).toBeVisible();
    await expect(component.getByTestId('loading-spinner')).toBeVisible();
  });

  test('form with input and button', async ({ mount }) => {
    const component = await mount(
      <form data-testid="form" className="space-y-4">
        <Input label="Email" placeholder="you@example.com" />
        <Button type="submit" fullWidth>
          Subscribe
        </Button>
      </form>
    );

    await component.getByTestId('input').fill('test@example.com');
    await expect(component.getByTestId('input')).toHaveValue('test@example.com');
    await expect(component.getByTestId('button')).toHaveClass(/w-full/);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

test.describe('Edge Cases', () => {
  test('button with long text', async ({ mount }) => {
    const component = await mount(
      <Button>This is a very long button text that might overflow</Button>
    );

    await expect(component.getByTestId('button')).toBeVisible();
    await expect(component).toContainText('This is a very long button text');
  });

  test('badge with empty content', async ({ mount }) => {
    const component = await mount(<Badge>{''}</Badge>);

    await expect(component.getByTestId('badge')).toBeVisible();
  });

  test('input with special characters', async ({ mount }) => {
    const component = await mount(<Input />);

    await component.getByTestId('input').fill('<script>alert("xss")</script>');
    await expect(component.getByTestId('input')).toHaveValue('<script>alert("xss")</script>');
  });

  test('multiple skeletons render correctly', async ({ mount }) => {
    const component = await mount(
      <div className="space-y-2" data-testid="skeleton-group">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    );

    await expect(component.getByTestId('skeleton')).toHaveCount(3);
  });
});
