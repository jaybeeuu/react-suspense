import type { PromiseState} from "@jaybeeuu/utilities";
import { getErrorMessage } from "@jaybeeuu/utilities";
import type { ImageClassification } from "./image-service";
import { LoadingSpinner } from "./loading-spinner";

export interface ImageClassificationsProps {
  classifications: PromiseState<ImageClassification[]>;
}

export const ImageClassifications = ({ classifications }: ImageClassificationsProps): JSX.Element => {
  if (classifications.status === "pending") {
    return <LoadingSpinner />;
  }

  if (classifications.status === "failed") {
    return <div>{getErrorMessage(classifications.error)}</div>;
  }

  return (
    <ul>
      {classifications.value.map((category) => (
        <li key={category.className}>{category.className} ({Math.round(category.probability * 100)}%)</li>
      ))}
    </ul>
  );
};
