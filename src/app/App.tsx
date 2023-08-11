import { useState, useTransition } from "react";
import { ImageView } from "../image-view";
import styles from "./app.module.css";

export const App = (): JSX.Element => {
  const [file, setFile] = useState<File | null>();
  const [isPending, startTransition] = useTransition();
  return (
    <>
      <header className={styles.header}>
        <h1>React Suspense with RXJS</h1>
      </header>
      <main className={styles.main}>
        <label>
          Choose an image to categorise:
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
        {file ? <ImageView file={file} /> : null}
      </main>
    </>
  );
};
