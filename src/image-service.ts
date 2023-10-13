import type { TypeAssertion } from "@jaybeeuu/utilities";
import { asError, assert, delay, is } from "@jaybeeuu/utilities";
import type { MobileNet } from "@tensorflow-models/mobilenet";

const assertIsString: TypeAssertion<string> = assert(is("string"));

export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const onError: OnErrorEventHandler = (event) => reject(asError(event));

    const image = new Image();

    image.onload = async () => {
      await delay(1500);

      resolve(image);
    };
    image.onerror = onError;
    image.alt = file.name;

    const fileReader = new FileReader();

    fileReader.onload = () => {
      const fileReaderResult = fileReader.result;
      assertIsString(fileReaderResult);
      image.src = fileReaderResult;
    };
    fileReader.onerror = onError;

    fileReader.readAsDataURL(file);
  });
};

export interface ImageClassification {
  className: string;
  probability: number;
}

let hasErrored = false;

const randomError = (): void => {
  if (!hasErrored) { // || Math.random() < 0.1) {
    hasErrored = true;
    throw new Error("There's grebulons in the expector. Try resetting your degrindator.");
  }
};

let mobileNetPromise: Promise<MobileNet> | null = null;

export const getMobileNet = async (): Promise<MobileNet> => {
  if (!mobileNetPromise) {
    mobileNetPromise = (async () => {
      await import("@tensorflow/tfjs-backend-webgl");
      const mobileNet = await import("@tensorflow-models/mobilenet");
      return mobileNet.load();
    })();
  }
  return mobileNetPromise;
};

export const classifyImage = async (image: HTMLImageElement): Promise<ImageClassification[]> => {
  const mobileNet = await getMobileNet();
  const classifications = await mobileNet.classify(image);
  await delay(2500);
  randomError();

  return classifications;
};
