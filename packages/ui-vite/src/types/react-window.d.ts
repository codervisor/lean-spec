import * as React from 'react';

declare module 'react-window' {
  export type Align = 'auto' | 'smart' | 'center' | 'end' | 'start';

  export interface ListOnScrollProps {
    scrollDirection: 'forward' | 'backward';
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }

  export interface ListChildComponentProps<T> {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
    isVisible?: boolean;
  }

  export interface FixedSizeListProps<T> {
    height: number;
    width: number | string;
    itemCount: number;
    itemSize: number;
    itemData?: T;
    overscanCount?: number;
    initialScrollOffset?: number;
    onScroll?: (props: ListOnScrollProps) => void;
    children: React.ComponentType<ListChildComponentProps<T>>;
  }

  export class FixedSizeList<T = any> extends React.Component<FixedSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: Align): void;
  }
}
