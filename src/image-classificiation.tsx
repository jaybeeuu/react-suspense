import type { ImageClassification } from "./image-service";
import { usePromise } from "./use-promise";

export interface ImageClassificationsProps {
  imageClassifications: Promise<ImageClassification[]>;
}

export const ImageClassifications = ({ imageClassifications }: ImageClassificationsProps): JSX.Element => {
  const resolvedClassifications = usePromise(imageClassifications);

  return (
    <ul>
      {resolvedClassifications.map((classification) => (
        <li key={classification.className}>{classification.className} ({Math.round(classification.probability * 100)}%)</li>
      ))}
    </ul>
  );
};
