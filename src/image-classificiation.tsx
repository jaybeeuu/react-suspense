import type { ImageClassification } from "./image-service";

export interface ImageClassificationsProps {
  getClassifications: () => ImageClassification[];
}

export const ImageClassifications = ({ getClassifications }: ImageClassificationsProps): JSX.Element => {
  const classifications = getClassifications();

  return (
    <ul>
      {classifications.map((category) => (
        <li key={category.className}>{category.className} ({Math.round(category.probability * 100)}%)</li>
      ))}
    </ul>
  );
};
