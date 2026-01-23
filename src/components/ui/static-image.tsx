import Image, { type StaticImageData, type ImageProps } from "next/image";

type StaticImageProps = Omit<ImageProps, "src"> & {
  image: StaticImageData;
};

export function StaticImage({ image, alt, ...props }: StaticImageProps) {
  return <Image src={image.src} alt={alt} width={image.width} height={image.height} {...props} />;
}
