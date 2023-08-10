import type { TypeAssertion} from "@jaybeeuu/utilities";
import { asError, assert, assertIsNotNullish, delay, is } from "@jaybeeuu/utilities";
import type { RefObject} from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./image-view.module.css";
import { LoadingSpinner } from "../loading-spinner";

export interface Pending {
  status: "pending";
}
const pending: Pending = { status: "pending" };

export interface Resolved<Value> {
  status: "resolved";
  value: Value;
}

export interface Errored {
  status: "errored";
  error: Error;
}

export type ProcessStatus<Value> = Pending | Resolved<Value> | Errored;

const assertIsString: TypeAssertion<string> = assert(is("string"));

interface ImageCategory {
  className: string;
  probability: number;
}

const useIsMounted = (): RefObject<boolean> => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return isMountedRef;
};

const useImageClassifications = (image: ProcessStatus<HTMLImageElement>): ProcessStatus<ImageCategory[]> => {
  const [value, setValue] = useState<ProcessStatus<ImageCategory[]>>(pending);
  useEffect(() => {
    setValue(pending);
    const isCurrent = { current: true };
    void (async () => {
      if (image.status !== "resolved") {
        return;
      }

      try {
        await import("@tensorflow/tfjs-backend-webgl");
        const mobilenet = await import("@tensorflow-models/mobilenet");
        const model = await mobilenet.load();
        const classifications = await model.classify(image.value);
        await delay(3000);

        if (isCurrent.current) {
          setValue({ status: "resolved", value: classifications });
        }
      } catch (error) {
        if (isCurrent.current) {
          setValue({ status: "errored", error: asError(error) });
        }
      }
    })();

    return () => { isCurrent.current = false; };
  }, [image]);

  return value;
};

interface ImageClassificationsProps {
  classes: ProcessStatus<ImageCategory[]>;
}

const ImageClassifications = ({ classes: classes }: ImageClassificationsProps): JSX.Element => {
  if (classes.status === "pending") {
    return <LoadingSpinner />;
  }
  if (classes.status === "errored") {
    return <div>{classes.error.message}</div>;
  }

  return (
    <ul>
      {classes.value.map((category) => (
        <li key={category.className}>{category.className} ({Math.round(category.probability * 100)}%)</li>
      ))}
    </ul>
  );
};

const useImage = (file: File): ProcessStatus<HTMLImageElement> => {
  const [value, setValue] = useState<ProcessStatus<HTMLImageElement>>(pending);
  const isMounted = useIsMounted();

  useEffect(() => {
    setValue(pending);

    const onError: OnErrorEventHandler = (event) => {
      if (isMounted.current) {
        setValue({ status: "errored", error: asError(event) });
      }
    };
    const image = new Image();

    image.onload = async () => {
      await delay(3000);
      if (isMounted.current) {
        setValue({ status: "resolved", value: image });
      }
    };
    image.onerror = onError;

    const fileReader = new FileReader();

    fileReader.onload = () => {
      const fileReaderResult = fileReader.result;
      assertIsString(fileReaderResult);
      image.src = fileReaderResult;
    };
    fileReader.onerror = onError;

    fileReader.readAsDataURL(file);
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
    if (image.status === "resolved") {
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
            <ImageClassifications classes={categories} />
          </>
        )
      }
    </div>
  );
};
