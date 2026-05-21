import { cn } from "@workspace/ui/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
};

export const Image = ({
  base64,
  mediaType,
  className,
  alt,
}: ImageProps) => (
  <img
    alt={alt}
    className={cn(
      "h-auto max-w-full overflow-hidden rounded-md",
      className
    )}
    src={`data:${mediaType};base64,${base64}`}
  />
);
