import { Suspense, useState } from "react";
import { LoadingSpinner } from "../loading-spinner";
import { ImageView } from "../image-view";
import styles from "./app.module.css";

export const App = (): JSX.Element => {
  const [file, setFile] = useState<File | null>();
  return (
    <>
      <header className={styles.header}>
        <h1>React Suspense with RXJS</h1>
      </header>
      <main className={styles.main}>
        <label>
          Choose an image to categorise:
          <input
            type="file"
            onChange={(e) => setFile(e.currentTarget.files?.item(0))}
            accept="image/*"
            placeholder="Choose an image to process"
          />
        </label>
        {file ? <ImageView file={file} /> : null}
      </main>
    </>
  );
};
