import { getErrorMessage } from "@jaybeeuu/utilities";

export interface ErrorViewProps {
  error: unknown;
  resetErrorBoundary: () => void
}

export const ErrorView = ({ error, resetErrorBoundary }: ErrorViewProps): JSX.Element => {
  return (
    <div role="alert" >
      <h2>Whoops! Something went wrong...</h2>
      <pre>{getErrorMessage(error)}</pre>
      <button onClick={() => resetErrorBoundary()}>Retry</button>
    </div>
  );
};
