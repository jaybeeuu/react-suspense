import { useState, useTransition } from "react";
import styles from "./app.module.css";
import { ImageLoader } from "../image-loader/image-loader";
import { LoadingSpinner } from "../loading-spinner";

export const App = (): JSX.Element => {
  const [file, setFile] = useState<File | null>();
  const [isPending, startTransition] = useTransition();
  return (
    <>
      <header className={styles.header}>
        <h1>React Suspense</h1>
      </header>

      <main className={styles.main}>
        <label>
          Choose an image to classify:
          {isPending ? <LoadingSpinner size={"small"} /> : null}
          <input
            disabled={isPending}
            type="file"
            onChange={(e) => {
              startTransition(() => setFile(e.currentTarget.files?.item(0)));
            }}
            accept="image/*"
            placeholder="Choose an image to process"
          />
        </label>
        {file ? (
          <ImageLoader file={file} />
        ) : null}
      </main>
    </>
  );
};
