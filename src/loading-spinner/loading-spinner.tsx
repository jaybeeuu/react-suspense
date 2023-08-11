import classNames from "classnames";
import styles from "./loading-spinner.module.css";

export interface LoadingSpinnerProps {
  size?: "small"
}

export const LoadingSpinner = ({ size }: LoadingSpinnerProps): JSX.Element => (
  <div
    role="alert"
    aria-busy="true"
    aria-label="loading"
    className={classNames(
      "fade-in",
      styles.spinner,
      { [styles.small]: size === "small"}
    )}
  />
);
