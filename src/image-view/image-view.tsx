import type { PromiseState } from "@jaybeeuu/utilities";
import { asError, assertIsNotNullish, complete, pending, failed } from "@jaybeeuu/utilities";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImageClassifications } from "../image-classificiation";
import type { ImageClassification } from "../image-service";
import { classifyImage, loadImage } from "../image-service";
import { LoadingSpinner } from "../loading-spinner";
import styles from "./image-view.module.css";

const useIsMounted = (): RefObject<boolean> => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return isMountedRef;
};

const useImageClassifications = (image: PromiseState<HTMLImageElement>): PromiseState<ImageClassification[]> => {
  const [value, setValue] = useState<PromiseState<ImageClassification[]>>(pending());
  useEffect(() => {
    setValue(pending());
    const isCurrent = { current: true };
    void (async () => {
      if (image.status !== "complete") {
        return;
      }

      try {
        const classifications = await classifyImage(image.value);
        if (isCurrent.current) {
          setValue(complete(classifications));
        }
      } catch (error) {
        if (isCurrent.current) {
          setValue(failed(asError(error)));
        }
      }
    })();

    return () => { isCurrent.current = false; };
  }, [image]);

  return value;
};

const useImage = (file: File): PromiseState<HTMLImageElement> => {
  const [value, setValue] = useState<PromiseState<HTMLImageElement>>(pending());
  const isMounted = useIsMounted();

  useEffect(() => {
    setValue(pending());

    void(async () => {
      try {
        const image = await loadImage(file);
        if (isMounted.current) {
          setValue(complete(image));
        }
      } catch (error) {
        if (isMounted.current) {
          setValue(failed(asError(error)));
        }
      }
    })();
  }, [file]);

  return value;
};

export interface ImageViewProps {
  file: File;
}

export const ImageView = ({ file }: ImageViewProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const image = useImage(file);
  const categories = useImageClassifications(image);

  useLayoutEffect(() => {
    if (image.status === "complete") {
      const canvas = canvasRef.current;
      assertIsNotNullish(canvas);
      canvas.width = image.value.width;
      canvas.height = image.value.height;
      canvas.getContext("2d")?.drawImage(image.value, 0, 0);
    }
  }, [image]);

  return (
    <div className={styles.componentRoot}>
      {
        image.status === "pending" ? <LoadingSpinner /> : (
          <>
            <canvas ref={canvasRef} className={styles.image} />
            <ImageClassifications classifications={categories} />
          </>
        )
      }
    </div>
  );
};
