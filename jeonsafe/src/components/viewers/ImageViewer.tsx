type Props = { src: string; width: number; alt?: string };
export default function ImageViewer({ src, width, alt }: Props) {
  return (
    <img
      src={src}
      alt={alt || "image"}
      style={{ width, height: "auto" }}
      className="max-w-none border border-gray-300 rounded-lg bg-white"
    />
  );
}
