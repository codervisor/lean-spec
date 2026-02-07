import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { ChatContainer } from './ChatContainer';

// Mock scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: () => { },
}));

describe('ChatInput', () => {
  it('renders input and submit button', () => {
    render(<ChatInput onSubmit={() => { }} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onSubmit with message when form is submitted', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello world' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith('Hello world');
  });

  it('clears input after submit', () => {
    render(<ChatInput onSubmit={() => { }} />);

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(input.closest('form')!);

    expect(input.value).toBe('');
  });

  it('does not submit empty messages', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.submit(input.closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables button when loading', () => {
    render(<ChatInput onSubmit={() => { }} isLoading />);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('ChatMessage', () => {
  it('renders user message', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'Hello, AI!' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
  });

  it('renders assistant message', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Hello! How can I help?' }],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
  });

  it('displays tool invocations', () => {
    const message = {
      id: '3',
      role: 'assistant' as const,
      parts: [
        { type: 'text' as const, text: 'Looking up specs...' },
        {
          type: 'tool-list_specs' as const,
          toolCallId: 'tc1',
          state: 'output-available' as const,
          input: { status: 'in-progress' },
          output: [],
        },
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('list_specs')).toBeInTheDocument();
    expect(screen.getByText('chat.toolExecution.status.completed')).toBeInTheDocument();
  });
});

describe('ChatContainer', () => {
  it('shows empty state when no messages', () => {
    render(<ChatContainer messages={[]} onSubmit={() => { }} />);

    expect(screen.getByText('chat.title')).toBeInTheDocument();
    expect(screen.getByText('chat.empty')).toBeInTheDocument();
  });

  it('renders messages when provided', () => {
    const messages = [
      { id: '1', role: 'user' as const, parts: [{ type: 'text' as const, text: 'Hi' }] },
      { id: '2', role: 'assistant' as const, parts: [{ type: 'text' as const, text: 'Hello!' }] },
    ];

    render(<ChatContainer messages={messages} onSubmit={() => { }} />);

    expect(screen.getByText('Hi')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('shows thinking indicator when loading', () => {
    // Need at least one message to show the thinking indicator (not empty state)
    const messages = [{ id: '1', role: 'user' as const, parts: [{ type: 'text' as const, text: 'Test' }] }];
    render(<ChatContainer messages={messages} onSubmit={() => { }} isLoading />);

    expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
  });

  it('shows error with retry button', () => {
    const onRetry = vi.fn();
    const error = new Error('Connection failed');

    render(<ChatContainer messages={[]} onSubmit={() => { }} error={error} onRetry={onRetry} />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();

    fireEvent.click(screen.getByText('actions.retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});
