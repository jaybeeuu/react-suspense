import classNames from "classnames";
import styles from "./loading-spinner.module.css";

export const LoadingSpinner = (): JSX.Element => <div className={classNames("fade-in", styles.spinner)}/>;
