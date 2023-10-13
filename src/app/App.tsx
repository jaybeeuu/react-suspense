import { useState, useTransition } from "react";
import { ImageLoader } from "../image-loader/image-loader";
import { LoadingSpinner } from "../loading-spinner";
import styles from "./app.module.css";
import { getMobileNet } from "../image-service";

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
          <input
            disabled={isPending}
            type="file"
            onChange={(e) => {
              startTransition(() => {
                void getMobileNet(); // pre-load mobilenet
                setFile(e.currentTarget.files?.item(0));
              });
            }}
            accept="image/*"
          />
          {isPending ? <LoadingSpinner size={"small"} /> : null}
        </label>
        {file ? (
          <ImageLoader file={file} />
        ) : null}
      </main>
    </>
  );
};
