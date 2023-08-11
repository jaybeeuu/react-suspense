import { Suspense } from "react";
import { loadImage, classifyImage } from "../image-service";
import { ImageView } from "../image-view";
import { usePromise } from "../use-promise";
import { LoadingSpinner } from "../loading-spinner";
import styles from "./image-loader.module.css";

export interface ImageLoaderProps {
  file: File;
}

export const ImageLoader = ({ file }: ImageLoaderProps): JSX.Element => {
  const getImage = usePromise(() => loadImage(file), [file]);

  const getImageClassifications = usePromise(async () => {
    const image = await getImage.promise;
    return classifyImage(image);
  }, [getImage.promise]);

  return (
    <div className={styles.componentRoot}>
      <Suspense fallback={<LoadingSpinner/>}>
        <ImageView
          getImage={getImage}
          getImageClassifications={getImageClassifications}
        />
      </Suspense>
    </div>
  );
};
