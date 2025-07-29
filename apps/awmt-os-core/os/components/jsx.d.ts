declare namespace JSX {
  interface IntrinsicElements {
    div: JSX.HTMLAttributes;
    span: JSX.HTMLAttributes;
    button: JSX.HTMLAttributes;
    input: JSX.HTMLAttributes;
    // Add other HTML elements as needed
  }

  interface HTMLAttributes {
    style?: {
      [key: string]: string | number | undefined;
    };
    className?: string;
    id?: string;
    onClick?: () => void;
    // Add other common attributes as needed
  }
}

// Define ReactNode type
declare namespace React {
  type ReactNode = string | number | boolean | null | undefined | React.ReactElement | Array<React.ReactNode>;
  interface ReactElement {
    type: string | Function;
    props: Record<string, unknown>;
    key: string | null;
  }
} 

