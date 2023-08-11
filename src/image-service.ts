import type { TypeAssertion } from "@jaybeeuu/utilities";
import { asError, assert, delay, is } from "@jaybeeuu/utilities";

const assertIsString: TypeAssertion<string> = assert(is("string"));

export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const onError: OnErrorEventHandler = (event) => reject(asError(event));

    const image = new Image();

    image.onload = async () => {
      await delay(3000);
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

export const classifyImage = async (image: HTMLImageElement): Promise<ImageClassification[]> => {
  await import("@tensorflow/tfjs-backend-webgl");
  const mobilenet = await import("@tensorflow-models/mobilenet");
  const model = await mobilenet.load();
  const classifications = await model.classify(image);
  await delay(3000);

  return classifications;
};
