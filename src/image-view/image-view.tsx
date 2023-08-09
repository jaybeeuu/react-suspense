import { assertIsNotNullish } from "@jaybeeuu/utilities";
import { Suspense, useLayoutEffect, useRef } from "react";
import { ImageClassifications } from "../image-classificiation";
import type { ImageClassification } from "../image-service";
import { LoadingSpinner } from "../loading-spinner";
import styles from "./image-view.module.css";
import { usePromise } from "../use-promise";

export interface ImageViewProps {
  image: Promise<HTMLImageElement>;
  imageClassifications: Promise<ImageClassification[]>;
}

export const ImageView = ({ image, imageClassifications }: ImageViewProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImage = usePromise(image);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    assertIsNotNullish(canvas);
    canvas.width = loadedImage.width;
    canvas.height = loadedImage.height;
    canvas.getContext("2d")?.drawImage(loadedImage, 0, 0);
  }, [loadedImage]);

  return (
    <div className={styles.componentRoot}>
      <canvas ref={canvasRef} className={styles.image} />
      <Suspense fallback={<LoadingSpinner />}>
        <ImageClassifications imageClassifications={imageClassifications} />
      </Suspense>
    </div>
  );
};
