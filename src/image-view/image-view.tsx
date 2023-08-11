import { assertIsNotNullish } from "@jaybeeuu/utilities";
import { Suspense, useLayoutEffect, useRef } from "react";
import { ImageClassifications } from "../image-classificiation";
import type { ImageClassification } from "../image-service";
import { LoadingSpinner } from "../loading-spinner";
import styles from "./image-view.module.css";

export interface ImageViewProps {
  getImage: () => HTMLImageElement;
  getImageClassifications: () => ImageClassification[];
}

export const ImageView = ({ getImage, getImageClassifications }: ImageViewProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const image = getImage();

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    assertIsNotNullish(canvas);
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
  }, [image]);

  return (
    <div className={styles.componentRoot}>
      <canvas ref={canvasRef} className={styles.image} />
      <Suspense fallback={<LoadingSpinner />}>
        <ImageClassifications getClassifications={getImageClassifications} />
      </Suspense>
    </div>
  );
};
