import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { classifyImage, loadImage } from "../image-service";
import { ImageView } from "../image-view";
import { LoadingSpinner } from "../loading-spinner";
import { useSemanticMemo } from "../use-promise";
import styles from "./image-loader.module.css";
import { ErrorView } from "../error-view";

export interface ImageLoaderProps {
  file: File;
}
const useRetryToken = (): { retry: () => void; retryToken: number } => {
  const [retryToken, setRetryToken] = useState<number>(0);
  return {
    retryToken,
    retry() { setRetryToken((last) => last + 1); }
  };
};

export const ImageLoader = ({ file }: ImageLoaderProps): JSX.Element => {
  const { retry, retryToken } = useRetryToken();
  const image = useSemanticMemo(
    () => loadImage(file),
    [file, retryToken]
  );

  const imageClassifications = useSemanticMemo(
    async () => classifyImage(await image),
    [image, retryToken]
  );

  return (
    <div className={styles.componentRoot}>
      <Suspense fallback={<LoadingSpinner/>}>
        <ErrorBoundary
          FallbackComponent={ErrorView}
          onReset={() => retry()}
        >
          <ImageView
            image={image}
            imageClassifications={imageClassifications}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};
