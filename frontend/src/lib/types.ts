export type DetectionItem = {
  id: number;
  label: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  detector?: string;
};

export type DetectionsPayload = {
  original_width: number;
  original_height: number;
  items: DetectionItem[];
  source?: string;
  prompt?: string;
  original_filename?: string;
};

export type ImageRecord = {
  id: string;
  url: string;
  detections: DetectionsPayload;
};
